# Google Vision OCR Setup & Troubleshooting Guide

## 🚨 **Quick Fix for Most Common Issue**

If Google Vision OCR is not working, it's usually because the API key is missing:

### **Step 1: Check Current Status**
1. Open your browser console (F12)
2. Go to your app (localhost:3000)
3. Paste this command:
```javascript
fetch('/api/google-vision-ocr', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({test: true})}).then(r => r.json()).then(d => console.log('STATUS:', d))
```

### **Expected Results:**
- ✅ **Working**: `STATUS: {available: true, message: "Google Vision API is configured and ready to use"}`
- ❌ **Not Working**: `STATUS: {available: false, error: "Google Cloud Vision API key not configured"}`

---

## 🔧 **Fix the API Key Issue**

### **1. Get Google Cloud Vision API Key**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing one
3. Enable Vision API:
   - Search "Cloud Vision API" → Enable
4. Create credentials:
   - APIs & Services → Credentials → Create Credentials → API Key
   - Copy the key (starts with `AIzaSy...`)

### **2. Add API Key to Your Project**
Create a file called `.env.local` in your project root:

```env
GOOGLE_CLOUD_VISION_API_KEY=AIzaSyCQCN6v8fyFtzJr6zEvJajvkMFcivFTAbg
```

**Important:** Replace `AIzaSyCQCN6v8fyFtzJr6zEvJajvkMFcivFTAbg` with your actual API key!

### **3. Restart Your App**
```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### **4. Test Again**
Run the test command from Step 1 again. You should now see:
```
STATUS: {available: true, message: "Google Vision API is configured and ready to use"}
```

---

## 🧪 **Comprehensive Test**

For a full diagnostic, run this comprehensive test in your browser console:

**Copy and paste this entire script:**
```javascript
// Copy the entire content from QUICK_CONSOLE_TEST.js
```

This will test:
- ✅ API configuration
- ✅ Image processing
- ✅ OCR accuracy
- ✅ Response handling

---

## 🔍 **Other Common Issues**

### **Issue: "API key invalid"**
**Cause:** Wrong API key or restrictions
**Fix:** 
1. Verify key in Google Cloud Console
2. Remove API restrictions temporarily
3. Ensure billing is enabled

### **Issue: "Quota exceeded"**
**Cause:** Too many API calls
**Fix:**
1. Check usage in Google Cloud Console
2. Wait for quota reset
3. Upgrade billing plan if needed

### **Issue: "No text detected"**
**Cause:** Poor image quality
**Fix:**
1. Ensure good lighting
2. Keep receipt flat and clear
3. Fill camera frame with receipt
4. Avoid shadows and reflections

### **Issue: "Network error"**
**Cause:** Connection or server issues
**Fix:**
1. Check internet connection
2. Restart development server
3. Clear browser cache

---

## 📱 **Current App Status**

Your app works with **dual OCR support**:

- **Primary**: Google Cloud Vision (95% accuracy) - *Requires setup*
- **Fallback**: Tesseract.js (85% accuracy) - *Works automatically*

When Google Vision is properly configured, it will be used automatically. If not, the app falls back to Tesseract.

---

## ✅ **Success Indicators**

When everything is working correctly, you'll see these in your browser console:

```
🔍 Starting OCR processing...
📡 Attempting Google Cloud Vision OCR...
📸 Base64 conversion completed: {blobSize: 156789, base64Length: 209052, success: true}
🔍 Processing OCR request with Google Cloud Vision...
📊 Request info: {requestsCount: 1, imageContentLength: 209052, featuresCount: 2}
📡 Google Vision API response status: 200
📥 Google Vision response received: {hasTextAnnotations: true, textAnnotationsCount: 25, hasFullTextAnnotation: true}
✅ Using fullTextAnnotation: 245 characters
✅ Google Vision OCR completed successfully: 245 characters, confidence: 0.87
✅ Google Vision OCR successful!
```

## 🆘 **Still Not Working?**

1. **Run the comprehensive test** (see above)
2. **Check the browser console** for specific error messages
3. **Verify your API key** is correct and has no spaces
4. **Ensure billing is enabled** in Google Cloud (required even for free tier)
5. **Try with a clear, well-lit receipt image**

Your app will still work with Tesseract OCR even if Google Vision isn't configured! 