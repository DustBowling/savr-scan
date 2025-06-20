import { PreprocessingResult } from './imagePreprocessing';

export interface ReceiptAnalysis {
  isReceipt: boolean;
  confidence: number;
  issues: string[];
  recommendations: string[];
  dimensions: {
    width: number;
    height: number;
    aspectRatio: number;
  };
  regions: {
    header?: { y: number };
    items?: { start: number; end: number };
    total?: { y: number };
  };
}

export async function analyzeReceiptImage(imageData: PreprocessingResult): Promise<ReceiptAnalysis> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check dimensions and aspect ratio
  const aspectRatio = imageData.width / imageData.height;
  if (aspectRatio > 1) {
    issues.push('Receipt appears to be horizontal');
    recommendations.push('Rotate the receipt to vertical orientation');
  }
  
  // Check if dimensions are appropriate for receipts
  if (imageData.width < 500) {
    issues.push('Image resolution may be too low');
    recommendations.push('Move closer to the receipt or use better lighting');
  }
  
  // Analyze image quality
  const { quality } = imageData;
  if (quality.brightness < 0.3) {
    issues.push('Receipt is too dark');
    recommendations.push('Increase lighting or use flash');
  }
  if (quality.brightness > 0.9) {
    issues.push('Receipt is too bright or has glare');
    recommendations.push('Reduce direct light or try different angle');
  }
  if (quality.blurriness > 0.5) {
    issues.push('Image is blurry');
    recommendations.push('Hold camera steady and ensure receipt is in focus');
  }
  
  // Calculate confidence based on issues
  const confidence = Math.max(0, 1 - (issues.length * 0.2));
  
  // Attempt to identify receipt regions (placeholder logic)
  const regions = detectReceiptRegions(imageData);
  
  return {
    isReceipt: confidence > 0.3,
    confidence,
    issues,
    recommendations,
    dimensions: {
      width: imageData.width,
      height: imageData.height,
      aspectRatio
    },
    regions
  };
}

function detectReceiptRegions(imageData: PreprocessingResult) {
  // This is a placeholder for more sophisticated region detection
  // In a full implementation, this would:
  // 1. Detect the store name/header region
  // 2. Identify the itemized list section
  // 3. Locate the total amount area
  // 4. Find any additional sections (tax, subtotal, etc.)
  
  return {
    header: { y: Math.floor(imageData.height * 0.1) },
    items: {
      start: Math.floor(imageData.height * 0.2),
      end: Math.floor(imageData.height * 0.8)
    },
    total: { y: Math.floor(imageData.height * 0.9) }
  };
}

export async function optimizeForReceipt(
  imageData: PreprocessingResult,
  analysis: ReceiptAnalysis
): Promise<PreprocessingResult> {
  // Apply receipt-specific optimizations based on analysis
  
  // If we detected specific regions, we could:
  // 1. Increase contrast in the items region
  // 2. Enhance text clarity in the total area
  // 3. Adjust brightness differently for different sections
  // 4. Remove background patterns or logos
  // 5. Straighten text lines
  
  // For now, return the original data
  // This is where we'd implement the actual optimizations
  return imageData;
}

export function generateReceiptGuidance(analysis: ReceiptAnalysis): string[] {
  const guidance: string[] = [];
  
  if (!analysis.isReceipt) {
    guidance.push('⚠️ Image may not be a receipt. Please ensure you are scanning a receipt.');
  }
  
  // Add all recommendations
  analysis.recommendations.forEach(rec => {
    guidance.push(`💡 ${rec}`);
  });
  
  // Add confidence-based guidance
  if (analysis.confidence < 0.5) {
    guidance.push('📸 Try taking another photo with better conditions');
  } else if (analysis.confidence < 0.8) {
    guidance.push('⚡ Good capture, but could be improved');
  } else {
    guidance.push('✨ Excellent capture quality');
  }
  
  return guidance;
} 