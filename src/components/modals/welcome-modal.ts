// components/modals/welcome-modal.ts

import { OnSaveApiKey } from '../../types';
import { setWelcomeShown } from '../../utils/storage';

export function setupWelcomeModal(
    welcomeModalElement: HTMLElement,
    closeButton: HTMLButtonElement,
    feedbackButton: HTMLButtonElement,
    apiKeyInput: HTMLInputElement,
    saveApiKeyButton: HTMLButtonElement,
    onSaveApiKey: OnSaveApiKey
) {
    closeButton.addEventListener('click', () => {
        welcomeModalElement.style.display = 'none';
        setWelcomeShown(true);
    });

    feedbackButton.addEventListener('click', () => {
        window.open("https://forms.gle/VAu9VduKtVeg9VKv8");
    });

    saveApiKeyButton.addEventListener('click', () => {
        onSaveApiKey(apiKeyInput);
        if (apiKeyInput.classList.contains('correct')) {
            // If save successful, close modal, otherwise let user retry
            welcomeModalElement.style.display = 'none';
        }
    });

    // Initial state update for API key input
    toggleApiKeyInputStyle(apiKeyInput, apiKeyInput.value.length > 0);
}

export function openWelcomeModal(welcomeModalElement: HTMLElement, apiKeyInput: HTMLInputElement, currentApiKey: string | null) {
    apiKeyInput.value = currentApiKey || '';
    toggleApiKeyInputStyle(apiKeyInput, !!currentApiKey);
    welcomeModalElement.style.display = 'flex';
}

export function toggleApiKeyInputStyle(inputElement: HTMLInputElement, hasKey: boolean) {
    if (hasKey) {
        inputElement.classList.add('correct');
        inputElement.classList.remove('incorrect');
    } else {
        inputElement.classList.remove('correct', 'incorrect');
    }
}