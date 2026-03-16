-- Payment methods: saved cards (and future Cash App) for choosing how to pay
-- Run in Supabase SQL Editor if not using supabase db push

-- Add Stripe customer id to profiles (for saving cards)
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Saved payment methods (cards; Cash App can be added later with type = 'cashapp')
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'card',  -- 'card' | 'cashapp'
  stripe_payment_method_id TEXT,      -- pm_xxx for cards
  brand TEXT,                         -- visa, mastercard, etc.
  last4 TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, stripe_payment_method_id)
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_payment_methods" ON public.payment_methods
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON public.payment_methods(user_id);
