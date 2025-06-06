import React from 'react';

interface PersonalDetails {
  name: string;
  email: string;
  address: string;
  memberId: string;
}

interface SuperannuationBalance {
  currentBalance: number;
  lastUpdated: string;
  growthRate: number;
}

export const PersonalDetailsCard: React.FC<{ details: PersonalDetails }> = ({ details }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <h3 className="text-xl font-semibold mb-4">Personal Details</h3>
      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-600">Name</p>
          <p className="font-medium">{details.name}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Email</p>
          <p className="font-medium">{details.email}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Address</p>
          <p className="font-medium">{details.address}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Member ID</p>
          <p className="font-medium">{details.memberId}</p>
        </div>
      </div>
    </div>
  );
};

export const SuperannuationBalanceCard: React.FC<{ balance: SuperannuationBalance }> = ({ balance }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4">Superannuation Balance</h3>
      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-600">Current Balance</p>
          <p className="text-2xl font-bold text-green-600">
            ${balance.currentBalance.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Growth Rate</p>
          <p className={`font-medium ${balance.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {balance.growthRate}%
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Last Updated</p>
          <p className="font-medium">{balance.lastUpdated}</p>
        </div>
      </div>
    </div>
  );
}; 