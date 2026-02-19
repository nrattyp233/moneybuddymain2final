
export interface BankAccount {
  id: string;
  name: string;
  mask: string;
  balance: number;
  type: string;
}

export interface Transaction {
  id: string;
  amount: number;
  sender_id: string;
  senderEmail: string;
  recipient_email: string;
  description: string;
  created_at: string;
  status: 'locked' | 'completed' | 'returned' | 'canceled';
  geofence_points?: [number, number][];
  expires_at?: string | null;
  stripe_payment_intent_id?: string;
  stripe_transfer_id?: string;
  protocol_fee: number;
  net_amount: number;
}

export interface GeoLocation {
  lat: number;
  lng: number;
}
