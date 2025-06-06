import { useState, useEffect } from 'react';

interface PersonalDetailsProps {
  isVisible: boolean;
  newAddress?: string;
}

interface PersonalInfo {
  name: string;
  memberNumber: string;
  email: string;
  address: string;
  phone: string;
  dateOfBirth: string;
}

export const PersonalDetails = ({ isVisible, newAddress }: PersonalDetailsProps) => {
  const [loading, setLoading] = useState(false);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo | null>(null);

  useEffect(() => {
    if (isVisible) {
      setLoading(true);
      // Simulate fetching personal details from an API
      setTimeout(() => {
        setPersonalInfo({
          name: "John Smith",
          memberNumber: "CFS12345678",
          email: "john.smith@email.com",
          address: newAddress || "123 Main Street, Sydney NSW 2000",
          phone: "0400 123 456",
          dateOfBirth: "15/06/1980"
        });
        setLoading(false);
      }, 1000);
    }
  }, [isVisible, newAddress]);

  if (!isVisible) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: "#164A9A" }}>Personal Details</h3>
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
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "#164A9A" }}></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Full Name</p>
              <p className="font-medium" style={{ color: "#164A9A" }}>{personalInfo?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Member Number</p>
              <p className="font-medium" style={{ color: "#164A9A" }}>{personalInfo?.memberNumber}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500">Email Address</p>
            <p className="font-medium" style={{ color: "#164A9A" }}>{personalInfo?.email}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Residential Address</p>
            <p className="font-medium" style={{ color: "#164A9A" }}>{personalInfo?.address}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Phone Number</p>
              <p className="font-medium" style={{ color: "#164A9A" }}>{personalInfo?.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date of Birth</p>
              <p className="font-medium" style={{ color: "#164A9A" }}>{personalInfo?.dateOfBirth}</p>
            </div>
          </div>

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
              <span>Your details are kept secure and private</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 