import React from 'react';
import { User, Phone, Users, Settings, Mail, MapPin } from 'lucide-react';

interface PersonalDetails {
  name: string;
  email: string;
  address: string;
  memberId: string;
  phone?: string;
  city?: string;
  accountNumber?: string;
  type?: string;
  status?: string;
  memberSince?: string;
}

interface SuperannuationAccount {
  accountName: string;
  accountNumber: string;
  abn: string;
  usi: string;
  logoUrl?: string;
}

export const PersonalDetailsCard: React.FC<{ details: PersonalDetails }> = ({ details }) => {
  return (
    <div className="rounded-xl shadow-md mb-4 overflow-hidden bg-white border border-blue-100">
      {/* Avatar */}
      <div className="flex flex-col items-center pt-8 pb-2">
        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-2 border-2 border-blue-200">
          <User className="w-10 h-10 text-blue-400" />
        </div>
        <div className="text-xl font-bold text-gray-900">{details.name}</div>
        <div className="mt-2 px-3 py-1 rounded-full bg-blue-100 text-xs text-blue-700 font-semibold">Premium Member</div>
      </div>
      {/* Contact Info */}
      <div className="bg-blue-50 rounded-lg mx-6 mt-4 p-4 flex flex-col gap-2 text-gray-700">
        <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-blue-400" /> <span>{details.phone || '+1 (555) 123-4567'}</span></div>
        <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-blue-400" /> <span>{details.email}</span></div>
        <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-400" /> <span>{details.city || details.address}</span></div>
      </div>
      {/* Divider */}
      <div className="mx-6 my-4 border-t border-blue-100" />
      {/* Account Info */}
      <div className="mx-6 mb-6 grid grid-cols-2 gap-y-2 text-gray-700 text-sm">
        <div className="opacity-80">Account</div>
        <div className="font-semibold tracking-widest">{details.accountNumber || '****-****-****-4567'}</div>
        <div className="opacity-80">Type</div>
        <div className="font-semibold">{details.type || 'Premium Plus'}</div>
        <div className="opacity-80">Status</div>
        <div><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">{details.status || 'Active'}</span></div>
        <div className="opacity-80">Member Since</div>
        <div className="font-semibold">{details.memberSince || 'January 2020'}</div>
      </div>
    </div>
  );
};

export const SuperAccountCard: React.FC<{ account: SuperannuationAccount }> = ({ account }) => {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-md p-4 mb-4 relative overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <div className="font-semibold text-gray-800 text-sm">{account.accountName}</div>
        {account.logoUrl && <img src={account.logoUrl} alt="logo" className="h-6" />}
      </div>
      <div className="text-xs text-gray-500 mb-1">Account number</div>
      <div className="font-mono text-lg tracking-widest text-gray-900 mb-2">{account.accountNumber}</div>
      <div className="text-xs text-gray-500">ABN: <span className="text-gray-700">{account.abn}</span></div>
      <div className="text-xs text-gray-500">USI: <span className="text-gray-700">{account.usi}</span></div>
      <div className="mt-2">
        <a href="#" className="text-blue-700 text-xs underline">View more</a>
      </div>
      {/* Optional: background watermark or logo */}
      <div className="absolute right-2 top-2 opacity-10 pointer-events-none select-none">
        <svg width="60" height="60" viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="#164A9A" /></svg>
      </div>
    </div>
  );
}; 