// components/modals/settings-modal.ts

import { Settings } from '../../types';
import { setupCollapsibleSections } from '../../utils/dom-helpers';
import { getDifficultyEmoji } from '../../utils/string-helpers';
import { DEBOUNCE_DELAY, MODEL_NAME } from '../../utils/constants';
import { debounce } from '../../utils/debounce';

import { settingsService } from '../../services/settings';
import { geminiAIService } from '../../services/api/gemini-ai';
import { speechService } from '../../services/speech'; // Додано speechService для доступу до голосів

interface SettingsModalElements {
    modal: HTMLElement;
    appearanceModeSelect: HTMLSelectElement;
    scalingRange: HTMLInputElement;
    scalingValueDisplay: HTMLElement;
    ttsVoiceSelect: HTMLSelectElement;
    voiceVolumeRange: HTMLInputElement;
    voiceVolumeValueDisplay: HTMLElement;
    sentenceCountRange: HTMLInputElement;
    sentenceCountValueDisplay: HTMLElement;
    difficultyRange: HTMLInputElement;
    difficultyValueDisplay: HTMLElement;
    apiKeyInput: HTMLInputElement;
    saveApiKeyButton: HTMLButtonElement;
    customSituationInput: HTMLInputElement;
    addCustomSituationButton: HTMLButtonElement;
    customSituationsListElement: HTMLElement;
    predefinedSituationsListElement: HTMLElement;
    customSituationsHeader: HTMLElement;
    situationAllCheckbox: HTMLInputElement;
    customFocusInput: HTMLInputElement;
    addCustomFocusButton: HTMLButtonElement;
    customFocusesListElement: HTMLElement;
    predefinedFocusesListElement: HTMLElement;
    customFocusesHeader: HTMLElement;
    focusAllCheckbox: HTMLInputElement;
    backButton: HTMLButtonElement;
    saveButton: HTMLButtonElement;
    collapsibleToggles: NodeListOf<HTMLButtonElement>;
    // Assistant elements
    assistantEnabled: HTMLInputElement;
    assistantModel: HTMLSelectElement;
    assistantLanguage: HTMLSelectElement;
    assistantStatusLabel: HTMLElement;
    // Generation model
    generationModel: HTMLSelectElement;
}

// Function to update the TTS voice dropdown
function updateTtsVoiceDropdown(ttsVoiceSelect: HTMLSelectElement, settings: Settings, voices: SpeechSynthesisVoice[]) {
    ttsVoiceSelect.innerHTML = '<option value="">Default</option>';
    if (settings.voiceVolume > 0 && voices.length > 0) {
        ttsVoiceSelect.disabled = false;
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.value = voice.name;
            ttsVoiceSelect.appendChild(option);
        });

        // Try to select the previously saved voice
        if (voices.some(v => v.name === settings.ttsVoice)) {
            ttsVoiceSelect.value = settings.ttsVoice;
        } else {
            // If saved voice not found, try to select Google US English as default
            const googleUSEnglishVoice = voices.find(v => v.name === "Google US English" && v.lang === "en-US");
            if (googleUSEnglishVoice) {
                ttsVoiceSelect.value = googleUSEnglishVoice.name;
                settings.ttsVoice = googleUSEnglishVoice.name; // Update settings if new default is picked
            } else if (voices.length > 0) { // Fallback to first available voice if Google US English is not found
                ttsVoiceSelect.value = voices[0].name;
                settings.ttsVoice = voices[0].name; // Update settings
            } else { // No voices found at all
                ttsVoiceSelect.value = "";
                settings.ttsVoice = "";
            }
        }
    } else {
        ttsVoiceSelect.disabled = true;
        ttsVoiceSelect.innerHTML = '<option value="">TTS Disabled (Volume 0%)</option>';
        settings.ttsVoice = ""; // Clear selected voice if disabled
    }
}


