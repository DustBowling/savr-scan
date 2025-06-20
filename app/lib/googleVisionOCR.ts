// Google Cloud Vision OCR Service
// This provides better OCR accuracy than Tesseract for receipts

import { preprocessImage, PreprocessingResult } from './imagePreprocessing';

interface GoogleVisionResponse {
  responses: Array<{
    textAnnotations: Array<{
      description: string;
      boundingPoly: {
        vertices: Array<{ x: number; y: number; }>;
      };
    }>;
    fullTextAnnotation?: {
      text: string;
      pages: any[];
    };
    error?: {
      code: number;
      message: string;
      status: string;
    };
  }>;
}

interface OCRQualityMetrics {
  imageSize: number;
  processingTime: number;
  confidence: number;
  textBlockCount: number;
  averageWordConfidence: number;
}

interface OCRDebugInfo {
  preprocessingResult: PreprocessingResult;
  apiResponse: any;
  timing: {
    preprocessing: number;
    apiCall: number;
    total: number;
  };
  boundingBoxes: Array<{
    text: string;
    confidence: number;
    box: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
}

export interface OCRResult {
  text: string;
  confidence: number;
  quality: {
    imageSize: number;
    processingTime: number;
    confidence: number;
    textBlockCount: number;
    averageWordConfidence: number;
  };
  debug?: OCRDebugInfo;
}

interface TesseractWord {
  text: string;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

// Convert Blob to base64 for Google Vision API
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/jpeg;base64, prefix
      const base64 = result.split(',')[1];
      
      // Simplified logging
      console.log('📸 Base64 conversion completed:', {
        blobSize: blob.size,
        base64Length: base64.length,
        success: true
      });
      
      resolve(base64);
    };
    reader.onerror = (error) => {
      console.error('❌ Base64 conversion failed:', error);
      reject(error);
    };
    reader.readAsDataURL(blob);
  });
};

// Google Cloud Vision OCR
export async function processImageWithVision(
  imageBlob: Blob,
  debug = false
): Promise<OCRResult> {
  const startTime = performance.now();
  let debugInfo: OCRDebugInfo | undefined;
  
  try {
    // Preprocess image
    const preprocessStart = performance.now();
    const preprocessed = await preprocessImage(imageBlob, {
      maxWidth: 2000,
      maxHeight: 2000,
      autoRotate: true,
      enhanceContrast: true,
      removeNoise: true,
      adaptiveThreshold: true,
      cropWhitespace: true
    });
    const preprocessTime = performance.now() - preprocessStart;

    // Prepare API request
    const apiStart = performance.now();
    const response = await fetch('/api/google-vision-ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: preprocessed.imageData },
          features: [{
            type: 'DOCUMENT_TEXT_DETECTION', // Changed from TEXT_DETECTION
            maxResults: 1
          }],
          imageContext: {
            languageHints: ['en-t-i0-handwrit'] // Optimize for receipt text
          }
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Google Vision API error:', {
        status: response.status,
        error: errorText
      });
      
      // Check for specific error types
      if (response.status === 403) {
        throw new Error('API key invalid or Vision API not enabled');
      } else if (response.status === 429) {
        throw new Error('API quota exceeded');
      }
      throw new Error(`OCR API error: ${response.status}`);
    }

    const result = await response.json();
    const apiTime = performance.now() - apiStart;
    
    // Extract text and confidence
    const fullTextAnnotation = result.responses?.[0]?.fullTextAnnotation;
    const textAnnotations = result.responses?.[0]?.textAnnotations || [];
    
    if (!fullTextAnnotation && !textAnnotations.length) {
      throw new Error('No text detected in image');
    }

    // Calculate confidence metrics
    let totalConfidence = 0;
    let wordCount = 0;
    const boundingBoxes: OCRDebugInfo['boundingBoxes'] = [];

    // Process each text block
    textAnnotations.forEach((annotation: any, index: number) => {
      if (index === 0) return; // Skip first annotation (full text)
      
      const vertices = annotation.boundingPoly?.vertices || [];
      if (vertices.length === 4) {
        const [topLeft, topRight, bottomRight, bottomLeft] = vertices;
        
        boundingBoxes.push({
          text: annotation.description,
          confidence: annotation.confidence || 0,
          box: {
            x: topLeft.x,
            y: topLeft.y,
            width: topRight.x - topLeft.x,
            height: bottomLeft.y - topLeft.y
          }
        });
        
        totalConfidence += annotation.confidence || 0;
        wordCount++;
      }
    });

    const averageConfidence = wordCount > 0 ? totalConfidence / wordCount : 0;
    
    // Prepare debug info if requested
    if (debug) {
      debugInfo = {
        preprocessingResult: preprocessed,
        apiResponse: result.responses[0],
        timing: {
          preprocessing: preprocessTime,
          apiCall: apiTime,
          total: performance.now() - startTime
        },
        boundingBoxes
      };
      
      // Log detailed debug information
      console.log('📊 OCR Debug Info:', {
        imageQuality: preprocessed.quality,
        warnings: preprocessed.warnings,
        timing: debugInfo.timing,
        confidence: {
          average: averageConfidence,
          byWord: boundingBoxes.map(b => ({
            text: b.text,
            confidence: b.confidence
          }))
        }
      });
    }

    return {
      text: fullTextAnnotation?.text || textAnnotations[0]?.description || '',
      confidence: averageConfidence,
      quality: {
        imageSize: Math.round(imageBlob.size / 1024), // KB
        processingTime: performance.now() - startTime,
        confidence: averageConfidence,
        textBlockCount: wordCount,
        averageWordConfidence: averageConfidence
      },
      debug: debugInfo
    };

  } catch (error) {
    console.error('❌ OCR Processing Error:', error);
    throw error;
  }
}

