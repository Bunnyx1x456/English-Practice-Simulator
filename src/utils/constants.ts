// utils/constants.ts

export const MODEL_NAME = "gemini-2.5-flash-lite";
export const DEFAULT_SENTENCE_COUNT = 10;
export const DEFAULT_DIFFICULTY = 1; // "⚡"
export const APP_SETTINGS_KEY = 'englishLearnerSettings_v3';
export const APP_WELCOME_SHOWN_KEY = 'englishLearnerWelcomeShown_v1';
export const API_KEY_COOKIE_NAME = 'googleAiApiKey';
export const DEBOUNCE_DELAY = 300; // ms for search input debounce
export const DIFFICULTY_EMOJIS = ['👶', '⚡', '🧠', '🤯'];

// AI Models
export const AI_MODELS = {
    favorite: [
        { value: "gemini-2.5-flash-lite", label: "gemini-2.5-flash-lite", isFavorite: true }
    ],
    fastest: [
        { value: "gemini-2.5-flash-lite", label: "gemini-2.5-flash-lite (Release: July 2025) 🌟 DEFAULT", isFavorite: true },
        { value: "gemini-2.5-flash", label: "gemini-2.5-flash (Release: June 2025)" },
        { value: "gemini-1.5-flash-latest", label: "gemini-1.5-flash-latest (Points to latest release after April 2024)" },
        { value: "gemini-1.5-flash-002", label: "gemini-1.5-flash-002 (Release: September 2024)" },
        { value: "gemini-1.5-flash-8b-latest", label: "gemini-1.5-flash-8b-latest (Release: October 2024)" }
    ],
    mostPowerful: [
        { value: "gemini-2.5-pro", label: "gemini-2.5-pro (Release: June 2025)" },
        { value: "gemini-2.5-pro-preview-06-05", label: "gemini-2.5-pro-preview-06-05 (Release: June 2025)" },
        { value: "gemini-2.5-pro-preview-05-06", label: "gemini-2.5-pro-preview-05-06 (Release: May 2025)" },
        { value: "gemini-1.5-pro-latest", label: "gemini-1.5-pro-latest (Points to latest release after April 2024)" },
        { value: "gemini-1.5-pro-002", label: "gemini-1.5-pro-002 (Release: September 2024)" },
        { value: "gemini-1.5-pro", label: "gemini-1.5-pro (Release: May 2024)" }
    ]
};

// Assistant Languages
export const ASSISTANT_LANGUAGES = [
    { value: "English", label: "English" },
    { value: "Spanish", label: "Spanish" },
    { value: "French", label: "French" },
    { value: "German", label: "German" },
    { value: "Italian", label: "Italian" },
    { value: "Portuguese", label: "Portuguese" },
    { value: "Russian", label: "Russian" },
    { value: "Chinese", label: "Chinese" },
    { value: "Japanese", label: "Japanese" },
    { value: "Korean", label: "Korean" },
    { value: "Arabic", label: "Arabic" },
    { value: "Hindi", label: "Hindi" }
];
