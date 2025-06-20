import { useEffect, useRef } from 'react';
import type { OCRResult } from '../lib/googleVisionOCR';

interface OCRDebugOverlayProps {
  ocrResult: OCRResult;
  imageUrl: string;
  onClose: () => void;
}

export default function OCRDebugOverlay({ ocrResult, imageUrl, onClose }: OCRDebugOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current || !ocrResult.debug) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Load and draw the original image
    const image = new Image();
    image.src = imageUrl;
    image.onload = () => {
      // Set canvas size to match image
      canvas.width = image.width;
      canvas.height = image.height;
      
      // Draw image
      ctx.drawImage(image, 0, 0);
      
      // Draw bounding boxes
      if (ocrResult.debug?.boundingBoxes) {
        ocrResult.debug.boundingBoxes.forEach(box => {
          // Color based on confidence
          const confidence = box.confidence;
          ctx.strokeStyle = confidence > 0.8 ? '#00ff00' : 
                           confidence > 0.6 ? '#ffff00' : '#ff0000';
          ctx.lineWidth = 2;
          
          // Draw box
          ctx.strokeRect(
            box.box.x,
            box.box.y,
            box.box.width,
            box.box.height
          );
          
          // Draw confidence score
          ctx.fillStyle = 'white';
          ctx.font = '12px Arial';
          ctx.fillText(
            `${Math.round(confidence * 100)}%`,
            box.box.x,
            box.box.y - 5
          );
        });
      }
    };
  }, [ocrResult, imageUrl]);
  
  // Early return if no debug info
  if (!ocrResult.debug) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
        <div className="text-white">No debug information available</div>
      </div>
    );
  }
  
  const { preprocessingResult, timing } = ocrResult.debug;
  
  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center p-4">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300"
      >
        Close
      </button>
      
      {/* Debug info */}
      <div className="bg-white/10 rounded-lg p-4 mb-4 text-white">
        <h3 className="font-bold mb-2">OCR Debug Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p>Image Quality:</p>
            <ul className="list-disc list-inside">
              <li>Brightness: {Math.round((preprocessingResult.quality.brightness || 0) * 100)}%</li>
              <li>Contrast: {Math.round((preprocessingResult.quality.contrast || 0) * 100)}%</li>
              <li>Sharpness: {Math.round((preprocessingResult.quality.sharpness || 0) * 100)}%</li>
            </ul>
          </div>
          <div>
            <p>Processing Time:</p>
            <ul className="list-disc list-inside">
              <li>Preprocessing: {Math.round(timing.preprocessing || 0)}ms</li>
              <li>API Call: {Math.round(timing.apiCall || 0)}ms</li>
              <li>Total: {Math.round(timing.total || 0)}ms</li>
            </ul>
          </div>
        </div>
        
        {/* Warnings */}
        {preprocessingResult.warnings && preprocessingResult.warnings.length > 0 && (
          <div className="mt-4">
            <p className="font-bold text-yellow-400">Warnings:</p>
            <ul className="list-disc list-inside text-yellow-200">
              {preprocessingResult.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Canvas overlay */}
      <div className="relative max-w-full max-h-[70vh] overflow-auto">
        <canvas
          ref={canvasRef}
          className="border border-white/20 rounded"
        />
      </div>
    </div>
  );
} 