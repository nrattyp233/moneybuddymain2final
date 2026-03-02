import React from 'react';
import { BankAccount, Transaction } from '../types';

interface BalanceSummaryProps {
  accounts: BankAccount[];
  transactions: Transaction[];
  isLoading: boolean;
}

const BalanceSummary: React.FC<BalanceSummaryProps> = ({ accounts, transactions, isLoading }) => {
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Compute real stats from transaction data
  const uniqueCards = new Set(transactions.map(tx => tx.sender_id)).size;
  const securedZones = new Set(
    transactions
      .filter(tx => tx.geo_fence_lat && tx.geo_fence_lng)
      .map(tx => `${tx.geo_fence_lat},${tx.geo_fence_lng}`)
  ).size;

  // Calculate month-over-month change from real transaction data
  const now = new Date();
  const thisMonth = transactions.filter(tx => {
    const d = new Date(tx.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && tx.status === 'completed';
  });
  const lastMonth = transactions.filter(tx => {
    const d = new Date(tx.created_at);
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === prev.getMonth() && d.getFullYear() === prev.getFullYear() && tx.status === 'completed';
  });

  const thisMonthInflow = thisMonth.reduce((sum, tx) => sum + tx.amount, 0);
  const lastMonthInflow = lastMonth.reduce((sum, tx) => sum + tx.amount, 0);
  const percentChange = lastMonthInflow > 0 ? ((thisMonthInflow - lastMonthInflow) / lastMonthInflow) * 100 : 0;

  return (
    <div className="p-8 glass rounded-3xl relative overflow-hidden border border-[#FF7CA3]/10 bg-gradient-to-br from-[#FF7CA3]/3 via-transparent to-transparent">
      <div className="relative z-10">
        <h2 className="text-white font-black uppercase tracking-widest text-sm mb-4 flex items-center space-x-2">
          <span className="w-2 h-2 bg-[#FF7CA3] rounded-full animate-pulse"></span>
          Total Combined Balance
          <span className="w-2 h-2 bg-[#FF7CA3] rounded-full animate-pulse"></span>
        </h2>
        <div className="flex items-baseline space-x-3">
          <span className="text-5xl md:text-6xl font-black text-white drop-shadow-2xl">
            {isLoading ? "..." : `$${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </span>
          {!isLoading && percentChange !== 0 && (
            <span className={`text-sm font-black px-2 py-1 rounded-lg ${percentChange >= 0 ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30' : 'bg-red-400/20 text-red-400 border border-red-400/30'}`}>
              {percentChange >= 0 ? '↑' : '↓'} {Math.abs(percentChange).toFixed(1)}%
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">
          <StatBox label="Active Cards" value={isLoading ? "..." : uniqueCards.toString()} icon="💳" color="pink" />
          <StatBox label="Secured Zones" value={isLoading ? "..." : securedZones.toString()} icon="📍" color="green" />
          <StatBox label="Transactions" value={isLoading ? "..." : transactions.filter(tx => tx.status === 'completed').length.toString()} icon="🛡️" color="white" />
          <StatBox label="Linked Banks" value={isLoading ? "..." : accounts.length.toString()} icon="🏛️" color="pink" />
        </div>
      </div>
      
      {/* Enhanced decorative elements */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-[#FF7CA3]/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#FF7CA3]/5 rounded-full blur-2xl"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#FF7CA3]/3 rounded-full blur-3xl opacity-20"></div>
    </div>
  );
};

const StatBox: React.FC<{ label: string, value: string, icon: string, color: 'pink' | 'green' | 'white' }> = ({ label, value, icon, color }) => {
  const colorConfig = {
    pink: { bg: 'from-[#FF7CA3]/5', border: 'border-[#FF7CA3]/20', glow: 'bg-[#FF7CA3]/10' },
    green: { bg: 'from-lime-400/5', border: 'border-lime-400/20', glow: 'bg-lime-400/10' },
    white: { bg: 'from-white/5', border: 'border-white/20', glow: 'bg-white/10' }
  };
  
  const config = colorConfig[color];
  
  return (
    <div className={`glass-dark p-4 rounded-2xl border ${config.border} bg-gradient-to-br ${config.bg} to-transparent relative overflow-hidden group hover:scale-105 transition-all duration-300`}>
      <div className={`absolute top-0 right-0 w-8 h-8 ${config.glow} rounded-full blur-lg`}></div>
      <div className="relative z-10">
        <div className={`text-xl mb-2 ${color === 'pink' ? 'text-[#FF7CA3]' : color === 'green' ? 'text-lime-400' : 'text-white'} drop-shadow-[0_0_8px_rgba(255,124,163,0.5)]`}>{icon}</div>
        <div className="text-lg font-black text-white mb-1">{value}</div>
        <div className="text-[10px] text-white uppercase tracking-widest font-black opacity-80">{label}</div>
      </div>
    </div>
  );
};

export default BalanceSummary;
