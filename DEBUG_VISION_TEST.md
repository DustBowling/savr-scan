# Google Cloud Vision OCR Debug Guide

## 🔍 **Step-by-Step Debugging Process**

### **Step 1: Test API Key Configuration**

Open browser console (F12) and run:

```javascript
// Test 1: Check if API is configured
fetch('/api/google-vision-ocr', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ test: true })
}).then(res => res.json()).then(data => console.log('✅ API Test Result:', data)).catch(err => console.error('❌ API Test Failed:', err));
```

**Expected Success Output:**
```
✅ API Test Result: { available: true, message: "Google Vision API is configured" }
```

---

### **Step 2: Test Base64 Image Encoding**

```javascript
// Test 2: Create a simple test image and encode it
const canvas = document.createElement('canvas');
canvas.width = 300;
canvas.height = 200;
const ctx = canvas.getContext('2d');

// Draw test text
ctx.fillStyle = 'white';
ctx.fillRect(0, 0, 300, 200);
ctx.fillStyle = 'black';
ctx.font = '20px Arial';
ctx.fillText('TEST RECEIPT', 50, 50);
ctx.fillText('ITEM 1    $5.99', 50, 100);
ctx.fillText('TOTAL     $5.99', 50, 150);

// Convert to blob and test
canvas.toBlob(async (blob) => {
  console.log('🧪 Test image created:', {
    size: blob.size,
    type: blob.type
  });
  
  // Try OCR on test image
  try {
    const response = await fetch('/api/google-vision-ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: {
            content: await new Promise(resolve => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result.split(',')[1]);
              reader.readAsDataURL(blob);
            })
          },
          features: [
            { type: 'TEXT_DETECTION', maxResults: 10 },
            { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
          ]
        }]
      })
    });
    
    const result = await response.json();
    console.log('🧪 Test OCR Result:', result);
    
  } catch (error) {
    console.error('🧪 Test OCR Failed:', error);
  }
}, 'image/jpeg', 0.9);
```

---

### **Step 3: Test Real Receipt Scanning**

1. **Take a receipt photo** using the live scanner
2. **Watch browser console** for these debug messages:

#### **Image Capture Debug:**
```
📸 Capture details: {originalSize: "1920x1080", outputSize: "800x600", ...}
✅ Image captured successfully {size: 156789, type: "image/jpeg", sizeInKB: 153}
```

#### **Base64 Conversion Debug:**
```
📸 Base64 Conversion: {
  originalBlobSize: 156789,
  blobType: "image/jpeg",
  base64Length: 209052,
  base64Preview: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYH..."
}
```

#### **Server Request Debug:**
```
📤 Request Details: {
  requestsCount: 1,
  hasImageContent: true,
  imageContentLength: 209052,
  features: [{"type": "TEXT_DETECTION", "maxResults": 50}, ...],
  imageContext: {"languageHints": ["en"], ...}
}
```

#### **Google Vision Response Debug:**
```
📥 Google Vision Response Overview: {
  hasResponses: true,
  responsesCount: 1,
  hasTextAnnotations: true,
  textAnnotationsCount: 25,
  hasFullTextAnnotation: true,
  fullTextLength: 245
}
```

#### **Text Extraction Debug:**
```
📝 Text Extraction Details: {
  fullTextAnnotationText: "SAFEWAY\nStore 910 Dir Chris Bay\nMain: (925) 371-6969...",
  firstTextAnnotation: "SAFEWAY\nStore 910 Dir Chris Bay\nMain: (925) 371-6969...",
  finalTextUsed: "SAFEWAY\nStore 910 Dir Chris Bay\nMain: (925) 371-6969...",
  finalTextLength: 245
}
```

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: API Key Problems**

**Symptoms:**
- `API key not valid. Please pass a valid API key.`
- `{available: false}` in test

