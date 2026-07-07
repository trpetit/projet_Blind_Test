/**
 * Calculates the Levenshtein distance between two strings.
 */
export function getLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1  // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Checks if a guess matches the correct string closely (including typos).
 */
export function checkCloseMatch(guess: string, correct: string): boolean {
  if (!guess || !correct) return false;
  if (guess === correct) return true;

  // Direct substring check
  const minLength = Math.max(4, Math.ceil(correct.length * 0.6));
  if (guess.length >= minLength) {
    if (correct.includes(guess) || guess.includes(correct)) {
      return true;
    }
  }

  // Levenshtein-based edit distance check
  const dist = getLevenshteinDistance(guess, correct);
  let maxAllowed = 0;
  if (correct.length <= 2) {
    maxAllowed = 0;
  } else if (correct.length <= 5) {
    maxAllowed = 1;
  } else {
    maxAllowed = 2; // Allow up to 2 typo letters
  }

  if (dist <= maxAllowed) {
    return true;
  }

  return false;
}

/**
 * Splits a collaboration string into individual artists.
 * Handles delimiters like feat., ft., with, and, &, x, comma, etc.
 */
export function splitArtists(artistStr: string): string[] {
  if (!artistStr) return [];

  // Normalize parentheses containing features first, so they don't get lost
  // e.g. "David Guetta (feat. Sia)" -> "David Guetta feat. Sia"
  let normalized = artistStr.replace(/[()\[\]]/g, " ");

  // Use a regex to split by common collaboration delimiters
  const splitRegex = /\s+(?:feat\.?|ft\.?|featuring|with|and|&|x)\s+|\s*,\s*/gi;
  
  return normalized
    .split(splitRegex)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

/**
 * Normalizes a string by converting it to lowercase, removing accents/diacritics,
 * and stripping out common noise, punctuation, and musical suffixes.
 */
export function cleanText(text: string): string {
  if (!text) return "";

  let cleaned = text.toLowerCase();

  // Normalize accents (e.g., "é" -> "e", "ç" -> "c")
  cleaned = cleaned.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Remove common parenthetical additions and track features/edits
  // Examples: " (feat. Drake)", " - 2015 Remastered Version", " [Radio Edit]"
  cleaned = cleaned.replace(/\s*[([].*?(feat|ft|with|remaster|live|edit|single|version|mix|recording|re-recording|acoustic|cover|instrumental).*?[\])]/gi, "");
  cleaned = cleaned.replace(/\s*-\s*.*?(remaster|live|edit|single|version|mix|recording|acoustic|cover|instrumental).*$/gi, "");
  cleaned = cleaned.replace(/\s*(feat\.|feat|ft\.|ft)\s+.*$/gi, "");

  // Replace punctuation and special characters with spaces
  cleaned = cleaned.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?¿¡[\]+]/g, " ");

  // Collapse multiple spaces and trim
  return cleaned.replace(/\s+/g, " ").trim();
}

/**
 * Compares a user's guess against the correct answer.
 * Returns true if it is a close match.
 */
export function compareTexts(guess: string, correct: string, isArtist: boolean = false): boolean {
  const cleanGuess = cleanText(guess);
  const cleanCorrect = cleanText(correct);

  if (!cleanGuess || !cleanCorrect) return false;

  // 1. Direct comparison on full strings (exact, substring or close Levenshtein match)
  if (checkCloseMatch(cleanGuess, cleanCorrect)) {
    return true;
  }

  // 2. If it's an artist, split the original into individual candidates and check each one
  if (isArtist) {
    const candidates = splitArtists(correct);
    for (const candidate of candidates) {
      const cleanCandidate = cleanText(candidate);
      if (cleanCandidate && checkCloseMatch(cleanGuess, cleanCandidate)) {
        return true;
      }
    }
  }

  // 3. Word-by-word intersection (useful for out-of-order words or subset matching)
  const guessWords = cleanGuess.split(" ").filter(w => w.length > 2);
  const correctWords = cleanCorrect.split(" ").filter(w => w.length > 2);

  if (guessWords.length > 0 && correctWords.length > 0) {
    // If guess has multiple words, check how many overlap
    const overlaps = guessWords.filter(word => correctWords.includes(word));
    const overlapRatio = overlaps.length / Math.max(guessWords.length, correctWords.length);
    
    // If more than 65% of words match, count it as correct
    if (overlapRatio >= 0.65) {
      return true;
    }

    // Special case for single-word matching of longer titles
    if (guessWords.length === 1 && correctWords.includes(guessWords[0])) {
      if (guessWords[0].length >= 5) {
        return true;
      }
    }
  }

  return false;
}
