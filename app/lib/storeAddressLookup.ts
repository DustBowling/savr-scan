// Store identification by address lookup
export interface StoreLocation {
  storeName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  storeNumber?: string;
  phone?: string;
}

export interface AddressLookupResult {
  storeName: string;
  confidence: number;
  matchedAddress: string;
  storeDetails?: StoreLocation;
}

// Known store address patterns and databases
const STORE_ADDRESS_DATABASE: Record<string, StoreLocation[]> = {
  WALMART: [
    {
      storeName: 'WALMART',
      address: '9455 MISSISSAUGA ROAD',
      city: 'BRAMPTON',
      state: 'ON',
      zip: 'L6X 0Z8',
      country: 'CA',
      storeNumber: '1079',
      phone: '905-451-6307'
    },
    {
      storeName: 'WALMART',
      address: '882 S. STATE ROAD 136',
      city: 'GREENWOOD',
      state: 'IN',
      zip: '46143',
      country: 'US',
      storeNumber: '5483'
    },
    // Add more Walmart locations as needed
  ],
  SAFEWAY: [
    {
      storeName: 'SAFEWAY',
      address: '1554 FIRST STREET',
      city: 'LIVERMORE',
      state: 'CA',
      zip: '94550',
      country: 'US',
      storeNumber: '910'
    },
    // Add more Safeway locations
  ],
  TARGET: [
    // Add Target locations
  ],
  // Add more store chains
};

// Regular expressions for extracting address components
const ADDRESS_PATTERNS = {
  // Street addresses
  street: /(\d+\s+(?:N\.?|S\.?|E\.?|W\.?)?\s*[A-Z][A-Z\s\.\-]+(?:STREET|ST|ROAD|RD|AVENUE|AVE|BOULEVARD|BLVD|DRIVE|DR|LANE|LN|CIRCLE|CIR|COURT|CT|PLACE|PL|WAY))/i,
  
  // Canadian postal codes
  canadianPostal: /([A-Z]\d[A-Z]\s*\d[A-Z]\d)/i,
  
  // US ZIP codes
  usZip: /(\d{5}(?:-\d{4})?)/,
  
  // Phone numbers
  phone: /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/,
  
  // Store numbers
  storeNumber: /STORE\s*#?\s*(\d{3,5})/i,
  
  // Cities with provinces/states
  cityState: /([A-Z\s]+),?\s*([A-Z]{2,3})\s*(\d{5}|\w\d\w)/i
};

export function extractAddressFromReceipt(ocrText: string): {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  storeNumber?: string;
  country?: string;
} {
  const result: any = {};
  const lines = ocrText.split('\n').map(line => line.trim());
  
  // Extract store number
  const storeMatch = ocrText.match(ADDRESS_PATTERNS.storeNumber);
  if (storeMatch) {
    result.storeNumber = storeMatch[1];
  }
  
  // Extract phone number
  const phoneMatch = ocrText.match(ADDRESS_PATTERNS.phone);
  if (phoneMatch) {
    result.phone = phoneMatch[1];
  }
  
  // Look for street address
  for (const line of lines) {
    const streetMatch = line.match(ADDRESS_PATTERNS.street);
    if (streetMatch) {
      result.street = streetMatch[1].trim();
      break;
    }
  }
  
  // Look for city, state, postal code
  const canadianMatch = ocrText.match(ADDRESS_PATTERNS.canadianPostal);
  const usZipMatch = ocrText.match(ADDRESS_PATTERNS.usZip);
  
  if (canadianMatch) {
    result.zip = canadianMatch[1];
    result.country = 'CA';
    
    // Look for Canadian city/province pattern
    const cityStateMatch = ocrText.match(/([A-Z\s]+),?\s*(ON|BC|AB|SK|MB|QC|NB|NS|PE|NL|NT|NU|YT)/i);
    if (cityStateMatch) {
      result.city = cityStateMatch[1].trim();
      result.state = cityStateMatch[2].toUpperCase();
    }
  } else if (usZipMatch) {
    result.zip = usZipMatch[1];
    result.country = 'US';
    
    // Look for US city/state pattern
    const cityStateMatch = ocrText.match(/([A-Z\s]+),?\s*([A-Z]{2})\s*\d{5}/i);
    if (cityStateMatch) {
      result.city = cityStateMatch[1].trim();
      result.state = cityStateMatch[2].toUpperCase();
    }
  }
  
  return result;
}

export function lookupStoreByAddress(extractedAddress: any): AddressLookupResult | null {
  let bestMatch: AddressLookupResult | null = null;
  let highestConfidence = 0;
  
  // Search through all store databases
  for (const [storeName, locations] of Object.entries(STORE_ADDRESS_DATABASE)) {
    for (const location of locations) {
      const confidence = calculateAddressConfidence(extractedAddress, location);
      
      if (confidence > highestConfidence && confidence > 0.6) { // Minimum confidence threshold
        highestConfidence = confidence;
        bestMatch = {
          storeName: location.storeName,
          confidence,
          matchedAddress: `${location.address}, ${location.city}, ${location.state}`,
          storeDetails: location
        };
      }
    }
  }
  
  return bestMatch;
}