export function setupSettingsModal(
    elements: SettingsModalElements,
    onSaveSettings: (settings: Settings) => void,
    onCloseModal: () => void,
) {
    elements.backButton.addEventListener('click', onCloseModal);
    elements.saveButton.addEventListener('click', () => {
        const newSettings: Settings = {
            appearanceMode: elements.appearanceModeSelect.value as Settings['appearanceMode'],
            scaling: parseInt(elements.scalingRange.value),
            ttsVoice: elements.ttsVoiceSelect.value, // Capture the currently selected voice
            voiceVolume: parseInt(elements.voiceVolumeRange.value),
            sentenceCount: parseInt(elements.sentenceCountRange.value),
            difficulty: parseInt(elements.difficultyRange.value),
            selectedSituations: [
                ...new Set([
                    ...settingsService.getSelectedCheckboxValues('situation-', elements.predefinedSituationsListElement),
                    ...settingsService.getSelectedCheckboxValues('custom-situation-', elements.customSituationsListElement)
                ])
            ],
            selectedFocuses: [
                ...new Set([
                    ...settingsService.getSelectedCheckboxValues('focus-', elements.predefinedFocusesListElement),
                    ...settingsService.getSelectedCheckboxValues('custom-focus-', elements.customFocusesListElement)
                ])
            ],
            customSituations: [...settingsService.settings.customSituations],
            customFocuses: [...settingsService.settings.customFocuses],
            assistantEnabled: elements.assistantEnabled?.checked || false,
            assistantModel: elements.assistantModel?.value || 'gemini-2.5-flash-lite',
            assistantLanguage: elements.assistantLanguage?.value || 'English',
            generationModel: elements.generationModel?.value || 'gemini-2.5-flash-lite',
        };
        onSaveSettings(newSettings);
    });

    elements.saveApiKeyButton.addEventListener('click', () => {
        const success = geminiAIService.setApiKey(elements.apiKeyInput.value);
        if (success) {
            elements.apiKeyInput.classList.add('correct');
            elements.apiKeyInput.classList.remove('incorrect');
        } else {
            elements.apiKeyInput.classList.add('incorrect');
            elements.apiKeyInput.classList.remove('correct');
        }
    });


    elements.scalingRange.addEventListener('input', () => {
        const scaleValue = parseInt(elements.scalingRange.value);
        elements.scalingValueDisplay.textContent = `${scaleValue}%`;
        settingsService.applyLiveScaling(scaleValue);
    });
    elements.voiceVolumeRange.addEventListener('input', () => elements.voiceVolumeValueDisplay.textContent = `${elements.voiceVolumeRange.value}%`);
    elements.sentenceCountRange.addEventListener('input', () => elements.sentenceCountValueDisplay.textContent = elements.sentenceCountRange.value);
    elements.difficultyRange.addEventListener('input', () => elements.difficultyValueDisplay.textContent = getDifficultyEmoji(parseInt(elements.difficultyRange.value)));

    const debouncedFilterSituations = debounce(() => settingsService.filterCheckboxesBySearch(elements.customSituationInput, '#situations-content', elements.addCustomSituationButton), DEBOUNCE_DELAY);
    elements.customSituationInput.addEventListener('input', debouncedFilterSituations);
    elements.addCustomSituationButton.addEventListener('click', () => {
        settingsService.addCustomCheckboxTopic(
            elements.customSituationInput,
            elements.customSituationsListElement,
            'situation',
            elements.situationAllCheckbox,
            '#situations-content',
            elements.addCustomSituationButton
        );
    });

    const debouncedFilterFocuses = debounce(() => settingsService.filterCheckboxesBySearch(elements.customFocusInput, '#focuses-content', elements.addCustomFocusButton), DEBOUNCE_DELAY);
    elements.customFocusInput.addEventListener('input', debouncedFilterFocuses);
    elements.addCustomFocusButton.addEventListener('click', () => {
        settingsService.addCustomCheckboxTopic(
            elements.customFocusInput,
            elements.customFocusesListElement,
            'focus',
            elements.focusAllCheckbox,
            '#focuses-content',
            elements.addCustomFocusButton
        );
    });

    setupCollapsibleSections(elements.collapsibleToggles);

    // Assistant enable/disable functionality
    if (elements.assistantEnabled) {
        elements.assistantEnabled.addEventListener('change', () => {
            const isEnabled = elements.assistantEnabled.checked;
            if (elements.assistantModel) elements.assistantModel.disabled = !isEnabled;
            if (elements.assistantLanguage) elements.assistantLanguage.disabled = !isEnabled;
            if (elements.assistantStatusLabel) {
                elements.assistantStatusLabel.textContent = isEnabled ? 'Enabled' : 'Disabled';
            }
        });
    }

    // Listen for TTS voices to change and update the dropdown
    speechService.addEventListener('ttsVoicesChanged', ((e: CustomEvent) => {
        updateTtsVoiceDropdown(elements.ttsVoiceSelect, settingsService.settings, e.detail.voices);
    }) as EventListener);

    // Listen for ttsReady (even if no voices changed, just that the service is ready)
    speechService.addEventListener('ttsReady', (() => {
        updateTtsVoiceDropdown(elements.ttsVoiceSelect, settingsService.settings, speechService.currentVoices);
    }) as EventListener);
}

