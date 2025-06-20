// Non-Food Detection Insights and Analytics System
// Provides insights into detection accuracy, learning progress, and system performance

import { EnhancedNonFoodDetector, NonFoodDetectionResult } from './nonFoodDetector';

export interface DetectionInsights {
  totalDetections: number;
  categoryCounts: Record<string, number>;
  confidenceDistribution: {
    high: number; // 90%+
    medium: number; // 70-89%
    low: number; // 50-69%
  };
  suggestedActions: {
    hide: number;
    review: number;
    keep: number;
  };
  accuracyStats: {
    totalFeedback: number;
    accuracy: number;
    commonMisclassifications: Array<{text: string, count: number}>;
  };
}

export interface ReceiptAnalysis {
  totalItems: number;
  foodItems: number;
  nonFoodItems: number;
  hiddenItems: number;
  foodSpendingPercentage: number;
  detectionSummary: {
    autoHidden: number;
    needsReview: number;
    highConfidenceDetections: number;
  };
}

export class NonFoodInsightsSystem {
  // Analyze a batch of detection results
  static analyzeDetections(results: NonFoodDetectionResult[]): DetectionInsights {
    const categoryCounts: Record<string, number> = {};
    const confidenceDistribution = { high: 0, medium: 0, low: 0 };
    const suggestedActions = { hide: 0, review: 0, keep: 0 };
    
    results.forEach(result => {
      // Count categories
      categoryCounts[result.category] = (categoryCounts[result.category] || 0) + 1;
      
      // Confidence distribution
      if (result.confidence >= 0.9) confidenceDistribution.high++;
      else if (result.confidence >= 0.7) confidenceDistribution.medium++;
      else if (result.confidence >= 0.5) confidenceDistribution.low++;
      
      // Suggested actions
      suggestedActions[result.suggestedAction]++;
    });
    
    const accuracyStats = EnhancedNonFoodDetector.getLearningInsights();
    
    return {
      totalDetections: results.length,
      categoryCounts,
      confidenceDistribution,
      suggestedActions,
      accuracyStats
    };
  }
  
  // Analyze an entire receipt
  static analyzeReceipt(
    items: Array<{name: string, price: number}>,
    hiddenItems: Set<number>,
    nonFoodDetections: Map<number, NonFoodDetectionResult>,
    receiptTotal: number
  ): ReceiptAnalysis {
    const totalItems = items.length;
    const nonFoodCount = nonFoodDetections.size;
    const foodItems = totalItems - nonFoodCount - hiddenItems.size;
    const hiddenCount = hiddenItems.size;
    
    // Calculate food spending
    const foodSpending = items
      .filter((_, index) => !nonFoodDetections.has(index) && !hiddenItems.has(index))
      .reduce((sum, item) => sum + item.price, 0);
    
    const foodSpendingPercentage = receiptTotal > 0 ? (foodSpending / receiptTotal) * 100 : 0;
    
    // Detection summary
    let autoHidden = 0;
    let needsReview = 0;
    let highConfidenceDetections = 0;
    
    nonFoodDetections.forEach(detection => {
      if (detection.suggestedAction === 'hide') autoHidden++;
      if (detection.suggestedAction === 'review') needsReview++;
      if (detection.confidence >= 0.9) highConfidenceDetections++;
    });
    
    return {
      totalItems,
      foodItems,
      nonFoodItems: nonFoodCount,
      hiddenItems: hiddenCount,
      foodSpendingPercentage,
      detectionSummary: {
        autoHidden,
        needsReview,
        highConfidenceDetections
      }
    };
  }
  
  // Get category-specific insights
  static getCategoryInsights(results: NonFoodDetectionResult[]): Array<{
    category: string;
    count: number;
    averageConfidence: number;
    icon: string;
    description: string;
  }> {
    const categoryData: Record<string, {count: number, totalConfidence: number}> = {};
    
    results.forEach(result => {
      if (!categoryData[result.category]) {
        categoryData[result.category] = { count: 0, totalConfidence: 0 };
      }
      categoryData[result.category].count++;
      categoryData[result.category].totalConfidence += result.confidence;
    });
    
    const categoryInfo: Record<string, {icon: string, description: string}> = {
      tax: { icon: '🏛️', description: 'Government taxes and fees' },
      fee: { icon: '💳', description: 'Store fees and charges' },
      coupon: { icon: '🎫', description: 'Coupons and discounts' },
      discount: { icon: '💰', description: 'Member savings and deals' },
      payment: { icon: '💳', description: 'Payment methods and transactions' },
      service: { icon: '🛠️', description: 'Store services and metadata' },
      personal_care: { icon: '🧴', description: 'Personal care and hygiene' },
      household: { icon: '🏠', description: 'Household and cleaning items' },
      pharmacy: { icon: '💊', description: 'Medications and health products' },
      other: { icon: '❓', description: 'Other non-food items' }
    };
    
    return Object.entries(categoryData).map(([category, data]) => ({
      category,
      count: data.count,
      averageConfidence: data.totalConfidence / data.count,
      ...(categoryInfo[category] || categoryInfo.other)
    })).sort((a, b) => b.count - a.count);
  }
  
