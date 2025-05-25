/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// --- Constants ---
const MODEL_NAME = "gemini-2.5-flash-preview-05-20";
const DEFAULT_SENTENCE_COUNT = 10;
const DEFAULT_DIFFICULTY = 1; // "⚡"
const APP_SETTINGS_KEY = 'englishLearnerSettings_v3';
const APP_WELCOME_SHOWN_KEY = 'englishLearnerWelcomeShown_v1';
const API_KEY_COOKIE_NAME = 'googleAiApiKey'; // New constant for cookie name
const DEBOUNCE_DELAY = 300; // ms for search input debounce

// --- DOM Elements ---
let drillContentAreaElement: HTMLElement;
let newGameButton: HTMLButtonElement;
let settingsButton: HTMLButtonElement; // Corrected type
let helpButton: HTMLButtonElement;
let micButton: HTMLButtonElement;

let settingsModal: HTMLElement;
let appearanceModeSelect: HTMLSelectElement;
let scalingRange: HTMLInputElement;
let scalingValueDisplay: HTMLElement;
let ttsVoiceSelect: HTMLSelectElement;
let voiceVolumeRange: HTMLInputElement;
let voiceVolumeValueDisplay: HTMLElement;
let sentenceCountRange: HTMLInputElement;
let sentenceCountValueDisplay: HTMLElement;
let difficultyRange: HTMLInputElement;
let difficultyValueDisplay: HTMLElement;
let backButtonSettings: HTMLButtonElement;
let saveButtonSettings: HTMLButtonElement;

let welcomeModalElement: HTMLElement;
let closeWelcomeModalButton: HTMLButtonElement;
let openFeedbackButton: HTMLButtonElement;

// New API Key DOM Elements
let apiKeyInputWelcome: HTMLInputElement;
let saveApiKeyWelcomeButton: HTMLButtonElement;
let apiKeyInputSettings: HTMLInputElement;
let saveApiKeySettingsButton: HTMLButtonElement;


let customSituationInput: HTMLInputElement;
let addCustomSituationButton: HTMLButtonElement;
let customSituationsListElement: HTMLElement;
let predefinedSituationsListElement: HTMLElement;
let customSituationsHeader: HTMLElement;

let customFocusInput: HTMLInputElement;
let addCustomFocusButton: HTMLButtonElement;
let customFocusesListElement: HTMLElement;
let predefinedFocusesListElement: HTMLElement;
let customFocusesHeader: HTMLElement;

let situationAllCheckbox: HTMLInputElement;
let focusAllCheckbox: HTMLInputElement;


let loadingOverlay: HTMLElement;
let toastElement: HTMLElement;
let confettiContainer: HTMLElement;


// --- Application State ---
interface SentencePair {
    id: string;
    hint: string;
    sentence: string;
}

type ValidationStatus = 'pending' | 'correct' | 'incorrect';
type InputMethod = 'keyboard' | 'speech';
type ToastType = 'error' | 'success';


let sentences: SentencePair[] = [];
let userInputs: string[] = [];
let validationStates: ValidationStatus[] = [];
let activeDrillIndex: number = 0;

let isGenerating: boolean = false;
let isRecognizingSpeech: boolean = false;
let isProcessingValidation: boolean = false;
let gameJustCompleted: boolean = false;
let toastHideTimer: number | undefined;

let currentApiKey: string | null = null; // New mutable API Key variable


interface Settings {
    appearanceMode: 'system' | 'light' | 'dark';
    scaling: number;
    ttsVoice: string;
    voiceVolume: number;
    sentenceCount: number;
    difficulty: number;
    selectedSituations: string[];
    selectedFocuses: string[];
    customSituations: string[];
    customFocuses: string[];
}

let currentSettings: Settings = {
    appearanceMode: 'system',
    scaling: 100,
    ttsVoice: '',
    voiceVolume: 80,
    sentenceCount: DEFAULT_SENTENCE_COUNT,
    difficulty: DEFAULT_DIFFICULTY,
    selectedSituations: ["General Conversation"],
    selectedFocuses: ["Common Vocabulary"],
    customSituations: [],
    customFocuses: [],
};

// --- Gemini AI Client ---
let ai: GoogleGenAI | null = null;

// --- Speech Synthesis & Recognition ---
let synth: SpeechSynthesis | null = null;
let voices: SpeechSynthesisVoice[] = [];
let recognition: any | null = null;
let speechInputTarget: HTMLTextAreaElement | null = null;
let currentSpeechInputListeners: { type: string, handler: EventListener }[] = [];

// --- Resize Observer for Hint Sync ---
let hintSyncObserver: ResizeObserver | null = null;


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    queryDOMElements();
    loadApiKeyFromCookie(); // Load API key first
    initializeGeminiAI(); // Initialize AI client based on loaded key

    initializeHintSyncObserver();
    setupEventListeners();
    setupCollapsibleSettings();

    if ('speechSynthesis' in window) {
        synth = window.speechSynthesis;
    } else {
        console.warn("Text-to-Speech not supported by this browser.");
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = handleSpeechResult;
        recognition.onerror = handleSpeechError;
        recognition.onstart = () => {
            isRecognizingSpeech = true;
            micButton.classList.add('active-mic');
            micButton.setAttribute('aria-label', 'Stop voice input');
            updateSpeechTargetAndListeners();
        };
        recognition.onend = () => {
            isRecognizingSpeech = false;
            micButton.classList.remove('active-mic');
            micButton.setAttribute('aria-label', 'Start voice input');

            if (speechInputTarget) {
                currentSpeechInputListeners.forEach(listener => {
                    speechInputTarget!.removeEventListener(listener.type, listener.handler);
                });
            }
            currentSpeechInputListeners = [];
            speechInputTarget = null;
        };
    } else {
        console.warn("Speech Recognition not supported by this browser.");
        micButton.disabled = true;
        showToast("Speech input not supported by this browser.", 3500, 'error');
    }

    loadSettings();
    renderLists();

    const welcomeShown = localStorage.getItem(APP_WELCOME_SHOWN_KEY);
    if (!welcomeShown) {
        openWelcomeModal();
    }
});

