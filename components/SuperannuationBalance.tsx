import { useState, useEffect } from 'react';

interface SuperannuationBalanceProps {
  isVisible: boolean;
}

export const SuperannuationBalance = ({ isVisible }: SuperannuationBalanceProps) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setLoading(true);
      // Simulate fetching balance from an API
      setTimeout(() => {
        setBalance(125000.75);
        setLoading(false);
      }, 1000);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold" style={{ color: "#164A9A" }}>Superannuation Balance</h3>
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
          <svg
            className="w-5 h-5"
            style={{ color: "#164A9A" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "#164A9A" }}></div>
        </div>
      ) : (
        <div className="mt-2">
          <div className="text-3xl font-bold" style={{ color: "#164A9A" }}>
            ${balance?.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-sm text-gray-500 mt-1">As of {new Date().toLocaleDateString('en-AU')}</div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center text-sm" style={{ color: "#164A9A" }}>
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Your balance is updated daily</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 