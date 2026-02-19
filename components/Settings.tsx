
import React from 'react';

interface SettingsProps {
  userEmail: string;
  isAdmin: boolean;
}

const Settings: React.FC<SettingsProps> = ({ userEmail, isAdmin }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="flex items-center space-x-4 px-2">
        <h2 className="text-3xl font-black tracking-tight uppercase">Terminal Configuration</h2>
        {isAdmin && <span className="bg-lime-400/20 text-lime-400 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-lime-400/30">Admin Access Restricted</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Section title="Operational Identity">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-gray-400 font-bold uppercase tracking-widest">Login ID</span>
                <span className="text-sm font-medium">{userEmail}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-gray-400 font-bold uppercase tracking-widest">Clearance Level</span>
                <span className="text-sm font-black text-indigo-400 uppercase tracking-tighter">{isAdmin ? 'Overseer (Level 99)' : 'Standard Operator'}</span>
              </div>
            </div>
          </Section>

          <Section title="Security Protocols">
            <div className="space-y-4">
              <Toggle label="Biometric Check-in" enabled={true} />
              <Toggle label="Force Geofence Tunnels" enabled={false} />
              <Toggle label="Admin Fee Transparency" enabled={isAdmin} />
              <Toggle label="Auto-Return Unclaimed Funds (24H)" enabled={true} />
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Network Health">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-gray-500">Supabase Link</span>
                <span className="w-2 h-2 rounded-full bg-lime-400 shadow-[0_0_8px_#bef264]"></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-gray-500">Plaid Interface</span>
                <span className="w-2 h-2 rounded-full bg-lime-400 shadow-[0_0_8px_#bef264]"></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-gray-500">Geospatial Sync</span>
                <span className="w-2 h-2 rounded-full bg-lime-400 shadow-[0_0_8px_#bef264]"></span>
              </div>
              <div className="pt-4 mt-4 border-t border-white/5">
                <button className="w-full py-3 glass hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 text-xs font-black uppercase tracking-widest transition-all rounded-xl">
                  Purge Local Storage
                </button>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
  <div className="glass p-6 rounded-3xl border border-white/5">
    <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-6 border-l-4 border-indigo-600 pl-3">{title}</h3>
    {children}
  </div>
);

const Toggle: React.FC<{ label: string, enabled: boolean }> = ({ label, enabled }) => {
  const [isOn, setIsOn] = React.useState(enabled);
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-bold text-indigo-100">{label}</span>
      <button 
        onClick={() => setIsOn(!isOn)}
        className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${isOn ? 'bg-lime-400 shadow-[0_0_10px_rgba(190,242,100,0.4)]' : 'bg-white/10'}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${isOn ? 'translate-x-6' : 'translate-x-0'}`}></div>
      </button>
    </div>
  );
};

export default Settings;
