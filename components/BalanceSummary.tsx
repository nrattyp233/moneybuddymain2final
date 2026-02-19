
import React from 'react';
import { BankAccount } from '../types';

interface BalanceSummaryProps {
  accounts: BankAccount[];
  isLoading: boolean;
}

const BalanceSummary: React.FC<BalanceSummaryProps> = ({ accounts, isLoading }) => {
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div className="p-8 glass rounded-3xl relative overflow-hidden">
      <div className="relative z-10">
        <h2 className="text-gray-400 font-medium mb-2">Total Combined Balance</h2>
        <div className="flex items-baseline space-x-2">
          <span className="text-4xl md:text-5xl font-bold">
            {isLoading ? "..." : `$${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </span>
          <span className="text-lime-400 text-sm font-semibold">+2.4% this month</span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <StatBox label="Active Cards" value="3" icon="💳" />
          <StatBox label="Secured Zones" value="12" icon="📍" />
          <StatBox label="Safe Score" value="98/100" icon="🛡️" />
          <StatBox label="Linked Banks" value={accounts.length.toString()} icon="🏛️" />
        </div>
      </div>
      
      {/* Decorative pulse */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-lime-400/10 rounded-full blur-3xl animate-pulse"></div>
    </div>
  );
};

const StatBox: React.FC<{ label: string, value: string, icon: string }> = ({ label, value, icon }) => (
  <div className="glass-dark p-3 rounded-xl">
    <div className="text-lg mb-1">{icon}</div>
    <div className="text-sm font-bold">{value}</div>
    <div className="text-[10px] text-gray-400 uppercase tracking-tighter">{label}</div>
  </div>
);

export default BalanceSummary;