function queryDOMElements() {
    drillContentAreaElement = document.getElementById('drill-content-area')!;
    newGameButton = document.getElementById('new-game-button') as HTMLButtonElement;
    settingsButton = document.getElementById('settings-button') as HTMLButtonElement;
    helpButton = document.getElementById('help-button') as HTMLButtonElement;
    micButton = document.getElementById('mic-button') as HTMLButtonElement;

    settingsModal = document.getElementById('settings-modal')!;
    appearanceModeSelect = document.getElementById('appearance-mode') as HTMLSelectElement;
    scalingRange = document.getElementById('scaling-range') as HTMLInputElement;
    scalingValueDisplay = document.getElementById('scaling-value')!;
    ttsVoiceSelect = document.getElementById('tts-voice') as HTMLSelectElement;
    voiceVolumeRange = document.getElementById('voice-volume') as HTMLInputElement;
    voiceVolumeValueDisplay = document.getElementById('voice-volume-value')!;
    sentenceCountRange = document.getElementById('sentence-count') as HTMLInputElement;
    sentenceCountValueDisplay = document.getElementById('sentence-count-value')!;
    difficultyRange = document.getElementById('difficulty-level') as HTMLInputElement;
    difficultyValueDisplay = document.getElementById('difficulty-value')!;
    backButtonSettings = document.getElementById('back-button-settings') as HTMLButtonElement;
    saveButtonSettings = document.getElementById('save-button-settings') as HTMLButtonElement;

    welcomeModalElement = document.getElementById('welcome-modal')!;
    closeWelcomeModalButton = document.getElementById('close-welcome-modal-button') as HTMLButtonElement;
    openFeedbackButton = document.getElementById('open-feedback-button') as HTMLButtonElement;

    // New API Key DOM Elements
    apiKeyInputWelcome = document.getElementById('api-key-input-welcome') as HTMLInputElement;
    saveApiKeyWelcomeButton = document.getElementById('save-api-key-welcome-button') as HTMLButtonElement;
    apiKeyInputSettings = document.getElementById('api-key-input-settings') as HTMLInputElement;
    saveApiKeySettingsButton = document.getElementById('save-api-key-settings-button') as HTMLButtonElement;


    customSituationInput = document.getElementById('custom-situation-input') as HTMLInputElement;
    addCustomSituationButton = document.getElementById('add-custom-situation-button') as HTMLButtonElement;
    customSituationsListElement = document.getElementById('custom-situations-list')!;
    predefinedSituationsListElement = document.getElementById('predefined-situations-list')!;
    customSituationsHeader = document.getElementById('custom-situations-header')!;


    customFocusInput = document.getElementById('custom-focus-input') as HTMLInputElement;
    addCustomFocusButton = document.getElementById('add-custom-focus-button') as HTMLButtonElement;
    customFocusesListElement = document.getElementById('custom-focuses-list')!;
    predefinedFocusesListElement = document.getElementById('predefined-focuses-list')!;
    customFocusesHeader = document.getElementById('custom-focuses-header')!;

    situationAllCheckbox = document.getElementById('situation-all') as HTMLInputElement;
    focusAllCheckbox = document.getElementById('focus-all') as HTMLInputElement;

    loadingOverlay = document.getElementById('loading-overlay')!;
    toastElement = document.getElementById('toast-message')!;
    confettiContainer = document.getElementById('confetti-container')!;
}

// --- Cookie Functions ---
function setCookie(name: string, value: string, days: number) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/; SameSite=Lax";
}

function getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function loadApiKeyFromCookie() {
    currentApiKey = getCookie(API_KEY_COOKIE_NAME);
    if (currentApiKey) {
        console.log("API Key loaded from cookie.");
    }
}

function initializeGeminiAI() {
    if (currentApiKey) {
        try {
            ai = new GoogleGenAI({ apiKey: currentApiKey });
            console.log("Gemini AI client initialized.");
            // No need for a toast here, it's done silently on load
        } catch (e) {
            console.error("Failed to initialize GoogleGenAI with provided key:", e);
            ai = null;
            currentApiKey = null; // Invalidate key if initialization fails
            showToast("Failed to initialize AI with saved key. Please re-enter.", 5000, 'error');
        }
    } else {
        ai = null;
        console.log("No API Key found, AI client not initialized.");
    }
}

function handleSaveApiKey(inputElement: HTMLInputElement) {
    const key = inputElement.value.trim();
    if (key) {
        try {
            setCookie(API_KEY_COOKIE_NAME, key, 365); // Store for 1 year
            currentApiKey = key;
            initializeGeminiAI(); // Re-initialize AI client
            inputElement.classList.remove('incorrect');
            inputElement.classList.add('correct');
            showToast("API Key saved successfully!", 2500, 'success');
        } catch (e) {
            console.error("Error saving API Key to cookie:", e);
            inputElement.classList.remove('correct');
            inputElement.classList.add('incorrect');
            showToast("Error saving API Key. Please try again.", 3000, 'error');
        }
    } else {
        setCookie(API_KEY_COOKIE_NAME, '', -1); // Clear cookie
        currentApiKey = null;
        initializeGeminiAI(); // Clear AI client
        inputElement.classList.remove('correct');
        inputElement.classList.add('incorrect');
        showToast("API Key cannot be empty.", 3000, 'error');
    }
}


// --- Utility Functions ---
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
    let timeout: number | undefined;
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
        new Promise(resolve => {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = window.setTimeout(() => resolve(func(...args)), waitFor);
        });
}


function setupEventListeners() {
    newGameButton.addEventListener('click', startNewGame);
    settingsButton.addEventListener('click', openSettingsModal);
    helpButton.addEventListener('click', openWelcomeModal);
    micButton.addEventListener('click', toggleSpeechRecognition);

    backButtonSettings.addEventListener('click', closeSettingsModal);
    saveButtonSettings.addEventListener('click', saveAndApplySettings);

    closeWelcomeModalButton.addEventListener('click', closeWelcomeModal);
    openFeedbackButton.addEventListener('click', openFeedbackForm);

    // API Key button listeners
    saveApiKeyWelcomeButton.addEventListener('click', () => handleSaveApiKey(apiKeyInputWelcome));
    saveApiKeySettingsButton.addEventListener('click', () => handleSaveApiKey(apiKeyInputSettings));


    scalingRange.addEventListener('input', () => {
        scalingValueDisplay.textContent = `${scalingRange.value}%`;
        applyScaling(parseInt(scalingRange.value));
    });
    voiceVolumeRange.addEventListener('input', () => {
        voiceVolumeValueDisplay.textContent = `${voiceVolumeRange.value}%`;
    });
    sentenceCountRange.addEventListener('input', () => sentenceCountValueDisplay.textContent = sentenceCountRange.value);
    difficultyRange.addEventListener('input', () => {
        const emojis = ['👶', '⚡', '🧠', '🤯'];
        difficultyValueDisplay.textContent = emojis[parseInt(difficultyRange.value)] || '⚡';
    });

    const debouncedFilterSituations = debounce(() => filterCheckboxesBySearch(customSituationInput, '#situations-content', addCustomSituationButton), DEBOUNCE_DELAY);
    customSituationInput.addEventListener('input', debouncedFilterSituations);
    addCustomSituationButton.addEventListener('click', () => addCustomCheckboxTopic(customSituationInput, customSituationsListElement, currentSettings.customSituations, 'situation', situationAllCheckbox, '#situations-content', addCustomSituationButton));

    const debouncedFilterFocuses = debounce(() => filterCheckboxesBySearch(customFocusInput, '#focuses-content', addCustomFocusButton), DEBOUNCE_DELAY);
    customFocusInput.addEventListener('input', debouncedFilterFocuses);
    addCustomFocusButton.addEventListener('click', () => addCustomCheckboxTopic(customFocusInput, customFocusesListElement, currentSettings.customFocuses, 'focus', focusAllCheckbox, '#focuses-content', addCustomFocusButton));

    // Event delegation for drill inputs (now textareas)
    drillContentAreaElement.addEventListener('input', handleDrillInputEvent);
    drillContentAreaElement.addEventListener('change', handleDrillChangeEvent); // May not be needed for textareas if input is primary
    drillContentAreaElement.addEventListener('keypress', handleDrillKeypressEvent);
}

