-- Ensures exchange-plaid-token upsert(..., { onConflict: 'plaid_account_id' }) works.
-- Run in Supabase SQL Editor if your Edge Function fails with "no unique constraint" on upsert.
-- If this fails due to duplicate plaid_account_id, deduplicate rows first then re-run.

ALTER TABLE public.bank_accounts
  DROP CONSTRAINT IF EXISTS bank_accounts_plaid_account_id_key;

ALTER TABLE public.bank_accounts
  ADD CONSTRAINT bank_accounts_plaid_account_id_key UNIQUE (plaid_account_id);
