// COMPREHENSIVE Google Vision OCR Test - Copy and paste this into browser console

async function comprehensiveVisionTest() {
  console.log('🧪 Starting Comprehensive Google Vision Test...');
  console.log('═══════════════════════════════════════════════════════════');
  
  // Step 1: Test API Configuration
  console.log('\n📋 STEP 1: Testing API Configuration...');
  console.log('──────────────────────────────────────────────────────────');
  
  try {
    const configResponse = await fetch('/api/google-vision-ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    });
    
    const configData = await configResponse.json();
    console.log('Status:', configResponse.status);
    console.log('Response:', configData);
    
    if (configResponse.status === 503) {
      console.error('❌ FAILED: API key not configured!');
      console.log('💡 Solution: Create .env.local file with:');
      console.log('   GOOGLE_CLOUD_VISION_API_KEY=your_api_key_here');
      return;
    }
    
    if (!configData.available) {
      console.error('❌ FAILED: API not available!');
      console.log('Error details:', configData);
      return;
    }
    
    console.log('✅ SUCCESS: API is configured and available!');
  } catch (error) {
    console.error('❌ FAILED: Could not reach API endpoint:', error);
    return;
  }
  
  // Step 2: Test with simple image
  console.log('\n🎨 STEP 2: Creating and testing simple image...');
  console.log('──────────────────────────────────────────────────────────');
  
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  
  // Draw test receipt with clear, readable text
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 600, 400);
  ctx.fillStyle = 'black';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  
  // Receipt header
  ctx.fillText('VISION TEST MARKET', 300, 50);
  ctx.font = '18px Arial';
  ctx.fillText('123 Main Street', 300, 80);
  ctx.fillText('Test City, TC 12345', 300, 105);
  ctx.fillText('──────────────────────────', 300, 130);
  
  // Items
  ctx.font = '20px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('MILK WHOLE GALLON         $3.99', 50, 170);
  ctx.fillText('BREAD WHEAT LOAF          $2.50', 50, 200);
  ctx.fillText('EGGS LARGE DOZEN          $4.25', 50, 230);
  ctx.fillText('BANANAS LB                $1.99', 50, 260);
  
  // Total
  ctx.textAlign = 'center';
  ctx.fillText('──────────────────────────', 300, 290);
  ctx.font = 'bold 22px Arial';
  ctx.fillText('TOTAL:  $12.73', 300, 330);
  ctx.font = '16px Arial';
  ctx.fillText('Thank you for shopping!', 300, 365);
  
  console.log('✅ Test image created successfully');
  
  // Convert to blob and test
  canvas.toBlob(async (blob) => {
    console.log('\n📤 STEP 3: Testing OCR with created image...');
    console.log('──────────────────────────────────────────────────────────');
    
    console.log('📊 Image details:', {
      size: blob.size,
      type: blob.type,
      sizeKB: Math.round(blob.size / 1024)
    });
    
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result.split(',')[1];
          
          console.log('📊 Base64 conversion:', {
            originalSize: blob.size,
            base64Length: base64.length,
            compressionRatio: Math.round((base64.length / blob.size) * 100) + '%'
          });
          
          // Send to API
          console.log('📡 Sending request to Google Vision API...');
          const startTime = Date.now();
          
          const response = await fetch('/api/google-vision-ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requests: [{
                image: { content: base64 },
                features: [
                  { type: 'TEXT_DETECTION', maxResults: 50 },
                  { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
                ],
                imageContext: {
                  languageHints: ['en']
                }
              }]
            })
          });
          
          const responseTime = Date.now() - startTime;
          console.log('⏱️ Response time:', responseTime + 'ms');
          console.log('📥 Response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Request Failed!');
            console.error('Status:', response.status);
            console.error('Error:', errorText);
            return;
          }
          
          const data = await response.json();
          
          // Analyze response
          console.log('\n🔍 STEP 4: Analyzing API Response...');
          console.log('──────────────────────────────────────────────────────────');
          
          const analysis = {
            hasResponses: !!data.responses,
            responsesCount: data.responses?.length || 0,
            hasError: !!(data.responses?.[0]?.error),
            hasTextAnnotations: !!(data.responses?.[0]?.textAnnotations),
            textAnnotationsCount: data.responses?.[0]?.textAnnotations?.length || 0,
            hasFullTextAnnotation: !!(data.responses?.[0]?.fullTextAnnotation),
            fullTextLength: data.responses?.[0]?.fullTextAnnotation?.text?.length || 0
          };
          
          console.log('📊 Response structure:', analysis);
          
          if (analysis.hasError) {
            console.error('❌ Google Vision returned an error:');
            console.error(data.responses[0].error);
            return;
          }
          
          if (!analysis.hasTextAnnotations && !analysis.hasFullTextAnnotation) {
            console.error('❌ No text detected in response!');
            console.log('Full response:', JSON.stringify(data, null, 2));
            return;
          }
          
          // Extract and display text
          const visionResponse = data.responses[0];
          const fullText = visionResponse.fullTextAnnotation?.text || '';
          const firstText = visionResponse.textAnnotations?.[0]?.description || '';
          const extractedText = fullText || firstText;
          
          console.log('\n📝 STEP 5: Text Extraction Results...');
          console.log('──────────────────────────────────────────────────────────');
          
          console.log('✅ Extracted text length:', extractedText.length);
          console.log('📄 Full extracted text:');
          console.log('┌─────────────────────────────────────────────┐');
          console.log(extractedText.split('\n').map(line => '│ ' + line.padEnd(43) + ' │').join('\n'));
          console.log('└─────────────────────────────────────────────┘');
          
          // Test for expected content
          console.log('\n🎯 STEP 6: Content Validation...');
          console.log('──────────────────────────────────────────────────────────');
          
          const expectedTerms = ['VISION TEST MARKET', 'MILK', 'BREAD', 'TOTAL', '$12.73'];
          const foundTerms = expectedTerms.filter(term => 
            extractedText.toUpperCase().includes(term.toUpperCase())
          );
          
          console.log('🔍 Looking for expected terms:', expectedTerms);
          console.log('✅ Found terms:', foundTerms);
          console.log('📊 Recognition accuracy:', Math.round((foundTerms.length / expectedTerms.length) * 100) + '%');
          
          if (foundTerms.length >= 3) {
            console.log('\n🎉 SUCCESS: Google Vision is working correctly!');
            console.log('✅ OCR quality: EXCELLENT');
            console.log('✅ Text extraction: FUNCTIONAL');
            console.log('✅ API integration: WORKING');
          } else if (foundTerms.length >= 1) {
            console.log('\n⚠️ PARTIAL SUCCESS: Google Vision is working but with reduced accuracy');
            console.log('💡 Consider improving image quality or lighting');
          } else {
            console.log('\n❌ RECOGNITION FAILURE: Text was detected but content is incorrect');
            console.log('💡 This suggests image processing issues');
          }
          
          // Individual text elements
          if (visionResponse.textAnnotations && visionResponse.textAnnotations.length > 1) {
            console.log('\n📋 Individual text elements detected:', visionResponse.textAnnotations.length - 1);
            visionResponse.textAnnotations.slice(1, 6).forEach((annotation, index) => {
              console.log(`  ${index + 1}. "${annotation.description}"`);
            });
            if (visionResponse.textAnnotations.length > 6) {
              console.log(`  ... and ${visionResponse.textAnnotations.length - 6} more elements`);
            }
          }
          
        } catch (processingError) {
          console.error('❌ Error during OCR processing:', processingError);
        }
      };
      
      reader.readAsDataURL(blob);
      
    } catch (error) {
      console.error('❌ Error in base64 conversion:', error);
    }
  }, 'image/jpeg', 0.9);
  
  console.log('\n⏳ Please wait for OCR processing to complete...');
}

// Auto-run the test
console.log('🚀 Google Vision OCR Comprehensive Test');
console.log('This will test your entire Google Vision setup step by step');
console.log('');
comprehensiveVisionTest(); 