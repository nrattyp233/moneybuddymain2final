
import React, { useState } from 'react';
import { supabase } from './supabaseClient';

interface AuthProps {
  onDemoLogin: () => void;
  onAdminLogin: (email: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onDemoLogin, onAdminLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Hardcoded Admin Logic
    if (email === 'lucasnale305@gmail.com' && password === 'Awaken76!') {
      onAdminLogin(email);
      setLoading(false);
      return;
    }

    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage({ type: 'error', text: error.message });
      if (error.message.includes('Invalid URL') || error.message.includes('fetch')) {
        setMessage({ type: 'error', text: 'Supabase connection failed. Use Clearance Override for access.' });
      }
    } else if (isSignUp) {
      setMessage({ type: 'success', text: 'Confirmation link dispatched to your terminal.' });
    }
    setLoading(false);
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Specify target email for reset.' });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Reset sequence initiated. Check email.' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full glass p-8 rounded-3xl space-y-8 shadow-2xl relative border border-white/10">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 relative">
             <div className="absolute inset-0 bg-lime-400/20 blur-2xl rounded-full animate-pulse"></div>
             <img 
               src="logo.png" 
               alt="Money Buddy Mascot" 
               className="w-full h-full object-contain relative z-10 transform hover:scale-110 transition-transform duration-500"
             />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            {isSignUp ? 'Initialize Profile' : 'Vault Access'}
          </h2>
          <p className="mt-2 text-indigo-300 text-sm font-medium uppercase tracking-widest">
            Money Buddy Secure Interface
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleAuth}>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-indigo-200 uppercase tracking-[0.2em] mb-2 block ml-1">Terminal ID</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-lime-400/50 transition-colors text-sm"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-indigo-200 uppercase tracking-[0.2em] mb-2 block ml-1">Access Cipher</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-lime-400/50 transition-colors text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-xl text-xs font-bold leading-relaxed animate-pulse ${message.type === 'error' ? 'bg-red-500/20 text-red-200 border border-red-500/30' : 'bg-lime-500/20 text-lime-200 border border-lime-500/30'}`}>
              <span className="uppercase mr-2">[{message.type}]:</span> {message.text}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 border border-indigo-400/30"
            >
              {loading ? 'Decrypting...' : (isSignUp ? 'INITIALIZE' : 'AUTHENTICATE')}
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">or</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            <button
              type="button"
              onClick={onDemoLogin}
              className="w-full py-4 bg-[#bef264] hover:bg-[#a3e635] text-indigo-900 font-black rounded-xl transition-all shadow-xl shadow-lime-400/20 active:scale-[0.98] uppercase tracking-wider text-sm border-2 border-lime-400/50"
            >
              Clearance Override (Demo Access)
            </button>

            {!isSignUp && (
              <button
                type="button"
                onClick={handlePasswordReset}
                className="w-full text-[10px] text-indigo-400 hover:text-white transition-colors uppercase font-bold tracking-widest"
              >
                Reset Forgotten Cipher
              </button>
            )}
          </div>
        </form>

        <div className="text-center pt-4">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-indigo-200 hover:text-lime-400 transition-colors text-xs font-bold uppercase tracking-widest"
          >
            {isSignUp ? 'Existing Personnel? Log In' : "New Personnel? Register"}
          </button>
        </div>
      </div>
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-indigo-500/5 blur-[100px] pointer-events-none"></div>
    </div>
  );
};

export default Auth;
