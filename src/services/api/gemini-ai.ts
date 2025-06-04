// services/api/gemini-ai.ts

import { GoogleGenAI } from "@google/genai"; // Видалили GenerateContentResponse
import { MODEL_NAME } from '../../utils/constants';
import { getApiKeyFromCookie, saveApiKeyToCookie, clearApiKeyCookie } from '../../utils/storage';
import { showToast } from '../../utils/dom-helpers';
import { DifficultyPromptDetails, Settings, SentencePair } from '../../types';
import { getDifficultyPromptDetails as getDifficultyDetails } from '../../utils/string-helpers';


class GeminiAIService {
    private ai: GoogleGenAI | null = null;
    private _currentApiKey: string | null = null;

    constructor() {
        this.loadApiKey();
    }

    private loadApiKey() {
        this._currentApiKey = getApiKeyFromCookie();
        this.initializeAIClient();
    }

    private initializeAIClient() {
        if (this._currentApiKey) {
            try {
                this.ai = new GoogleGenAI({ apiKey: this._currentApiKey });
                console.log("Gemini AI client initialized.");
            } catch (e) {
                console.error("Failed to initialize GoogleGenAI with provided key:", e);
                this.ai = null;
                this._currentApiKey = null; // Invalidate key if initialization fails due to bad key
                showToast("Failed to initialize AI with saved key. Please re-enter API Key.", 5000, 'error');
            }
        } else {
            this.ai = null;
            console.log("No API Key found, AI client not initialized.");
        }
    }

    public get currentApiKey(): string | null {
        return this._currentApiKey;
    }

    // Додаємо публічний getter для перевірки, чи AI ініціалізовано
    public get isInitialized(): boolean {
        return !!this.ai;
    }

    public setApiKey(key: string): boolean {
        const trimmedKey = key.trim();
        if (trimmedKey) {
            try {
                saveApiKeyToCookie(trimmedKey);
                this._currentApiKey = trimmedKey;
                this.initializeAIClient(); // Re-initialize AI client
                showToast("API Key saved successfully!", 2500, 'success');
                return true;
            } catch (e) {
                console.error("Error saving API Key to cookie:", e);
                showToast("Error saving API Key. Please try again.", 3000, 'error');
                return false;
            }
        } else {
            clearApiKeyCookie();
            this._currentApiKey = null;
            this.initializeAIClient(); // Clear AI client
            showToast("API Key cleared.", 3000, 'success');
            return true;
        }
    }

    public async generateSentences(settings: Settings): Promise<SentencePair[]> {
        if (!this.ai) {
            throw new Error("AI client not initialized. Please provide a valid API Key.");
        }

        const difficultyDetails: DifficultyPromptDetails = getDifficultyDetails(settings.difficulty);

        const situationsPrompt = settings.selectedSituations.join(', ') || "any common situation";
        const focusesPrompt = settings.selectedFocuses.join(', ') || "general vocabulary and grammar";

        let prompt = `
          Generate a JSON object for an English substitution drill exercise.
          The JSON response must be a valid JSON object with a single root key "drills".
          The value of "drills" must be an array of drill objects. Each drill object must have "hint" and "sentence" string properties.
          The first drill object's "sentence" is the base sentence. Subsequent "hint"s must logically modify the PREVIOUS drill's "sentence" to form the new "sentence".
          Hints should be concise (1-4 words). The JSON must be strictly valid: all strings and keys must be double-quoted, and no trailing commas are allowed.

          Generate ${settings.sentenceCount} such drill objects.

          Difficulty requirements:
          - Sentence length: ${difficultyDetails.lengthDescription}.
          - English level (CEFR): ${difficultyDetails.levelDescription}.
        `;
        prompt += `\nFocus content on situations like: ${situationsPrompt}.`;
        prompt += `\nEmphasize learning focuses such as: ${focusesPrompt}.`;
        prompt += `
          Example of a valid JSON structure for "drills":
          [
            {"hint": "base sentence", "sentence": "I drink coffee every day."},
            {"hint": "tea", "sentence": "I drink tea every day."},
            {"hint": "in the morning", "sentence": "I drink tea in the morning."}
          ]

          Provide ONLY the raw JSON object, no markdown fences (like \`\`\`json) or other explanatory text.
        `;

        try {
            const result = await this.ai.models.generateContent({
                model: MODEL_NAME,
                contents: [{ role: 'user', parts: [{ text: prompt }] }], // Використовуємо об'єкт contents замість прямого передавання
                config: { responseMimeType: "application/json" }
            });

            // Перевіряємо, чи result.text визначено
            if (!result.text) {
                throw new Error("API response text was empty or undefined.");
            }

            let jsonStr = result.text.trim();
            const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
            const match = jsonStr.match(fenceRegex);
            if (match && match[1]) jsonStr = match[1].trim();

            const data = JSON.parse(jsonStr);
            if (data.drills && Array.isArray(data.drills) && data.drills.length > 0) {
                return data.drills.map((drill: any, i: number) => ({
                    id: `drill-${Date.now()}-${i}`,
                    hint: drill.hint || "No hint",
                    sentence: drill.sentence || "No sentence",
                }));
            } else {
                throw new Error("Invalid or empty drills array in API response.");
            }
        } catch (error: any) {
            console.error("Error fetching sentences from Gemini AI:", error);
            throw new Error(`AI generation failed: ${error.message || 'Unknown API error'}`);
        }
    }
}

export const geminiAIService = new GeminiAIService();