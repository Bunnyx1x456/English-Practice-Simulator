// utils/string-helpers.ts

import { DifficultyPromptDetails } from '../types';
import { DIFFICULTY_EMOJIS } from './constants';

export function normalizeSentenceForComparison(text: string): string {
    if (!text) return "";
    return text
        .toLowerCase()
        .replace(/[.,!?&/^"“”;:]/g, '')
        .replace(/\b(comma|period|question mark|exclamation point|quote|unquote)\b/g, '') // Explicitly remove common speech recognition artifacts
        .replace(/\s+/g, ' ').trim();
}

export function getDifficultyPromptDetails(level: number): DifficultyPromptDetails {
    switch (level) {
        case 0: return { lengthDescription: "short (3-6 words)", levelDescription: "A0-A1" };
        case 1: return { lengthDescription: "medium (5-7 words)", levelDescription: "A2-B1" };
        case 2: return { lengthDescription: "large (7-12 words)", levelDescription: "B2-C1" };
        case 3: return { lengthDescription: "medium compound, using commas (10-15 words)", levelDescription: "A1-C1 elements, progressively complex" };
        default: return { lengthDescription: "medium (5-7 words)", levelDescription: "A2-B1" };
    }
}

export function getDifficultyEmoji(level: number): string {
    return DIFFICULTY_EMOJIS[level] || DIFFICULTY_EMOJIS[1]; // Default to lightning if out of bounds
}