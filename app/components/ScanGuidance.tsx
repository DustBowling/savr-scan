import { useEffect, useState } from 'react';
import type { ReceiptAnalysis } from '../lib/receiptPreprocessing';

interface ScanGuidanceProps {
  analysis?: ReceiptAnalysis;
  isProcessing: boolean;
}

export default function ScanGuidance({ analysis, isProcessing }: ScanGuidanceProps) {
  const [showTip, setShowTip] = useState(0);
  
  // Rotate through tips every 3 seconds
  useEffect(() => {
    if (!analysis?.recommendations.length) return;
    
    const interval = setInterval(() => {
      setShowTip(current => (current + 1) % analysis.recommendations.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [analysis?.recommendations]);
  
  if (isProcessing) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 text-white p-4">
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          <span>Processing receipt...</span>
        </div>
      </div>
    );
  }
  
  if (!analysis) return null;
  
  const { confidence, issues, recommendations } = analysis;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
      {/* Confidence Indicator */}
      <div className="flex items-center justify-center mb-4">
        <div className="w-full max-w-xs bg-white/20 rounded-full h-2">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              confidence > 0.8 ? 'bg-green-500' :
              confidence > 0.5 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
      </div>
      
      {/* Current Tip */}
      {recommendations.length > 0 && (
        <div className="text-white text-center animate-fade-in">
          {recommendations[showTip]}
        </div>
      )}
      
      {/* Issues */}
      {issues.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-wrap justify-center gap-2">
            {issues.map((issue: string, i: number) => (
              <span
                key={i}
                className="bg-red-500/50 text-white text-xs px-2 py-1 rounded-full"
              >
                {issue}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Perfect Scan Indicator */}
      {confidence > 0.8 && (
        <div className="text-center text-green-400 mt-2 animate-pulse">
          Perfect! Hold steady...
        </div>
      )}
    </div>
  );
}

// Add to tailwind.config.js:
// animation: {
//   'fade-in': 'fadeIn 0.5s ease-in-out',
// },
// keyframes: {
//   fadeIn: {
//     '0%': { opacity: '0' },
//     '100%': { opacity: '1' },
//   },
// }, 