
import React from 'react';
import { Transaction } from '../types';

interface TransactionHistoryProps {
  transactions: Transaction[];
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-2xl font-black uppercase tracking-tight">Ledger History</h2>
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">Encrypted Log active</span>
      </div>

      <div className="glass rounded-3xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 text-[10px] font-black text-indigo-300 uppercase tracking-widest border-b border-white/5">
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Counterparty</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4 text-right">Credit/Debit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter border ${
                      tx.status === 'completed' ? 'bg-lime-500/10 text-lime-400 border-lime-500/30' : 
                      tx.status === 'locked' ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30 animate-pulse' : 
                      'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {/* Fix: Use recipient_email from Transaction interface */}
                    <div className="text-xs font-bold text-white/90">{tx.recipient_email}</div>
                    <div className="text-[9px] text-gray-500 font-mono">ID: {tx.id.slice(0,8)}</div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-400">{tx.description}</td>
                  <td className="px-6 py-4 text-[10px] font-mono text-gray-500">
                    {/* Fix: Use created_at from Transaction interface */}
                    {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className={`px-6 py-4 text-right font-mono font-black text-sm ${tx.status === 'completed' ? 'text-white' : 'text-indigo-400'}`}>
                    ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {transactions.length === 0 && (
          <div className="p-20 text-center text-gray-500 uppercase text-xs font-black tracking-widest opacity-20">
            No Transaction Data Recovered
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
