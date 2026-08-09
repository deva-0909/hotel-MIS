-- ============================================================
-- Per-property currency. Defaults every existing property to INR so
-- nothing changes for current data; new properties can pick a different
-- ISO 4217 code going forward.
-- ============================================================

alter table properties add column currency text not null default 'INR';
