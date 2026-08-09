-- ============================================================
-- General ledger: chart of accounts + journal entries, per property.
-- ============================================================

create type account_type as enum ('asset', 'liability', 'equity', 'revenue', 'expense');

create table chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  code text not null,
  name text not null,
  account_type account_type not null,
  parent_id uuid references chart_of_accounts(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (property_id, code)
);

create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id),
  entry_number text not null unique default next_doc_number('JE', 'journal_entry_seq'),
  entry_date date not null default current_date,
  description text not null,
  source_table text,
  source_id uuid,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  -- one ledger entry per source transaction (e.g. one per invoice) so
  -- post-to-ledger actions can't double-post
  unique (source_table, source_id)
);

create table journal_entry_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references journal_entries(id) on delete cascade,
  account_id uuid not null references chart_of_accounts(id),
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  check (debit = 0 or credit = 0)
);

create index idx_chart_of_accounts_property on chart_of_accounts(property_id);
create index idx_journal_entries_property on journal_entries(property_id);
create index idx_journal_entry_lines_entry on journal_entry_lines(journal_entry_id);
create index idx_journal_entry_lines_account on journal_entry_lines(account_id);

-- Seeds a standard minimal chart of accounts for a new property.
create or replace function seed_default_chart_of_accounts(p_property_id uuid) returns void as $$
begin
  insert into chart_of_accounts (property_id, code, name, account_type) values
    (p_property_id, 'CASH', 'Cash on Hand', 'asset'),
    (p_property_id, 'BANK', 'Bank Account', 'asset'),
    (p_property_id, 'AR', 'Accounts Receivable', 'asset'),
    (p_property_id, 'INVENTORY', 'Inventory', 'asset'),
    (p_property_id, 'AP', 'Accounts Payable', 'liability'),
    (p_property_id, 'EQUITY', 'Owner''s Equity', 'equity'),
    (p_property_id, 'REV-ROOM', 'Room Revenue', 'revenue'),
    (p_property_id, 'REV-FB', 'Food & Beverage Revenue', 'revenue'),
    (p_property_id, 'REV-OTHER', 'Other Revenue', 'revenue'),
    (p_property_id, 'COGS', 'Cost of Goods Sold', 'expense'),
    (p_property_id, 'PAYROLL', 'Payroll Expense', 'expense'),
    (p_property_id, 'UTILITIES', 'Utilities Expense', 'expense'),
    (p_property_id, 'EXP-OTHER', 'Other Expense', 'expense')
  on conflict (property_id, code) do nothing;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function seed_default_chart_of_accounts(uuid) to authenticated;

-- Backfill the chart for every property that already exists.
do $$
declare
  p record;
begin
  for p in select id from properties loop
    perform seed_default_chart_of_accounts(p.id);
  end loop;
end $$;

-- Creates a journal entry with its lines atomically; rejects unbalanced
-- entries outright rather than allowing debits <> credits to be saved.
create or replace function create_journal_entry(
  p_property_id uuid,
  p_entry_date date,
  p_description text,
  p_lines jsonb,
  p_staff_id uuid,
  p_source_table text default null,
  p_source_id uuid default null
) returns uuid as $$
declare
  v_entry_id uuid;
  v_total_debit numeric(14,2) := 0;
  v_total_credit numeric(14,2) := 0;
  line jsonb;
begin
  if not is_staff_for_property(p_property_id) then
    raise exception 'not authorized';
  end if;

  select coalesce(sum((l->>'debit')::numeric), 0), coalesce(sum((l->>'credit')::numeric), 0)
  into v_total_debit, v_total_credit
  from jsonb_array_elements(p_lines) l;

  if v_total_debit <> v_total_credit then
    raise exception 'Journal entry does not balance: debits %, credits %', v_total_debit, v_total_credit;
  end if;
  if v_total_debit = 0 then
    raise exception 'Journal entry has no amount';
  end if;

  insert into journal_entries (property_id, entry_date, description, source_table, source_id, created_by)
  values (p_property_id, p_entry_date, p_description, p_source_table, p_source_id, p_staff_id)
  returning id into v_entry_id;

  for line in select * from jsonb_array_elements(p_lines) loop
    insert into journal_entry_lines (journal_entry_id, account_id, debit, credit)
    values (v_entry_id, (line->>'account_id')::uuid, coalesce((line->>'debit')::numeric, 0), coalesce((line->>'credit')::numeric, 0));
  end loop;

  return v_entry_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function create_journal_entry(uuid, date, text, jsonb, uuid, text, uuid) to authenticated;

