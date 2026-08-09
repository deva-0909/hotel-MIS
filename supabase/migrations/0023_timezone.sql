-- ============================================================
-- Per-property timezone (IANA name). Defaults every existing property to
-- Asia/Kolkata, matching current behavior — the app has only ever rendered
-- dates in whatever timezone the server/browser happened to be in, which
-- for this deployment has always meant India.
-- ============================================================

alter table properties add column timezone text not null default 'Asia/Kolkata';
