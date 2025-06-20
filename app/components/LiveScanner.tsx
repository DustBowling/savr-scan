'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface LiveScannerProps {
  onCapture: (imageBlob: Blob) => void;
  onClose: () => void;
  isProcessing?: boolean;
}

interface DetectedRect {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export default function LiveScanner({ onCapture, onClose, isProcessing = false }: LiveScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedRect, setDetectedRect] = useState<DetectedRect | null>(null);
  const [scanQuality, setScanQuality] = useState<'poor' | 'good' | 'excellent'>('poor');
  const [autoCapture, setAutoCapture] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Initialize camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera on mobile
            width: { ideal: 3840, min: 1280 }, // Increased from 1920 to 3840 for better quality
            height: { ideal: 2160, min: 720 }, // Increased from 1080 to 2160 for better quality
            aspectRatio: { ideal: 4/3 }, // Better for receipt capture
          }
        });
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsReady(true);
            startProcessing();
          };
        }
      } catch (err) {
        console.error('Camera access error:', err);
        setError('Unable to access camera. Please ensure camera permissions are granted.');
      }
    };

    initCamera();

    return () => {
      stopCamera();
    };
  }, []);

  // Stop camera and cleanup
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  // Document detection using edge detection
  const detectDocument = useCallback((imageData: ImageData): DetectedRect | null => {
    const { data, width, height } = imageData;
    
    // Convert to grayscale and find edges
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const idx = i / 4;
      gray[idx] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    
    // Simple edge detection using Sobel operator
    const edges = new Uint8Array(width * height);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        // Sobel X
        const gx = (
          -gray[(y-1)*width + (x-1)] + gray[(y-1)*width + (x+1)] +
          -2*gray[y*width + (x-1)] + 2*gray[y*width + (x+1)] +
          -gray[(y+1)*width + (x-1)] + gray[(y+1)*width + (x+1)]
        );
        
        // Sobel Y
        const gy = (
          -gray[(y-1)*width + (x-1)] - 2*gray[(y-1)*width + x] - gray[(y-1)*width + (x+1)] +
          gray[(y+1)*width + (x-1)] + 2*gray[(y+1)*width + x] + gray[(y+1)*width + (x+1)]
        );
        
        edges[idx] = Math.min(255, Math.sqrt(gx*gx + gy*gy));
      }
    }
    
    // Find rectangular regions (simplified approach)
    const threshold = 30; // Reduced threshold for better detection
    let minX = width, maxX = 0, minY = height, maxY = 0;
    let edgeCount = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (edges[y * width + x] > threshold) {
          edgeCount++;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    // Debug logging every 60 frames (about once per second at 60fps)
    if (Math.random() < 0.016) {
      console.log(`🔍 Detection debug: edges=${edgeCount}, threshold=${threshold}, dimensions=${width}x${height}`);
    }
    
    // Check if detected region looks like a document
    const detectedWidth = maxX - minX;
    const detectedHeight = maxY - minY;
    const aspectRatio = detectedWidth / detectedHeight;
    const area = detectedWidth * detectedHeight;
    const screenArea = width * height;
    
    // More lenient receipt-like criteria
    if (
      detectedWidth > 150 && detectedHeight > 200 && // Reduced minimum size
      aspectRatio > 0.4 && aspectRatio < 1.2 && // More flexible aspect ratio
      area > screenArea * 0.1 && area < screenArea * 0.9 && // More flexible area
      edgeCount > 50 // Reduced edge requirement
    ) {
      const confidence = Math.min(1.0, edgeCount / 300); // Adjusted confidence calculation
      
      console.log(`📱 Detection: ${detectedWidth}x${detectedHeight}, ratio: ${aspectRatio.toFixed(2)}, edges: ${edgeCount}, confidence: ${confidence.toFixed(2)}`);
      
      return {
        x: minX,
        y: minY,
        width: detectedWidth,
        height: detectedHeight,
        confidence
      };
    }
    
    return null;
  }, []);

  // Process video frame
  const processFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !overlayCanvasRef.current || !isReady) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const overlayCtx = overlayCanvas.getContext('2d');
    
    if (!ctx || !overlayCtx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    overlayCanvas.width = video.offsetWidth;
    overlayCanvas.height = video.offsetHeight;

    // Draw current frame
    ctx.drawImage(video, 0, 0);
    
    // Get image data for processing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Detect document
    const rect = detectDocument(imageData);
    setDetectedRect(rect);
    
    // Update scan quality (more lenient)
    if (rect) {
      if (rect.confidence > 0.6) {
        setScanQuality('excellent');
      } else if (rect.confidence > 0.3) {
        setScanQuality('good');
      } else {
        setScanQuality('poor');
      }
    } else {
      setScanQuality('poor');
    }
    
    // Draw overlay
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    if (rect) {
      // Scale rectangle to overlay canvas
      const scaleX = overlayCanvas.width / canvas.width;
      const scaleY = overlayCanvas.height / canvas.height;
      
      const scaledRect = {
        x: rect.x * scaleX,
        y: rect.y * scaleY,
        width: rect.width * scaleX,
        height: rect.height * scaleY
      };
      
      // Draw detection rectangle
      overlayCtx.strokeStyle = scanQuality === 'excellent' ? '#10B981' : 
                              scanQuality === 'good' ? '#F59E0B' : '#EF4444';
      overlayCtx.lineWidth = 3;
      overlayCtx.setLineDash([]);
      overlayCtx.strokeRect(scaledRect.x, scaledRect.y, scaledRect.width, scaledRect.height);
      
      // Draw corner indicators
      const cornerSize = 20;
      overlayCtx.lineWidth = 4;
      
      // Top-left
      overlayCtx.beginPath();
      overlayCtx.moveTo(scaledRect.x, scaledRect.y + cornerSize);
      overlayCtx.lineTo(scaledRect.x, scaledRect.y);
      overlayCtx.lineTo(scaledRect.x + cornerSize, scaledRect.y);
      overlayCtx.stroke();
      
      // Top-right
      overlayCtx.beginPath();
      overlayCtx.moveTo(scaledRect.x + scaledRect.width - cornerSize, scaledRect.y);
      overlayCtx.lineTo(scaledRect.x + scaledRect.width, scaledRect.y);
      overlayCtx.lineTo(scaledRect.x + scaledRect.width, scaledRect.y + cornerSize);
      overlayCtx.stroke();
      
      // Bottom-left
      overlayCtx.beginPath();
      overlayCtx.moveTo(scaledRect.x, scaledRect.y + scaledRect.height - cornerSize);
      overlayCtx.lineTo(scaledRect.x, scaledRect.y + scaledRect.height);
      overlayCtx.lineTo(scaledRect.x + cornerSize, scaledRect.y + scaledRect.height);
      overlayCtx.stroke();
      
      // Bottom-right
      overlayCtx.beginPath();
      overlayCtx.moveTo(scaledRect.x + scaledRect.width - cornerSize, scaledRect.y + scaledRect.height);
      overlayCtx.lineTo(scaledRect.x + scaledRect.width, scaledRect.y + scaledRect.height);
      overlayCtx.lineTo(scaledRect.x + scaledRect.width, scaledRect.y + scaledRect.height - cornerSize);
      overlayCtx.stroke();
    }
    
    // Draw scan area guide (always show)
    const centerX = overlayCanvas.width / 2;
    const centerY = overlayCanvas.height / 2;
    const guideWidth = overlayCanvas.width * 0.7;
    const guideHeight = overlayCanvas.height * 0.6;
    
    // If no detection, show more prominent guide
    if (!rect) {
      overlayCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      overlayCtx.lineWidth = 3;
      overlayCtx.setLineDash([15, 10]);
    } else {
      overlayCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      overlayCtx.lineWidth = 2;
      overlayCtx.setLineDash([10, 10]);
    }
    
    overlayCtx.strokeRect(
      centerX - guideWidth / 2,
      centerY - guideHeight / 2,
      guideWidth,
      guideHeight
    );
    
    // Add corner guides when no detection
    if (!rect) {
      const cornerSize = 30;
      overlayCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      overlayCtx.lineWidth = 4;
      overlayCtx.setLineDash([]);
      
      const guideX = centerX - guideWidth / 2;
      const guideY = centerY - guideHeight / 2;
      
      // Top-left
      overlayCtx.beginPath();
      overlayCtx.moveTo(guideX, guideY + cornerSize);
      overlayCtx.lineTo(guideX, guideY);
      overlayCtx.lineTo(guideX + cornerSize, guideY);
      overlayCtx.stroke();
      
      // Top-right
      overlayCtx.beginPath();
      overlayCtx.moveTo(guideX + guideWidth - cornerSize, guideY);
      overlayCtx.lineTo(guideX + guideWidth, guideY);
      overlayCtx.lineTo(guideX + guideWidth, guideY + cornerSize);
      overlayCtx.stroke();
      
      // Bottom-left
      overlayCtx.beginPath();
      overlayCtx.moveTo(guideX, guideY + guideHeight - cornerSize);
      overlayCtx.lineTo(guideX, guideY + guideHeight);
      overlayCtx.lineTo(guideX + cornerSize, guideY + guideHeight);
      overlayCtx.stroke();
      
      // Bottom-right
      overlayCtx.beginPath();
      overlayCtx.moveTo(guideX + guideWidth - cornerSize, guideY + guideHeight);
      overlayCtx.lineTo(guideX + guideWidth, guideY + guideHeight);
      overlayCtx.lineTo(guideX + guideWidth, guideY + guideHeight - cornerSize);
      overlayCtx.stroke();
    }
    
    // Auto-capture logic
    if (autoCapture && rect && scanQuality === 'excellent' && !countdown) {
      startCountdown();
    }
    
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [isReady, detectDocument, scanQuality, autoCapture, countdown]);

  const startProcessing = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    processFrame();
  }, [processFrame]);

  // Auto-capture countdown
  const startCountdown = useCallback(() => {
    let count = 3;
    setCountdown(count);
    
    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        setCountdown(null);
        clearInterval(countdownInterval);
        captureImage();
      }
    }, 1000);
  }, []);

  // Capture and crop image
  const captureImage = useCallback(async () => {
    if (!canvasRef.current) {
      console.error('❌ Canvas reference not available');
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('❌ Canvas context not available');
      return;
    }
    
    try {
      console.log('📸 Capturing image...', detectedRect ? 'with detection' : 'full frame');
      
      // Create output canvas with higher resolution
      const outputCanvas = document.createElement('canvas');
      const outputCtx = outputCanvas.getContext('2d');
      if (!outputCtx) {
        throw new Error('Failed to create output canvas context');
      }
      
      // Create preprocessing canvas for image enhancement
      const preprocessCanvas = document.createElement('canvas');
      const preprocessCtx = preprocessCanvas.getContext('2d');
      if (!preprocessCtx) {
        throw new Error('Failed to create preprocess canvas context');
      }
      
      if (detectedRect) {
        // Set preprocessing canvas size
        preprocessCanvas.width = detectedRect.width;
        preprocessCanvas.height = detectedRect.height;
        
        // Draw original image to preprocessing canvas
        preprocessCtx.drawImage(
          canvas,
          detectedRect.x, detectedRect.y, detectedRect.width, detectedRect.height,
          0, 0, detectedRect.width, detectedRect.height
        );
        
        // Apply preprocessing
        const imageData = preprocessCtx.getImageData(0, 0, preprocessCanvas.width, preprocessCanvas.height);
        const enhancedImageData = enhanceImageForOCR(imageData);
        preprocessCtx.putImageData(enhancedImageData, 0, 0);
        
        // Set output canvas size (2x for better resolution)
        outputCanvas.width = detectedRect.width * 2;
        outputCanvas.height = detectedRect.height * 2;
        
        // Enable image smoothing
        outputCtx.imageSmoothingEnabled = true;
        outputCtx.imageSmoothingQuality = 'high';
        
        // Draw enhanced image to output canvas
        outputCtx.drawImage(
          preprocessCanvas,
          0, 0, preprocessCanvas.width, preprocessCanvas.height,
          0, 0, outputCanvas.width, outputCanvas.height
        );
      } else {
        // Calculate dimensions for center crop
        const centerCropWidth = Math.min(canvas.width, canvas.height * 0.7);
        const centerCropHeight = Math.min(canvas.height, centerCropWidth * 1.2);
        const startX = (canvas.width - centerCropWidth) / 2;
        const startY = (canvas.height - centerCropHeight) / 2;
        
        // Set preprocessing canvas size
        preprocessCanvas.width = centerCropWidth;
        preprocessCanvas.height = centerCropHeight;
        
        // Draw original image to preprocessing canvas
        preprocessCtx.drawImage(
          canvas,
          startX, startY, centerCropWidth, centerCropHeight,
          0, 0, centerCropWidth, centerCropHeight
        );
        
        // Apply preprocessing
        const imageData = preprocessCtx.getImageData(0, 0, preprocessCanvas.width, preprocessCanvas.height);
        const enhancedImageData = enhanceImageForOCR(imageData);
        preprocessCtx.putImageData(enhancedImageData, 0, 0);
        
        // Set output canvas size (2x for better resolution)
        outputCanvas.width = centerCropWidth * 2;
        outputCanvas.height = centerCropHeight * 2;
        
        // Enable image smoothing
        outputCtx.imageSmoothingEnabled = true;
        outputCtx.imageSmoothingQuality = 'high';
        
        // Draw enhanced image to output canvas
        outputCtx.drawImage(
          preprocessCanvas,
          0, 0, preprocessCanvas.width, preprocessCanvas.height,
          0, 0, outputCanvas.width, outputCanvas.height
        );
      }
      
      // Convert to blob with maximum quality
      outputCanvas.toBlob((blob) => {
        if (blob) {
          console.log('✅ Image captured successfully', {
            size: blob.size,
            type: blob.type,
            sizeInKB: Math.round(blob.size / 1024)
          });
          onCapture(blob);
        } else {
          console.error('❌ Failed to create image blob');
          throw new Error('Failed to create image blob');
        }
      }, 'image/jpeg', 1.0);
    } catch (error) {
      console.error('❌ Error capturing image:', error);
      setError('Failed to capture image. Please try again.');
    }
  }, [detectedRect, onCapture]);

  // Image enhancement function for better OCR
  const enhanceImageForOCR = (imageData: ImageData): ImageData => {
    const { data, width, height } = imageData;
    const enhanced = new Uint8ClampedArray(data.length);
    
    // Calculate image statistics
    let min = 255, max = 0, sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      min = Math.min(min, gray);
      max = Math.max(max, gray);
      sum += gray;
    }
    const avg = sum / (width * height);
    
    // Enhance contrast and normalize brightness
    const contrast = 1.5; // Increased contrast
    const brightness = 128 - avg; // Auto-brightness adjustment
    
    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      
      // Apply contrast and brightness
      let enhanced_value = (((gray - 128) * contrast) + 128) + brightness;
      
      // Noise reduction (simple threshold)
      if (Math.abs(enhanced_value - avg) < 10) {
        enhanced_value = avg;
      }
      
      // Edge sharpening
      if (i > width * 4 && i < data.length - width * 4) {
        const above = data[i - width * 4];
        const below = data[i + width * 4];
        const left = data[i - 4];
        const right = data[i + 4];
        const edges = Math.abs(above - below) + Math.abs(left - right);
        if (edges > 50) { // Edge threshold
          enhanced_value = enhanced_value > avg ? 255 : 0; // Sharpen edges
        }
      }
      
      // Clamp values
      enhanced_value = Math.max(0, Math.min(255, enhanced_value));
      
      // Set RGB channels to the enhanced value
      enhanced[i] = enhanced_value;
      enhanced[i + 1] = enhanced_value;
      enhanced[i + 2] = enhanced_value;
      enhanced[i + 3] = data[i + 3]; // Preserve alpha
    }
    
    return new ImageData(enhanced, width, height);
  };

  // Manual capture - always allow
  const handleManualCapture = () => {
    console.log('🖱️ Manual capture triggered, quality:', scanQuality);
    captureImage();
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 m-4 max-w-sm">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Camera Access Required</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />
      
      {/* Quality Indicator Overlay */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between bg-black/50 rounded-lg p-2">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            scanQuality === 'excellent' ? 'bg-green-500' :
            scanQuality === 'good' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span className="text-white text-sm">
            {scanQuality === 'excellent' ? 'Perfect! Hold steady' :
             scanQuality === 'good' ? 'Almost there...' : 'Adjust position'}
          </span>
        </div>
        
        {/* Quality Tips */}
        <div className="text-white text-xs">
          {!detectedRect && 'Position receipt in frame'}
          {detectedRect && detectedRect.confidence < 0.3 && 'Move closer'}
          {detectedRect && detectedRect.confidence >= 0.3 && detectedRect.confidence < 0.6 && 'Reduce glare'}
          {detectedRect && detectedRect.confidence >= 0.6 && 'Hold steady'}
        </div>
      </div>

      {/* Guidance Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="h-full flex flex-col justify-center items-center text-white/70">
          <div className="w-4/5 aspect-[1/2] border-2 border-dashed border-white/50 rounded-lg flex items-center justify-center">
            {!detectedRect && (
              <div className="text-center p-4 bg-black/50 rounded">
                <p>Center the receipt within the frame</p>
                <p className="text-sm mt-1">Ensure good lighting and minimal glare</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Overlay canvas for UI */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 pointer-events-none"
      />
      
      {/* UI Controls */}
      <div className="absolute inset-0 flex flex-col">
        {/* Top Controls */}
        <div className="flex justify-between items-center p-4">
          <button
            onClick={onClose}
            className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="bg-black bg-opacity-50 text-white px-3 py-2 rounded-full text-sm">
            📄 Position receipt in frame
          </div>
          
          <button
            onClick={() => setAutoCapture(!autoCapture)}
            className={`p-2 rounded-full ${autoCapture ? 'bg-green-500' : 'bg-black bg-opacity-50'} text-white`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        
        {/* Center Info */}
        <div className="flex-1 flex items-center justify-center">
          {countdown && (
            <div className="bg-black bg-opacity-75 text-white text-6xl font-bold rounded-full w-24 h-24 flex items-center justify-center">
              {countdown}
            </div>
          )}
        </div>
        
        {/* Bottom Controls */}
        <div className="p-4">
          {/* Status Indicator */}
          <div className="text-center mb-4">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
              scanQuality === 'excellent' ? 'bg-green-500 text-white' :
              scanQuality === 'good' ? 'bg-yellow-500 text-white' :
              'bg-red-500 text-white'
            }`}>
              {scanQuality === 'excellent' && '✅ Perfect - Auto-capture ready!'}
              {scanQuality === 'good' && '📋 Good - Tap to capture or improve position'}
              {scanQuality === 'poor' && '📱 Position receipt or tap to capture anyway'}
            </div>
          </div>
          
          {/* Capture Controls */}
          <div className="flex justify-center items-center space-x-4">
            <div className="text-white text-sm">
              {autoCapture ? 'Auto-capture ON' : 'Manual capture'}
            </div>
            
            <button
              onClick={handleManualCapture}
              disabled={isProcessing}
              className={`w-20 h-20 rounded-full border-4 flex items-center justify-center ${
                scanQuality === 'excellent' ? 'border-green-500 bg-green-500' :
                scanQuality === 'good' ? 'border-yellow-500 bg-yellow-500' :
                'border-white bg-white'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95 cursor-pointer'} transition-all duration-200 shadow-lg`}
            >
              {isProcessing ? (
                <div className="animate-spin h-6 w-6 border-2 border-gray-600 border-t-transparent rounded-full"></div>
              ) : (
                <div className={`w-14 h-14 rounded-full ${
                  scanQuality === 'excellent' ? 'bg-white' :
                  scanQuality === 'good' ? 'bg-white' :
                  'bg-gray-600'
                }`}></div>
              )}
            </button>
            
            <div className="text-white text-sm">
              Tap to capture
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 