**Solutions:**
1. **Check API Key Format**: Should be `AIzaSy...` (39 characters)
2. **Remove Restrictions**: Go to Google Cloud Console → Credentials → Edit API key → Remove all restrictions temporarily
3. **Enable Billing**: Vision API requires billing even for free tier
4. **Check Quotas**: Ensure you haven't exceeded API limits

### **Issue 2: Empty OCR Results**

**Symptoms:**
- `textAnnotationsCount: 0`
- `fullTextLength: 0`
- `finalTextLength: 0`

**Solutions:**
1. **Image Quality**: 
   - Ensure good lighting
   - Remove shadows
   - Clear, readable text
   - Image size 50KB-2MB optimal

2. **Image Format**:
   - Use JPEG format
   - High quality (95%+)
   - Minimum 300x300 pixels

3. **Receipt Position**:
   - Fill camera frame
   - Keep receipt flat
   - Perpendicular to camera

### **Issue 3: Base64 Encoding Problems**

**Symptoms:**
- `base64Length: 0`
- Encoding errors in console

**Solutions:**
1. **Blob Validation**: Check blob size and type
2. **Canvas Issues**: Verify image capture process
3. **Memory Limits**: Very large images may fail

### **Issue 4: Network/Server Issues**

**Symptoms:**
- Network errors
- Server timeouts
- API rate limits

**Solutions:**
1. **Internet Connection**: Stable connection required
2. **API Limits**: Check Google Cloud quotas
3. **Server Restart**: Restart development server

---

## 🧪 **Advanced Debugging**

### **Check Google Cloud Console:**

1. **API Status**: APIs & Services → Dashboard → Vision API usage
2. **Quotas**: APIs & Services → Quotas → Search "Vision"
3. **Credentials**: APIs & Services → Credentials → API key details
4. **Billing**: Billing → Account overview

### **Test Different Image Types:**

```javascript
// Test with different image qualities
const testQualities = [0.5, 0.7, 0.9, 0.95];
testQualities.forEach(quality => {
  canvas.toBlob(blob => {
    console.log(`Testing quality ${quality}:`, blob.size);
    // Test OCR here
  }, 'image/jpeg', quality);
});
```

### **Compare OCR Services:**

```javascript
// Test both Google Vision and Tesseract on same image
const testBothOCR = async (imageBlob) => {
  console.log('🆚 Comparing OCR services...');
  
  try {
    // Force Google Vision
    const googleResult = await processImageWithGoogleVision(imageBlob);
    console.log('📊 Google Vision:', googleResult);
  } catch (e) {
    console.error('❌ Google Vision failed:', e);
  }
  
  try {
    // Force Tesseract
    const tesseractResult = await processImageWithTesseract(imageBlob);
    console.log('📊 Tesseract:', tesseractResult);
  } catch (e) {
    console.error('❌ Tesseract failed:', e);
  }
};
```

---

## ✅ **Success Indicators**

### **What Good Results Look Like:**

1. **API Test**: `{available: true}`
2. **Image Size**: 50KB - 2MB
3. **Base64 Length**: > 50,000 characters
4. **Text Annotations**: > 5 detected text elements
5. **Full Text Length**: > 50 characters for typical receipts
6. **Processing Time**: 200-500ms for Google Vision

### **Expected Console Flow:**

```
🔍 Starting OCR processing...
📡 Attempting Google Cloud Vision OCR...
📸 Base64 Conversion: {originalBlobSize: 156789, ...}
🔍 Processing OCR request with Google Cloud Vision...
📤 Request Details: {requestsCount: 1, hasImageContent: true, ...}
📥 Google Vision Response Overview: {hasTextAnnotations: true, textAnnotationsCount: 25, ...}
📝 Text Extraction Details: {finalTextLength: 245, ...}
✅ Google Vision OCR completed: 245 characters, confidence: 0.87
✅ Google Vision OCR successful!
🔍 Raw OCR Response: {textLength: 245, confidence: 0.87, fullText: "SAFEWAY...", ...}
```

Run these tests and let me know what results you get! 🎯 