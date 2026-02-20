-- MONEY BUDDY - STRIPE CONNECT MIGRATION
-- Adds Stripe Connect and Plaid fields to profiles/bank_accounts

-- 1. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    stripe_connect_account_id TEXT,
    stripe_connect_onboarded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add Stripe Connect columns to profiles (safe if already exists)
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_connect_onboarded BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Add Plaid access token to bank_accounts (encrypted at rest via Supabase)
DO $$ BEGIN
    ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS plaid_access_token TEXT;
    ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS stripe_bank_account_token TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. Add platform_fee_amount to transactions for explicit tracking
DO $$ BEGIN
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC(12,2);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. Add geo-fence columns to transactions if they don't exist
DO $$ BEGIN
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS geo_fence_lat DOUBLE PRECISION;
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS geo_fence_lng DOUBLE PRECISION;
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS geo_fence_radius DOUBLE PRECISION;
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS time_lock_until TIMESTAMPTZ;
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES auth.users(id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 6. RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "users_read_own_profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "users_update_own_profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "users_insert_own_profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 7. Update transaction policy so recipient can also see transactions sent to them
-- (The existing policy uses recipient_email; add recipient_id based access)
CREATE POLICY IF NOT EXISTS "recipient_id_transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = recipient_id);

-- 8. Allow transaction status updates by sender or recipient
CREATE POLICY IF NOT EXISTS "user_update_transactions" ON public.transactions
    FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- 9. Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger to ensure it's current
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
