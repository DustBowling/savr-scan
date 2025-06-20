// Product name enhancement using AI
export interface EnhancedProduct {
  originalName: string;
  enhancedName: string;
  category?: string;
  confidence: number;
}

// Store-specific abbreviation patterns
const STORE_PATTERNS = {
  SAFEWAY: {
    'G-P': 'Grey Poupon',
    'TATES': 'Tate\'s',
    'SPINDRIFT': 'Spindrift',
    'LND O LKS': 'Land O Lakes',
    'AMYS': 'Amy\'s',
    'SIG': 'Signature',
    'WT': 'Weight',
    'CRV': 'California Redemption Value',
    'GALBANI': 'Galbani',
    'PUFFS': 'Puffs',
    'BOUNCE': 'Bounce',
    'PRECIOUS GALBANI': 'Precious Galbani',
    'WHOLE GRAIN': 'Whole Grain'
  },
  WALMART: {
    'GV': 'Great Value',
    'MM': 'Marketside',
    'EQ': 'Equate',
    'MV': 'Member\'s Mark',
    'HRI': 'Hormel',
    'CL': 'Classic',
    'CHS': 'Cheese',
    'PEP': 'Pepperoni',
    'USG': 'Usage',
    'SC': 'South Carolina',
    'BCN': 'Bacon',
    'CHDDR': 'Cheddar',
    'ABF': 'ABF',
    'THINBRST': 'Thin Crust',
    'DV': 'Dove',
    'RSE': 'Rose',
    'LT': 'Light',
    'SWT': 'Sweet',
    'BUTTR': 'Butter',
    'AVO': 'Avocado',
    'VERDE': 'Verde',
    'BTS': 'Boots',
    'BLON': 'Blonde',
    'TR': 'Trail',
    'HS': 'House',
    'FRM': 'From',
    'HNY': 'Honey',
    'GRMS': 'Grams',
    'ENTYSAS': 'Entity SAS',
    'PAL ORI': 'Palmolive Original',
    'TIDEHEORG': 'Tide HE Original',
    'CHRMNSF': 'Charmin Soft',
    'WHT GRAN SUG': 'White Granulated Sugar',
    'ZPR SANDW': 'Zipper Sandwich',
    'POUF': 'Pouf',
    'PALOMA': 'Paloma',
    'CCSERVINGBWL': 'CC Serving Bowl',
    'FUSILL': 'Fusilli',
    'MS10X14BOARD': 'MS 10x14 Board',
    'ELD-HARV': 'Eldorado Harvest',
    'CHK BST BNLS': 'Chicken Breast Boneless',
    'MIX VEG': 'Mixed Vegetables'
  },
  TARGET: {
    'UP&UP': 'Up & Up',
    'GH': 'Good & Gather',
    'MW': 'Market Pantry'
  }
};

// Common abbreviations across all stores
const COMMON_ABBREVIATIONS = {
  'CK': 'Cookies',
  'BK': 'Book',
  'PK': 'Pack',
  'LB': 'Pound',
  'OZ': 'Ounce',
  'FL': 'Fluid',
  'CT': 'Count',
  'LRG': 'Large',
  'MED': 'Medium',
  'SM': 'Small',
  'REG': 'Regular',
  'LT': 'Light',
  'FF': 'Fat Free',
  'LF': 'Low Fat',
  'WHL': 'Whole',
  'ORG': 'Organic',
  'FRZ': 'Frozen',
  'FRS': 'Fresh',
  'DRY': 'Dry',
  'LIQ': 'Liquid',
  'PWD': 'Powder',
  'CONC': 'Concentrate',
  'UNSLTD': 'Unsalted',
  'SLTD': 'Salted',
  'SW': 'Sweet',
  'UNSWT': 'Unsweetened',
  'VAN': 'Vanilla',
  'CHOC': 'Chocolate',
  'STR': 'Strawberry',
  'RSP': 'Raspberry',
  'LMN': 'Lemon',
  'LIM': 'Lime',
  'ORNG': 'Orange',
  'APL': 'Apple',
  'BAN': 'Banana',
  'GRP': 'Grape',
  'BLU': 'Blueberry',
  'BLK': 'Black',
  'WHT': 'White',
  'RED': 'Red',
  'GRN': 'Green',
  'YLW': 'Yellow'
};

