import { createCanvas, loadImage, ImageData } from 'canvas';

export interface PreprocessingResult {
  imageData: string;  // base64
  width: number;
  height: number;
  quality: {
    brightness: number;
    contrast: number;
    sharpness: number;
    blurriness: number;
  };
  warnings: string[];
}

interface PreprocessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  autoRotate?: boolean;
  enhanceContrast?: boolean;
  removeNoise?: boolean;
  adaptiveThreshold?: boolean;
  cropWhitespace?: boolean;
}

export async function preprocessImage(
  imageBlob: Blob,
  options: PreprocessingOptions = {}
): Promise<PreprocessingResult> {
  const warnings: string[] = [];
  
  // Convert blob to ImageData
  const arrayBuffer = await imageBlob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const image = await loadImage(buffer);
  
  // Create canvas with original dimensions
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  
  // Draw original image
  ctx.drawImage(image, 0, 0);
  
  // Get image data for processing
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Calculate initial quality metrics
  const initialQuality = analyzeImageQuality(imageData);
  
  // Auto-rotate if needed
  if (options.autoRotate) {
    const rotation = detectRotation(imageData);
    if (rotation !== 0) {
      imageData = rotateImage(imageData, rotation);
      console.log(`🔄 Auto-rotated image by ${rotation} degrees`);
    }
  }
  
  // Convert to grayscale and enhance contrast
  imageData = convertToGrayscale(imageData);
  
  if (options.enhanceContrast) {
    imageData = enhanceContrast(imageData);
  }
  
  // Apply adaptive thresholding for faded text
  if (options.adaptiveThreshold) {
    imageData = adaptiveThreshold(imageData);
  }
  
  // Remove noise if requested
  if (options.removeNoise) {
    imageData = removeNoise(imageData);
  }
  
  // Resize if necessary
  const { maxWidth = 2000, maxHeight = 2000 } = options;
  if (image.width > maxWidth || image.height > maxHeight) {
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    const newWidth = Math.floor(image.width * scale);
    const newHeight = Math.floor(image.height * scale);
    
    imageData = resizeImage(imageData, newWidth, newHeight);
    warnings.push(`Image resized to ${newWidth}x${newHeight} to optimize OCR`);
  }
  
  // Crop whitespace if requested
  if (options.cropWhitespace) {
    imageData = cropWhitespace(imageData);
  }
  
  // Calculate final quality metrics
  const quality = analyzeImageQuality(imageData);
  
  // Add quality-based warnings
  if (quality.brightness < 0.3) warnings.push('Image may be too dark');
  if (quality.brightness > 0.9) warnings.push('Image may be too bright');
  if (quality.contrast < 0.3) warnings.push('Image has low contrast');
  if (quality.blurriness > 0.7) warnings.push('Image may be blurry');
  
  // Convert back to base64
  ctx.putImageData(imageData, 0, 0);
  const base64Data = canvas.toDataURL('image/png').split(',')[1];
  
  return {
    imageData: base64Data,
    width: imageData.width,
    height: imageData.height,
    quality,
    warnings
  };
}

function analyzeImageQuality(imageData: ImageData) {
  const { data, width, height } = imageData;
  let totalBrightness = 0;
  let minBrightness = 255;
  let maxBrightness = 0;
  let blurScore = 0;
  
  // Calculate brightness and contrast metrics
  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    totalBrightness += brightness;
    minBrightness = Math.min(minBrightness, brightness);
    maxBrightness = Math.max(maxBrightness, brightness);
  }
  
  const avgBrightness = totalBrightness / (width * height);
  const contrast = (maxBrightness - minBrightness) / 255;
  
  // Calculate blurriness using Laplacian variance
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const current = data[idx];
      const neighbors = [
        data[((y - 1) * width + x) * 4],
        data[((y + 1) * width + x) * 4],
        data[(y * width + x - 1) * 4],
        data[(y * width + x + 1) * 4]
      ];
      const variance = Math.max(...neighbors.map(n => Math.abs(current - n)));
      blurScore += variance;
    }
  }
  
  const normalizedBlur = 1 - (blurScore / (width * height) / 255);
  
  return {
    brightness: avgBrightness / 255,
    contrast,
    sharpness: 1 - normalizedBlur,
    blurriness: normalizedBlur
  };
}

function convertToGrayscale(imageData: ImageData): ImageData {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
  return imageData;
}

