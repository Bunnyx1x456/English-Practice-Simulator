// index.tsx

import { geminiAIService } from './services/api/gemini-ai.ts';
import { settingsService } from './services/settings.ts';
import { speechService } from './services/speech.ts';
import { gameLogicService } from './services/game-logic.ts';
import { assistantService } from './services/assistant.ts';
import { getWelcomeShown } from './utils/storage.ts';

import {
    initAppUI,
    updateAppUIState
} from './components/app-ui.ts';

import {
    initializeDrillElements,
    renderDrillList
} from './components/drill-elements.ts';

import {
    setupWelcomeModal,
    openWelcomeModal as openWelcomeModalComponent,
    toggleApiKeyInputStyle
} from './components/modals/welcome-modal.ts';

import {
    setupSettingsModal,
    openSettingsModal as openSettingsModalComponent,
    closeSettingsModal as closeSettingsModalComponent
} from './components/modals/settings-modal.ts';

import { assistantUI } from './components/assistant-ui.ts';


// --- DOM Elements (Centralized Querying) ---
let drillContentAreaElement: HTMLElement;
let newGameButton: HTMLButtonElement;
let settingsButton: HTMLButtonElement;
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
let apiKeyInputSettings: HTMLInputElement;
let saveApiKeySettingsButton: HTMLButtonElement;
let customSituationInput: HTMLInputElement;
let addCustomSituationButton: HTMLButtonElement;
let customSituationsListElement: HTMLElement;
let predefinedSituationsListElement: HTMLElement;
let customSituationsHeader: HTMLElement;
let situationAllCheckbox: HTMLInputElement;
let customFocusInput: HTMLInputElement;
let addCustomFocusButton: HTMLButtonElement;
let customFocusesListElement: HTMLElement;
let predefinedFocusesListElement: HTMLElement;
let customFocusesHeader: HTMLElement;
let focusAllCheckbox: HTMLInputElement;
let settingsCollapsibleToggles: NodeListOf<HTMLButtonElement>;

// Assistant elements
let assistantEnabled: HTMLInputElement;
let assistantModel: HTMLSelectElement;
let assistantLanguage: HTMLSelectElement;
let assistantStatusLabel: HTMLElement;
let generationModel: HTMLSelectElement;

let welcomeModalElement: HTMLElement;
let closeWelcomeModalButton: HTMLButtonElement;
let openFeedbackButton: HTMLButtonElement;
let apiKeyInputWelcome: HTMLInputElement;
let saveApiKeyWelcomeButton: HTMLButtonElement;

let confettiContainer: HTMLElement;

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
    queryDOMElements(); // Populate DOM element variables
    initializeListeners(); // Setup event listeners for UI interactions
    initializeServices(); // Setup service dependencies and initial states
    initializeUI(); // Render initial UI components

    const welcomeShown = getWelcomeShown();
    if (!welcomeShown) {
        openWelcomeModalComponent(welcomeModalElement, apiKeyInputWelcome, geminiAIService.currentApiKey);
    }
});


function queryDOMElements() {
    // Main app elements
    drillContentAreaElement = document.getElementById('drill-content-area')!;
    newGameButton = document.getElementById('new-game-button') as HTMLButtonElement;
    settingsButton = document.getElementById('settings-button') as HTMLButtonElement;
    helpButton = document.getElementById('help-button') as HTMLButtonElement;
    micButton = document.getElementById('mic-button') as HTMLButtonElement;
    confettiContainer = document.getElementById('confetti-container')!;

    // Settings Modal elements
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
    apiKeyInputSettings = document.getElementById('api-key-input-settings') as HTMLInputElement;
    saveApiKeySettingsButton = document.getElementById('save-api-key-settings-button') as HTMLButtonElement;
    customSituationInput = document.getElementById('custom-situation-input') as HTMLInputElement;
    addCustomSituationButton = document.getElementById('add-custom-situation-button') as HTMLButtonElement;
    customSituationsListElement = document.getElementById('custom-situations-list')!;
    predefinedSituationsListElement = document.getElementById('predefined-situations-list')!;
    customSituationsHeader = document.getElementById('custom-situations-header')!;
    situationAllCheckbox = document.getElementById('situation-all') as HTMLInputElement;
    customFocusInput = document.getElementById('custom-focus-input') as HTMLInputElement;
    addCustomFocusButton = document.getElementById('add-custom-focus-button') as HTMLButtonElement;
    customFocusesListElement = document.getElementById('custom-focuses-list')!;
    predefinedFocusesListElement = document.getElementById('predefined-focuses-list')!;
    customFocusesHeader = document.getElementById('custom-focuses-header')!;
    focusAllCheckbox = document.getElementById('focus-all') as HTMLInputElement;
    settingsCollapsibleToggles = document.querySelectorAll<HTMLButtonElement>('.settings-section-toggle');

    // Assistant elements
    assistantEnabled = document.getElementById('assistant-enabled') as HTMLInputElement;
    assistantModel = document.getElementById('assistant-model') as HTMLSelectElement;
    assistantLanguage = document.getElementById('assistant-language') as HTMLSelectElement;
    assistantStatusLabel = document.getElementById('assistant-status-label')!;
    generationModel = document.getElementById('generation-model') as HTMLSelectElement;

    // Welcome Modal elements
    welcomeModalElement = document.getElementById('welcome-modal')!;
    closeWelcomeModalButton = document.getElementById('close-welcome-modal-button') as HTMLButtonElement;
    openFeedbackButton = document.getElementById('open-feedback-button') as HTMLButtonElement;
    apiKeyInputWelcome = document.getElementById('api-key-input-welcome') as HTMLInputElement;
    saveApiKeyWelcomeButton = document.getElementById('save-api-key-welcome-button') as HTMLButtonElement;
}


