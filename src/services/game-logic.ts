// services/game-logic.ts

import { SentencePair, ValidationStatus, InputMethod, Settings } from '../types';
import { geminiAIService } from './api/gemini-ai';
import { speechService } from './speech';
import { assistantService } from './assistant';
import { showLoading, showToast } from '../utils/dom-helpers';
import { normalizeSentenceForComparison } from '../utils/string-helpers';
import { highlightNewGameButton, triggerConfettiEffect } from '../utils/effects';


class GameLogicService extends EventTarget {
    private sentences: SentencePair[] = [];
    private userInputs: string[] = [];
    private validationStates: ValidationStatus[] = [];
    private activeDrillIndex: number = 0; // 0 for base sentence, 1 for first input etc.
    private isGenerating: boolean = false;
    private gameJustCompleted: boolean = false;
    private currentSettings: Settings | null = null;
    private newGameButton: HTMLButtonElement | null = null;
    private settingsButton: HTMLButtonElement | null = null;
    private helpButton: HTMLButtonElement | null = null;
    private micButton: HTMLButtonElement | null = null;
    private confettiContainer: HTMLElement | null = null;


    constructor() {
        super();
        speechService.addEventListener('speechResult', this.handleSpeechResult.bind(this) as EventListener);
        speechService.addEventListener('speechStart', this.handleSpeechStart.bind(this) as EventListener);
        speechService.addEventListener('speechEnd', this.handleSpeechEnd.bind(this) as EventListener);
    }

    public init(settings: Settings, newGameBtn: HTMLButtonElement, settingsBtn: HTMLButtonElement, helpBtn: HTMLButtonElement, micBtn: HTMLButtonElement, confettiCont: HTMLElement) {
        this.currentSettings = settings;
        this.newGameButton = newGameBtn;
        this.settingsButton = settingsBtn;
        this.helpButton = helpBtn;
        this.micButton = micBtn;
        this.confettiContainer = confettiCont;
        this.updateLoadingState();
    }

    public updateSettings(settings: Settings) {
        this.currentSettings = settings;
    }

    private generatePlaceholderSentences(count: number): SentencePair[] {
        const placeholders: SentencePair[] = [];
        if (count > 0) {
            placeholders.push({ id: 'ph-0', hint: "Base sentence", sentence: "This is a sample sentence. It might be long enough to wrap if the window is narrow." });
            for (let i = 1; i < count; i++) {
                placeholders.push({
                    id: `ph-${i}`,
                    hint: `Hint for placeholder ${i + 1} which could also be quite long and cause wrapping.`,
                    sentence: `Placeholder sentence ${i + 1}. (API error or not configured)`,
                });
            }
        }
        return placeholders;
    }

    public async startNewGame() {
        if (this.isGenerating) return;
        this.isGenerating = true;
        speechService.stopRecognition(); // Still good to stop any lingering recognition here

        this.sentences = [];
        this.userInputs = [];
        this.validationStates = [];
        this.activeDrillIndex = 0;
        this.gameJustCompleted = false;

        this.updateLoadingState();
        this.dispatchGameState();

        if (!geminiAIService.currentApiKey || !geminiAIService.isInitialized) {
            showToast("API Key not provided or invalid. Please enter it in Settings or the Welcome screen.", 5000, 'error');
            this.sentences = this.generatePlaceholderSentences(this.currentSettings!.sentenceCount);
        } else {
            try {
                this.sentences = await geminiAIService.generateSentences(this.currentSettings!);
            } catch (error: any) {
                console.error("Error fetching sentences:", error);
                showToast(`Failed to generate: ${error.message || 'Unknown API error'}. Placeholders used.`, 5000, 'error');
                this.sentences = this.generatePlaceholderSentences(this.currentSettings!.sentenceCount);
            }
        }

        this.userInputs = new Array(this.sentences.length).fill('');
        this.validationStates = new Array(this.sentences.length).fill('pending');
        if (this.sentences.length > 0) {
            this.validationStates[0] = 'correct';
            this.activeDrillIndex = 1;
        } else {
            this.activeDrillIndex = 0;
        }

        this.isGenerating = false;
        this.updateLoadingState();
        this.dispatchGameState();
        (this as EventTarget).dispatchEvent(new CustomEvent('gameStarted'));
    }