// --- Event Handlers for Drill Inputs (Event Delegation) ---
function handleDrillInputEvent(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    if (target.classList.contains('sentence-input') && target.dataset.index) {
        const index = parseInt(target.dataset.index, 10);
        if (!isNaN(index) && index > 0 && index < userInputs.length) {
             userInputs[index] = target.value;
        }
        // Adjust height on input
        adjustTextareaHeight(target);
        // ResizeObserver will handle syncing the hint
    }
}

function handleDrillChangeEvent(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    if (target.classList.contains('sentence-input') && target.dataset.index) {
        const index = parseInt(target.dataset.index, 10);
         if (!isNaN(index) && index === activeDrillIndex && index > 0 && index < sentences.length) {
            validateInput(index, 'keyboard');
        }
    }
}

function handleDrillKeypressEvent(event: KeyboardEvent) {
    const target = event.target as HTMLTextAreaElement;
    if (event.key === 'Enter' && !event.shiftKey && target.classList.contains('sentence-input') && target.dataset.index) { // Enter without Shift
        const index = parseInt(target.dataset.index, 10);
        if (!isNaN(index) && index === activeDrillIndex && index > 0 && index < sentences.length) {
            event.preventDefault(); // Prevent newline in textarea
            validateInput(index, 'keyboard');
        }
    }
}

// --- Collapsible Settings Logic ---
function setupCollapsibleSettings() {
    const toggles = document.querySelectorAll<HTMLButtonElement>('.settings-section-toggle');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', (!isExpanded).toString());
            // CSS handles hiding/showing based on aria-expanded
        });
    });
}


// --- Welcome Modal Logic ---
function openWelcomeModal() {
    // Set current API key value in welcome input field
    apiKeyInputWelcome.value = currentApiKey || '';
    if (currentApiKey) {
        apiKeyInputWelcome.classList.add('correct');
        apiKeyInputWelcome.classList.remove('incorrect');
    } else {
        apiKeyInputWelcome.classList.remove('correct', 'incorrect');
    }
    welcomeModalElement.style.display = 'flex';
}

function closeWelcomeModal() {
    welcomeModalElement.style.display = 'none';
    localStorage.setItem(APP_WELCOME_SHOWN_KEY, 'true');
}

function openFeedbackForm() {
    window.open("https://forms.gle/VAu9VduKtVeg9VKv8")
}

// --- Textarea Height & Hint Sync Logic ---
function initializeHintSyncObserver() {
    if (hintSyncObserver) {
        hintSyncObserver.disconnect();
    }
    hintSyncObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            const textarea = entry.target as HTMLTextAreaElement;
            const hintId = textarea.dataset.hintId;
            if (hintId) {
                const hintElement = document.getElementById(hintId);
                if (hintElement) {
                    // Set the height of the hint element to match the textarea's offsetHeight
                    // (which includes padding and border)
                    hintElement.style.height = `${textarea.offsetHeight}px`;
                }
            }
        }
    });
}

function adjustTextareaHeight(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto'; // Collapse to content height
    textarea.style.height = `${textarea.scrollHeight}px`; // Expand to scroll height
}


// --- UI Update Functions ---
function renderLists() {
    if (!drillContentAreaElement) return;

    // Disconnect observer from old elements before clearing
    if (hintSyncObserver) {
        const oldTextareas = drillContentAreaElement.querySelectorAll('.sentence-input');
        oldTextareas.forEach(ta => hintSyncObserver!.unobserve(ta));
    }

    drillContentAreaElement.innerHTML = '';
    const ttsEnabled = currentSettings.voiceVolume > 0 && synth && voices.length > 0;

    if (!sentences || sentences.length === 0) {
        const placeholder = document.createElement('p');
        placeholder.classList.add('placeholder-text');
        placeholder.textContent = 'Adjust the settings or start a New game now.';
        drillContentAreaElement.appendChild(placeholder);
        return;
    }

    sentences.forEach((pair, index) => {
        const drillPairRow = document.createElement('div');
        drillPairRow.classList.add('drill-pair-row');
        drillPairRow.id = `drill-row-${index}`;

        const hintItem = document.createElement('div');
        hintItem.classList.add('hint-item');
        const hintItemId = `hint-item-${index}`; // Unique ID for the hint
        hintItem.id = hintItemId;
        hintItem.textContent = pair.hint;

        if (index === activeDrillIndex && index > 0) {
             hintItem.classList.add('active');
        }
        if (index === 0 || validationStates[index] === 'correct') {
            hintItem.classList.add('correct');
        }
        drillPairRow.appendChild(hintItem);

        const sentenceContainer = document.createElement('div');
        sentenceContainer.classList.add('sentence-item-container');

        const inputElement = document.createElement('textarea');
        inputElement.classList.add('sentence-input');
        inputElement.id = `sentence-input-${index}`;
        inputElement.setAttribute('data-index', index.toString());
        inputElement.setAttribute('data-hint-id', hintItemId);
        inputElement.rows = 1;

        if (index === 0) { // Base sentence
            inputElement.classList.add('correct');
            inputElement.value = pair.sentence;
            inputElement.readOnly = true;
        } else { // Subsequent sentences
            inputElement.value = userInputs[index] || '';
            inputElement.setAttribute('aria-label', `Sentence input ${index + 1}, hint: ${pair.hint}`);

            if (validationStates[index] === 'correct') {
                inputElement.classList.add('correct');
                inputElement.readOnly = true;
                // No explicit placeholder, value is shown.
            } else if (validationStates[index] === 'incorrect') {
                // This implies index === activeDrillIndex, as an incorrect one would be the active one
                inputElement.classList.add('incorrect');
                inputElement.placeholder = `Use hint: "${pair.hint}"`;
                inputElement.disabled = false; // Ensure editable
            } else { // validationStates[index] === 'pending'
                if (index === activeDrillIndex) {
                    inputElement.placeholder = `Use hint: "${pair.hint}"`;
                    inputElement.disabled = false; // Current active input
                    inputElement.classList.add('is-active-target');
                } else {
                    // This covers pending items that are NOT the activeDrillIndex
                    // i.e., index > activeDrillIndex (future locked items)
                    // or index < activeDrillIndex (past pending items, though less common)
                    inputElement.placeholder = "Locked";
                    inputElement.disabled = true;
                }
            }
        }

        sentenceContainer.appendChild(inputElement);
        // Add speaker button only if TTS enabled AND (base sentence OR sentence is correct)
        if (ttsEnabled && (index === 0 || validationStates[index] === 'correct')) {
            sentenceContainer.appendChild(createSpeakerButton(pair.sentence, index));
        }

        drillPairRow.appendChild(sentenceContainer);
        drillContentAreaElement.appendChild(drillPairRow);

        // Initial height adjustment and observe
        adjustTextareaHeight(inputElement);
        if (hintSyncObserver) {
            hintSyncObserver.observe(inputElement);
        }
    });

    const activeRow = document.getElementById(`drill-row-${activeDrillIndex}`);
    if (activeRow) {
        activeRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        if (activeDrillIndex > 0 && activeDrillIndex < sentences.length) { // Check if activeDrillIndex is within valid input range
            const activeInput = activeRow.querySelector(`#sentence-input-${activeDrillIndex}`) as HTMLTextAreaElement;
            if (activeInput && !activeInput.disabled && !activeInput.readOnly && !isRecognizingSpeech && !isGenerating && document.activeElement !== activeInput) {
                activeInput.focus({ preventScroll: true });
            }
        }
    } else if (activeDrillIndex === 0 && sentences.length > 0) {
        const firstRow = document.getElementById(`drill-row-0`);
        firstRow?.scrollIntoView({behavior: 'smooth', block: 'nearest' });
    }

    if (activeDrillIndex >= sentences.length && sentences.length > 0) {
        if (gameJustCompleted) {
            showToast("Congratulations! All drills completed!", 3000, 'success');
            triggerConfettiEffect();
            highlightNewGameButton();
            gameJustCompleted = false;
        }
    }
}


