
import React from 'react';
import { BankAccount } from '../types';

interface AccountListProps {
  accounts: BankAccount[];
}

const AccountList: React.FC<AccountListProps> = ({ accounts }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold uppercase tracking-tight px-2">Operational Accounts</h3>
      {accounts.length === 0 ? (
        <div className="p-16 text-center glass rounded-[2.5rem] border border-dashed border-white/10 group cursor-pointer hover:bg-white/5 transition-all">
          <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏦</div>
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest">No Bank Nodes Detected</p>
          <p className="text-[10px] text-indigo-400/50 mt-2 uppercase tracking-tighter">Synchronize via Plaid Link to initiate capitalization</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map(account => (
            <div key={account.id} className="p-6 glass rounded-3xl hover:bg-white/10 transition-all group cursor-pointer border border-white/5 hover:border-lime-400/30">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-black text-white group-hover:text-lime-300 transition-colors uppercase tracking-tight">{account.name}</h4>
                  <p className="text-gray-500 text-[10px] font-black font-mono mt-0.5">{account.mask}</p>
                </div>
                <div className="bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded text-[8px] font-black uppercase text-indigo-300">
                  {account.type}
                </div>
              </div>
              <div className="mt-6 flex justify-between items-end">
                <span className="text-2xl font-black font-mono tracking-tighter">${account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-lime-400/20 transition-all">
                  <svg className="w-5 h-5 text-gray-500 group-hover:text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AccountList;
