import React from 'react';

interface SuperannuationCardProps {
  balance: number;
  returns: number;
  accountNumber: string;
}

export const SuperannuationCard: React.FC<SuperannuationCardProps> = ({ balance, returns, accountNumber }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 w-full max-w-xs mx-auto">
      <div className="text-center mb-2">
        <div className="text-gray-500 text-sm">Superannuation</div>
        <div className="text-xs text-gray-400">Account number: {accountNumber}</div>
      </div>
      <div className="border-t border-b py-4 mb-2">
        <div className="text-gray-500 text-sm mb-1">Balance</div>
        <div className="text-3xl font-bold text-blue-900 mb-1">${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        <div className="text-green-700 text-xs font-semibold">▲ ${returns.toLocaleString(undefined, { minimumFractionDigits: 2 })} returns since joining</div>
      </div>
      <div className="mt-2">
        {/* Simple static chart representation */}
        <svg width="100%" height="60" viewBox="0 0 200 60">
          <polyline
            fill="none"
            stroke="#164A9A"
            strokeWidth="3"
            points="0,50 30,40 60,35 90,30 120,20 150,10 180,5 200,0"
          />
          <polyline
            fill="none"
            stroke="#8884d8"
            strokeDasharray="4"
            strokeWidth="2"
            points="0,55 30,50 60,48 90,45 120,40 150,35 180,30 200,25"
          />
        </svg>
        <div className="text-xs text-gray-400 text-right">Mar 2025</div>
      </div>
    </div>
  );
}; 