function createSpeakerButton(sentenceText: string, sentenceIndex: number): HTMLButtonElement {
    const speakerButton = document.createElement('button');
    speakerButton.classList.add('speaker-icon-button');
    speakerButton.setAttribute('aria-label', `Play sentence: ${sentenceText}`);
    speakerButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
    speakerButton.addEventListener('click', (e) => {
        e.stopPropagation();
        playSentenceAudio(sentenceText);
    });
    return speakerButton;
}

function showLoading(show: boolean) {
    isGenerating = show;
    loadingOverlay.style.display = show ? 'flex' : 'none';
    document.body.setAttribute('aria-busy', show.toString());
    newGameButton.disabled = show;
    settingsButton.disabled = show;
    helpButton.disabled = show;
    micButton.disabled = show || (sentences.length === 0 && activeDrillIndex === 0);
}

function showToast(message: string, duration: number = 3500, type: ToastType = 'error') {
    console.log(`Toast (${type}): ${message}`);
    if (toastHideTimer) {
        clearTimeout(toastHideTimer);
    }

    toastElement.textContent = message;
    toastElement.classList.remove('show', 'error-style', 'success-style', 'show-above-footer');
    toastElement.classList.add(type === 'success' ? 'success-style' : 'error-style');
    toastElement.style.display = 'block';
    void toastElement.offsetWidth;
    toastElement.classList.add('show', 'show-above-footer');

    toastHideTimer = window.setTimeout(() => {
        toastElement.classList.remove('show', 'show-above-footer');
        window.setTimeout(() => {
            if (!toastElement.classList.contains('show')) {
                toastElement.style.display = 'none';
            }
        }, 300);
    }, duration);
}

