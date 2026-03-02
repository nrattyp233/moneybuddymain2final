
import React, { useState } from 'react';
import { BankAccount, Transaction } from '../types';

interface AccountListProps {
  accounts: BankAccount[];
  transactions?: Transaction[];
}

const AccountList: React.FC<AccountListProps> = ({ accounts, transactions = [] }) => {
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

  // Get transactions for selected account
  const accountTransactions = selectedAccount 
    ? transactions.filter(tx => tx.description?.includes(selectedAccount.mask) || 
                               tx.senderEmail?.includes(selectedAccount.mask))
    : [];

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
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((account, index) => {
              const colorSchemes = [
                { bg: 'from-[#FF7CA3]/3', border: 'hover:border-[#FF7CA3]/40', badge: 'bg-[#FF7CA3]/15 border-[#FF7CA3]/30 text-white', hover: 'group-hover:text-[#FF7CA3]', icon: 'group-hover:bg-[#FF7CA3]/25 group-hover:border-[#FF7CA3]/40 group-hover:text-[#FF7CA3]' },
                { bg: 'from-lime-400/3', border: 'hover:border-lime-400/40', badge: 'bg-lime-400/15 border-lime-400/30 text-white', hover: 'group-hover:text-lime-400', icon: 'group-hover:bg-lime-400/25 group-hover:border-lime-400/40 group-hover:text-lime-400' },
                { bg: 'from-white/3', border: 'hover:border-white/40', badge: 'bg-white/15 border-white/30 text-white', hover: 'group-hover:text-white', icon: 'group-hover:bg-white/25 group-hover:border-white/40 group-hover:text-white' }
              ];
              const scheme = colorSchemes[index % colorSchemes.length];
              const isSelected = selectedAccount?.id === account.id;
              
              return (
              <div 
                key={account.id} 
                className={`p-8 glass rounded-3xl hover:bg-white/10 transition-all group cursor-pointer border border-white/5 ${scheme.border} bg-gradient-to-br ${scheme.bg} via-transparent to-transparent relative overflow-hidden ${isSelected ? 'ring-2 ring-white/50 scale-105' : ''}`}
                onClick={() => setSelectedAccount(account)}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 z-20">
                    <span className="text-[10px] font-black text-white bg-white/20 px-2 py-1 rounded-lg">SELECTED</span>
                  </div>
                )}
                <div className={`absolute top-0 right-0 w-16 h-16 ${scheme.badge.split(' ')[0].replace('text-', 'bg-')} rounded-full blur-xl`}></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`font-black text-white ${scheme.hover} transition-colors uppercase tracking-tight text-lg drop-shadow-lg`}>{account.name}</h4>
                      <p className="text-gray-400 text-[11px] font-black font-mono mt-1">{account.mask}</p>
                      <p className="text-[9px] text-white/60 mt-1">{account.institution_name}</p>
                    </div>
                    <div className={`${scheme.badge} px-3 py-2 rounded-lg text-[9px] font-black uppercase shadow-lg`}>
                      {account.type}
                    </div>
                  </div>
                  <div className="mt-8 flex justify-between items-end">
                    <span className="text-3xl font-black font-mono tracking-tighter text-white drop-shadow-2xl">${account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <div className={`w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center transition-all border border-white/10 ${scheme.icon}`}>
                      <svg className="w-6 h-6 text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            );
            })}
          </div>

          {/* Account Details Panel */}
          {selectedAccount && (
            <div className="mt-6 p-6 glass rounded-3xl border border-[#FF7CA3]/20 bg-gradient-to-br from-[#FF7CA3]/5 via-transparent to-transparent">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white flex items-center space-x-2">
                  <span className="w-2 h-6 bg-[#FF7CA3] rounded-full"></span>
                  Account Details
                </h3>
                <button 
                  onClick={() => setSelectedAccount(null)}
                  className="text-[10px] text-gray-400 hover:text-white transition-colors"
                >
                  ✕ Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Account Name</p>
                    <p className="text-lg font-black text-white">{selectedAccount.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Institution</p>
                    <p className="text-lg font-black text-white">{selectedAccount.institution_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Account Type</p>
                    <p className="text-lg font-black text-white capitalize">{selectedAccount.type}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Account Number</p>
                    <p className="text-lg font-black text-white font-mono">****{selectedAccount.mask}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Current Balance</p>
                    <p className="text-2xl font-black text-white font-mono">${selectedAccount.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Status</p>
                    <p className="text-lg font-black text-lime-400">● Active</p>
                  </div>
                </div>
              </div>

              {/* Recent Transactions for this account */}
              {accountTransactions.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h4 className="text-sm font-black text-white uppercase tracking-widest mb-4">Recent Transactions</h4>
                  <div className="space-y-2">
                    {accountTransactions.slice(0, 5).map(tx => (
                      <div key={tx.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <div>
                          <p className="text-sm font-black text-white">{tx.description || 'Transaction'}</p>
                          <p className="text-[9px] text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-black font-mono ${tx.sender_id === tx.recipient_id ? 'text-white' : 'text-lime-400'}`}>
                            ${tx.amount.toLocaleString()}
                          </p>
                          <p className="text-[8px] text-gray-500 uppercase">{tx.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AccountList;
