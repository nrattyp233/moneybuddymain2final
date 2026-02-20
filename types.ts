export interface BankAccount {
  id: string;
  name: string;
  mask: string;
  balance: number;
  type: string;
  institution_name?: string;
  plaid_item_id?: string;
  plaid_account_id?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  sender_id: string;
  senderEmail?: string;
  recipient_email: string;
  recipient_id?: string;
  description: string;
  created_at: string;
  completed_at?: string;
  status: 'pending_payment' | 'pending_escrow' | 'locked' | 'completed' | 'returned' | 'canceled' | 'failed';
  geofence_points?: [number, number][];
  geo_fence_lat?: number;
  geo_fence_lng?: number;
  geo_fence_radius?: number;
  time_lock_until?: string | null;
  expires_at?: string | null;
  stripe_payment_intent_id?: string;
  stripe_transfer_id?: string;
  protocol_fee: number;
  net_amount: number;
  platform_fee_amount?: number;
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface StripeConnectStatus {
  accountId: string | null;
  onboarded: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  stripe_connect_account_id?: string;
  stripe_connect_onboarded: boolean;
}
