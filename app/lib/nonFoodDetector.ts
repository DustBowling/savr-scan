// Enhanced Non-Food Item Detection System for Receipt Parsing
// Provides highly accurate detection of taxes, fees, coupons, discounts, and other non-grocery items

export interface NonFoodDetectionResult {
  isNonFood: boolean;
  confidence: number;
  reason: string;
  category: 'tax' | 'fee' | 'coupon' | 'discount' | 'payment' | 'service' | 'personal_care' | 'household' | 'pharmacy' | 'other';
  suggestedAction: 'hide' | 'review' | 'keep';
}

export interface NonFoodLearningData {
  originalText: string;
  isNonFood: boolean;
  category: string;
  userFeedback: 'correct' | 'incorrect';
  storeName: string;
  timestamp: Date;
}

export class EnhancedNonFoodDetector {
  // Comprehensive detection patterns with weighted confidence
  private static readonly detectionRules = {
    // High confidence patterns (95%+)
    definiteNonFood: {
      // Tax patterns
      tax: [
        /\b(sales?|state|city|local|county)\s*tax\b/i,
        /\btax\s*(\d+\.\d{2}|\d+%)/i,
        /\b(hst|gst|pst|vat)\b/i,
        /\btotal\s*tax/i,
        /tax\s*total/i
      ],
      
      // Payment methods & transactions
      payment: [
        /\b(amex|visa|mastercard|discover|card)\s*(tend|tender|payment|transaction)/i,
        /\b(cash|credit|debit)\s*(tend|tender|payment)/i,
        /\b(payment|tender)\s*(amount|method)/i,
        /\bchange\s*(due|given)/i,
        /\b(subtotal|total|balance)\s*\d+\.\d{2}$/i,
        /\b(cashback|cash\s*back)\b/i,
        /\bgift\s*card/i
      ],
      
      // Store fees & deposits
      fees: [
        /\b(bag|bottle|container|recycling|environmental)\s*(fee|charge|deposit)/i,
        /\bcrv\b/i,
        /\b(service|handling|processing|delivery|convenience)\s*(fee|charge)/i,
        /\b(plastic|paper|shopping)\s*bag/i,
        /\bdeposit\s*(fee|charge)/i
      ],
      
      // Coupons & discounts (including negative amounts)
      coupons: [
        /\b(manufacturer|store|digital|mobile|app)\s*(coupon|discount)/i,
        /\bscanned\s*coupon/i,
        /\bmfr\s*coupon/i,
        /\b(member|club|card)\s*(savings|discount|price)/i,
        /\btotal\s*savings/i,
        /\byou\s*saved/i,
        /^\d+\.\d{2}-$/, // negative amounts
        /-\s*\$?\d+\.\d{2}$/,
        /\b(promo|promotion|deal|offer|rebate)\b/i
      ]
    },
    
    // Medium-high confidence patterns (80-90%)
    likelyNonFood: {
      // Personal care & health
      personalCare: [
        /\b(shampoo|conditioner|soap|lotion|deodorant|toothpaste|mouthwash)\b/i,
        /\b(razor|shaving|cologne|perfume|makeup|lipstick|foundation)\b/i,
        /\b(bandaid|first\s*aid|medicine|vitamin|supplement|aspirin|tylenol|advil)\b/i,
        /\b(feminine|tampons|pads|pregnancy|test)\b/i
      ],
      
      // Household & cleaning
      household: [
        /\b(detergent|fabric\s*softener|bleach|cleaner|disinfectant|windex|lysol)\b/i,
        /\b(toilet\s*paper|paper\s*towel|tissue|napkin|kleenex|charmin|bounty)\b/i,
        /\b(trash\s*bag|garbage\s*bag|storage\s*bag|aluminum\s*foil|plastic\s*wrap)\b/i,
        /\b(light\s*bulb|battery|batteries|extension\s*cord|air\s*freshener)\b/i
      ],
      
      // Pharmacy & health
      pharmacy: [
        /\b(prescription|rx|pharmacy|medication|pills|tablets|capsules)\b/i,
        /\b(cough|cold|flu|allergy|pain\s*relief|antacid|laxative)\b/i,
        /\b(blood\s*pressure|diabetes|insulin|heart|cholesterol)\b/i
      ],
      
      // Baby & pet care
      babyPet: [
        /\b(diaper|wipe|baby\s*(food|formula|oil|powder|lotion))\b/i,
        /\b(cat|dog|pet)\s*(food|treat|toy|litter|collar|leash)\b/i,
        /\b(purina|pedigree|friskies|meow\s*mix|iams|whiskas)\b/i
      ],
      
      // Non-edible household items
      nonEdible: [
        /\b(magazine|newspaper|book|greeting\s*card|gift\s*card|phone\s*card)\b/i,
        /\b(lottery|scratch|ticket|cigarette|tobacco|vape|electronic)\b/i,
        /\b(flower|plant|garden|fertilizer|mulch|seeds)\b/i
      ]
    },
    
    // Store services & metadata (90%+ confidence)
    storeServices: [
      /\bstore\s*\d+/i,
      /\b(manager|employee|staff|cashier)\b/i,
      /\b(receipt|transaction)\s*(number|id|#)/i,
      /\byour\s*cashier\s*today\s*was/i,
      /\bthank\s*you\s*for\s*shopping/i,
      /\b(date|time|address|phone)\s*[:=]/i,
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
      /\b\d{3}-\d{3}-\d{4}\b/,
      /\b\d+\s*(first|main|state|road|street|ave|blvd)\b/i
    ]
  };

  // Store-specific non-food brand patterns
  private static readonly nonFoodBrands = {
    // Personal care brands
    personalCare: [
      'dove', 'olay', 'head shoulders', 'pantene', 'herbal essences', 'aussie', 'tresemme',
      'colgate', 'crest', 'oral-b', 'listerine', 'scope', 'aquafresh',
      'gillette', 'schick', 'venus', 'old spice', 'axe', 'degree', 'secret',
      'covergirl', 'maybelline', 'revlon', 'loreal', 'neutrogena', 'cetaphil'
    ],
    
    // Cleaning & household brands
    household: [
      'tide', 'downy', 'gain', 'cascade', 'finish', 'dawn', 'joy',
      'lysol', 'clorox', 'windex', 'febreze', 'glade', 'air wick',
      'charmin', 'bounty', 'scott', 'kleenex', 'puffs', 'angel soft',
      'glad', 'hefty', 'ziploc', 'reynolds', 'saran'
    ],
    
    // Health & pharmacy brands
    pharmacy: [
      'tylenol', 'advil', 'aleve', 'motrin', 'bayer', 'excedrin',
      'benadryl', 'claritin', 'zyrtec', 'allegra', 'sudafed',
      'robitussin', 'mucinex', 'dayquil', 'nyquil', 'pepto', 'tums',
      'centrum', 'nature made', 'one a day', 'flintstones'
    ],
    
    // Baby & pet brands
    babyPet: [
      'pampers', 'huggies', 'luvs', 'honest', 'seventh generation',
      'similac', 'enfamil', 'gerber', 'earth best',
      'purina', 'pedigree', 'friskies', 'meow mix', 'iams', 'whiskas',
      'blue buffalo', 'hills', 'royal canin', 'wellness'
    ]
  };

  // Context analysis for receipt structure
  private static analyzeReceiptContext(items: Array<{name: string, price: number}>, storeName: string): Map<number, number> {
    const contextScores = new Map<number, number>();
    
    items.forEach((item, index) => {
      let contextScore = 0;
      
      // Very high prices are often not individual food items
      if (item.price > 100) contextScore += 0.8;
      else if (item.price > 50) contextScore += 0.4;
      
      // Round amounts, especially high ones, are often payments/deposits
      if (item.price % 1 === 0 && item.price >= 20) contextScore += 0.3;
      
      // Negative prices are almost always discounts/coupons
      if (item.price < 0) contextScore += 0.9;
      
      // Items at the end of receipt are often totals/payments
      const positionFromEnd = items.length - index;
      if (positionFromEnd <= 3 && item.price > 20) contextScore += 0.2;
      
      // Store-specific context
      if (storeName.includes('PHARMACY') || storeName.includes('CVS') || storeName.includes('WALGREENS')) {
        contextScore += 0.1; // Pharmacy stores have more non-food items
      }
      
      contextScores.set(index, contextScore);
    });
    
    return contextScores;
  }

  // Enhanced detection with multiple analysis layers
  static detectNonFood(itemName: string, price?: number, context?: {
    storeName?: string;
    allItems?: Array<{name: string, price: number}>;
    itemIndex?: number;
  }): NonFoodDetectionResult {
    const name = itemName.toLowerCase().trim();
    let confidence = 0;
    let category: NonFoodDetectionResult['category'] = 'other';
    let reason = '';
    
    // Layer 1: Definite non-food patterns (high confidence)
    for (const [cat, patterns] of Object.entries(this.detectionRules.definiteNonFood)) {
      for (const pattern of patterns) {
        if (pattern.test(name)) {
          return {
            isNonFood: true,
            confidence: 0.95,
            reason: `Definite non-food: matches ${cat} pattern`,
            category: cat as NonFoodDetectionResult['category'],
            suggestedAction: 'hide'
          };
        }
      }
    }
    
    // Layer 2: Store services & metadata
    for (const pattern of this.detectionRules.storeServices) {
      if (pattern.test(name)) {
        return {
          isNonFood: true,
          confidence: 0.9,
          reason: 'Store service or metadata',
          category: 'service',
          suggestedAction: 'hide'
        };
      }
    }
    
    // Layer 3: Likely non-food patterns (medium-high confidence)
    for (const [cat, patterns] of Object.entries(this.detectionRules.likelyNonFood)) {
      for (const pattern of patterns) {
        if (pattern.test(name)) {
          confidence = Math.max(confidence, 0.85);
          category = cat as NonFoodDetectionResult['category'];
          reason = `Likely non-food: matches ${cat} pattern`;
        }
      }
    }
    
    // Layer 4: Brand name analysis
    for (const [brandCat, brands] of Object.entries(this.nonFoodBrands)) {
      for (const brand of brands) {
        if (name.includes(brand.toLowerCase())) {
          confidence = Math.max(confidence, 0.8);
          category = brandCat as NonFoodDetectionResult['category'];
          reason = `Non-food brand detected: ${brand}`;
        }
      }
    }
    
    // Layer 5: Context analysis
    if (context?.allItems && context.itemIndex !== undefined) {
      const contextScores = this.analyzeReceiptContext(context.allItems, context.storeName || '');
      const contextScore = contextScores.get(context.itemIndex) || 0;
      confidence = Math.max(confidence, contextScore);
      if (contextScore > 0.5) {
        reason = reason || `Context analysis suggests non-food (${Math.round(contextScore * 100)}% context score)`;
      }
    }
    
    // Layer 6: Price-based heuristics
    if (price !== undefined) {
      // Negative prices are almost always discounts
      if (price < 0) {
        return {
          isNonFood: true,
          confidence: 0.95,
          reason: 'Negative price indicates discount/refund',
          category: 'discount',
          suggestedAction: 'hide'
        };
      }
      
      // Very high prices are suspicious
      if (price > 100) {
        confidence = Math.max(confidence, 0.7);
        reason = reason || 'Unusually high price for individual food item';
      }
      
      // Round payment amounts
      if (price >= 50 && price % 1 === 0) {
        confidence = Math.max(confidence, 0.6);
        reason = reason || 'Round high-value amount suggests payment/tender';
        category = 'payment';
      }
    }
    
    // Layer 7: Pattern-based anomaly detection
    if (name.length < 3) {
      confidence = Math.max(confidence, 0.7);
      reason = reason || 'Very short name, likely not a food item';
    }
    
    if (/^\d+[a-z]*\d*$/i.test(name)) {
      confidence = Math.max(confidence, 0.8);
      reason = reason || 'Appears to be a product code or UPC';
    }
    
    // Determine suggested action based on confidence
    let suggestedAction: NonFoodDetectionResult['suggestedAction'] = 'keep';
    if (confidence >= 0.85) suggestedAction = 'hide';
    else if (confidence >= 0.6) suggestedAction = 'review';
    
    return {
      isNonFood: confidence >= 0.6,
      confidence,
      reason: reason || 'No non-food indicators detected',
      category: confidence >= 0.6 ? category : 'other',
      suggestedAction
    };
  }

  // Batch processing with context awareness
  static detectNonFoodBatch(
    items: Array<{name: string, price?: number}>,
    context?: {storeName?: string}
  ): Array<NonFoodDetectionResult> {
    const allItems = items.map(item => ({name: item.name, price: item.price || 0}));
    
    return items.map((item, index) => 
      this.detectNonFood(item.name, item.price, {
        storeName: context?.storeName,
        allItems,
        itemIndex: index
      })
    );
  }

  // Get items suggested for hiding with customizable thresholds
  static getSuggestedActions(
    items: Array<{name: string, price?: number}>,
    context?: {storeName?: string},
    thresholds?: {hide?: number, review?: number}
  ): {hide: Set<number>, review: Set<number>} {
    const hideThreshold = thresholds?.hide || 0.85;
    const reviewThreshold = thresholds?.review || 0.6;
    
    const results = this.detectNonFoodBatch(items, context);
    const hide = new Set<number>();
    const review = new Set<number>();
    
    results.forEach((result, index) => {
      if (result.confidence >= hideThreshold) {
        hide.add(index);
      } else if (result.confidence >= reviewThreshold) {
        review.add(index);
      }
    });
    
    return {hide, review};
  }

  // Learning system for user feedback
  private static learningData: NonFoodLearningData[] = [];
  
  static recordUserFeedback(
    originalText: string,
    detectionResult: NonFoodDetectionResult,
    userFeedback: 'correct' | 'incorrect',
    storeName: string
  ) {
    this.learningData.push({
      originalText,
      isNonFood: detectionResult.isNonFood,
      category: detectionResult.category,
      userFeedback,
      storeName,
      timestamp: new Date()
    });
    
    // Auto-adjust patterns based on feedback (simple implementation)
    if (userFeedback === 'incorrect' && detectionResult.confidence > 0.8) {
      console.log(`⚠️ High-confidence detection was incorrect: "${originalText}" in ${storeName}`);
      // In a production system, this would update ML models or pattern weights
    }
  }

  // Get learning insights
  static getLearningInsights(): {
    totalFeedback: number;
    accuracy: number;
    commonMisclassifications: Array<{text: string, count: number}>;
  } {
    const total = this.learningData.length;
    const correct = this.learningData.filter(d => d.userFeedback === 'correct').length;
    
    const misclassifications = new Map<string, number>();
    this.learningData
      .filter(d => d.userFeedback === 'incorrect')
      .forEach(d => {
        const count = misclassifications.get(d.originalText) || 0;
        misclassifications.set(d.originalText, count + 1);
      });
    
    return {
      totalFeedback: total,
      accuracy: total > 0 ? correct / total : 0,
      commonMisclassifications: Array.from(misclassifications.entries())
        .map(([text, count]) => ({text, count}))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    };
  }

  // Generate detailed explanation for UI
  static getDetailedExplanation(result: NonFoodDetectionResult): {
    title: string;
    description: string;
    icon: string;
    actionText: string;
  } {
    const categoryInfo = {
      tax: {
        icon: '🏛️',
        title: 'Tax/Government Fee',
        description: 'Government-imposed taxes and fees',
        actionText: 'Hide from food spending'
      },
      fee: {
        icon: '💳',
        title: 'Store Fee/Charge',
        description: 'Store-imposed fees (bags, deposits, etc.)',
        actionText: 'Hide from food spending'
      },
      coupon: {
        icon: '🎫',
        title: 'Coupon/Discount',
        description: 'Savings from coupons or promotions',
        actionText: 'Hide (already reduces total)'
      },
      discount: {
        icon: '💰',
        title: 'Discount/Savings',
        description: 'Member savings or promotional discounts',
        actionText: 'Hide (already reduces total)'
      },
      payment: {
        icon: '💳',
        title: 'Payment Method',
        description: 'Payment processing or tender information',
        actionText: 'Hide from items list'
      },
      service: {
        icon: '🛠️',
        title: 'Store Service',
        description: 'Store services or receipt metadata',
        actionText: 'Hide from items list'
      },
      personal_care: {
        icon: '🧴',
        title: 'Personal Care',
        description: 'Health, beauty, and personal hygiene items',
        actionText: 'Review - may not be groceries'
      },
      household: {
        icon: '🏠',
        title: 'Household Item',
        description: 'Cleaning supplies, paper products, etc.',
        actionText: 'Review - may not be groceries'
      },
      pharmacy: {
        icon: '💊',
        title: 'Pharmacy/Health',
        description: 'Medications, vitamins, and health products',
        actionText: 'Review - may not be groceries'
      },
      other: {
        icon: '❓',
        title: 'Non-Food Item',
        description: 'Item that doesn\'t appear to be food',
        actionText: 'Review classification'
      }
    };
    
    const info = categoryInfo[result.category] || categoryInfo.other;
    
    return {
      ...info,
      description: `${info.description}. ${result.reason} (${Math.round(result.confidence * 100)}% confidence)`
    };
  }
}

// Convenience hook for React components
export function useEnhancedNonFoodDetector() {
  return {
    detectNonFood: EnhancedNonFoodDetector.detectNonFood,
    detectBatch: EnhancedNonFoodDetector.detectNonFoodBatch,
    getSuggestedActions: EnhancedNonFoodDetector.getSuggestedActions,
    recordFeedback: EnhancedNonFoodDetector.recordUserFeedback,
    getExplanation: EnhancedNonFoodDetector.getDetailedExplanation,
    getLearningInsights: EnhancedNonFoodDetector.getLearningInsights
  };
}

// Legacy compatibility
export const NonFoodDetector = EnhancedNonFoodDetector; 