// --- Core Logic Functions ---
async function startNewGame() {
    if (isGenerating) return;
    showLoading(true);
    if (isRecognizingSpeech) recognition.stop();

    if (hintSyncObserver) {
        hintSyncObserver.disconnect(); // Stop observing all elements before clearing
    }

    sentences = [];
    userInputs = [];
    validationStates = [];
    activeDrillIndex = 0;
    gameJustCompleted = false;

    if (!currentApiKey || !ai) { // Check for API key and initialized AI client
        showToast("API Key not provided or invalid. Please enter it in Settings or the Welcome screen.", 5000, 'error');
        sentences = generatePlaceholderSentences(currentSettings.sentenceCount);
    } else {
        try {
            const difficultyDetails = getDifficultyPromptDetails(currentSettings.difficulty);

            const selectedPredefinedSituations = getSelectedCheckboxValues('situation-', predefinedSituationsListElement);
            const selectedCustomSituations = getSelectedCheckboxValues('custom-situation-', customSituationsListElement);
            let situationsPrompt = [...selectedPredefinedSituations, ...selectedCustomSituations].join(', ');
            situationsPrompt = situationsPrompt || "any common situation";

            const selectedPredefinedFocuses = getSelectedCheckboxValues('focus-', predefinedFocusesListElement);
            const selectedCustomFocuses = getSelectedCheckboxValues('custom-focus-', customFocusesListElement);
            let focusesPrompt = [...selectedPredefinedFocuses, ...selectedCustomFocuses].join(', ');
            focusesPrompt = focusesPrompt || "general vocabulary and grammar";


            let prompt = `
              Generate a JSON object for an English substitution drill exercise.
              The JSON response must be a valid JSON object with a single root key "drills".
              The value of "drills" must be an array of drill objects. Each drill object must have "hint" and "sentence" string properties.
              The first drill object's "sentence" is the base sentence. Subsequent "hint"s must logically modify the PREVIOUS drill's "sentence" to form the new "sentence".
              Hints should be concise (1-4 words). The JSON must be strictly valid: all strings and keys must be double-quoted, and no trailing commas are allowed.

              Generate ${currentSettings.sentenceCount} such drill objects.

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

            const response: GenerateContentResponse = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

            let jsonStr = response.text.trim();
            const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
            const match = jsonStr.match(fenceRegex);
            if (match && match[1]) jsonStr = match[1].trim();

            const data = JSON.parse(jsonStr);
            if (data.drills && Array.isArray(data.drills) && data.drills.length > 0) {
                sentences = data.drills.map((drill: any, i: number) => ({
                    id: `drill-${Date.now()}-${i}`,
                    hint: drill.hint || "No hint",
                    sentence: drill.sentence || "No sentence",
                }));
            } else {
                throw new Error("Invalid or empty drills array in API response.");
            }
        } catch (error: any) {
            console.error("Error fetching sentences:", error);
            showToast(`Failed to generate: ${error.message || 'Unknown API error'}. Placeholders used.`, 5000, 'error');
            sentences = generatePlaceholderSentences(currentSettings.sentenceCount);
        }
    }

    userInputs = new Array(sentences.length).fill('');
    validationStates = new Array(sentences.length).fill('pending');
    if (sentences.length > 0) {
      validationStates[0] = 'correct';
      activeDrillIndex = 1;
    } else {
      activeDrillIndex = 0;
    }

    renderLists();
    showLoading(false);
}

interface DifficultyPromptDetails { lengthDescription: string; levelDescription: string; }
function getDifficultyPromptDetails(level: number): DifficultyPromptDetails {
    switch (level) {
        case 0: return { lengthDescription: "short (3-6 words)", levelDescription: "A0-A1" };
        case 1: return { lengthDescription: "medium (5-7 words)", levelDescription: "A2-B1" };
        case 2: return { lengthDescription: "large (7-12 words)", levelDescription: "B2-C1" };
        case 3: return { lengthDescription: "medium compound, using commas (10-15 words)", levelDescription: "A1-C1 elements, progressively complex" };
        default: return { lengthDescription: "medium (5-7 words)", levelDescription: "A2-B1" };
    }
}

function generatePlaceholderSentences(count: number): SentencePair[] {
    const placeholders: SentencePair[] = [];
    if (count > 0) {
      placeholders.push({ id: 'ph-0', hint: "Base sentence", sentence: "This is a sample sentence. It might be long enough to wrap if the window is narrow."});
      for (let i = 1; i < count; i++) {
          placeholders.push({
              id: `ph-${i}`,
              hint: `Hint for placeholder ${i+1} which could also be quite long and cause wrapping.`,
              sentence: `Placeholder sentence ${i + 1}. (API error or not configured)`,
          });
      }
    }
    return placeholders;
}

function normalizeSentenceForComparison(text: string): string {
    if (!text) return "";
    return text
        .toLowerCase()
        .replace(/[.,!?&/^"“”;:]/g, '')
        .replace(/\b(comma|period|question mark|exclamation point|quote|unquote)\b/g, '')
        .replace(/\s+/g, ' ').trim();
}

function validateInput(index: number, inputMethod: InputMethod = 'keyboard') {
    if (isProcessingValidation) return;
    if (index === 0 || index >= sentences.length || validationStates[index] === 'correct') {
        return;
    }
    isProcessingValidation = true;

    try {
        const userInput = normalizeSentenceForComparison(userInputs[index]);
        const targetSentence = normalizeSentenceForComparison(sentences[index].sentence);

        if (userInput === targetSentence) {
            validationStates[index] = 'correct';
            if (inputMethod === 'keyboard' && currentSettings.voiceVolume > 0 && synth) {
                playSentenceAudio(sentences[index].sentence);
            }

            const isLastSentence = index === sentences.length - 1;

            if (!isLastSentence) {
                activeDrillIndex = index + 1;
            } else {
                activeDrillIndex = sentences.length;
                gameJustCompleted = true;
                if (inputMethod === 'speech' && isRecognizingSpeech) {
                    recognition.stop();
                }
            }
            renderLists();

            if (inputMethod === 'speech' && isRecognizingSpeech && !isLastSentence) {
                updateSpeechTargetAndListeners();
            }

        } else {
            validationStates[index] = 'incorrect';
            showToast("Try again! Check the hint and your sentence.", 2000, 'error');
            renderLists();
        }
    } finally {
        requestAnimationFrame(() => {
            isProcessingValidation = false;
        });
    }
}


// --- Settings Modal Logic ---
function openSettingsModal() {
    updateSettingsUI();
    // Set current API key value in settings input field
    apiKeyInputSettings.value = currentApiKey || '';
    if (currentApiKey) {
        apiKeyInputSettings.classList.add('correct');
        apiKeyInputSettings.classList.remove('incorrect');
    } else {
        apiKeyInputSettings.classList.remove('correct', 'incorrect');
    }

    setupChooseAllCheckboxes('situation', situationAllCheckbox, '#situations-content');
    setupChooseAllCheckboxes('focus', focusAllCheckbox, '#focuses-content');
    settingsModal.style.display = 'flex';
}

function closeSettingsModal() {
    customSituationInput.value = '';
    customFocusInput.value = '';
    filterCheckboxesBySearch(customSituationInput, '#situations-content', addCustomSituationButton);
    filterCheckboxesBySearch(customFocusInput, '#focuses-content', addCustomFocusButton);
    settingsModal.style.display = 'none';
}

function getSelectedCheckboxValues(namePrefix: string, containerElement: HTMLElement): string[] {
    const values: string[] = [];
    containerElement.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name^="${namePrefix}"]:checked`).forEach(cb => {
        if (!cb.id.endsWith('-all')) {
            values.push(cb.value);
        }
    });
    return values;
}

function setSelectedCheckboxValues(namePrefix: string, valuesToSelect: string[], containerElement: HTMLElement, allCheckbox: HTMLInputElement | null) {
    let allSelected = true;
    let hasCheckboxes = false;
    containerElement.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name^="${namePrefix}"]`).forEach(cb => {
        if (!cb.id.endsWith('-all')) {
            hasCheckboxes = true;
            cb.checked = valuesToSelect.includes(cb.value);
            if (!cb.checked) {
                allSelected = false;
            }
        }
    });
    if (allCheckbox && hasCheckboxes) {
        allCheckbox.checked = allSelected;
    } else if (allCheckbox) {
        allCheckbox.checked = false;
    }
}


function setupChooseAllCheckboxes(topicType: 'situation' | 'focus', allCheckbox: HTMLInputElement, sectionContentSelector: string) {
    const sectionContentElement = document.querySelector(sectionContentSelector);
    if (!sectionContentElement) return;

    const individualCheckboxes = Array.from(sectionContentElement.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name^="${topicType}-"], input[type="checkbox"][name^="custom-${topicType}-"]`));

    const relevantIndividualCheckboxes = individualCheckboxes.filter(cb => cb.id !== allCheckbox.id);

    const currentHandler = (allCheckbox as any)._handler;
    if (currentHandler) {
        allCheckbox.removeEventListener('change', currentHandler);
    }
    (allCheckbox as any)._handler = () => {
        relevantIndividualCheckboxes.forEach(cb => cb.checked = allCheckbox.checked);
    };
    allCheckbox.addEventListener('change', (allCheckbox as any)._handler);

    relevantIndividualCheckboxes.forEach(cb => {
        const currentCbHandler = (cb as any)._handler;
        if (currentCbHandler) {
            cb.removeEventListener('change', currentCbHandler);
        }
        (cb as any)._handler = () => {
            allCheckbox.checked = relevantIndividualCheckboxes.every(iCb => iCb.checked);
        };
        cb.addEventListener('change', (cb as any)._handler);
    });

    if (relevantIndividualCheckboxes.length > 0) {
        allCheckbox.checked = relevantIndividualCheckboxes.every(iCb => iCb.checked);
    } else {
        allCheckbox.checked = false;
    }
}


