import { NextRequest, NextResponse } from 'next/server';

// Google Cloud Vision API endpoint
const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

export async function POST(request: NextRequest) {
  try {
    // Get API key from environment variables
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    
    if (!apiKey) {
      console.error('❌ Google Cloud Vision API key not configured in environment variables');
      return NextResponse.json(
        { 
          error: 'Google Cloud Vision API key not configured', 
          available: false,
          hint: 'Add GOOGLE_CLOUD_VISION_API_KEY to your .env.local file'
        },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Handle test requests
    if (body.test) {
      console.log('✅ Google Vision API key is configured and available');
      return NextResponse.json({ 
        available: true, 
        message: 'Google Vision API is configured and ready to use' 
      });
    }
    
    // Validate request format
    if (!body.requests || !Array.isArray(body.requests) || body.requests.length === 0) {
      console.error('❌ Invalid request format - missing requests array');
      return NextResponse.json(
        { error: 'Invalid request format - requests array is required' },
        { status: 400 }
      );
    }

    // Validate image content
    const imageContent = body.requests[0]?.image?.content;
    if (!imageContent) {
      console.error('❌ Invalid request format - missing image content');
      return NextResponse.json(
        { error: 'Invalid request format - image content is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Processing OCR request with Google Cloud Vision...');
    console.log('📊 Request info:', {
      requestsCount: body.requests.length,
      imageContentLength: imageContent.length,
      featuresCount: body.requests[0]?.features?.length || 0
    });

    // Make request to Google Cloud Vision API
    const visionApiUrl = `${GOOGLE_VISION_API_URL}?key=${apiKey}`;
    const response = await fetch(visionApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    console.log('📡 Google Vision API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Google Vision API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      // Provide more specific error messages
      let userFriendlyError = 'OCR processing failed';
      if (response.status === 400) {
        userFriendlyError = 'Invalid image format or API request';
      } else if (response.status === 403) {
        userFriendlyError = 'API key invalid or permissions denied';
      } else if (response.status === 429) {
        userFriendlyError = 'API quota exceeded - try again later';
      }
      
      return NextResponse.json(
        { 
          error: userFriendlyError, 
          details: errorText,
          status: response.status 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Log basic response info
    console.log('📥 Google Vision response received:', {
      hasResponses: !!data.responses,
      responsesCount: data.responses?.length || 0,
      hasTextAnnotations: !!(data.responses?.[0]?.textAnnotations),
      textAnnotationsCount: data.responses?.[0]?.textAnnotations?.length || 0,
      hasFullTextAnnotation: !!(data.responses?.[0]?.fullTextAnnotation),
      hasError: !!(data.responses?.[0]?.error)
    });
    
    // Check for Vision API errors in response
    if (data.responses?.[0]?.error) {
      const visionError = data.responses[0].error;
      console.error('❌ Google Vision API returned error in response:', visionError);
      return NextResponse.json(
        { 
          error: 'Vision API processing error', 
          details: visionError.message,
          code: visionError.code 
        },
        { status: 400 }
      );
    }
    
    console.log('✅ Google Cloud Vision OCR completed successfully');
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ OCR API route error:', error);
    
    // More specific error handling
    let errorMessage = 'Internal server error during OCR processing';
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        errorMessage = 'Network error connecting to Google Vision API';
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Invalid JSON in request or response';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle CORS for development
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 