    public validateInput(index: number, inputMethod: InputMethod, userInput: string) {
        if (index === 0 || index >= this.sentences.length || this.validationStates[index] === 'correct') {
            return;
        }
        if (index !== this.activeDrillIndex) {
            console.warn("Attempted to validate non-active drill index. Index:", index, "Active:", this.activeDrillIndex);
            return;
        }

        this.userInputs[index] = userInput;

        const normalizedUserInput = normalizeSentenceForComparison(userInput);
        const normalizedTargetSentence = normalizeSentenceForComparison(this.sentences[index].sentence);

        if (normalizedUserInput === normalizedTargetSentence) {
            this.validationStates[index] = 'correct';
            if (inputMethod === 'keyboard' && this.currentSettings!.voiceVolume > 0) {
                speechService.playSentenceAudio(this.sentences[index].sentence);
            }

            const isLastSentence = index === this.sentences.length - 1;

            if (!isLastSentence) {
                this.activeDrillIndex = index + 1;
            } else {
                this.activeDrillIndex = this.sentences.length;
                this.gameJustCompleted = true;
                // REMOVED: speechService.stopRecognition(); // Handled by startRecognition internally or state changes
            }
            this.dispatchGameState();

            if (this.gameJustCompleted) {
                showToast("Congratulations! All drills completed!", 3000, 'success');
                if (this.confettiContainer) {
                    triggerConfettiEffect(this.confettiContainer);
                }
                if (this.newGameButton) {
                    highlightNewGameButton(this.newGameButton);
                }
                (this as EventTarget).dispatchEvent(new CustomEvent('gameCompleted'));
            } else if (inputMethod === 'speech' && speechService.IsRecognizing) {
                // Restart recognition for the next input, speechService handles stopping current one.
                const nextInput = document.getElementById(`sentence-input-${this.activeDrillIndex}`) as HTMLTextAreaElement;
                if (nextInput) {
                    speechService.startRecognition(nextInput);
                }
            }

        } else {
            this.validationStates[index] = 'incorrect';
            showToast("Try again! Check the hint and your sentence.", 2000, 'error');
            this.dispatchGameState();

            // Викликаємо асистента для підказки
            this.showAssistantHint(index, userInput);

            // If the input was from speech, restart recognition for the same field
            // so the user can try again without clicking the mic button.
            // This is crucial for platforms where recognition stops automatically after a result.
            if (inputMethod === 'speech') {
                const currentInput = document.getElementById(`sentence-input-${index}`) as HTMLTextAreaElement;
                if (currentInput) {
                    // Use a small timeout to allow the UI to update and prevent immediate re-triggering issues.
                    setTimeout(() => {
                        speechService.startRecognition(currentInput);
                    }, 100); // A short delay can improve stability on some browsers.
                }
            }
        }
    }

    private handleSpeechResult(event: CustomEvent<{ transcript: string, isFinal: boolean }>) {
        if (!event.detail || this.activeDrillIndex === 0 || this.activeDrillIndex >= this.sentences.length) return;

        const { transcript, isFinal } = event.detail;
        this.userInputs[this.activeDrillIndex] = transcript;
        this.dispatchGameState();

        if (isFinal) {
            this.validateInput(this.activeDrillIndex, 'speech', transcript);
        }
    }

    private handleSpeechStart() {
        this.dispatchGameState();
    }

    private handleSpeechEnd() {
        this.dispatchGameState();
    }

    private dispatchGameState() {
        if (this.micButton) {
            const isRecognizing = speechService.IsRecognizing;
            const isAvailable = speechService.IsRecognitionAvailable;
            const isActiveDrill = this.activeDrillIndex > 0 && this.activeDrillIndex < this.sentences.length;

            // Determine if the mic button should be disabled
            let shouldBeDisabled = false;
            if (this.isGenerating) { // Priority 1: If generating, disable
                shouldBeDisabled = true;
            } else if (!isAvailable) { // Priority 2: If speech recognition not available, disable
                shouldBeDisabled = true;
            } else if (!isActiveDrill && !isRecognizing) { // Priority 3: If not on an active drill AND NOT currently recognizing, disable
                shouldBeDisabled = true;
            }
            // If it's recognizing (isRecognizing is true), it should NOT be disabled.
            // If isActiveDrill is true AND !isRecognizing, it should NOT be disabled.

            this.micButton.disabled = shouldBeDisabled;
        }

        (this as EventTarget).dispatchEvent(new CustomEvent('gameStateUpdated', {
            detail: {
                sentences: [...this.sentences],
                userInputs: [...this.userInputs],
                validationStates: [...this.validationStates],
                activeDrillIndex: this.activeDrillIndex,
                isGenerating: this.isGenerating,
                isGameCompleted: this.gameJustCompleted,
                isRecognizingSpeech: speechService.IsRecognizing
            }
        }));
    }

    private async showAssistantHint(index: number, userInput: string) {
        // Імпортуємо assistantUI прямо тут, щоб уникнути циклічних залежностей
        const { assistantUI } = await import('../components/assistant-ui');
        
        if (this.currentSettings?.assistantEnabled && 
            assistantService.isInitialized && 
            index < this.sentences.length) {
            
            try {
                assistantUI.showHint(userInput, this.sentences[index].sentence);
            } catch (error) {
                console.error('Failed to show assistant hint:', error);
            }
        }
    }

    private updateLoadingState() {
        if (this.newGameButton && this.settingsButton && this.helpButton && this.micButton) {
            showLoading(this.isGenerating, this.newGameButton, this.settingsButton, this.helpButton, this.micButton);
        }
    }

    public getCurrentGameState() {
        return {
            sentences: [...this.sentences],
            userInputs: [...this.userInputs],
            validationStates: [...this.validationStates],
            activeDrillIndex: this.activeDrillIndex,
            isGenerating: this.isGenerating,
            isRecognizingSpeech: speechService.IsRecognizing,
            isGameCompleted: this.gameJustCompleted
        };
    }
}

export const gameLogicService = new GameLogicService();
