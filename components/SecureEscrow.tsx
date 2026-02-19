
import React, { useState } from 'react';
import { Transaction } from '../types';
import { supabase } from '../supabaseClient';

interface SecureEscrowProps {
  inboundTransfers: Transaction[];
  onClaim: (id: string) => void;
}

const isInsideGeofence = (point: [number, number], vs: [number, number][]) => {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

const SecureEscrow: React.FC<SecureEscrowProps> = ({ inboundTransfers, onClaim }) => {
  const [checkingLocation, setCheckingLocation] = useState<string | null>(null);

  const handleClaimAttempt = (transfer: Transaction) => {
    setCheckingLocation(transfer.id);
    
    const now = new Date();
    // Fix: Using correct property name expires_at from Transaction interface
    if (transfer.expires_at) {
      const expiry = new Date(transfer.expires_at);
      if (now > expiry) {
        alert("Protocol Timeout: Transaction has exceeded its temporal lock window.");
        setCheckingLocation(null);
        return;
      }
    }

    // Fix: Using correct property name geofence_points from Transaction interface
    if (!transfer.geofence_points || transfer.geofence_points.length === 0) {
      onClaim(transfer.id);
      setCheckingLocation(null);
      return;
    }

    // PRODUCTION HARDENING: No caching, high accuracy required
    const geoOptions = {
      enableHighAccuracy: true,
      maximumAge: 0, 
      timeout: 10000 
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userPoint: [number, number] = [position.coords.latitude, position.coords.longitude];
        
        // 1. Client-side pre-verification
        // Fix: Using correct property name geofence_points from Transaction interface
        const isSecure = isInsideGeofence(userPoint, transfer.geofence_points!);

        if (isSecure) {
          /* 
            PROD NOTE: In a live environment, we call a Supabase Edge Function here:
            const { data, error } = await supabase.functions.invoke('verify-spatial-claim', {
              body: { txId: transfer.id, lat: userPoint[0], lng: userPoint[1] }
            });
          */
          
          // Log spatial success in audit trail
          await supabase.from('audit_log').insert({
            event_type: 'SPATIAL_VERIFICATION_SUCCESS',
            transaction_id: transfer.id,
            metadata: { coords: userPoint }
          });

          alert(`Spatial Identity Confirmed at [${userPoint[0].toFixed(4)}, ${userPoint[1].toFixed(4)}]. Access Granted.`);
          onClaim(transfer.id);
        } else {
          // Log spatial violation attempt
          await supabase.from('audit_log').insert({
            event_type: 'SPATIAL_VERIFICATION_FAILURE',
            transaction_id: transfer.id,
            metadata: { attempted_coords: userPoint }
          });
          alert(`Spatial Violation: Hardware reported coordinates outside the secure perimeter.`);
        }
        setCheckingLocation(null);
      },
      (error) => {
        alert(`Hardware Signal Error: ${error.message}. Spatial verification requires active GPS hardware.`);
        setCheckingLocation(null);
      },
      geoOptions
    );
  };

  if (inboundTransfers.length === 0) return null;

  return (
    <div className="space-y-4 mt-8 animate-in fade-in slide-in-from-bottom-4">
      <h3 className="text-lg font-bold px-2 flex items-center text-lime-400">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Sovereign Escrow Queue
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {inboundTransfers.map(transfer => {
          // Fix: Using correct property name expires_at from Transaction interface
          const isExpired = transfer.expires_at && new Date() > new Date(transfer.expires_at);
          return (
            <div key={transfer.id} className={`p-6 glass-dark border rounded-3xl relative overflow-hidden group transition-all ${isExpired ? 'border-red-500/30 opacity-60' : 'border-indigo-500/30 hover:border-lime-400/40 shadow-xl'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mb-1">
                    {isExpired ? 'Link Severed' : 'Locked Asset'}
                  </p>
                  <h4 className="text-2xl font-black font-mono text-white">${transfer.amount.toLocaleString()}</h4>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter block">Origin Terminal</span>
                  <span className="text-[10px] font-medium text-indigo-200">{transfer.senderEmail}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-[9px] uppercase font-black tracking-[0.2em]">
                  <span className="text-gray-500">Security:</span>
                  <div className="flex space-x-2">
                    {/* Fix: Using correct property name geofence_points and expires_at */}
                    {transfer.geofence_points && <span className="text-lime-400">SPATIAL_LOCK</span>}
                    {transfer.expires_at && <span className="text-orange-400">TIME_LOCK</span>}
                    {!transfer.geofence_points && !transfer.expires_at && <span className="text-indigo-400">SIG_PIN</span>}
                  </div>
                </div>
                
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full animate-pulse ${isExpired ? 'bg-red-500 w-full' : 'bg-lime-400 w-3/4'}`}></div>
                </div>

                <button 
                  onClick={() => handleClaimAttempt(transfer)}
                  disabled={checkingLocation === transfer.id || isExpired}
                  className={`w-full py-4 border rounded-2xl text-[10px] font-black transition-all uppercase tracking-[0.3em] flex items-center justify-center space-x-3 ${
                    isExpired 
                    ? 'bg-red-500/10 border-red-500/20 text-red-400 cursor-not-allowed opacity-50' 
                    : 'bg-indigo-600/10 hover:bg-lime-400 text-indigo-300 hover:text-indigo-900 border-indigo-500/30 hover:border-lime-400 shadow-lg shadow-indigo-500/10'
                  }`}
                >
                  {checkingLocation === transfer.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>{isExpired ? 'Expired' : 'Authorize Release'}</span>
                    </>
                  )}
                </button>
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-lime-400/5 rounded-full blur-3xl"></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SecureEscrow;
