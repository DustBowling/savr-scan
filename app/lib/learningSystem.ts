// Learning system for receipt parsing improvements
export interface LearningData {
  timestamp: string;
  storeName: string;
  originalName: string;
  oldEnhancedName: string;
  newEnhancedName: string;
  correctionType: 'user_edit' | 'ai_correction' | 'pattern_update' | 'item_hidden';
}

export class ReceiptLearningSystem {
  private static readonly LEARNING_KEY = 'receipt_learning_data';
  private static readonly PATTERNS_KEY = 'learned_patterns';

  // Save a new learning entry
  static saveLearning(data: Omit<LearningData, 'timestamp'>) {
    try {
      const entry: LearningData = {
        ...data,
        timestamp: new Date().toISOString()
      };
      
      const existing = this.getLearningData();
      existing.push(entry);
      
      // Keep only last 500 entries
      if (existing.length > 500) {
        existing.splice(0, existing.length - 500);
      }
      
      localStorage.setItem(this.LEARNING_KEY, JSON.stringify(existing));
      
      // Update learned patterns
      this.updatePatterns(entry);
      
      console.log('💡 Learning saved:', entry);
    } catch (error) {
      console.error('Failed to save learning data:', error);
    }
  }

  // Get all learning data
  static getLearningData(): LearningData[] {
    try {
      const stored = localStorage.getItem(this.LEARNING_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load learning data:', error);
      return [];
    }
  }

  // Get all learned patterns
  private static getAllPatterns(): Record<string, Record<string, string>> {
    try {
      const stored = localStorage.getItem(this.PATTERNS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load learned patterns:', error);
      return {};
    }
  }

  // Get learned patterns for a specific store
  static getLearnedPatterns(storeName: string): Record<string, string> {
    try {
      const allPatterns = this.getAllPatterns();
      return allPatterns[storeName.toUpperCase()] || {};
    } catch (error) {
      console.error('Failed to load learned patterns:', error);
      return {};
    }
  }

  // Update learned patterns based on user corrections
  private static updatePatterns(entry: LearningData) {
    try {
      const patterns = this.getAllPatterns();
      const storeKey = entry.storeName.toUpperCase();
      
      if (!patterns[storeKey]) {
        patterns[storeKey] = {};
      }
      
      // Store the pattern: original -> corrected
      patterns[storeKey][entry.originalName] = entry.newEnhancedName;
      
      localStorage.setItem(this.PATTERNS_KEY, JSON.stringify(patterns));
    } catch (error) {
      console.error('Failed to update patterns:', error);
    }
  }

  // Apply learned patterns to improve parsing
  static applyLearnedEnhancements(
    items: Array<{ name: string; enhancedName?: string }>,
    storeName: string
  ): Array<{ name: string; enhancedName: string; wasLearned: boolean; shouldHide?: boolean }> {
    const patterns = this.getLearnedPatterns(storeName);
    
    return items.map(item => {
      const learned = patterns[item.name];
      if (learned === '__HIDDEN__') {
        return {
          name: item.name,
          enhancedName: item.enhancedName || item.name,
          wasLearned: true,
          shouldHide: true
        };
      } else if (learned) {
        return {
          name: item.name,
          enhancedName: learned,
          wasLearned: true
        };
      }
      
      return {
        name: item.name,
        enhancedName: item.enhancedName || item.name,
        wasLearned: false
      };
    });
  }

  // Get items that should be automatically hidden
  static getItemsToHide(
    items: Array<{ name: string; enhancedName?: string }>,
    storeName: string
  ): Set<number> {
    const patterns = this.getLearnedPatterns(storeName);
    const hiddenIndices = new Set<number>();
    
    items.forEach((item, index) => {
      // Check both original name and enhanced name
      const names = [item.name, item.enhancedName].filter(Boolean);
      
      for (const name of names) {
        if (patterns[name as string] === '__HIDDEN__') {
          hiddenIndices.add(index);
          break;
        }
      }
    });
    
    return hiddenIndices;
  }

  // Get learning statistics
  static getLearningStats() {
    const data = this.getLearningData();
    const allPatterns = this.getAllPatterns();
    
    const hiddenItemsCount = Object.values(allPatterns).reduce((total, storePatterns) => 
      total + Object.values(storePatterns).filter(value => value === '__HIDDEN__').length, 0);
    
    const stats = {
      totalCorrections: data.length,
      storesLearned: Object.keys(allPatterns).length,
      patternsLearned: Object.values(allPatterns).reduce((total, storePatterns) => 
        total + Object.keys(storePatterns).length, 0),
      hiddenItemsLearned: hiddenItemsCount,
      recentCorrections: data.filter(entry => 
        new Date(entry.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length,
      topStores: this.getTopCorrectedStores(data),
      correctionsByType: this.getCorrectionsByType(data)
    };
    
    return stats;
  }

  private static getCorrectionsByType(data: LearningData[]) {
    const types: Record<string, number> = {};
    data.forEach(entry => {
      types[entry.correctionType] = (types[entry.correctionType] || 0) + 1;
    });
    return types;
  }

  private static getTopCorrectedStores(data: LearningData[]) {
    const storeCounts: Record<string, number> = {};
    
    data.forEach(entry => {
      storeCounts[entry.storeName] = (storeCounts[entry.storeName] || 0) + 1;
    });
    
    return Object.entries(storeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([store, count]) => ({ store, corrections: count }));
  }

  // Export learning data for analysis
  static exportLearningData() {
    const data = this.getLearningData();
    const patterns = this.getAllPatterns();
    const stats = this.getLearningStats();
    
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0'
      },
      stats,
      learningData: data,
      patterns
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  // Clear all learning data (for reset)
  static clearLearningData() {
    try {
      localStorage.removeItem(this.LEARNING_KEY);
      localStorage.removeItem(this.PATTERNS_KEY);
      console.log('🧹 Learning data cleared');
    } catch (error) {
      console.error('Failed to clear learning data:', error);
    }
  }

  // Suggest improvements based on confidence patterns
  static getSuggestions(items: Array<{ name: string; confidence?: number }>) {
    const lowConfidenceItems = items.filter(item => 
      item.confidence && item.confidence < 0.7
    );
    
    const suggestions = [];
    
    if (lowConfidenceItems.length > 0) {
      suggestions.push({
        type: 'review_low_confidence',
        message: `${lowConfidenceItems.length} items have low confidence and might need review`,
        items: lowConfidenceItems
      });
    }
    
    // Check for commonly corrected patterns
    const allPatterns = this.getAllPatterns();
    const commonPatterns = Object.entries(allPatterns)
      .flatMap(([store, storePatterns]) => 
        Object.entries(storePatterns).map(([original, corrected]) => ({
          store, original, corrected
        }))
      );
    
    if (commonPatterns.length > 10) {
      suggestions.push({
        type: 'pattern_learning',
        message: `System has learned ${commonPatterns.length} correction patterns`,
        info: 'These will be automatically applied to future receipts'
      });
    }
    
    return suggestions;
  }
}

// Hook for React components
export function useLearningSystem() {
  const saveLearning = (data: Omit<LearningData, 'timestamp'>) => {
    ReceiptLearningSystem.saveLearning(data);
  };
  
  const getStats = () => ReceiptLearningSystem.getLearningStats();
  
  const applyLearned = (
    items: Array<{ name: string; enhancedName?: string }>,
    storeName: string
  ) => ReceiptLearningSystem.applyLearnedEnhancements(items, storeName);
  
  return {
    saveLearning,
    getStats,
    applyLearned,
    getSuggestions: ReceiptLearningSystem.getSuggestions
  };
} 