function initializeListeners() {
    // Main controls
    newGameButton.addEventListener('click', () => gameLogicService.startNewGame());

    settingsButton.addEventListener('click', () => openSettingsModalComponent({
        modal: settingsModal,
        appearanceModeSelect, scalingRange, scalingValueDisplay,
        ttsVoiceSelect, voiceVolumeRange, voiceVolumeValueDisplay,
        sentenceCountRange, sentenceCountValueDisplay, difficultyRange, difficultyValueDisplay,
        apiKeyInput: apiKeyInputSettings, saveApiKeyButton: saveApiKeySettingsButton,
        customSituationInput, addCustomSituationButton, customSituationsListElement, predefinedSituationsListElement, customSituationsHeader, situationAllCheckbox,
        customFocusInput, addCustomFocusButton, customFocusesListElement, predefinedFocusesListElement, customFocusesHeader, focusAllCheckbox,
        backButton: backButtonSettings, saveButton: saveButtonSettings,
        collapsibleToggles: settingsCollapsibleToggles
    }, settingsService.settings, speechService.currentVoices)); // Передаємо поточні налаштування та голоси

    helpButton.addEventListener('click', () => openWelcomeModalComponent(welcomeModalElement, apiKeyInputWelcome, geminiAIService.currentApiKey));
    micButton.addEventListener('click', () => {
        const currentActiveInput = document.getElementById(`sentence-input-${gameLogicService.getCurrentGameState().activeDrillIndex}`) as HTMLTextAreaElement;
        if (speechService.IsRecognizing) {
            speechService.stopRecognition();
        } else {
            const { activeDrillIndex, sentences } = gameLogicService.getCurrentGameState();
            if (activeDrillIndex === 0 || activeDrillIndex >= sentences.length) {
                return; // Кнопка має бути disabled у цих станах, але це додаткова перевірка
            }
            speechService.startRecognition(currentActiveInput);
        }
    });


    // Welcome Modal
    setupWelcomeModal(
        welcomeModalElement,
        closeWelcomeModalButton,
        openFeedbackButton,
        apiKeyInputWelcome,
        saveApiKeyWelcomeButton,
        (inputElement) => {
            const success = geminiAIService.setApiKey(inputElement.value);
            toggleApiKeyInputStyle(inputElement, success);
            return success;
        }
    );

    // Settings Modal
    setupSettingsModal(
        {
            modal: settingsModal,
            appearanceModeSelect, scalingRange, scalingValueDisplay,
            ttsVoiceSelect, voiceVolumeRange, voiceVolumeValueDisplay,
            sentenceCountRange, sentenceCountValueDisplay, difficultyRange, difficultyValueDisplay,
            apiKeyInput: apiKeyInputSettings, saveApiKeyButton: saveApiKeySettingsButton,
            customSituationInput, addCustomSituationButton, customSituationsListElement, predefinedSituationsListElement, customSituationsHeader, situationAllCheckbox,
            customFocusInput, addCustomFocusButton, customFocusesListElement, predefinedFocusesListElement, customFocusesHeader, focusAllCheckbox,
            backButton: backButtonSettings, saveButton: saveButtonSettings,
            collapsibleToggles: settingsCollapsibleToggles,
            assistantEnabled, assistantModel, assistantLanguage, assistantStatusLabel,
            generationModel
        },
        (newSettings) => {
            settingsService.saveSettings(newSettings);
            closeSettingsModalComponent({
                modal: settingsModal,
                appearanceModeSelect, scalingRange, scalingValueDisplay,
                ttsVoiceSelect, voiceVolumeRange, voiceVolumeValueDisplay,
                sentenceCountRange, sentenceCountValueDisplay, difficultyRange, difficultyValueDisplay,
                apiKeyInput: apiKeyInputSettings, saveApiKeyButton: saveApiKeySettingsButton,
                customSituationInput, addCustomSituationButton, customSituationsListElement, predefinedSituationsListElement, customSituationsHeader, situationAllCheckbox,
                customFocusInput, addCustomFocusButton, customFocusesListElement, predefinedFocusesListElement, customFocusesHeader, focusAllCheckbox,
                backButton: backButtonSettings, saveButton: saveButtonSettings,
                collapsibleToggles: settingsCollapsibleToggles,
                assistantEnabled, assistantModel, assistantLanguage, assistantStatusLabel,
                generationModel
            });
        },
        () => closeSettingsModalComponent({
            modal: settingsModal,
            appearanceModeSelect, scalingRange, scalingValueDisplay,
            ttsVoiceSelect, voiceVolumeRange, voiceVolumeValueDisplay,
            sentenceCountRange, sentenceCountValueDisplay, difficultyRange, difficultyValueDisplay,
            apiKeyInput: apiKeyInputSettings, saveApiKeyButton: saveApiKeySettingsButton,
            customSituationInput, addCustomSituationButton, customSituationsListElement, predefinedSituationsListElement, customSituationsHeader, situationAllCheckbox,
            customFocusInput, addCustomFocusButton, customFocusesListElement, predefinedFocusesListElement, customFocusesHeader, focusAllCheckbox,
            backButton: backButtonSettings, saveButton: saveButtonSettings,
            collapsibleToggles: settingsCollapsibleToggles,
            assistantEnabled, assistantModel, assistantLanguage, assistantStatusLabel,
            generationModel
        })
    );
}

