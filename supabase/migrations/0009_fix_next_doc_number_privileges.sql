-- next_doc_number() lazily creates a sequence per document type on first use
-- (create sequence if not exists ...). Running as SECURITY INVOKER, that DDL
-- executes with the caller's own privileges — and the `authenticated` role
-- correctly has no CREATE grant on the public schema, so the very first
-- reservation/order/purchase-order/invoice created for a given prefix failed
-- with "permission denied for schema public". Mark it SECURITY DEFINER so it
-- runs with its owner's privileges instead; search_path is already pinned in
-- the function definition, so this doesn't reopen a search-path hijack risk.
alter function public.next_doc_number(prefix text, seq_name text) security definer;
