
-- MONEY BUDDY - GEO SAFE PRODUCTION SCHEMA V3.2
-- TARGET: SOVEREIGN MULTI-USER DEPLOYMENT WITH STRIPE INTEGRATION

-- 1. Prerequisites
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    stripe_connect_account_id TEXT,
    stripe_connect_onboarded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bank Accounts Table
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    mask TEXT NOT NULL,
    balance NUMERIC(15,2) DEFAULT 0.00,
    type TEXT DEFAULT 'checking',
    institution_name TEXT,
    plaid_item_id TEXT,
    plaid_account_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Transactions Ledger (Updated for Stripe)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES auth.users(id) NOT NULL,
    recipient_id UUID REFERENCES auth.users(id),
    recipient_email TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    protocol_fee NUMERIC(15,2) DEFAULT 0.00,
    platform_fee_amount NUMERIC(12,2),
    net_amount NUMERIC(15,2) DEFAULT 0.00,
    description TEXT,
    status TEXT DEFAULT 'locked',
    geofence_points JSONB,
    geo_fence_lat DOUBLE PRECISION,
    geo_fence_lng DOUBLE PRECISION,
    geo_fence_radius DOUBLE PRECISION,
    time_lock_until TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    stripe_payment_intent_id TEXT, -- For tracking the hold on the sender's card
    stripe_transfer_id TEXT,       -- For tracking the payout to the recipient
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 4. Immutable Audit Log
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    transaction_id UUID REFERENCES public.transactions(id),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Platform Revenue Vault
CREATE TABLE IF NOT EXISTS public.platform_revenue (
    id SERIAL PRIMARY KEY,
    total_yield NUMERIC(20,2) DEFAULT 0.00,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.platform_revenue (total_yield) SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM public.platform_revenue);

-- 6. Trigger Logic: Protocol Tax Automation
CREATE OR REPLACE FUNCTION process_transaction_tax()
RETURNS TRIGGER AS $$
DECLARE
    calculated_fee NUMERIC(15,2);
BEGIN
    calculated_fee := NEW.amount * 0.02;
    NEW.protocol_fee := calculated_fee;
    NEW.net_amount := NEW.amount - calculated_fee;
    
    UPDATE public.platform_revenue SET total_yield = total_yield + calculated_fee, last_updated = now();
    
    INSERT INTO public.audit_log (event_type, user_id, transaction_id, metadata)
    VALUES ('TRANSFER_INITIATED', NEW.sender_id, NEW.id, json_build_object('amount', NEW.amount, 'fee', calculated_fee));
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_tx_insert
BEFORE INSERT ON public.transactions
FOR EACH ROW EXECUTE PROCEDURE process_transaction_tax();

-- 8. Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. RLS Configuration
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own_profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_own_profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "user_accounts_isolation" ON public.bank_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_transactions_isolation" ON public.transactions FOR SELECT USING (auth.uid() = sender_id OR LOWER(auth.email()) = LOWER(recipient_email));
CREATE POLICY "recipient_id_transactions" ON public.transactions FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "user_insert_transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "user_update_transactions" ON public.transactions FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "audit_read_only" ON public.audit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "audit_system_append" ON public.audit_log FOR INSERT WITH CHECK (true);

-- 8. View for Lucas
CREATE OR REPLACE VIEW public.admin_platform_metrics AS
SELECT 
    (SELECT COUNT(*) FROM public.transactions) as total_global_tx,
    (SELECT SUM(amount) FROM public.transactions) as total_volume,
    (SELECT total_yield FROM public.platform_revenue LIMIT 1) as platform_revenue_2_percent;