function filterCheckboxesBySearch(inputElement: HTMLInputElement, sectionContentSelector: string, addButton: HTMLButtonElement) {
    const searchTerm = inputElement.value.toLowerCase().trim();
    const sectionContentElement = document.querySelector(sectionContentSelector);
    if (!sectionContentElement) return;

    let exactMatchFound = false;
    const checkboxes = sectionContentElement.querySelectorAll<HTMLDivElement>('.setting-item.checkbox-item');

    checkboxes.forEach(item => {
        const label = item.querySelector('label');
        const checkboxInput = item.querySelector('input[type="checkbox"]');
        if (label && checkboxInput && checkboxInput.id !== `${inputElement.id.includes('situation') ? 'situation' : 'focus'}-all`) {
            const labelText = label.textContent?.toLowerCase() || '';
            if (labelText.includes(searchTerm)) {
                item.classList.remove('hidden-by-search');
                if (labelText === searchTerm) {
                    exactMatchFound = true;
                }
            } else {
                item.classList.add('hidden-by-search');
            }
        }
    });
    addButton.disabled = exactMatchFound || searchTerm === '';
}

function addCustomCheckboxTopic(
    inputElement: HTMLInputElement,
    customListContainer: HTMLElement,
    settingsArray: string[],
    topicTypePrefix: 'situation' | 'focus',
    allCheckboxElement: HTMLInputElement,
    sectionContentSelector: string,
    addButton: HTMLButtonElement
) {
    const topicValue = inputElement.value.trim();
    if (!topicValue) return;

    let isDuplicate = false;
    const sectionContentElement = document.querySelector(sectionContentSelector);
    if (sectionContentElement) {
        sectionContentElement.querySelectorAll<HTMLInputElement>(`input[type="checkbox"]`).forEach(cb => {
            if (cb.value.toLowerCase() === topicValue.toLowerCase()) {
                isDuplicate = true;
            }
        });
    }

    if (isDuplicate) {
        showToast(`"${topicValue}" already exists.`, 2500, 'error');
        return;
    }

    if (!settingsArray.map(s => s.toLowerCase()).includes(topicValue.toLowerCase())) {
        settingsArray.push(topicValue);

        const checkboxId = `custom-${topicTypePrefix}-${topicValue.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;

        const newItem = document.createElement('div');
        newItem.classList.add('setting-item', 'checkbox-item');

        const newCheckbox = document.createElement('input');
        newCheckbox.type = 'checkbox';
        newCheckbox.id = checkboxId;
        newCheckbox.name = `custom-${topicTypePrefix}-${topicValue.replace(/\s+/g, '_')}`;
        newCheckbox.value = topicValue;
        newCheckbox.checked = true;

        const newLabel = document.createElement('label');
        newLabel.htmlFor = checkboxId;
        newLabel.textContent = topicValue;

        newItem.appendChild(newCheckbox);
        newItem.appendChild(newLabel);
        customListContainer.appendChild(newItem);

        setupChooseAllCheckboxes(topicTypePrefix, allCheckboxElement, sectionContentSelector);
        allCheckboxElement.checked = Array.from(sectionContentElement!.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name^="${topicTypePrefix}-"], input[type="checkbox"][name^="custom-${topicTypePrefix}-"]`))
                                      .filter(cb => cb.id !== allCheckboxElement.id && !cb.closest('.hidden-by-search'))
                                      .every(cb => cb.checked);


        inputElement.value = '';
        filterCheckboxesBySearch(inputElement, sectionContentSelector, addButton);

        const customHeader = topicTypePrefix === 'situation' ? customSituationsHeader : customFocusesHeader;
        customHeader.style.display = 'block';

    } else {
        showToast(`"${topicValue}" already exists.`, 2500, 'error');
    }
}

