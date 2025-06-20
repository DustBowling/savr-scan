'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';

type SavedReceipt = {
  id: string;
  storeName: string;
  items: { 
    name: string; 
    enhancedName?: string;
    category?: string;
    confidence?: number;
    price: number;
  }[];
  total: number;
  createdAt: any; // Firestore timestamp
  ocrText?: string;
};

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<SavedReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<SavedReceipt | null>(null);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const receiptsRef = collection(db, 'receipts');
      const q = query(receiptsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const fetchedReceipts: SavedReceipt[] = [];
      querySnapshot.forEach((doc) => {
        fetchedReceipts.push({
          id: doc.id,
          ...doc.data()
        } as SavedReceipt);
      });
      
      setReceipts(fetchedReceipts);
    } catch (err) {
      console.error('Error fetching receipts:', err);
      setError('Failed to load receipts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      // Handle Firestore timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown date';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin h-1 w-1 border-1 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your receipts...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition"
            >
              <svg className="h-1 w-1 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Receipts</h1>
              <p className="text-gray-600">
                {receipts.length > 0 
                  ? `${receipts.length} receipt${receipts.length === 1 ? '' : 's'} saved`
                  : 'No receipts found'
                }
              </p>
            </div>
          </div>
          <Link
            href="/upload"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          >
            Scan New Receipt
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg shadow flex items-center gap-2">
            <svg className="shrink-0" width="8" height="8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
            <button
              onClick={fetchReceipts}
              className="ml-auto px-3 py-1 bg-red-200 text-red-800 rounded font-semibold text-sm hover:bg-red-300 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Receipts Grid */}
        {receipts.length === 0 && !error ? (
          <div className="text-center py-16">
            <div className="mb-6">
              <svg className="mx-auto h-1 w-1 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No receipts yet</h3>
            <p className="text-gray-600 mb-6">Start by scanning your first receipt!</p>
            <Link
              href="/upload"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            >
              <svg className="mr-1 h-1 w-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Scan Your First Receipt
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {receipts.map((receipt) => (
              <div
                key={receipt.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden cursor-pointer"
                onClick={() => setSelectedReceipt(receipt)}
              >
                <div className="p-6">
                  {/* Store Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 truncate">
                      {receipt.storeName || 'Unknown Store'}
                    </h3>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600">
                        {formatCurrency(receipt.total)}
                      </div>
                    </div>
                  </div>

                  {/* Date */}
                  <p className="text-sm text-gray-500 mb-4">
                    {formatDate(receipt.createdAt)}
                  </p>

                  {/* Items Preview */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {receipt.items.length} item{receipt.items.length === 1 ? '' : 's'}:
                    </p>
                                         <div className="space-y-1">
                       {receipt.items.slice(0, 3).map((item, index) => (
                         <div key={index} className="flex justify-between text-sm">
                           <span className="text-gray-600 truncate mr-2">
                             {item.enhancedName || item.name}
                           </span>
                           <span className="text-gray-800 font-medium">
                             {formatCurrency(item.price)}
                           </span>
                         </div>
                       ))}
                      {receipt.items.length > 3 && (
                        <p className="text-xs text-gray-500 italic">
                          +{receipt.items.length - 3} more items
                        </p>
                      )}
                    </div>
                  </div>

                  {/* View Button */}
                  <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-sm">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Receipt Detail Modal */}
        {selectedReceipt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedReceipt.storeName || 'Unknown Store'}
                    </h2>
                    <p className="text-gray-600">
                      {formatDate(selectedReceipt.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="text-gray-400 hover:text-gray-600 transition"
                  >
                    <svg className="h-1 w-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Items List */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Items</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                                         <div className="space-y-2">
                       {selectedReceipt.items.map((item, index) => (
                         <div key={index} className="flex justify-between items-start py-2 border-b border-gray-200 last:border-b-0">
                           <div className="flex flex-col flex-1 mr-4">
                             {item.enhancedName ? (
                               <>
                                 <span className="text-gray-900 font-medium">{item.enhancedName}</span>
                                 <span className="text-xs text-gray-500">{item.name}</span>
                                 {item.category && (
                                   <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded w-fit mt-1">
                                     {item.category}
                                   </span>
                                 )}
                               </>
                             ) : (
                               <span className="text-gray-700">{item.name}</span>
                             )}
                           </div>
                           <span className="font-medium text-gray-900">
                             {formatCurrency(item.price)}
                           </span>
                         </div>
                       ))}
                    </div>
                    <div className="border-t-2 border-gray-300 mt-4 pt-3 flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total:</span>
                      <span className="text-xl font-bold text-green-600">
                        {formatCurrency(selectedReceipt.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* OCR Text (if available) */}
                {selectedReceipt.ocrText && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Original OCR Text</h3>
                    <div className="bg-gray-100 rounded-lg p-4 max-h-40 overflow-y-auto">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedReceipt.ocrText}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Modal Footer */}
                <div className="flex justify-end">
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
} 