function calculateAddressConfidence(extracted: any, known: StoreLocation): number {
  let score = 0;
  let maxScore = 0;
  
  // Street address match (highest weight)
  if (extracted.street && known.address) {
    maxScore += 40;
    const streetSimilarity = calculateStringSimilarity(
      normalizeAddress(extracted.street),
      normalizeAddress(known.address)
    );
    score += streetSimilarity * 40;
  }
  
  // City match
  if (extracted.city && known.city) {
    maxScore += 20;
    if (normalizeString(extracted.city) === normalizeString(known.city)) {
      score += 20;
    }
  }
  
  // State/Province match
  if (extracted.state && known.state) {
    maxScore += 15;
    if (extracted.state.toUpperCase() === known.state.toUpperCase()) {
      score += 15;
    }
  }
  
  // ZIP/Postal code match
  if (extracted.zip && known.zip) {
    maxScore += 15;
    if (normalizeString(extracted.zip) === normalizeString(known.zip)) {
      score += 15;
    }
  }
  
  // Store number match
  if (extracted.storeNumber && known.storeNumber) {
    maxScore += 10;
    if (extracted.storeNumber === known.storeNumber) {
      score += 10;
    }
  }
  
  // Phone number match
  if (extracted.phone && known.phone) {
    maxScore += 5;
    const normalizedExtracted = extracted.phone.replace(/\D/g, '');
    const normalizedKnown = known.phone.replace(/\D/g, '');
    if (normalizedExtracted === normalizedKnown) {
      score += 5;
    }
  }
  
  return maxScore > 0 ? score / maxScore : 0;
}

function normalizeAddress(address: string): string {
  return address
    .toUpperCase()
    .replace(/\b(STREET|ST|ROAD|RD|AVENUE|AVE|BOULEVARD|BLVD|DRIVE|DR)\b/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeString(str: string): string {
  return str.toUpperCase().replace(/[^\w]/g, '').trim();
}

function calculateStringSimilarity(str1: string, str2: string): number {
  // Simple Levenshtein distance-based similarity
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Online address lookup services (optional integration)
export async function lookupStoreOnline(address: string): Promise<AddressLookupResult | null> {
  try {
    // This could integrate with:
    // - Google Places API
    // - Yelp API
    // - Store locator APIs
    // - OpenStreetMap/Nominatim
    
    // Example Google Places API integration (requires API key)
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.log('Google Places API key not found, skipping online lookup');
      return null;
    }
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(address)}&type=store&key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const place = data.results[0];
      
      // Extract store chain from place name or types
      const storeName = extractStoreChainFromPlaceName(place.name);
      
      if (storeName) {
        return {
          storeName,
          confidence: 0.8, // Lower confidence for online lookup
          matchedAddress: place.formatted_address,
          storeDetails: {
            storeName,
            address: place.formatted_address,
            city: '',
            state: '',
            zip: '',
            country: ''
          }
        };
      }
    }
  } catch (error) {
    console.error('Online address lookup failed:', error);
  }
  
  return null;
}

function extractStoreChainFromPlaceName(placeName: string): string | null {
  const storeChains = [
    'WALMART', 'TARGET', 'SAFEWAY', 'KROGER', 'COSTCO', 
    'HOME DEPOT', 'LOWES', 'BEST BUY', 'MACY\'S', 'KOHLS'
  ];
  
  const upperName = placeName.toUpperCase();
  for (const chain of storeChains) {
    if (upperName.includes(chain)) {
      return chain;
    }
  }
  
  return null;
}

// Smart address-based store detection
export function detectStoreByAddress(ocrText: string): AddressLookupResult | null {
  // Extract address components from OCR text
  const extractedAddress = extractAddressFromReceipt(ocrText);
  
  // First try local database lookup
  const localResult = lookupStoreByAddress(extractedAddress);
  if (localResult && localResult.confidence > 0.8) {
    return localResult;
  }
  
  // If local lookup fails or has low confidence, could try online lookup
  // (commented out to avoid API costs, but available if needed)
  /*
  if (extractedAddress.street) {
    const fullAddress = `${extractedAddress.street}, ${extractedAddress.city}, ${extractedAddress.state}`;
    return await lookupStoreOnline(fullAddress);
  }
  */
  
  return localResult;
}

// Add new store locations to database (for learning)
export function addStoreLocationToDatabase(storeLocation: StoreLocation) {
  if (!STORE_ADDRESS_DATABASE[storeLocation.storeName]) {
    STORE_ADDRESS_DATABASE[storeLocation.storeName] = [];
  }
  
  // Check if location already exists
  const exists = STORE_ADDRESS_DATABASE[storeLocation.storeName].some(loc => 
    loc.address === storeLocation.address && loc.city === storeLocation.city
  );
  
  if (!exists) {
    STORE_ADDRESS_DATABASE[storeLocation.storeName].push(storeLocation);
    console.log(`Added new ${storeLocation.storeName} location: ${storeLocation.address}`);
  }
} 