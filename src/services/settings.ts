// services/settings.ts

import { APP_SETTINGS_KEY } from '../utils/constants';
import { getSettingsFromLocal, saveSettingsToLocal } from '../utils/storage';
import { Settings } from '../types';
import { createCheckboxItem, showToast } from '../utils/dom-helpers';

class SettingsService {
    private _currentSettings: Settings;

    public onSettingsChanged?: (settings: Settings) => void;
    public onUpdateUI?: (settings: Settings) => void;
    public onSaveApiKey?: (inputElement: HTMLInputElement) => boolean;

    private predefinedSituations: string[] = [
        "General Conversation", "Travel", "Work/Office", "Hobbies/Interests",
        "Food/Restaurant", "Shopping", "At the Doctor", "Daily Routines",
        "Social Events", "Technology", "News & Current Events", "Nature & Environment",
        "School/University"
    ];
    private predefinedFocuses: string[] = [
        "Common Vocabulary", "Phrasal Verbs", "Idioms", "Verb Tenses (e.g., past, present, future)",
        "Forming Questions", "Prepositions", "Conditionals", "Modal Verbs",
        "Reported Speech", "Passive Voice", "Articles (a, an, the)", "Pronouns"
    ];

    public applyLiveScaling(scaleValue: number) {
        document.documentElement.style.fontSize = `${(scaleValue / 100) * 16}px`;
    }

    constructor() {
        this._currentSettings = this.loadSettings();

        // Bind 'this' to methods that are passed as callbacks
        this.saveSettings = this.saveSettings.bind(this);
        this.loadSettings = this.loadSettings.bind(this);
        this.addCustomCheckboxTopic = this.addCustomCheckboxTopic.bind(this);
        this.filterCheckboxesBySearch = this.filterCheckboxesBySearch.bind(this);
        this.getSelectedCheckboxValues = this.getSelectedCheckboxValues.bind(this);
        this.setSelectedCheckboxValues = this.setSelectedCheckboxValues.bind(this);
        this.setupChooseAllCheckboxes = this.setupChooseAllCheckboxes.bind(this);
        this.ensureCustomCheckboxExists = this.ensureCustomCheckboxExists.bind(this);
        this.applyLiveScaling = this.applyLiveScaling.bind(this);
    }

    get settings(): Settings {
        return { ...this._currentSettings };
    }

    private loadSettings(): Settings {
        let loaded = getSettingsFromLocal(APP_SETTINGS_KEY);
        let defaultSettings: Settings = {
            appearanceMode: 'system',
            scaling: 100,
            ttsVoice: '',
            voiceVolume: 80,
            sentenceCount: 10,
            difficulty: 1, // ⚡
            selectedSituations: ["General Conversation"],
            selectedFocuses: ["Common Vocabulary"],
            customSituations: [],
            customFocuses: [],
        };
        if (loaded) {
            loaded = {
                ...defaultSettings,
                ...loaded,
                customSituations: Array.isArray(loaded.customSituations) ? loaded.customSituations : [],
                customFocuses: Array.isArray(loaded.customFocuses) ? loaded.customFocuses : [],
                selectedSituations: Array.isArray(loaded.selectedSituations) ? loaded.selectedSituations : [],
                selectedFocuses: Array.isArray(loaded.selectedFocuses) ? loaded.selectedFocuses : [],
            };
        } else {
            loaded = defaultSettings;
        }

        if (loaded.selectedSituations.length === 0 && defaultSettings.selectedSituations.length > 0) {
            loaded.selectedSituations = defaultSettings.selectedSituations;
        }
        if (loaded.selectedFocuses.length === 0 && defaultSettings.selectedFocuses.length > 0) {
            loaded.selectedFocuses = defaultSettings.selectedFocuses;
        }
        return loaded;
    }

    public saveSettings(newSettings: Settings) {
        this._currentSettings = newSettings;
        saveSettingsToLocal(APP_SETTINGS_KEY, this._currentSettings);
        this.applySettingsToDOM();
        this.onSettingsChanged?.(this._currentSettings);
        showToast('Settings saved!', 2000, 'success');
    }

    public applySettingsToDOM() {
        document.body.classList.remove('light-mode', 'dark-mode');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (this._currentSettings.appearanceMode === 'light' || (this._currentSettings.appearanceMode === 'system' && !prefersDark)) {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.add('dark-mode');
        }

        this.applyLiveScaling(this._currentSettings.scaling);
    }