// Fallback OCR using improved Tesseract (as backup)
export const processImageWithTesseract = async (imageBlob: Blob): Promise<OCRResult> => {
  try {
    console.log('🔍 Processing with Tesseract OCR...');
    
    // Load Tesseract.js from CDN if not already loaded
    if (typeof window !== 'undefined' && !(window as any).Tesseract) {
      console.log('📦 Loading Tesseract.js library...');
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@4.1.1/dist/tesseract.min.js';
        script.onload = () => {
          console.log('✅ Tesseract.js loaded successfully');
          resolve(undefined);
        };
        script.onerror = (error) => {
          console.error('❌ Failed to load Tesseract.js');
          reject(error);
        };
        document.head.appendChild(script);
      });
    }

    console.log('🤖 Creating Tesseract worker...');
    const worker = await (window as any).Tesseract.createWorker('eng');
    
    console.log('⚙️ Configuring Tesseract for receipt text...');
    // Configure for receipt text - more lenient settings
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,/-$()&%*@#:;',
      tessedit_pageseg_mode: '3', // Changed from 6 to 3 for more flexible segmentation
      tessedit_ocr_engine_mode: '3', // Changed to Legacy + LSTM mode
      textord_heavy_nr: '1', // More aggressive noise removal
      textord_min_linesize: '2.0', // More lenient with small text
      classify_min_scale: '0.5', // Better with varying text sizes
      preserve_interword_spaces: '1'
    });

    console.log('👁️ Running OCR recognition...');
    const { data: { text, confidence, words } } = await worker.recognize(imageBlob, {
      rectangle: null, // Process entire image
      rotateAuto: true, // Automatically detect and correct rotation
    });
    
    console.log('🧹 Cleaning up Tesseract worker...');
    await worker.terminate();
    
    // More lenient validation
    const cleanedText = text.trim();
    console.log(`📊 Tesseract results: ${cleanedText.length} characters, ${confidence}% confidence`);
    console.log(`📝 First 100 characters: "${cleanedText.substring(0, 100)}..."`);

    // Accept results even with lower confidence
    if (!cleanedText || cleanedText.length < 2) {
      console.warn('⚠️ Tesseract produced very short text output:', cleanedText);
      throw new Error('Tesseract produced insufficient text output');
    }

    return {
      text: cleanedText,
      confidence: confidence / 100, // Convert to 0-1 range
      quality: {
        imageSize: Math.round(imageBlob.size / 1024), // KB
        processingTime: 0, // Tesseract does not provide processing time
        confidence: confidence / 100,
        textBlockCount: 1,
        averageWordConfidence: confidence / 100
      },
      boundingBoxes: words?.map((word: TesseractWord) => ({
        text: word.text,
        x: word.bbox.x0,
        y: word.bbox.y0,
        width: word.bbox.x1 - word.bbox.x0,
        height: word.bbox.y1 - word.bbox.y0
      })) || []
    };

  } catch (error) {
    console.error('❌ Tesseract OCR error:', error);
    throw new Error(`Tesseract OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Check if Google Vision is available (simple check for API route)
const isGoogleVisionAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/google-vision-ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    });
    
    // Google Vision is available if we get a 200 response
    if (response.status === 200) {
      const data = await response.json();
      return data.available === true;
    }
    
    // 503 means not configured, 500+ means server error
    return false;
  } catch {
    return false;
  }
};

// Universal OCR processor that tries Google Vision first, then falls back to Tesseract
export const processImageWithOCR = async (imageBlob: Blob): Promise<OCRResult> => {
  console.log('🔍 Starting OCR processing...');
  console.log('📊 Image info:', {
    size: imageBlob.size,
    type: imageBlob.type,
    sizeKB: Math.round(imageBlob.size / 1024)
  });
  
  // Basic image validation - more lenient requirements
  if (imageBlob.size < 1000) { // Reduced from 10000 to 1000 bytes
    console.warn('⚠️ Very small image detected:', imageBlob.size, 'bytes');
    // Don't throw error, just warn and continue
  }
  
  if (imageBlob.size > 15000000) { // More than 15MB
    throw new Error('Image file is too large. Please try again with a smaller photo.');
  }
  
  if (!imageBlob.type.startsWith('image/')) {
    throw new Error('Invalid file type. Please provide a valid image.');
  }
  
  // Check if Google Vision is configured
  const googleVisionAvailable = await isGoogleVisionAvailable();
  console.log('📡 Google Vision available:', googleVisionAvailable);
  
  if (googleVisionAvailable) {
    try {
      // Try Google Cloud Vision first
      console.log('📡 Attempting Google Cloud Vision OCR...');
      const result = await processImageWithVision(imageBlob);
      
      // Validate OCR result
      if (!result.text || result.text.trim().length < 5) {
        throw new Error('No readable text found in the image. Please try again with a clearer photo.');
      }
      
      if (result.confidence < 0.3) {
        throw new Error('Text recognition confidence is too low. Please try again with better lighting and focus.');
      }
      
      console.log('✅ Google Vision OCR successful!');
      console.log('🔍 Google Vision result:', {
        textLength: result.text.length,
        confidence: result.confidence,
        boundingBoxes: result.boundingBoxes.length,
        textSample: result.text.substring(0, 100) + (result.text.length > 100 ? '...' : '')
      });
      return result;
    } catch (error) {
      console.warn('⚠️ Google Vision failed, falling back to Tesseract:', error);
      console.warn('🔍 Google Vision error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: typeof error,
        stack: error instanceof Error ? error.stack?.substring(0, 200) : 'No stack trace'
      });
      
      // If error indicates configuration issue, throw immediately
      if (error instanceof Error && 
          (error.message.includes('API key') || 
           error.message.includes('configuration') ||
           error.message.includes('credentials'))) {
        throw new Error('Google Vision API is not properly configured. Please check your settings.');
      }
    }
  } else {
    console.log('📡 Google Vision not configured, using Tesseract OCR directly');
  }
  
  try {
    // Use Tesseract (either as fallback or primary)
    console.log('🔄 Using Tesseract OCR...');
    const result = await processImageWithTesseract(imageBlob);
    
    // Validate Tesseract result
    if (!result.text || result.text.trim().length < 5) {
      throw new Error('No readable text found in the image. Please try again with a clearer photo.');
    }
    
    if (result.confidence < 0.3) {
      throw new Error('Text recognition confidence is too low. Please try again with better lighting and focus.');
    }
    
    console.log('✅ Tesseract OCR successful!');
    console.log('🔍 Tesseract result:', {
      textLength: result.text.length,
      confidence: result.confidence,
      textSample: result.text.substring(0, 100) + (result.text.length > 100 ? '...' : '')
    });
    return result;
  } catch (tesseractError) {
    console.error('❌ OCR processing failed:', tesseractError);
    console.error('🔍 Final error details:', {
      message: tesseractError instanceof Error ? tesseractError.message : 'Unknown error',
      type: typeof tesseractError,
      stack: tesseractError instanceof Error ? tesseractError.stack?.substring(0, 200) : 'No stack trace'
    });
    
    // Provide more specific error guidance
    const errorMessage = tesseractError instanceof Error ? tesseractError.message : 'Unknown error';
    
    if (errorMessage.includes('insufficient text') || errorMessage.includes('confidence')) {
      throw new Error('Could not read the text clearly. Please ensure the receipt is well-lit, flat, and the text is clearly visible.');
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      throw new Error('Network error during processing. Please check your internet connection and try again.');
    } else if (errorMessage.includes('load')) {
      throw new Error('Failed to initialize text recognition. Please refresh the page and try again.');
    } else {
      throw new Error('Failed to process the image. Please try again with a clearer photo in better lighting.');
    }
  }
};

// Calculate OCR confidence based on text characteristics
const calculateOCRConfidence = (text: string): number => {
  if (!text || text.length < 10) return 0.1;
  
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  let qualityScore = 0;
  let totalLines = lines.length;
  
  for (const line of lines) {
    const cleanLine = line.trim();
    
    // Good indicators
    if (cleanLine.match(/\d+\.\d{2}/)) qualityScore += 2; // Prices
    if (cleanLine.match(/^[A-Z\s]+$/)) qualityScore += 1; // Uppercase text
    if (cleanLine.match(/^(TOTAL|TAX|SUBTOTAL|SAFEWAY|PUBLIX|KROGER)/i)) qualityScore += 3; // Receipt keywords
    if (cleanLine.length > 5 && cleanLine.length < 50) qualityScore += 1; // Reasonable length
    
    // Bad indicators
    if (cleanLine.match(/[^\w\s\.\-\$\(\)]/)) qualityScore -= 1; // Strange characters
    if (cleanLine.length > 100) qualityScore -= 1; // Too long
    if (cleanLine.match(/\b[A-Z]{1,2}\s+[A-Z]{1,2}\s+[A-Z]{1,2}/)) qualityScore -= 2; // Fragmented
  }
  
  // Normalize to 0-1 range
  const confidence = Math.max(0, Math.min(1, qualityScore / (totalLines * 2)));
  return confidence;
}; 