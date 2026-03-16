import React, { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { supabase } from '../supabaseClient';
import { callEdgeFunction } from '../lib/api';
import MapSelector from './MapSelector';
import type { PaymentMethod } from '../types';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#ffffff',
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: '14px',
      fontWeight: '500',
      '::placeholder': { color: 'rgba(255,255,255,0.3)' },
      iconColor: '#FF7CA3',
    },
    invalid: {
      color: '#ef4444',
      iconColor: '#ef4444',
    },
  },
  hidePostalCode: false,
};

interface SendMoneyFormProps {
  onTransactionInitiated?: () => void;
}

const SendMoneyForm: React.FC<SendMoneyFormProps> = ({ onTransactionInitiated }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [useGeofence, setUseGeofence] = useState(false);
  const [points, setPoints] = useState<[number, number][] | null>(null);
  const [useExpiry, setUseExpiry] = useState(false);
  const [expiryHours, setExpiryHours] = useState('24');
  const [isLoading, setIsLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [payWith, setPayWith] = useState<'new' | string>('new'); // 'new' | stripe_payment_method_id (saved) | 'cashapp'

  useEffect(() => {
    callEdgeFunction<{ payment_methods: PaymentMethod[] }>('list-payment-methods', {})
      .then((res) => res?.payment_methods && setPaymentMethods(res.payment_methods))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setSubmitError('Enter a valid amount greater than $0.');
      return;
    }

    setIsLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setSubmitError('Session expired. Please sign in again.');
      setIsLoading(false);
      return;
    }

    try {
      // Calculate geo-fence center from polygon points (centroid)
      let geoFenceLat: number | null = null;
      let geoFenceLng: number | null = null;
      let geoFenceRadius: number | null = null;

      if (useGeofence && points && points.length > 0) {
        geoFenceLat = points.reduce((sum, p) => sum + p[0], 0) / points.length;
        geoFenceLng = points.reduce((sum, p) => sum + p[1], 0) / points.length;
        // Approximate radius as max distance from centroid to any point (in meters)
        const toRad = (d: number) => (d * Math.PI) / 180;
        geoFenceRadius = Math.max(...points.map(p => {
          const R = 6371e3;
          const dLat = toRad(p[0] - geoFenceLat!);
          const dLng = toRad(p[1] - geoFenceLng!);
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(geoFenceLat!)) * Math.cos(toRad(p[0])) * Math.sin(dLng / 2) ** 2;
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }));
      }

      const timeLockUntil = useExpiry
        ? new Date(Date.now() + parseInt(expiryHours) * 60 * 60 * 1000).toISOString()
        : null;

      const savedPmId = payWith && payWith !== 'new' && payWith !== 'cashapp' ? payWith : undefined;
      if (payWith === 'cashapp') {
        setSubmitError('Cash App pay is coming soon. Use a card for now.');
        setIsLoading(false);
        return;
      }

      const paymentResult = await callEdgeFunction<{
        client_secret: string;
        transaction_id: string;
        payment_intent_id: string;
        platform_fee: number;
        net_amount: number;
      }>('create-payment-intent', {
        amount: val,
        recipient_email: email,
        description: description || 'Goods & Services Payment',
        geo_fence_lat: geoFenceLat,
        geo_fence_lng: geoFenceLng,
        geo_fence_radius: geoFenceRadius,
        time_lock_until: timeLockUntil,
        geofence_points: points,
        payment_method_id: savedPmId || undefined,
      });

      if (!stripe) {
        throw new Error('Payment form not ready. Refresh the page or check your Stripe key.');
      }

      let stripeError;
      if (savedPmId) {
        stripeError = (await stripe.confirmCardPayment(paymentResult.client_secret)).error;
      } else {
        const cardElement = elements?.getElement(CardElement);
        if (!cardElement) throw new Error('Card input not found. Please refresh and try again.');
        stripeError = (await stripe.confirmCardPayment(paymentResult.client_secret, {
          payment_method: { card: cardElement },
        })).error;
      }

      if (stripeError) {
        throw new Error(stripeError.message || 'Payment failed');
      }

      const feeDisplay = `Service Fee (2%): $${paymentResult.platform_fee.toFixed(2)}`;
      const netDisplay = `Seller Receives: $${paymentResult.net_amount.toFixed(2)}`;
      const expiryMsg = useExpiry ? ` Fulfillment deadline: ${expiryHours}H.` : '';
      const geoMsg = useGeofence ? ' Delivery zone set.' : '';

      alert(`Payment Secured in Escrow. $${val} held for ${email}.\n${feeDisplay} | ${netDisplay}${expiryMsg}${geoMsg}`);

      setAmount('');
      setEmail('');
      setDescription('');
      setPoints(null);
      setUseGeofence(false);
      setUseExpiry(false);
      setExpiryHours('24');
      setSubmitError(null);
      onTransactionInitiated?.();
    } catch (err) {
      const msg = (err as Error).message || 'Payment failed';
      setSubmitError(msg);
      alert(`Payment Error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass rounded-3xl p-8 sticky top-8 border border-white/5 shadow-2xl bg-gradient-to-br from-lime-400/3 via-transparent to-transparent relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-lime-400/10 rounded-full blur-2xl"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-black flex items-center space-x-3">
            <span className="w-3 h-8 bg-[#FF7CA3] rounded-full inline-block shadow-[0_0_15px_rgba(255,124,163,0.6)] animate-pulse"></span>
            <span className="tracking-tight uppercase italic text-white drop-shadow-lg">New Payment</span>
          </h3>
          <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] animate-pulse border border-[#FF7CA3]/30 px-2 py-1 rounded-lg bg-[#FF7CA3]/10">Escrow</span>
        </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="group">
          <label className="block text-[9px] font-black text-indigo-200 uppercase mb-1 ml-1 tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">Seller / Provider Email</label>
          <input 
            type="email" 
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#FF7CA3]/50 transition-all text-sm font-medium hover:bg-white/10 hover:bg-[#FF7CA3]/5"
            placeholder="seller@example.com"
          />
        </div>

        <div className="group">
          <label className="block text-[9px] font-black text-indigo-200 uppercase mb-1 ml-1 tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">Payment Amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lime-400 font-black">$</span>
            <input 
              type="number" 
              required
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setSubmitError(null); }}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:border-[#FF7CA3]/50 transition-all font-mono text-sm hover:bg-white/10 hover:bg-[#FF7CA3]/5"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="pt-4 space-y-4">
          <div className={`p-4 rounded-2xl transition-all border ${useGeofence ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-transparent hover:border-white/10'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setUseGeofence(!useGeofence)}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${useGeofence ? 'bg-indigo-500/30 text-indigo-400' : 'bg-white/10 text-gray-500'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Delivery Zone</span>
              </div>
              <input type="checkbox" checked={useGeofence} onChange={(e) => setUseGeofence(e.target.checked)} className="w-4 h-4 accent-lime-400 cursor-pointer" />
            </div>
            {useGeofence && (
              <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-4">
                <MapSelector selectedPoints={points} onLocationSelect={setPoints} />
              </div>
            )}
          </div>

          <div className={`p-4 rounded-2xl transition-all border ${useExpiry ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-transparent hover:border-white/10'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setUseExpiry(!useExpiry)}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${useExpiry ? 'bg-indigo-500/30 text-indigo-400' : 'bg-white/10 text-gray-500'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Fulfillment Deadline</span>
              </div>
              <input type="checkbox" checked={useExpiry} onChange={(e) => setUseExpiry(e.target.checked)} className="w-4 h-4 accent-lime-400 cursor-pointer" />
            </div>
            {useExpiry && (
              <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-4">
                <select 
                  value={expiryHours}
                  onChange={(e) => setExpiryHours(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                >
                  <option value="1">1 Hour</option>
                  <option value="6">6 Hours</option>
                  <option value="12">12 Hours</option>
                  <option value="24">24 Hours</option>
                  <option value="48">48 Hours</option>
                  <option value="168">7 Days</option>
                </select>
                <p className="text-[7px] text-gray-400 font-black uppercase tracking-widest text-center">Auto-refund if order not fulfilled within period</p>
              </div>
            )}
          </div>
        </div>

        <div className="group">
          <label className="block text-[9px] font-black text-indigo-200 uppercase mb-1 ml-1 tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">How to pay</label>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <label className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${payWith === 'new' ? 'bg-lime-400/20 border-lime-400/40 text-lime-300' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                <input type="radio" name="payWith" value="new" checked={payWith === 'new'} onChange={() => setPayWith('new')} className="sr-only" />
                <span className="text-lg">💳</span>
                <span className="text-[10px] font-black uppercase">New card</span>
              </label>
              {paymentMethods.filter((pm) => pm.stripe_payment_method_id).map((pm) => (
                <label key={pm.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${payWith === pm.stripe_payment_method_id ? 'bg-lime-400/20 border-lime-400/40 text-lime-300' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                  <input type="radio" name="payWith" value={pm.stripe_payment_method_id!} checked={payWith === pm.stripe_payment_method_id} onChange={() => setPayWith(pm.stripe_payment_method_id!)} className="sr-only" />
                  <span className="text-lg">💳</span>
                  <span className="text-[10px] font-black uppercase">{pm.brand || 'Card'} ****{pm.last4}</span>
                </label>
              ))}
              <label className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed opacity-60 cursor-not-allowed ${payWith === 'cashapp' ? 'bg-indigo-500/10' : 'bg-white/5 border-white/10'}`}>
                <input type="radio" name="payWith" value="cashapp" checked={payWith === 'cashapp'} onChange={() => setPayWith('cashapp')} className="sr-only" />
                <span className="text-lg">📱</span>
                <span className="text-[10px] font-black uppercase">Cash App</span>
                <span className="text-[8px] text-indigo-400">Soon</span>
              </label>
            </div>
            {payWith === 'new' && (
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 hover:bg-white/10 focus-within:border-[#FF7CA3]/50">
                <CardElement options={CARD_ELEMENT_OPTIONS} onChange={(e) => setCardError(e.error ? e.error.message : null)} />
              </div>
            )}
            {payWith === 'new' && cardError && (
              <p className="text-[10px] text-red-400 font-bold ml-1">{cardError}</p>
            )}
          </div>
        </div>

        {submitError && (
          <p className="text-[10px] font-bold text-red-400 bg-red-400/10 border border-red-400/30 rounded-xl px-3 py-2 mt-2">
            {submitError}
          </p>
        )}
        <button 
          type="submit"
          disabled={isLoading || !stripe}
          title={!stripe ? 'Loading payment form...' : undefined}
          className="w-full py-4 bg-lime-400 hover:bg-lime-300 text-indigo-900 font-black rounded-2xl transition-all active:scale-95 shadow-xl shadow-lime-400/20 uppercase text-[10px] tracking-[0.4em] disabled:opacity-50 disabled:cursor-not-allowed mt-4 group"
        >
          {isLoading ? (
             <div className="flex items-center justify-center space-x-2">
               <div className="w-3 h-3 border-2 border-indigo-900 border-t-transparent rounded-full animate-spin"></div>
               <span>PROCESSING...</span>
             </div>
          ) : !stripe ? 'LOADING PAYMENT FORM...' : 'SECURE PAYMENT'}
        </button>

        <div className="flex flex-col items-center space-y-1 opacity-40 mt-4">
           <p className="text-[7px] font-black uppercase tracking-widest text-indigo-200">Buyer Protection Active</p>
           <div className="flex items-center space-x-1">
             <span className="w-1 h-1 bg-lime-400 rounded-full animate-pulse"></span>
             <p className="text-[7px] font-black uppercase tracking-tighter">Escrow Secured by Stripe</p>
           </div>
        </div>
      </form>
      </div>
    </div>
  );
};

export default SendMoneyForm;
