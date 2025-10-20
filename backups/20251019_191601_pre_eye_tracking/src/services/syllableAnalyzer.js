/**
 * Syllable Analyzer for Realistic Mouth Movements
 * Breaks down words into syllables and maps them to visemes for natural lip-sync
 */

class SyllableAnalyzer {
  constructor() {
    // Common syllable patterns and their viseme mappings
    this.syllablePatterns = {
      // Vowel patterns
      'a': { viseme: 'aa', duration: 150, intensity: 0.8 },
      'e': { viseme: 'E', duration: 120, intensity: 0.7 },
      'i': { viseme: 'I', duration: 100, intensity: 0.6 },
      'o': { viseme: 'O', duration: 140, intensity: 0.8 },
      'u': { viseme: 'U', duration: 130, intensity: 0.7 },
      
      // Diphthongs (vowel combinations)
      'ai': { viseme: 'aa', duration: 180, intensity: 0.9 },
      'ay': { viseme: 'aa', duration: 180, intensity: 0.9 },
      'ei': { viseme: 'E', duration: 160, intensity: 0.8 },
      'ey': { viseme: 'E', duration: 160, intensity: 0.8 },
      'oi': { viseme: 'O', duration: 170, intensity: 0.9 },
      'oy': { viseme: 'O', duration: 170, intensity: 0.9 },
      'ou': { viseme: 'U', duration: 165, intensity: 0.8 },
      'ow': { viseme: 'U', duration: 165, intensity: 0.8 },
      'au': { viseme: 'aa', duration: 175, intensity: 0.9 },
      'aw': { viseme: 'aa', duration: 175, intensity: 0.9 },
      
      // Consonant patterns
      'm': { viseme: 'PP', duration: 80, intensity: 0.6 },
      'p': { viseme: 'PP', duration: 60, intensity: 0.8 },
      'b': { viseme: 'PP', duration: 70, intensity: 0.7 },
      'f': { viseme: 'FF', duration: 90, intensity: 0.7 },
      'v': { viseme: 'FF', duration: 85, intensity: 0.6 },
      's': { viseme: 'SS', duration: 100, intensity: 0.8 },
      'z': { viseme: 'SS', duration: 95, intensity: 0.7 },
      'th': { viseme: 'TH', duration: 110, intensity: 0.8 },
      't': { viseme: 'DD', duration: 70, intensity: 0.8 },
      'd': { viseme: 'DD', duration: 75, intensity: 0.7 },
      'k': { viseme: 'kk', duration: 65, intensity: 0.8 },
      'g': { viseme: 'kk', duration: 70, intensity: 0.7 },
      'ch': { viseme: 'CH', duration: 85, intensity: 0.8 },
      'j': { viseme: 'CH', duration: 80, intensity: 0.7 },
      'n': { viseme: 'nn', duration: 75, intensity: 0.6 },
      'r': { viseme: 'RR', duration: 95, intensity: 0.7 },
      'l': { viseme: 'RR', duration: 90, intensity: 0.6 },
      
      // Silent/transition
      'sil': { viseme: 'sil', duration: 50, intensity: 0.0 }
    };
    
    // Common word patterns for better syllable detection
    this.commonWords = {
      'hello': ['hel', 'lo'],
      'what': ['what'],
      'good': ['good'],
      'day': ['day'],
      'how': ['how'],
      'are': ['are'],
      'you': ['you'],
      'doing': ['do', 'ing'],
      'today': ['to', 'day'],
      'going': ['go', 'ing'],
      'working': ['work', 'ing'],
      'talking': ['talk', 'ing'],
      'thinking': ['think', 'ing'],
      'something': ['some', 'thing'],
      'everything': ['ev', 'ery', 'thing'],
      'anything': ['an', 'y', 'thing'],
      'nothing': ['noth', 'ing'],
      'really': ['real', 'ly'],
      'actually': ['ac', 'tu', 'al', 'ly'],
      'probably': ['prob', 'a', 'bly'],
      'definitely': ['def', 'i', 'nite', 'ly'],
      'absolutely': ['ab', 'so', 'lute', 'ly'],
      'basically': ['ba', 'sic', 'al', 'ly'],
      'literally': ['lit', 'er', 'al', 'ly'],
      'obviously': ['ob', 'vi', 'ous', 'ly'],
      'seriously': ['se', 'ri', 'ous', 'ly'],
      'obviously': ['ob', 'vi', 'ous', 'ly']
    };
  }

