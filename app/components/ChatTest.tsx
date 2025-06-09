'use client';

import { useState } from 'react';

interface ChatTestProps {
  onResponseReceived: (responseText: string) => void;
}

export default function ChatTest({ onResponseReceived }: ChatTestProps) {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      console.log('Sending request to /api/chat with message:', message);
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      console.log('Response status:', res.status);
      console.log('Response headers:', Object.fromEntries(res.headers.entries()));

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Received non-JSON response:', text);
        throw new Error(`Expected JSON response but got ${contentType}`);
      }

      const data = await res.json();
      console.log('Response data:', data);
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const aiResponse = data.response;
      setResponse(aiResponse);
      
      console.log('Passing AI response to onResponseReceived:', aiResponse);
      if (aiResponse) {
        onResponseReceived(aiResponse);
      }

    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Chat Test</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-2">
            Message
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 border rounded-md"
            rows={4}
            placeholder="Type your message here..."
          />
        </div>

        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300"
        >
          {loading ? 'Sending...' : 'Send Message'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {response && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Response:</h3>
          <div className="p-4 bg-gray-100 rounded-md">
            {response}
          </div>
        </div>
      )}
    </div>
  );
} 