// components/app-ui.ts

import { showLoading } from '../utils/dom-helpers';

// DOM elements will be injected at initAppUI
let newGameButton: HTMLButtonElement;
let settingsButton: HTMLButtonElement;
let helpButton: HTMLButtonElement;
let micButton: HTMLButtonElement;
let confettiContainer: HTMLElement;
// Note: loadingOverlay is handled internally by showLoading and doesn't need to be global here.


export function initAppUI(newGameBtn: HTMLButtonElement, settingsBtn: HTMLButtonElement, helpBtn: HTMLButtonElement, micBtn: HTMLButtonElement, confettiCont: HTMLElement) {
    newGameButton = newGameBtn;
    settingsButton = settingsBtn;
    helpButton = helpBtn;
    micButton = micBtn;
    confettiContainer = confettiCont;
}

// updateAppUIState відповідає за оновлення візуального стану кнопки мікрофона
export function updateAppUIState(isGenerating: boolean, isRecognizingSpeech: boolean, activeDrillIndex: number, totalDrills: number) {
    // showLoading тепер викликається gameLogicService і керує disabled станом всіх кнопок.
    // Тому тут не потрібно дублювати логіку showLoading.

    // Оновлення візуального стану мікрофона
    if (micButton) { // Забезпечити, що micButton існує
        if (isRecognizingSpeech) {
            micButton.classList.add('active-mic');
            micButton.setAttribute('aria-label', 'Stop voice input');
        } else {
            micButton.classList.remove('active-mic');
            micButton.setAttribute('aria-label', 'Start voice input');
        }

        // micButton.disabled ЛОГІКА БУЛА ТУТ, але тепер вона повністю в game-logic.ts
        // і вже встановлена до того, як updateAppUIState викликається.
        // Тому її немає тут.
    }
}

export function updateAppTitle(title: string) {
    const appTitleElement = document.querySelector('.app-title');
    if (appTitleElement) {
        appTitleElement.textContent = title;
    }
}