export function openSettingsModal(elements: SettingsModalElements, settings: Settings, voices: SpeechSynthesisVoice[]) {
    elements.appearanceModeSelect.value = settings.appearanceMode;
    elements.scalingRange.value = settings.scaling.toString();
    elements.scalingValueDisplay.textContent = `${settings.scaling}%`;

    elements.voiceVolumeRange.value = settings.voiceVolume.toString();
    elements.voiceVolumeValueDisplay.textContent = `${settings.voiceVolume}%`;

    // Populate TTS voices when opening the modal
    updateTtsVoiceDropdown(elements.ttsVoiceSelect, settings, voices);

    elements.sentenceCountRange.value = settings.sentenceCount.toString();
    elements.sentenceCountValueDisplay.textContent = settings.sentenceCount.toString();
    elements.difficultyRange.value = settings.difficulty.toString();
    elements.difficultyValueDisplay.textContent = getDifficultyEmoji(settings.difficulty);

    elements.apiKeyInput.value = geminiAIService.currentApiKey || '';
    if (geminiAIService.currentApiKey) {
        elements.apiKeyInput.classList.add('correct');
        elements.apiKeyInput.classList.remove('incorrect');
    } else {
        elements.apiKeyInput.classList.remove('correct', 'incorrect');
    }

    elements.customSituationsListElement.innerHTML = '';
    elements.customFocusesListElement.innerHTML = '';
    elements.customSituationsHeader.style.display = 'none';
    elements.customFocusesHeader.style.display = 'none';

    settings.customSituations.forEach(topic => settingsService.ensureCustomCheckboxExists(topic, elements.customSituationsListElement, 'situation'));
    settings.customFocuses.forEach(topic => settingsService.ensureCustomCheckboxExists(topic, elements.customFocusesListElement, 'focus'));


    settingsService.setSelectedCheckboxValues('situation-', settings.selectedSituations, elements.predefinedSituationsListElement, elements.situationAllCheckbox);
    settingsService.setSelectedCheckboxValues('custom-situation-', settings.selectedSituations, elements.customSituationsListElement, null);

    settingsService.setSelectedCheckboxValues('focus-', settings.selectedFocuses, elements.predefinedFocusesListElement, elements.focusAllCheckbox);
    settingsService.setSelectedCheckboxValues('custom-focus-', settings.selectedFocuses, elements.customFocusesListElement, null);

    settingsService.setupChooseAllCheckboxes('situation', elements.situationAllCheckbox, '#situations-content');
    settingsService.setupChooseAllCheckboxes('focus', elements.focusAllCheckbox, '#focuses-content');

    if (elements.customSituationsListElement.children.length > 0) elements.customSituationsHeader.style.display = 'block';
    if (elements.customFocusesListElement.children.length > 0) elements.customFocusesHeader.style.display = 'block';

    // Assistant settings
    if (elements.assistantEnabled) {
        elements.assistantEnabled.checked = settings.assistantEnabled || false;
        elements.assistantEnabled.dispatchEvent(new Event('change'));
    }
    if (elements.assistantModel) {
        elements.assistantModel.value = settings.assistantModel || 'gemini-2.5-flash-lite';
    }
    if (elements.assistantLanguage) {
        elements.assistantLanguage.value = settings.assistantLanguage || 'English';
    }
    if (elements.assistantStatusLabel) {
        elements.assistantStatusLabel.textContent = settings.assistantEnabled ? 'Enabled' : 'Disabled';
    }
    
    // Generation model
    if (elements.generationModel) {
        elements.generationModel.value = settings.generationModel || 'gemini-2.5-flash-lite';
    }

    elements.modal.style.display = 'flex';
}

export function closeSettingsModal(elements: SettingsModalElements) {
    elements.customSituationInput.value = '';
    elements.customFocusInput.value = '';
    settingsService.filterCheckboxesBySearch(elements.customSituationInput, '#situations-content', elements.addCustomSituationButton);
    settingsService.filterCheckboxesBySearch(elements.customFocusInput, '#focuses-content', elements.addCustomFocusButton);
    elements.modal.style.display = 'none';
}
