// Comprehensive Product Name Cleaning Service
// This can be extended with new patterns, machine learning, and API integrations

export interface ProductNameCleaningResult {
  originalName: string;
  cleanedName: string;
  confidence: number;
  appliedCorrections: string[];
}

export class ProductNameCleaner {
  private static corrections = {
    // OCR character fixes
    characterSubstitutions: [
      { pattern: /\b0(?=[A-Z])/g, replacement: 'O', description: 'OCR: 0→O before letters' },
      { pattern: /\b1(?=[A-Z])/g, replacement: 'I', description: 'OCR: 1→I before letters' },
      { pattern: /(?<=[A-Z])0(?=[A-Z])/g, replacement: 'O', description: 'OCR: 0→O between letters' },
      { pattern: /(?<=[A-Z])1(?=[A-Z])/g, replacement: 'I', description: 'OCR: 1→I between letters' },
      { pattern: /\bVV/g, replacement: 'W', description: 'OCR: VV→W' },
      { pattern: /\bU([AEIOU])/g, replacement: 'O$1', description: 'OCR: U+vowel→O+vowel' },
    ],

    // Common food-related OCR errors
    foodTerms: {
      // Proteins
      'CHIKEN': 'CHICKEN', 'CHICEN': 'CHICKEN', 'CHIKN': 'CHICKEN', 'CHICK': 'CHICKEN', 'CHCKN': 'CHICKEN',
      'BNLS': 'BONELESS', 'SKLSS': 'SKINLESS', 'GRND': 'GROUND',
      'BRST': 'BREAST', 'THGH': 'THIGH', 'WGNS': 'WINGS',
      'IMPOSS': 'IMPOSSIBLE', 'BURG': 'BURGER',
      // Vegetables & Produce
      'TOMATOE': 'TOMATO', 'POTATOE': 'POTATO', 'ONION': 'ONIONS', 'TOM': 'TOMATO',
      'BROCOLI': 'BROCCOLI', 'BROCOLLI': 'BROCCOLI', 'CRROT': 'CARROT',
      'AVACADO': 'AVOCADO', 'AVACODO': 'AVOCADO', 'ACOCADO': 'AVOCADO',
      'PEPPERS': 'PEPPERS', 'BELL': 'BELL', 'CARROTS': 'CARROTS',
      'SHALLOTS': 'SHALLOTS', 'SHLLOTS': 'SHALLOTS', 'SHALOTS': 'SHALLOTS',
      'PERSTN': 'PERSIAN', 'PERSTAN': 'PERSIAN',
      // Dairy
      'MLK': 'MILK', 'CHZ': 'CHEESE', 'CHSE': 'CHEESE', 'CHEES': 'CHEESE',
      'YOGRT': 'YOGURT', 'YOQRT': 'YOGURT', 'YOUGURT': 'YOGURT',
      'BTR': 'BUTTER', 'CRM': 'CREAM', 'CREM': 'CREAM',
      'FF': 'FAT FREE', 'LT': 'LIGHT', 'VANIL': 'VANILLA', 'VANILA': 'VANILLA',
      // Condiments & Sauces  
      'SCE': 'SAUCE', 'SAUGE': 'SAUCE', 'SAUSE': 'SAUCE', 'SACE': 'SAUCE',
      'KETCHP': 'KETCHUP', 'KETCHU': 'KETCHUP', 'MUSTRD': 'MUSTARD', 'MAYO': 'MAYONNAISE', 'MAYON': 'MAYONNAISE',
      'PAST': 'PASTE', 'PASTE': 'PASTE',
      // Grains & Carbs
      'BRD': 'BREAD', 'BRED': 'BREAD', 'RCE': 'RICE', 'RYCE': 'RICE',
      'PST': 'PASTA', 'PSTA': 'PASTA', 'FLR': 'FLOUR', 'FLUR': 'FLOUR',
      'W/G': 'WHOLE GRAIN', 'WG': 'WHOLE GRAIN', 'WHEAT': 'WHEAT',
      // Descriptors
      'ORGN': 'ORGANIC', 'ORGNC': 'ORGANIC', 'ORG': 'ORGANIC', 'ORGNIC': 'ORGANIC',
      'FRZ': 'FROZEN', 'FRZN': 'FROZEN', 'FR0Z': 'FROZEN',
      'WHL': 'WHOLE', 'WH': 'WHITE', 'WHT': 'WHITE', 'WHTE': 'WHITE',
      'FNCY': 'FANCY', 'PARM': 'PARMESAN', 'SHRD': 'SHREDDED',
      'RD': 'REDUCED', 'FT': 'FAT', 'LS': 'LOW SODIUM',
      // Specific brands/items
      'PAC': 'PACIFIC', 'HZ': 'HEINZ', 'JIF': 'JIF',
      'BROTH': 'BROTH', 'CREAMY': 'CREAMY',
    } as { [key: string]: string },

    // Store brand abbreviations
    storeBrands: {
      // Publix brands
      'PUB': '', 'PBX': '', 'PUBLIX': '', // Remove Publix brand prefix
      // Walmart brands
      'GV': 'GREAT VALUE', 'SIG': 'SIGNATURE', 'MM': 'MARKETSIDE',
      'EQ': 'EQUATE', 'PV': 'PARENT\'S CHOICE', 'SW': 'SIMPLY WHITE',
      // Other store brands
      'KS': 'KIRKLAND SIGNATURE', 'TJ': 'TRADER JOE\'S',
      '365': '365 EVERYDAY VALUE',
    } as { [key: string]: string },

    // National brand corrections
    nationalBrands: {
      // Rice brands
      'MAHATHA': 'MAHATMA', 'MAHATAMA': 'MAHATMA',
      'JASN': 'JASMINE', 'JASH': 'JASMINE', 'JASMIN': 'JASMINE',
      // Sauce brands  
      'HDISIN': 'HOISIN', 'HOSIN': 'HOISIN', 'HOYSIN': 'HOISIN',
      'SRIRACHA': 'SRIRACHA', 'SIRACHA': 'SRIRACHA', 'SIRRACH': 'SRIRACHA',
      // Popular brands
      'HUNTS': 'HUNT\'S', 'LAYS': 'LAY\'S', 'CAMPBELLS': 'CAMPBELL\'S',
      'KELLOGS': 'KELLOGG\'S', 'MCDONALDS': 'MCDONALD\'S',
      'ORVILLE': 'ORVILLE REDENBACHER', 'DORITOS': 'DORITOS',
      'CHEETOS': 'CHEETOS', 'FRITOS': 'FRITOS', 'TOSTITOS': 'TOSTITOS',
    } as { [key: string]: string },

    // Measurement & packaging
    measurements: {
      'LB': 'POUND', 'LBS': 'POUNDS', 'OZ': 'OUNCE', 'OUNCS': 'OUNCES',
      'PT': 'PINT', 'QT': 'QUART', 'GAL': 'GALLON', 'ML': 'MILLILITER',
      'PK': 'PACK', 'PKG': 'PACKAGE', 'CT': 'COUNT', 'PC': 'PIECE',
      'BX': 'BOX', 'BG': 'BAG', 'BTL': 'BOTTLE', 'CAN': 'CAN',
    } as { [key: string]: string }
  };

