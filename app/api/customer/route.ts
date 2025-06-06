import { NextResponse } from 'next/server';

// This would typically come from a database
let customerData = {
  name: "John Doe",
  email: "john.doe@example.com",
  address: "123 Main St, Sydney",
  memberId: "SUPER123456",
  superannuationBalance: {
    currentBalance: 150000,
    lastUpdated: "2024-03-20",
    growthRate: 5.2
  }
};

export async function GET() {
  return NextResponse.json(customerData);
}

export async function PUT(request: Request) {
  const body = await request.json();
  
  if (body.email) {
    customerData.email = body.email;
  }
  
  if (body.address) {
    customerData.address = body.address;
  }

  return NextResponse.json({
    message: "Customer information updated successfully",
    data: customerData
  });
} 