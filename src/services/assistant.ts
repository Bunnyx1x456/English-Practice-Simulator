// services/assistant.ts

import { GoogleGenAI } from "@google/genai";
import { getApiKeyFromCookie } from '../utils/storage';
import { showToast } from '../utils/dom-helpers';

class AssistantService {
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
                console.log("Assistant AI client initialized.");
            } catch (e) {
                console.error("Failed to initialize Assistant GoogleGenAI with provided key:", e);
                this.ai = null;
                showToast("Failed to initialize Assistant AI with saved key.", 3000, 'error');
            }
        } else {
            this.ai = null;
            console.log("No API Key found for Assistant, AI client not initialized.");
        }
    }

    public get isInitialized(): boolean {
        return !!this.ai;
    }

    public updateApiKey() {
        this.loadApiKey();
    }

    public async getCorrectionHint(incorrectSentence: string, correctSentence: string, language: string = 'English', model: string = 'gemini-2.5-flash-lite'): Promise<string> {
        if (!this.ai) {
            throw new Error("Assistant AI client not initialized. Please provide a valid API Key.");
        }

        const prompt = `
Correct sentence: '${correctSentence}' but user type '${incorrectSentence}' 
tell the user how to correct his sentence, but don't give him the whole sentence.
you have to explain in a way that the user learns something for themselves and remembers why they are wrong.
Respond in ${language}.
Provide ONLY the explanation, no other text.
`;

        try {
            const result = await this.ai.models.generateContent({
                model: model,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
            });

            if (!result.text) {
                throw new Error("API response text was empty or undefined.");
            }

            return result.text.trim();
        } catch (error: any) {
            console.error("Error getting correction hint from Assistant AI:", error);
            throw new Error(`Assistant AI failed: ${error.message || 'Unknown API error'}`);
        }
    }
}

export const assistantService = new AssistantService();