  static cleanProductName(name: string): ProductNameCleaningResult {
    const originalName = name;
    const appliedCorrections: string[] = [];
    let confidence = 0.8; // Base confidence

    // Step 1: Remove technical codes
    name = name.replace(/\b\d{12,}[A-Z]*\b/g, '').trim();
    name = name.replace(/\s+[A-Z]{1,2}$/g, '').trim();
    name = name.replace(/\b(F|T|E|X|KF|MD|LG|SM|XL|XXL)$/g, '').trim();

    // Step 2: Apply character-level OCR corrections
    this.corrections.characterSubstitutions.forEach(({ pattern, replacement, description }) => {
      if (pattern.test(name)) {
        name = name.replace(pattern, replacement);
        appliedCorrections.push(description);
        confidence += 0.05;
      }
    });

    // Step 3: Apply word-level corrections
    const wordCategories = [
      { dict: this.corrections.foodTerms, category: 'Food terms' },
      { dict: this.corrections.storeBrands, category: 'Store brands' },
      { dict: this.corrections.nationalBrands, category: 'National brands' },
      { dict: this.corrections.measurements, category: 'Measurements' }
    ];

    wordCategories.forEach(({ dict, category }) => {
      Object.entries(dict).forEach(([wrong, right]) => {
        const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
        if (regex.test(name)) {
          name = name.replace(regex, right);
          appliedCorrections.push(`${category}: ${wrong}→${right}`);
          confidence += 0.1;
        }
      });
    });

    // Step 4: Handle special patterns (like Publix slash combinations)
    name = name.replace(/\bTOM\/PASTE\b/gi, 'TOMATO PASTE');
    name = name.replace(/\bRD FT\b/gi, 'REDUCED FAT');
    name = name.replace(/\bFF LT\b/gi, 'FAT FREE LIGHT');
    name = name.replace(/\bW\/G WHEAT\b/gi, 'WHOLE GRAIN WHEAT');
    name = name.replace(/\bFNCY PARM SHRD\b/gi, 'FANCY PARMESAN SHREDDED');
    
    // Step 5: Clean up formatting
    name = name.replace(/\s+/g, ' ').trim();

    // Step 6: Validate result
    if (/^\d+$/.test(name) || name.length < 3 || /^[0-9\s]*$/.test(name)) {
      return {
        originalName,
        cleanedName: '',
        confidence: 0,
        appliedCorrections: ['Invalid product name']
      };
    }

    // Adjust confidence based on changes made
    const changeRatio = (originalName.length - name.length) / originalName.length;
    if (changeRatio > 0.5) confidence *= 0.7; // Large changes reduce confidence

    return {
      originalName,
      cleanedName: name,
      confidence: Math.min(confidence, 1.0),
      appliedCorrections
    };
  }

  // Add new correction patterns dynamically
  static addCorrection(category: 'foodTerms' | 'storeBrands' | 'nationalBrands' | 'measurements', wrong: string, right: string) {
    this.corrections[category][wrong] = right;
  }

  // Learn from user corrections
  static learnFromCorrection(originalOCR: string, userCorrected: string) {
    const words = originalOCR.split(' ');
    const correctedWords = userCorrected.split(' ');
    
    // Simple word-by-word learning (could be enhanced with fuzzy matching)
    words.forEach((word, index) => {
      if (correctedWords[index] && word !== correctedWords[index]) {
        this.corrections.foodTerms[word.toUpperCase()] = correctedWords[index].toUpperCase();
        console.log(`📚 Learned: ${word} → ${correctedWords[index]}`);
      }
    });
  }

  // Batch clean multiple product names
  static cleanBatch(names: string[]): ProductNameCleaningResult[] {
    return names.map(name => this.cleanProductName(name));
  }

  // Get suggestions for partial matches
  static getSuggestions(partialName: string): string[] {
    const suggestions: string[] = [];
    const searchTerm = partialName.toUpperCase();
    
    // Search through all known corrections
    Object.values(this.corrections.foodTerms).forEach(value => {
      if (value.includes(searchTerm) || searchTerm.includes(value)) {
        suggestions.push(value);
      }
    });

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }
} 