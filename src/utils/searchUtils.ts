import { useState, useEffect, useCallback } from 'react';

// Debounced search hook
export function useDebounceSearch(initialValue: string = '', delay: number = 300) {
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const [debouncedQuery, setDebouncedQuery] = useState(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, delay);

    return () => clearTimeout(handler);
  }, [searchQuery, delay]);

  return {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
  };
}

// Enhanced text matching utility
export function createTextMatcher(query: string) {
  if (!query.trim()) return () => true;
  
  // Normalize search query: remove accents, convert to lowercase
  const normalizedQuery = normalizeText(query);
  const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 0);
  
  return (text: string | undefined | null): boolean => {
    if (!text) return false;
    
    const normalizedText = normalizeText(text);
    
    // Check if all query words are found in the text
    return queryWords.every(word => 
      normalizedText.includes(word)
    );
  };
}

// Text normalization: remove accents and convert to lowercase
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
    .trim();
}

// Enhanced search for menu items
export function searchMenuItems<T extends { name: string; description?: string; categoryId: string }>(
  items: T[],
  query: string,
  categoryId?: string
): T[] {
  const textMatcher = createTextMatcher(query);
  
  return items.filter(item => {
    // Filter by category if specified
    if (categoryId && item.categoryId !== categoryId) {
      return false;
    }
    
    // Search in name and description
    return textMatcher(item.name) || textMatcher(item.description);
  });
}

// Search highlight utility
export function highlightSearchMatch(text: string, query: string): string {
  if (!query.trim()) return text;
  
  const normalizedQuery = normalizeText(query);
  const normalizedText = normalizeText(text);
  
  // Find match position in normalized text
  const matchIndex = normalizedText.indexOf(normalizedQuery);
  if (matchIndex === -1) return text;
  
  // Apply highlight to original text
  const before = text.substring(0, matchIndex);
  const match = text.substring(matchIndex, matchIndex + query.length);
  const after = text.substring(matchIndex + query.length);
  
  return `${before}**${match}**${after}`;
}