    public getSelectedCheckboxValues(namePrefix: string, containerElement: HTMLElement): string[] {
        const values: string[] = [];
        containerElement.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name^="${namePrefix}"]:checked`).forEach(cb => {
            if (!cb.id.endsWith('-all')) {
                values.push(cb.value);
            }
        });
        return values;
    }

    public setSelectedCheckboxValues(namePrefix: string, valuesToSelect: string[], containerElement: HTMLElement, allCheckbox: HTMLInputElement | null) {
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

    public setupChooseAllCheckboxes(topicType: 'situation' | 'focus', allCheckbox: HTMLInputElement, sectionContentSelector: string) {
        const sectionContentElement = document.querySelector(sectionContentSelector);
        if (!sectionContentElement) return;

        const individualCheckboxes = Array.from(sectionContentElement.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name^="${topicType}-"], input[type="checkbox"][name^="custom-${topicType}-"]`));
        const relevantIndividualCheckboxes = individualCheckboxes.filter(cb => cb.id !== allCheckbox.id);

        const currentHandler = (allCheckbox as any)._handler;
        if (currentHandler) {
            allCheckbox.removeEventListener('change', currentHandler);
        }
        const newAllHandler = () => {
            relevantIndividualCheckboxes.forEach(cb => cb.checked = allCheckbox.checked);
        };
        allCheckbox.addEventListener('change', newAllHandler);
        (allCheckbox as any)._handler = newAllHandler;

        relevantIndividualCheckboxes.forEach(cb => {
            const currentCbHandler = (cb as any)._handler;
            if (currentCbHandler) {
                cb.removeEventListener('change', currentCbHandler);
            }
            const newCbHandler = () => {
                allCheckbox.checked = relevantIndividualCheckboxes.every(iCb => iCb.checked);
            };
            cb.addEventListener('change', newCbHandler);
            (cb as any)._handler = newCbHandler;
        });

        if (relevantIndividualCheckboxes.length > 0) {
            allCheckbox.checked = relevantIndividualCheckboxes.every(iCb => iCb.checked);
        } else {
            allCheckbox.checked = false;
        }
    }

    public filterCheckboxesBySearch(inputElement: HTMLInputElement, sectionContentSelector: string, addButton: HTMLButtonElement) {
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

    public addCustomCheckboxTopic(
        inputElement: HTMLInputElement,
        customListContainer: HTMLElement,
        topicTypePrefix: 'situation' | 'focus',
        allCheckboxElement: HTMLInputElement,
        sectionContentSelector: string,
        addButton: HTMLButtonElement
    ) {
        const topicValue = inputElement.value.trim();
        if (!topicValue) return;

        let settingsArray = topicTypePrefix === 'situation' ? this._currentSettings.customSituations : this._currentSettings.customFocuses;

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
            this._currentSettings = {
                ...this._currentSettings,
                [`custom${topicTypePrefix === 'situation' ? 'Situations' : 'Focuses'}`]: settingsArray
            };
            const selectedTopicsArray = topicTypePrefix === 'situation' ? this._currentSettings.selectedSituations : this._currentSettings.selectedFocuses;
            if (!selectedTopicsArray.includes(topicValue)) {
                selectedTopicsArray.push(topicValue);
            }
            saveSettingsToLocal(APP_SETTINGS_KEY, this._currentSettings);

            this.ensureCustomCheckboxExists(topicValue, customListContainer, topicTypePrefix).checked = true;

            inputElement.value = '';
            this.filterCheckboxesBySearch(inputElement, sectionContentSelector, addButton);

            const customHeader = topicTypePrefix === 'situation' ?
                document.getElementById('custom-situations-header')! :
                document.getElementById('custom-focuses-header')!;
            customHeader.style.display = 'block';

            this.setupChooseAllCheckboxes(topicTypePrefix, allCheckboxElement, sectionContentSelector);

        } else {
            showToast(`"${topicValue}" already exists.`, 2500, 'error');
        }
    }

    public ensureCustomCheckboxExists(
        topicValue: string,
        customListContainer: HTMLElement,
        topicTypePrefix: 'situation' | 'focus'
    ): HTMLInputElement {
        const deterministicId = `custom-${topicTypePrefix}-${topicValue.replace(/\s+/g, '-').toLowerCase()}`;
        let existingCheckbox = customListContainer.querySelector<HTMLInputElement>(`#${deterministicId}`);

        if (!existingCheckbox) {
            const newItem = createCheckboxItem(
                deterministicId,
                `custom-${topicTypePrefix}-${topicValue.replace(/\s+/g, '_')}`,
                topicValue,
                topicValue,
                false
            );
            customListContainer.appendChild(newItem);
            existingCheckbox = newItem.querySelector('input[type="checkbox"]')!;

            const customHeader = topicTypePrefix === 'situation' ?
                document.getElementById('custom-situations-header')! :
                document.getElementById('custom-focuses-header')!;
            customHeader.style.display = 'block';
        }
        return existingCheckbox;
    }


    public getPredefinedSituations(): string[] { return [...this.predefinedSituations]; }
    public getPredefinedFocuses(): string[] { return [...this.predefinedFocuses]; }
}

export const settingsService = new SettingsService();

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settingsService.settings.appearanceMode === 'system') {
        settingsService.applySettingsToDOM();
    }
});