function ensureCustomCheckboxExists(
    topicValue: string,
    customListContainer: HTMLElement,
    topicTypePrefix: 'situation' | 'focus'
): HTMLInputElement {
    const deterministicId = `custom-${topicTypePrefix}-${topicValue.replace(/\s+/g, '-').toLowerCase()}`;
    let existingCheckbox = customListContainer.querySelector<HTMLInputElement>(`#${deterministicId}`);

    if (!existingCheckbox) {
        const allCustomCheckboxes = customListContainer.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][value="${topicValue}"]`);
        if (allCustomCheckboxes.length > 0) existingCheckbox = allCustomCheckboxes[0];
    }

    if (!existingCheckbox) {
        const newItem = document.createElement('div');
        newItem.classList.add('setting-item', 'checkbox-item');

        const newCheckbox = document.createElement('input');
        newCheckbox.type = 'checkbox';
        newCheckbox.id = deterministicId;
        newCheckbox.name = `custom-${topicTypePrefix}-${topicValue.replace(/\s+/g, '_')}`;
        newCheckbox.value = topicValue;

        const newLabel = document.createElement('label');
        newLabel.htmlFor = deterministicId;
        newLabel.textContent = topicValue;

        newItem.appendChild(newCheckbox);
        newItem.appendChild(newLabel);
        customListContainer.appendChild(newItem);
        existingCheckbox = newCheckbox;

        const customHeader = topicTypePrefix === 'situation' ? customSituationsHeader : customFocusesHeader;
        customHeader.style.display = 'block';
    }
    return existingCheckbox;
}


function updateSettingsUI() {
    appearanceModeSelect.value = currentSettings.appearanceMode;
    scalingRange.value = currentSettings.scaling.toString();
    scalingValueDisplay.textContent = `${currentSettings.scaling}%`;
    applyScaling(currentSettings.scaling);

    voiceVolumeRange.value = currentSettings.voiceVolume.toString();
    voiceVolumeValueDisplay.textContent = `${currentSettings.voiceVolume}%`;

    ttsVoiceSelect.value = currentSettings.ttsVoice;

    sentenceCountRange.value = currentSettings.sentenceCount.toString();
    sentenceCountValueDisplay.textContent = currentSettings.sentenceCount.toString();
    difficultyRange.value = currentSettings.difficulty.toString();
    const emojis = ['👶', '⚡', '🧠', '🤯'];
    difficultyValueDisplay.textContent = emojis[currentSettings.difficulty] || '⚡';

    customSituationsListElement.innerHTML = '';
    customFocusesListElement.innerHTML = '';
    customSituationsHeader.style.display = 'none';
    customFocusesHeader.style.display = 'none';

    currentSettings.customSituations.forEach(topic => ensureCustomCheckboxExists(topic, customSituationsListElement, 'situation'));
    currentSettings.customFocuses.forEach(topic => ensureCustomCheckboxExists(topic, customFocusesListElement, 'focus'));

    setSelectedCheckboxValues('situation-', currentSettings.selectedSituations, predefinedSituationsListElement, situationAllCheckbox);
    setSelectedCheckboxValues('custom-situation-', currentSettings.selectedSituations, customSituationsListElement, null);

    setSelectedCheckboxValues('focus-', currentSettings.selectedFocuses, predefinedFocusesListElement, focusAllCheckbox);
    setSelectedCheckboxValues('custom-focus-', currentSettings.selectedFocuses, customFocusesListElement, null);

    setupChooseAllCheckboxes('situation', situationAllCheckbox, '#situations-content');
    setupChooseAllCheckboxes('focus', focusAllCheckbox, '#focuses-content');

    if (customSituationsListElement.children.length > 0) customSituationsHeader.style.display = 'block';
    if (customFocusesListElement.children.length > 0) customFocusesHeader.style.display = 'block';
}

function saveAndApplySettings() {
    const oldVolume = currentSettings.voiceVolume;
    const oldTtsVoice = currentSettings.ttsVoice;

    currentSettings.appearanceMode = appearanceModeSelect.value as Settings['appearanceMode'];
    currentSettings.scaling = parseInt(scalingRange.value);
    currentSettings.ttsVoice = ttsVoiceSelect.value;
    currentSettings.voiceVolume = parseInt(voiceVolumeRange.value);
    currentSettings.sentenceCount = parseInt(sentenceCountRange.value);
    currentSettings.difficulty = parseInt(difficultyRange.value);

    const selectedPredefinedSituations = getSelectedCheckboxValues('situation-', predefinedSituationsListElement);
    const selectedCustomSituationsFromDOM = getSelectedCheckboxValues('custom-situation-', customSituationsListElement);
    currentSettings.selectedSituations = [...new Set([...selectedPredefinedSituations, ...selectedCustomSituationsFromDOM])];

    const selectedPredefinedFocuses = getSelectedCheckboxValues('focus-', predefinedFocusesListElement);
    const selectedCustomFocusesFromDOM = getSelectedCheckboxValues('custom-focus-', customFocusesListElement);
    currentSettings.selectedFocuses = [...new Set([...selectedPredefinedFocuses, ...selectedCustomFocusesFromDOM])];

    applyAppearanceMode();
    applyScaling(currentSettings.scaling);

    const ttsSettingsChanged = oldVolume !== currentSettings.voiceVolume || oldTtsVoice !== currentSettings.ttsVoice;
    if (ttsSettingsChanged) {
        toggleTTSAvailability(currentSettings.voiceVolume > 0);
    }

    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(currentSettings));
    closeSettingsModal();
}

function loadSettings() {
    const savedSettings = localStorage.getItem(APP_SETTINGS_KEY);
    if (savedSettings) {
        try {
            const parsedSettings = JSON.parse(savedSettings);
            currentSettings = {
                ...currentSettings,
                ...parsedSettings,
                customSituations: Array.isArray(parsedSettings.customSituations) ? parsedSettings.customSituations : [],
                customFocuses: Array.isArray(parsedSettings.customFocuses) ? parsedSettings.customFocuses : [],
            };
        } catch (e) { console.error("Failed to parse saved settings:", e); }
    }
    applyAppearanceMode();
    applyScaling(currentSettings.scaling);
    toggleTTSAvailability(currentSettings.voiceVolume > 0);
    updateSettingsUI();
}

function applyAppearanceMode() {
    document.body.classList.remove('light-mode', 'dark-mode');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (currentSettings.appearanceMode === 'light' || (currentSettings.appearanceMode === 'system' && !prefersDark)) {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.add('dark-mode');
    }
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (currentSettings.appearanceMode === 'system') applyAppearanceMode();
});

function applyScaling(scaleValue: number) {
    currentSettings.scaling = scaleValue;
    document.documentElement.style.fontSize = `${(scaleValue / 100) * 16}px`;
}

// --- Speech Synthesis Functions ---
function toggleTTSAvailability(enable: boolean) {
    if (!synth) {
        ttsVoiceSelect.disabled = true;
        ttsVoiceSelect.innerHTML = '<option value="">TTS Not Available</option>';
        currentSettings.ttsVoice = "";
        renderLists();
        return;
    }

    if (enable) {
        ttsVoiceSelect.disabled = false;
        if (speechSynthesis.onvoiceschanged !== undefined && voices.length === 0) {
             speechSynthesis.onvoiceschanged = () => {
                populateVoiceList();
                renderLists();
             };
        } else {
            populateVoiceList();
            renderLists();
        }
    } else {
        ttsVoiceSelect.disabled = true;
        ttsVoiceSelect.innerHTML = '<option value="">TTS Disabled (Volume 0%)</option>';
        currentSettings.ttsVoice = "";
        if (synth.speaking) synth.cancel();
        renderLists();
    }
}


function populateVoiceList() {
    if (!synth || currentSettings.voiceVolume === 0) {
      if (currentSettings.voiceVolume === 0) {
        ttsVoiceSelect.disabled = true;
        ttsVoiceSelect.innerHTML = '<option value="">TTS Disabled (Volume 0%)</option>';
      } else if (!synth) {
        ttsVoiceSelect.disabled = true;
        ttsVoiceSelect.innerHTML = '<option value="">TTS Not Supported</option>';
      }
      voices = [];
      currentSettings.ttsVoice = "";
      return;
    }

    voices = synth.getVoices().filter(voice => voice.lang.startsWith('en'));
    const previousVoiceSetting = currentSettings.ttsVoice;
    ttsVoiceSelect.innerHTML = '';

    if (voices.length === 0) {
        ttsVoiceSelect.innerHTML = '<option value="">No English voices</option>';
        currentSettings.ttsVoice = "";
        return;
    }

    voices.forEach(voice => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.value = voice.name;
        ttsVoiceSelect.appendChild(option);
    });

    const googleUSEnglishVoice = voices.find(v => v.name === "Google US English" && v.lang === "en-US");

    if (googleUSEnglishVoice) {
        ttsVoiceSelect.value = googleUSEnglishVoice.name;
        currentSettings.ttsVoice = googleUSEnglishVoice.name;
    } else if (voices.find(v => v.name === previousVoiceSetting)) {
        ttsVoiceSelect.value = previousVoiceSetting;
    } else if (voices.length > 0) {
        ttsVoiceSelect.value = voices[0].name;
        currentSettings.ttsVoice = voices[0].name;
    } else {
        currentSettings.ttsVoice = "";
    }
}

function playSentenceAudio(sentenceText: string) {
    if (!synth || !sentenceText || isGenerating || currentSettings.voiceVolume === 0 || voices.length === 0) return;
    if (synth.speaking) synth.cancel();

    const utterance = new SpeechSynthesisUtterance(sentenceText);
    const selectedVoice = voices.find(voice => voice.name === currentSettings.ttsVoice);

    if (selectedVoice) {
        utterance.voice = selectedVoice;
    } else if (voices.length > 0) {
        utterance.voice = voices[0];
    }

    utterance.volume = currentSettings.voiceVolume / 100;
    utterance.onerror = (event) => {
        console.error('SpeechSynthesis Error:', event);
        showToast(`TTS Error: ${event.error}`, 3000, 'error');
    };
    synth.speak(utterance);
}

// --- Speech Recognition Functions (STT) ---
function stopRecognitionOnManualInput() {
    if (isRecognizingSpeech) {
        recognition.stop();
    }
}

function updateSpeechTargetAndListeners() {
    if (speechInputTarget && currentSpeechInputListeners.length > 0) {
        currentSpeechInputListeners.forEach(listener => {
            speechInputTarget!.removeEventListener(listener.type, listener.handler);
        });
    }
    currentSpeechInputListeners = [];
    speechInputTarget = null;

    if (!isRecognizingSpeech || (activeDrillIndex >= sentences.length && sentences.length > 0)) {
        return;
    }

    const newActiveInput = document.getElementById(`sentence-input-${activeDrillIndex}`) as HTMLTextAreaElement;

    if (newActiveInput && !newActiveInput.disabled && !newActiveInput.readOnly) {
        speechInputTarget = newActiveInput;

        const handleManualInput = () => stopRecognitionOnManualInput();
        const inputListenerFunc = handleManualInput as EventListener;
        const clickListenerFunc = handleManualInput as EventListener;

        const inputListener = { type: 'input', handler: inputListenerFunc };
        const clickListener = { type: 'click', handler: clickListenerFunc };

        speechInputTarget.addEventListener(inputListener.type, inputListener.handler);
        speechInputTarget.addEventListener(clickListener.type, clickListener.handler);
        currentSpeechInputListeners = [inputListener, clickListener];
    }
}


function toggleSpeechRecognition() {
    if (!recognition) {
        showToast("Speech input is not available.", 3000, 'error');
        return;
    }
    if (isRecognizingSpeech) {
        recognition.stop();
    } else {
        if (activeDrillIndex >= sentences.length && sentences.length > 0 && !gameJustCompleted) {
            showToast("All drills completed. Start a new game.", 3000, 'error');
            return;
        }
         if (sentences.length === 0 || activeDrillIndex === 0) {
            showToast("Start a new game and advance to an input field to use the microphone.", 3500, 'error');
            return;
        }

        const currentActiveInput = document.getElementById(`sentence-input-${activeDrillIndex}`) as HTMLTextAreaElement;
        if (!currentActiveInput || currentActiveInput.disabled || currentActiveInput.readOnly) {
            showToast("Cannot start voice input on a locked or completed field.", 3000, 'error');
            return;
        }

        try {
            recognition.start();
        } catch (e: any) {
            console.error("Error starting speech recognition:", e);
            showToast(`Mic start error: ${e.message}. Check permissions.`, 4000, 'error');
            isRecognizingSpeech = false;
            micButton.classList.remove('active-mic');
            if (speechInputTarget) {
                currentSpeechInputListeners.forEach(listener => {
                    speechInputTarget!.removeEventListener(listener.type, listener.handler);
                });
            }
            currentSpeechInputListeners = [];
            speechInputTarget = null;
        }
    }
}

function handleSpeechResult(event: any) {
    if (!speechInputTarget) return;

    let fullTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
        fullTranscript += event.results[i][0].transcript;
    }

    const trimmedTranscript = fullTranscript.trim();
    speechInputTarget.value = trimmedTranscript;
    adjustTextareaHeight(speechInputTarget); // Adjust height after speech input
    if (activeDrillIndex > 0 && activeDrillIndex < sentences.length) {
        userInputs[activeDrillIndex] = trimmedTranscript;
    }

    if (event.results[event.results.length - 1].isFinal) {
        console.log('Final speech recognized (continuous):', trimmedTranscript);
        if (activeDrillIndex > 0 && activeDrillIndex < sentences.length) {
            validateInput(activeDrillIndex, 'speech');
        } else if (activeDrillIndex === 0 && sentences.length > 0) {
            console.warn("Speech processed for index 0, which is unexpected.");
        }
    }
}


function handleSpeechError(event: any) {
    console.error('Speech recognition error', event.error);
    let message = `Speech error: ${event.error}`;
    if (event.error === 'no-speech') message = 'No speech detected. Try again.';
    else if (event.error === 'audio-capture') message = 'Microphone problem. Check setup.';
    else if (event.error === 'not-allowed') message = 'Microphone access denied. Please enable permissions in browser/OS settings.';
    else if (event.error === 'network') message = 'Network error during speech recognition.';

    showToast(message, 4000, 'error');
}

// --- Effects ---
function triggerConfettiEffect() {
    if (!confettiContainer) return;

    const colors = ['#ff577f', '#ff884b', '#ffd384', '#fff9b0', '#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6'];
    const numParticles = 80;

    for (let i = 0; i < numParticles; i++) {
        const particle = document.createElement('div');
        particle.classList.add('confetti-particle');

        const type = Math.random();
        if (type < 0.5) {
            particle.style.width = `${Math.random() * 6 + 7}px`;
            particle.style.height = `${Math.random() * 10 + 8}px`;
        } else {
            const size = `${Math.random() * 5 + 8}px`;
            particle.style.width = size;
            particle.style.height = size;
        }
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.left = `${Math.random() * 100}vw`;

        const animDuration = (Math.random() * 1.5 + 2.5).toFixed(1);
        particle.style.animationDuration = `${animDuration}s`;
        particle.style.animationDelay = `${Math.random() * 0.3}s`;

        particle.style.transform = `rotateZ(${Math.random() * 360}deg) rotateX(${Math.random() * 360}deg)`;

        confettiContainer.appendChild(particle);

        setTimeout(() => {
            if (particle.parentElement) {
                particle.remove();
            }
        }, parseFloat(animDuration) * 1000 + 500);
    }
}

function highlightNewGameButton() {
    const button = newGameButton;
    const pulseClassName = 'new-game-button-pulse-animation';

    button.classList.add(pulseClassName);
    setTimeout(() => {
        button.classList.remove(pulseClassName);
    }, 350 * 2);
}