function initializeServices() {
    // Initial setup of services
    settingsService.applySettingsToDOM(); // Apply initial saved settings to active DOM
    speechService.updateSettings(settingsService.settings); // Pass initial settings to speech service

    settingsService.onSettingsChanged = (settings) => { // Subscribe to settings changes
        settingsService.applySettingsToDOM();
        speechService.updateSettings(settings);
        gameLogicService.updateSettings(settings);
        // Re-render drill list if settings change
        const currentGameState = gameLogicService.getCurrentGameState();
        renderDrillList(
            currentGameState.sentences,
            currentGameState.userInputs,
            currentGameState.validationStates,
            currentGameState.activeDrillIndex,
            gameLogicService.validateInput.bind(gameLogicService),
            speechService.playSentenceAudio.bind(speechService),
            settings.voiceVolume > 0 && speechService.currentVoices.length > 0
        );
    };

    gameLogicService.init(settingsService.settings, newGameButton, settingsButton, helpButton, micButton, confettiContainer);
    gameLogicService.addEventListener('gameStateUpdated', ((e: CustomEvent) => { // Приведення до EventListener
        const { sentences, userInputs, validationStates, activeDrillIndex, isGenerating, isRecognizingSpeech } = e.detail;

        // Оновити стан UI кнопок та класу активного мікрофона
        updateAppUIState(isGenerating, isRecognizingSpeech, activeDrillIndex, sentences.length);

        // Перемалювати список вправ
        renderDrillList(
            sentences,
            userInputs,
            validationStates,
            activeDrillIndex,
            gameLogicService.validateInput.bind(gameLogicService),
            speechService.playSentenceAudio.bind(speechService),
            settingsService.settings.voiceVolume > 0 && speechService.currentVoices.length > 0
        );
    }) as EventListener);

    // Make services globally accessible for easier debugging or if components need direct access (consider dependency injection for larger apps)
    (window as any).geminiAIService = geminiAIService;
    (window as any).settingsService = settingsService;
    (window as any).speechService = speechService;
    (window as any).gameLogicService = gameLogicService;
}

function initializeUI() {
    initAppUI(newGameButton, settingsButton, helpButton, micButton, confettiContainer);
    initializeDrillElements(drillContentAreaElement);

    // НЕ ЗАПУСКАЄМО ГРУ АВТОМАТИЧНО!
    // Замість цього, відображаємо порожній список з плейсхолдером.
    renderDrillList(
        [], // Пустий масив речень
        [], // Пустий масив введених користувачем даних
        [], // Пустий масив станів валідації
        0,  // Активний індекс 0 (немає активного вводу)
        () => { }, // Заглушка, оскільки нічого генерувати
        () => { }, // Заглушка
        false // TTS вимкнено для порожнього списку
    );
    // Відобразити кнопку мікрофона як вимкнену спочатку
    if (micButton) {
        micButton.disabled = true;
        micButton.classList.remove('active-mic');
        micButton.setAttribute('aria-label', 'Start voice input');
    }
}