  // Generate user-friendly summary text
  static generateSummaryText(analysis: ReceiptAnalysis): string {
    const { totalItems, foodItems, nonFoodItems, foodSpendingPercentage, detectionSummary } = analysis;
    
    let summary = `📊 Receipt Analysis: ${totalItems} total items detected. `;
    
    if (nonFoodItems > 0) {
      summary += `🔍 Found ${nonFoodItems} non-food items `;
      if (detectionSummary.highConfidenceDetections > 0) {
        summary += `(${detectionSummary.highConfidenceDetections} high-confidence). `;
      }
      
      if (detectionSummary.autoHidden > 0) {
        summary += `🤖 Auto-hid ${detectionSummary.autoHidden} items. `;
      }
      
      if (detectionSummary.needsReview > 0) {
        summary += `⚠️ ${detectionSummary.needsReview} items need review. `;
      }
    }
    
    summary += `🍎 ${foodItems} food items (${Math.round(foodSpendingPercentage)}% of spending). `;
    
    // Performance assessment
    if (foodSpendingPercentage > 80) {
      summary += `✅ Great food focus!`;
    } else if (foodSpendingPercentage > 60) {
      summary += `👍 Good food-to-total ratio.`;
    } else {
      summary += `💡 Consider reviewing non-food purchases.`;
    }
    
    return summary;
  }
  
  // Get improvement suggestions
  static getImprovementSuggestions(insights: DetectionInsights): Array<{
    type: 'info' | 'warning' | 'success';
    message: string;
    action?: string;
  }> {
    const suggestions: Array<{
      type: 'info' | 'warning' | 'success';
      message: string;
      action?: string;
    }> = [];
    
    // Accuracy feedback
    if (insights.accuracyStats.totalFeedback > 10) {
      const accuracy = insights.accuracyStats.accuracy;
      if (accuracy > 0.9) {
        suggestions.push({
          type: 'success' as const,
          message: `🎯 Detection accuracy is excellent (${Math.round(accuracy * 100)}%)!`
        });
      } else if (accuracy > 0.7) {
        suggestions.push({
          type: 'info' as const,
          message: `📊 Detection accuracy is good (${Math.round(accuracy * 100)}%). Keep providing feedback!`
        });
      } else {
        suggestions.push({
          type: 'warning' as const,
          message: `⚠️ Detection accuracy needs improvement (${Math.round(accuracy * 100)}%). Please provide more feedback.`,
          action: 'Provide feedback on detected items'
        });
      }
    } else {
      suggestions.push({
        type: 'info' as const,
        message: '💭 Help improve detection by providing feedback on flagged items.',
        action: 'Click ✓ or ✗ on detected non-food items'
      });
    }
    
    // Review suggestions
    if (insights.suggestedActions.review > 0) {
      suggestions.push({
        type: 'info' as const,
        message: `🔍 ${insights.suggestedActions.review} items need review. These might be groceries or non-groceries.`,
        action: 'Expand items to review and provide feedback'
      });
    }
    
    // Common misclassifications
    if (insights.accuracyStats.commonMisclassifications.length > 0) {
      const topMisclass = insights.accuracyStats.commonMisclassifications[0];
      suggestions.push({
        type: 'warning' as const,
        message: `🎯 Most common misclassification: "${topMisclass.text}" (${topMisclass.count} times)`,
        action: 'Consider manual classification for this item'
      });
    }
    
    return suggestions;
  }
}

// React hook for easy component integration
export function useNonFoodInsights() {
  return {
    analyzeDetections: NonFoodInsightsSystem.analyzeDetections,
    analyzeReceipt: NonFoodInsightsSystem.analyzeReceipt,
    getCategoryInsights: NonFoodInsightsSystem.getCategoryInsights,
    generateSummary: NonFoodInsightsSystem.generateSummaryText,
    getImprovementSuggestions: NonFoodInsightsSystem.getImprovementSuggestions
  };
} 