-- Posts an issued/paid invoice to the ledger: Dr Accounts Receivable,
-- Cr revenue accounts split by each line item's source_type.
create or replace function post_invoice_to_ledger(p_invoice_id uuid, p_staff_id uuid) returns uuid as $$
declare
  v_property_id uuid;
  v_invoice_number text;
  v_ar_account uuid;
  v_lines jsonb;
  v_total numeric(14,2);
begin
  select property_id, invoice_number into v_property_id, v_invoice_number from invoices where id = p_invoice_id;
  if v_property_id is null then
    raise exception 'Invoice not found';
  end if;
  if not is_staff_for_property(v_property_id) then
    raise exception 'not authorized';
  end if;

  select id into v_ar_account from chart_of_accounts where property_id = v_property_id and code = 'AR';

  select coalesce(sum(amount), 0) into v_total from invoice_line_items where invoice_id = p_invoice_id;
  if v_total <= 0 then
    raise exception 'Invoice has no line items to post';
  end if;

  select jsonb_agg(jsonb_build_object('account_id', coa.id, 'debit', 0, 'credit', rev.amount))
  into v_lines
  from (
    select
      case source_type
        when 'room' then 'REV-ROOM'
        when 'restaurant' then 'REV-FB'
        else 'REV-OTHER'
      end as code,
      sum(amount) as amount
    from invoice_line_items
    where invoice_id = p_invoice_id
    group by 1
  ) rev
  join chart_of_accounts coa on coa.property_id = v_property_id and coa.code = rev.code;

  v_lines := v_lines || jsonb_build_array(jsonb_build_object('account_id', v_ar_account, 'debit', v_total, 'credit', 0));

  return create_journal_entry(
    v_property_id, current_date, format('Invoice %s', v_invoice_number), v_lines, p_staff_id, 'invoices', p_invoice_id
  );
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function post_invoice_to_ledger(uuid, uuid) to authenticated;

-- Posts a payment to the ledger: Dr Cash/Bank, Cr Accounts Receivable.
create or replace function post_payment_to_ledger(p_payment_id uuid, p_staff_id uuid) returns uuid as $$
declare
  v_property_id uuid;
  v_amount numeric(14,2);
  v_method text;
  v_invoice_number text;
  v_cash_account uuid;
  v_ar_account uuid;
begin
  select i.property_id, p.amount, p.method::text, i.invoice_number
  into v_property_id, v_amount, v_method, v_invoice_number
  from payments p join invoices i on i.id = p.invoice_id
  where p.id = p_payment_id;

  if v_property_id is null then
    raise exception 'Payment not found';
  end if;
  if not is_staff_for_property(v_property_id) then
    raise exception 'not authorized';
  end if;

  select id into v_cash_account from chart_of_accounts
  where property_id = v_property_id and code = (case when v_method = 'cash' then 'CASH' else 'BANK' end);
  select id into v_ar_account from chart_of_accounts where property_id = v_property_id and code = 'AR';

  return create_journal_entry(
    v_property_id,
    current_date,
    format('Payment for %s', v_invoice_number),
    jsonb_build_array(
      jsonb_build_object('account_id', v_cash_account, 'debit', v_amount, 'credit', 0),
      jsonb_build_object('account_id', v_ar_account, 'debit', 0, 'credit', v_amount)
    ),
    p_staff_id,
    'payments',
    p_payment_id
  );
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function post_payment_to_ledger(uuid, uuid) to authenticated;

-- ---------- RLS ----------

alter table chart_of_accounts enable row level security;
create policy chart_of_accounts_all on chart_of_accounts for all to authenticated
  using (is_staff_for_property(property_id)) with check (is_staff_for_property(property_id));
grant select, insert, update, delete on chart_of_accounts to authenticated;

alter table journal_entries enable row level security;
create policy journal_entries_all on journal_entries for all to authenticated
  using (is_staff_for_property(property_id)) with check (is_staff_for_property(property_id));
grant select, insert, update, delete on journal_entries to authenticated;

alter table journal_entry_lines enable row level security;
create policy journal_entry_lines_all on journal_entry_lines for all to authenticated using (
  is_staff_for_property((select property_id from journal_entries where id = journal_entry_id))
) with check (
  is_staff_for_property((select property_id from journal_entries where id = journal_entry_id))
);
grant select, insert, update, delete on journal_entry_lines to authenticated;
