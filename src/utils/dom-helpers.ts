// utils/dom-helpers.ts

import { ToastType } from '../types';
import { DEBOUNCE_DELAY } from './constants';
import { debounce } from './debounce'; // Assuming debounce is moved here

let toastHideTimer: number | undefined;

export function adjustTextareaHeight(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
}

export function showLoading(show: boolean, newGameButton: HTMLButtonElement, settingsButton: HTMLButtonElement, helpButton: HTMLButtonElement, micButton: HTMLButtonElement) {
    const loadingOverlay = document.getElementById('loading-overlay')!;
    loadingOverlay.style.display = show ? 'flex' : 'none';
    document.body.setAttribute('aria-busy', show.toString());
    newGameButton.disabled = show;
    settingsButton.disabled = show;
    helpButton.disabled = show;
    // Mic button disable logic depends on game state, so typically handled in game-logic.ts
    micButton.disabled = show;
}

export function showToast(message: string, duration: number = 3500, type: ToastType = 'error') {
    const toastElement = document.getElementById('toast-message')!;
    if (toastHideTimer) {
        clearTimeout(toastHideTimer);
    }

    toastElement.textContent = message;
    toastElement.classList.remove('show', 'error-style', 'success-style', 'show-above-footer');
    toastElement.classList.add(type === 'success' ? 'success-style' : 'error-style');
    toastElement.style.display = 'block';
    // Trigger reflow to ensure animation restarts
    void toastElement.offsetWidth;
    toastElement.classList.add('show', 'show-above-footer');

    toastHideTimer = window.setTimeout(() => {
        toastElement.classList.remove('show', 'show-above-footer');
        window.setTimeout(() => {
            if (!toastElement.classList.contains('show')) {
                toastElement.style.display = 'none';
            }
        }, DEBOUNCE_DELAY); // Wait for fade-out transition
    }, duration);
}

export function setupCollapsibleSections(sections: NodeListOf<HTMLButtonElement>) {
    sections.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', String(!isExpanded));
            // CSS handles visibility based on aria-expanded
        });
    });
}

// Utility to create a checkbox item for settings
export function createCheckboxItem(
    id: string,
    name: string,
    value: string,
    labelText: string,
    isChecked: boolean,
    isChooseAll: boolean = false
): HTMLDivElement {
    const newItem = document.createElement('div');
    newItem.classList.add('setting-item', 'checkbox-item');

    const newCheckbox = document.createElement('input');
    newCheckbox.type = 'checkbox';
    newCheckbox.id = id;
    newCheckbox.name = name;
    newCheckbox.value = value;
    newCheckbox.checked = isChecked;

    const newLabel = document.createElement('label');
    newLabel.htmlFor = id;
    newLabel.textContent = labelText;
    if (isChooseAll) {
        newLabel.classList.add('choose-all-label');
    }

    newItem.appendChild(newCheckbox);
    newItem.appendChild(newLabel);
    return newItem;
}


// These are general UI utility functions that might not belong *inside* a specific component's class
// but rather are consumed by them.