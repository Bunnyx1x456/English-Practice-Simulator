// types.ts

export interface SentencePair {
    id: string;
    hint: string;
    sentence: string;
}

export type ValidationStatus = 'pending' | 'correct' | 'incorrect';
export type InputMethod = 'keyboard' | 'speech';
export type ToastType = 'error' | 'success';

export interface Settings {
    appearanceMode: 'system' | 'light' | 'dark';
    scaling: number;
    ttsVoice: string; // Stored voice name
    voiceVolume: number;
    sentenceCount: number;
    difficulty: number; // 0-3 for emojis
    selectedSituations: string[];
    customSituations: string[];
    selectedFocuses: string[];
    customFocuses: string[];
    // Assistant settings
    assistantEnabled: boolean;
    assistantModel: string;
    assistantLanguage: string;
    generationModel: string;
}

export interface DifficultyPromptDetails {
    lengthDescription: string;
    levelDescription: string;
}

// Callbacks for UI interactions
export type OnInputValidate = (index: number, inputMethod: InputMethod, userInput: string) => void;
export type OnPlaySentence = (sentence: string) => void;
export type OnAddCustomTopic = (
    inputElement: HTMLInputElement,
    customListContainer: HTMLElement,
    settingsArray: string[],
    topicTypePrefix: 'situation' | 'focus',
    allCheckboxElement: HTMLInputElement,
    sectionContentSelector: string,
    addButton: HTMLButtonElement
) => void;
export type OnFilterCheckboxes = (
    inputElement: HTMLInputElement,
    sectionContentSelector: string,
    addButton: HTMLButtonElement
) => void;
export type OnSaveApiKey = (inputElement: HTMLInputElement) => void;
export type OnSetupChooseAllCheckboxes = (topicType: 'situation' | 'focus', allCheckbox: HTMLInputElement, sectionContentSelector: string) => void;
export type OnGetSelectedCheckboxValues = (namePrefix: string, containerElement: HTMLElement) => string[];