  /**
   * Analyze text and break it into syllable-based viseme movements
   */
  analyzeText(text) {
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const movements = [];
    let totalTime = 0;

    for (const word of words) {
      const wordMovements = this.analyzeWord(word);
      
      // Add transition between words
      if (movements.length > 0) {
        movements.push({
          viseme: 'sil',
          duration: 80,
          intensity: 0.0,
          startTime: totalTime,
          endTime: totalTime + 80,
          type: 'transition'
        });
        totalTime += 80;
      }
      
      // Adjust start times for word movements
      wordMovements.forEach(movement => {
        movement.startTime = totalTime;
        movement.endTime = totalTime + movement.duration;
        totalTime += movement.duration;
      });
      
      movements.push(...wordMovements);
    }

    return movements;
  }

  /**
   * Analyze a single word and break it into syllable movements
   */
  analyzeWord(word) {
    // Check if we have a predefined pattern for this word
    if (this.commonWords[word]) {
      return this.analyzePredefinedWord(word);
    }
    
    // Otherwise, use phonetic analysis
    return this.analyzePhoneticWord(word);
  }

  /**
   * Analyze words with predefined syllable patterns
   */
  analyzePredefinedWord(word) {
    const syllables = this.commonWords[word];
    const movements = [];
    
    syllables.forEach((syllable, index) => {
      const syllableAnalysis = this.analyzeSyllable(syllable);
      
      movements.push({
        ...syllableAnalysis,
        syllable: syllable,
        wordIndex: index,
        type: 'syllable'
      });
    });
    
    return movements;
  }

  /**
   * Analyze words phonetically by breaking them into sounds
   */
  analyzePhoneticWord(word) {
    const movements = [];
    let currentIndex = 0;
    
    // Simple phonetic breakdown
    const sounds = this.breakIntoPhonemes(word);
    
    sounds.forEach((sound, index) => {
      const soundAnalysis = this.analyzeSound(sound);
      
      movements.push({
        ...soundAnalysis,
        sound: sound,
        soundIndex: index,
        type: 'phoneme'
      });
    });
    
    return movements;
  }

  /**
   * Break word into basic phonemes
   */
  breakIntoPhonemes(word) {
    const phonemes = [];
    let i = 0;
    
    while (i < word.length) {
      let found = false;
      
      // Check for multi-character sounds first
      if (i < word.length - 1) {
        const twoChar = word.substr(i, 2);
        if (this.syllablePatterns[twoChar]) {
          phonemes.push(twoChar);
          i += 2;
          found = true;
        }
      }
      
      // Single character
      if (!found && this.syllablePatterns[word[i]]) {
        phonemes.push(word[i]);
        i++;
        found = true;
      }
      
      // Default to vowel if not found
      if (!found) {
        const char = word[i];
        if (this.isVowel(char)) {
          phonemes.push(char);
        } else {
          phonemes.push('sil'); // Silent for unrecognized consonants
        }
        i++;
      }
    }
    
    return phonemes;
  }

  /**
   * Analyze a syllable/sound and get its viseme properties
   */
  analyzeSyllable(syllable) {
    return this.analyzeSound(syllable);
  }

  /**
   * Analyze a sound and get its viseme properties
   */
  analyzeSound(sound) {
    const pattern = this.syllablePatterns[sound] || this.syllablePatterns['sil'];
    
    // Add some randomness for natural variation
    const durationVariation = Math.random() * 0.2 - 0.1; // ±10%
    const intensityVariation = Math.random() * 0.1 - 0.05; // ±5%
    
    return {
      viseme: pattern.viseme,
      duration: Math.max(30, pattern.duration * (1 + durationVariation)),
      intensity: Math.max(0.1, Math.min(1.0, pattern.intensity + intensityVariation))
    };
  }

  /**
   * Check if character is a vowel
   */
  isVowel(char) {
    return /[aeiou]/i.test(char);
  }

  /**
   * Get timing for realistic speech rhythm
   */
  getSpeechRhythm(word) {
    const syllableCount = this.countSyllables(word);
    
    // Faster for short words, slower for longer words
    if (syllableCount <= 1) return 0.8;
    if (syllableCount <= 2) return 1.0;
    if (syllableCount <= 3) return 1.2;
    return 1.4;
  }

  /**
   * Count syllables in a word (simple estimation)
   */
  countSyllables(word) {
    return word.replace(/[^aeiou]/gi, '').length || 1;
  }
}

// Export singleton instance
export const syllableAnalyzer = new SyllableAnalyzer();