function enhanceContrast(imageData: ImageData): ImageData {
  const { data } = imageData;
  let min = 255, max = 0;
  
  // Find min and max values
  for (let i = 0; i < data.length; i += 4) {
    min = Math.min(min, data[i]);
    max = Math.max(max, data[i]);
  }
  
  // Apply contrast stretching
  const range = max - min;
  for (let i = 0; i < data.length; i += 4) {
    const normalized = ((data[i] - min) / range) * 255;
    data[i] = data[i + 1] = data[i + 2] = normalized;
  }
  
  return imageData;
}

function adaptiveThreshold(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const blockSize = 11; // Must be odd
  const C = 2; // Constant to subtract from mean
  
  // Create output array
  const output = new Uint8ClampedArray(data.length);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // Calculate local mean
      let sum = 0, count = 0;
      for (let dy = -blockSize >> 1; dy <= blockSize >> 1; dy++) {
        for (let dx = -blockSize >> 1; dx <= blockSize >> 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            sum += data[(ny * width + nx) * 4];
            count++;
          }
        }
      }
      
      const mean = sum / count;
      const value = data[idx] > mean - C ? 255 : 0;
      output[idx] = output[idx + 1] = output[idx + 2] = value;
      output[idx + 3] = data[idx + 3]; // Preserve alpha
    }
  }
  
  return new ImageData(output, width, height);
}

function removeNoise(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const output = new Uint8ClampedArray(data.length);
  
  // Median filter
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const neighbors = [];
      
      // Gather neighbor values
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nidx = ((y + dy) * width + (x + dx)) * 4;
          neighbors.push(data[nidx]);
        }
      }
      
      // Sort and take median
      neighbors.sort((a, b) => a - b);
      const median = neighbors[4]; // Middle value of 9 neighbors
      
      output[idx] = output[idx + 1] = output[idx + 2] = median;
      output[idx + 3] = data[idx + 3]; // Preserve alpha
    }
  }
  
  return new ImageData(output, width, height);
}

function resizeImage(imageData: ImageData, newWidth: number, newHeight: number): ImageData {
  const canvas = createCanvas(newWidth, newHeight);
  const ctx = canvas.getContext('2d');
  
  // Create temporary canvas with original image
  const tempCanvas = createCanvas(imageData.width, imageData.height);
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.putImageData(imageData, 0, 0);
  
  // Draw resized image
  ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);
  
  return ctx.getImageData(0, 0, newWidth, newHeight);
}

function cropWhitespace(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  let minX = width, maxX = 0, minY = height, maxY = 0;
  
  // Find content boundaries
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx] < 250) { // Not white
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  // Add padding
  minX = Math.max(0, minX - 10);
  minY = Math.max(0, minY - 10);
  maxX = Math.min(width - 1, maxX + 10);
  maxY = Math.min(height - 1, maxY + 10);
  
  // Create cropped image
  const newWidth = maxX - minX + 1;
  const newHeight = maxY - minY + 1;
  const canvas = createCanvas(newWidth, newHeight);
  const ctx = canvas.getContext('2d');
  
  // Copy cropped region
  const croppedData = ctx.createImageData(newWidth, newHeight);
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcIdx = ((minY + y) * width + (minX + x)) * 4;
      const dstIdx = (y * newWidth + x) * 4;
      croppedData.data[dstIdx] = data[srcIdx];
      croppedData.data[dstIdx + 1] = data[srcIdx + 1];
      croppedData.data[dstIdx + 2] = data[srcIdx + 2];
      croppedData.data[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  
  return croppedData;
}

function detectRotation(imageData: ImageData): number {
  // Simple rotation detection using text line analysis
  // Returns rotation angle in degrees (0, 90, 180, or 270)
  // This is a placeholder - implement more sophisticated detection if needed
  return 0;
}

function rotateImage(imageData: ImageData, degrees: number): ImageData {
  const canvas = createCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  
  // Draw original image
  ctx.putImageData(imageData, 0, 0);
  
  // Create new canvas for rotated image
  const rotatedCanvas = createCanvas(
    degrees % 180 === 0 ? imageData.width : imageData.height,
    degrees % 180 === 0 ? imageData.height : imageData.width
  );
  const rotatedCtx = rotatedCanvas.getContext('2d');
  
  // Rotate and draw
  rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
  rotatedCtx.rotate((degrees * Math.PI) / 180);
  rotatedCtx.drawImage(
    canvas,
    -imageData.width / 2,
    -imageData.height / 2
  );
  
  return rotatedCtx.getImageData(0, 0, rotatedCanvas.width, rotatedCanvas.height);
} 