// Product categories for better understanding
const PRODUCT_CATEGORIES = {
  'MUSTARD|KETCHUP|MAYO|SAUCE': 'Condiments',
  'COOKIE|CAKE|BREAD|BAGEL|MUFFIN': 'Bakery',
  'MILK|CHEESE|BUTTER|YOGURT|CREAM': 'Dairy',
  'CHICKEN|BEEF|PORK|FISH|MEAT': 'Meat',
  'APPLE|BANANA|ORANGE|POTATO|ONION|CARROT': 'Produce',
  'SOAP|SHAMPOO|TOOTHPASTE|DETERGENT|CLEANER': 'Personal Care & Cleaning',
  'SODA|JUICE|WATER|COFFEE|TEA': 'Beverages',
  'PASTA|RICE|CEREAL|CRACKERS|CHIPS': 'Pantry',
  'ICE CREAM|PIZZA|VEGETABLES|FRUIT': 'Frozen'
};

export function enhanceProductName(
  originalName: string, 
  storeName: string = ''
): EnhancedProduct {
  let enhancedName = originalName.trim();
  let confidence = 0.7; // Base confidence
  let category: string | undefined;

  // Clean up the original name
  enhancedName = enhancedName
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s&'-]/g, '')
    .trim();

  // Apply store-specific patterns
  const storeKey = storeName.toUpperCase();
  if (STORE_PATTERNS[storeKey as keyof typeof STORE_PATTERNS]) {
    const patterns = STORE_PATTERNS[storeKey as keyof typeof STORE_PATTERNS];
    Object.entries(patterns).forEach(([abbrev, expansion]) => {
      const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
      if (regex.test(enhancedName)) {
        enhancedName = enhancedName.replace(regex, expansion);
        confidence += 0.1;
      }
    });
  }

  // Apply common abbreviations
  Object.entries(COMMON_ABBREVIATIONS).forEach(([abbrev, expansion]) => {
    const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
    if (regex.test(enhancedName)) {
      enhancedName = enhancedName.replace(regex, expansion);
      confidence += 0.05;
    }
  });

  // Determine category
  Object.entries(PRODUCT_CATEGORIES).forEach(([keywords, cat]) => {
    const keywordRegex = new RegExp(keywords, 'i');
    if (keywordRegex.test(enhancedName)) {
      category = cat;
      confidence += 0.1;
    }
  });

  // Clean up the enhanced name
  enhancedName = enhancedName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Cap confidence at 1.0
  confidence = Math.min(confidence, 1.0);

  return {
    originalName,
    enhancedName,
    category,
    confidence
  };
}

// AI-powered enhancement using OpenAI or similar
export async function enhanceWithAI(
  originalName: string,
  storeName: string = ''
): Promise<EnhancedProduct> {
  try {
    // This would use OpenAI API or similar AI service
    const prompt = `
Given this cryptic receipt item name from ${storeName}: "${originalName}"

Please provide:
1. A clear, readable product name
2. The product category
3. Your confidence level (0-1)

Example:
Input: "G-P MUSTARD"
Output: {"enhancedName": "Grey Poupon Mustard", "category": "Condiments", "confidence": 0.9}

Respond with JSON only:`;

    // For now, fall back to rule-based enhancement
    // In production, you'd make an API call to OpenAI here
    return enhanceProductName(originalName, storeName);
    
  } catch (error) {
    console.error('AI enhancement failed, falling back to rule-based:', error);
    return enhanceProductName(originalName, storeName);
  }
}

// Batch enhancement for multiple products
export async function enhanceProductsBatch(
  items: { name: string; price: number }[],
  storeName: string = ''
): Promise<Array<{ originalName: string; enhancedName: string; price: number; category?: string; confidence: number }>> {
  return Promise.all(
    items.map(async (item) => {
      const enhanced = await enhanceWithAI(item.name, storeName);
      return {
        originalName: item.name,
        enhancedName: enhanced.enhancedName,
        price: item.price,
        category: enhanced.category,
        confidence: enhanced.confidence
      };
    })
  );
} 