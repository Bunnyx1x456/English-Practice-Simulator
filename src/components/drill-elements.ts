// components/drill-elements.ts

import { SentencePair, ValidationStatus, OnInputValidate, OnPlaySentence } from '../types';
import { adjustTextareaHeight } from '../utils/dom-helpers';

// Ініціалізуємо ResizeObserver одразу, а не як null. В JS він буде створений при запуску.
let hintSyncObserver: ResizeObserver;
let drillContentAreaElement: HTMLElement | null = null; // Початкове значення null приймається

// Ініціалізуємо ResizeObserver
hintSyncObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
        const textarea = entry.target as HTMLTextAreaElement;
        const hintId = textarea.dataset.hintId;
        if (hintId) {
            const hintElement = document.getElementById(hintId);
            if (hintElement) {
                hintElement.style.height = `${textarea.offsetHeight}px`;
            }
        }
    }
});


export function initializeDrillElements(areaElement: HTMLElement) {
    drillContentAreaElement = areaElement;
    // Disconnect any previous observations to ensure a clean slate if called multiple times
    // This is important if `initializeDrillElements` is called more than once during app lifecycle
    // for some reason (e.g., re-mounting a component).
    // The original observer itself should be a singleton.
    // We only unobserve elements here, not destroy the observer.
    if (drillContentAreaElement) {
        const oldTextareas = drillContentAreaElement.querySelectorAll('.sentence-input');
        oldTextareas.forEach(ta => hintSyncObserver.unobserve(ta));
    }
}

export function renderDrillList(
    sentences: SentencePair[],
    userInputs: string[],
    validationStates: ValidationStatus[],
    activeDrillIndex: number,
    onInputValidate: OnInputValidate,
    onPlaySentence: OnPlaySentence,
    ttsEnabled: boolean
) {
    if (!drillContentAreaElement) {
        console.error("drillContentAreaElement is null. Cannot render drill list.");
        return;
    }

    // Disconnect observer from old elements to prevent memory leaks
    // (This line moved from the top of the function to be more reliable)
    // No '!' needed on hintSyncObserver as it's guaranteed to be initialized
    const oldTextareas = drillContentAreaElement.querySelectorAll('.sentence-input');
    oldTextareas.forEach(ta => hintSyncObserver.unobserve(ta));


    drillContentAreaElement.innerHTML = ''; // Clear previous content

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
        const hintItemId = `hint-item-${index}`;
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

        if (index === 0) {
            inputElement.classList.add('correct');
            inputElement.value = pair.sentence;
            inputElement.readOnly = true;
        } else {
            inputElement.value = userInputs[index] || '';
            inputElement.setAttribute('aria-label', `Sentence input ${index + 1}, hint: ${pair.hint}`);

            if (validationStates[index] === 'correct') {
                inputElement.classList.add('correct');
                inputElement.readOnly = true;
            } else if (validationStates[index] === 'incorrect') {
                inputElement.classList.add('incorrect');
                inputElement.placeholder = `Use hint: "${pair.hint}"`;
                inputElement.disabled = false;
            } else { // 'pending'
                if (index === activeDrillIndex) {
                    inputElement.placeholder = `Use hint: "${pair.hint}"`;
                    inputElement.disabled = false;
                    inputElement.classList.add('is-active-target');
                } else {
                    inputElement.placeholder = "Locked";
                    inputElement.disabled = true;
                }
            }
        }

        // Add event listeners for the input element
        if (index > 0 && validationStates[index] !== 'correct' && !inputElement.readOnly) {
            inputElement.addEventListener('input', (e) => {
                const target = e.target as HTMLTextAreaElement;
                if (target.dataset.index) {
                    // Update actual user input in gameLogicService state (pass through callback)
                    // The direct state update is handled by gameLogicService via speechResult handler or validateInput
                    // For keyboard input, we only update height and let the gameLogicService manage data on validate
                }
                adjustTextareaHeight(target);
            });
            inputElement.addEventListener('keypress', (e) => {
                const target = e.target as HTMLTextAreaElement;
                const idx = parseInt(target.dataset.index || '-1', 10);
                if (e.key === 'Enter' && !e.shiftKey && idx > 0 && idx === activeDrillIndex) {
                    e.preventDefault();
                    onInputValidate(idx, 'keyboard', target.value);
                }
            });
            inputElement.addEventListener('change', (e) => {
                // For change event, also trigger validation on blur (useful for mobile keyboards)
                const target = e.target as HTMLTextAreaElement;
                const idx = parseInt(target.dataset.index || '-1', 10);
                if (idx > 0 && idx === activeDrillIndex) {
                    onInputValidate(idx, 'keyboard', target.value);
                }
            });
        }


        sentenceContainer.appendChild(inputElement);

        if (ttsEnabled && (index === 0 || validationStates[index] === 'correct')) {
            sentenceContainer.appendChild(createSpeakerButton(pair.sentence, onPlaySentence));
        }

        drillPairRow.appendChild(sentenceContainer);
        drillContentAreaElement.appendChild(drillPairRow);

        adjustTextareaHeight(inputElement); // Initial height adjustment
        // No '!' on hintSyncObserver needed as it's guaranteed to be initialized
        hintSyncObserver.observe(inputElement); // Start observing for height changes
    });

    // Scroll to active row
    const activeRow = document.getElementById(`drill-row-${activeDrillIndex}`);
    if (activeRow) {
        activeRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // Focusing input should only happen if it's the active one and not being used by speech recognition
        // The decision to focus should ideally come from gameLogicService or a higher-level controller
        // that knows the speech recognition state.
        // For simplicity now, we assume gameLogicService handles the focus if necessary,
        // (after dispatching 'gameStateUpdated').
    } else if (activeDrillIndex === 0 && sentences.length > 0) {
        const firstRow = document.getElementById(`drill-row-0`);
        firstRow?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function createSpeakerButton(sentenceText: string, onPlaySentence: OnPlaySentence): HTMLButtonElement {
    const speakerButton = document.createElement('button');
    speakerButton.classList.add('speaker-icon-button');
    speakerButton.setAttribute('aria-label', `Play sentence: ${sentenceText}`);
    speakerButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
    speakerButton.addEventListener('click', (e) => {
        e.stopPropagation();
        onPlaySentence(sentenceText);
    });
    return speakerButton;
}