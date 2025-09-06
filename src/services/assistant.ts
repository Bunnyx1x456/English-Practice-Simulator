// services/assistant.ts

import { GoogleGenAI } from "@google/genai";
import { getApiKeyFromCookie } from '../utils/storage';
import { showToast } from '../utils/dom-helpers';

export interface AssistantSettings {
    enabled: boolean;
    model: string;
    language: string;
}

export interface AssistantHint {
    title: string;
    explanation: string;
    examples: string[];
}

class AssistantService {
    private ai: GoogleGenAI | null = null;
    private settings: AssistantSettings = {
        enabled: false,
        model: 'gemini-2.5-flash-lite',
        language: 'en'
    };

    constructor() {
        this.loadApiKey();
    }

    private loadApiKey() {
        const apiKey = getApiKeyFromCookie();
        if (apiKey) {
            try {
                this.ai = new GoogleGenAI({ apiKey });
                console.log("Assistant AI client initialized.");
            } catch (e) {
                console.error("Failed to initialize Assistant AI client:", e);
                this.ai = null;
            }
        }
    }

    public updateSettings(settings: AssistantSettings) {
        this.settings = { ...this.settings, ...settings };
    }

    public get currentSettings(): AssistantSettings {
        return { ...this.settings };
    }

    public async generateHint(userInput: string, correctSentence: string): Promise<AssistantHint | null> {
        if (!this.ai || !this.settings.enabled) {
            return null;
        }

        const systemInstruction = `
You are an English learning assistant. Your task is to help students understand their mistakes and learn from them.
Correct sentence: '${correctSentence}' but user type '${userInput}'
Tell the user how to correct his sentence, but don't give him the whole sentence.
You have to explain in a way that the user learns something for themselves and remembers why they are wrong.
Respond in ${this.settings.language} language.
Provide your response as a JSON object with the following structure:
{
  "title": "Brief title of the mistake type",
  "explanation": "Detailed explanation of the mistake and how to fix it",
  "examples": ["Example 1", "Example 2"]
}
`;

        try {
            const result = await this.ai.models.generateContent({
                model: this.settings.model,
                contents: [{ role: 'user', parts: [{ text: systemInstruction }] }],
                config: { responseMimeType: "application/json" }
            });

            if (!result.text) {
                throw new Error("API response text was empty or undefined.");
            }

            let jsonStr = result.text.trim();
            const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
            const match = jsonStr.match(fenceRegex);
            if (match && match[1]) jsonStr = match[1].trim();

            const hintData = JSON.parse(jsonStr);
            
            return {
                title: hintData.title || "Language Hint",
                explanation: hintData.explanation || "No explanation provided",
                examples: Array.isArray(hintData.examples) ? hintData.examples : []
            };
        } catch (error: any) {
            console.error("Error generating hint from Assistant AI:", error);
            showToast(`Assistant failed: ${error.message || 'Unknown error'}`, 3000, 'error');
            return null;
        }
    }
}

export const assistantService = new AssistantService();
