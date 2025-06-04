// services/speech.ts

import { showToast } from '../utils/dom-helpers';
import { Settings } from '../types';

class SpeechService extends EventTarget {
    private synth: SpeechSynthesis | null = null;
    private recognition: any | null = null;
    private voices: SpeechSynthesisVoice[] = [];
    private _isRecognizingSpeech: boolean = false;
    private currentSpeechInputTarget: HTMLTextAreaElement | null = null;
    private currentTargetInputListener: EventListener | null = null;
    private currentTargetClickListener: EventListener | null = null;
    private settings: Settings | null = null;
    private _pendingStartTarget: HTMLTextAreaElement | null = null; // New: stores target for delayed start

    constructor() {
        super();

        if ('speechSynthesis' in window) {
            this.synth = window.speechSynthesis;
            // Safari/Firefox bug workaround: voices are not immediately available
            // Use an event listener for voiceschanged, as getVoices() can be empty initially.
            if (this.synth.onvoiceschanged !== undefined) {
                this.synth.onvoiceschanged = () => {
                    this.populateVoiceList();
                    (this as EventTarget).dispatchEvent(new CustomEvent('ttsVoicesChanged', { detail: { voices: this.voices } }));
                };
            } else {
                // Fallback for browsers that don't support onvoiceschanged, or when it's not fired.
                // Try populating immediately, but also rely on updateSettings calls.
                this.populateVoiceList();
            }
        } else {
            console.warn("Text-to-Speech not supported by this browser.");
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.lang = 'en-US';
            this.recognition.interimResults = true;
            this.recognition.maxAlternatives = 1;

            this.recognition.onresult = this.handleSpeechResult.bind(this);
            this.recognition.onerror = this.handleSpeechError.bind(this);
            this.recognition.onstart = this.handleSpeechStart.bind(this);
            this.recognition.onend = this.handleSpeechEnd.bind(this); // Now robustly handles pending starts
        } else {
            console.warn("Speech Recognition not supported by this browser.");
            showToast("Speech input not supported by this browser.", 3500, 'error');
        }
    }

    public updateSettings(settings: Settings) {
        this.settings = settings;
        this.toggleTTSAvailability(this.settings.voiceVolume > 0);
    }

    private populateVoiceList() {
        if (!this.synth || (this.settings && this.settings.voiceVolume === 0)) {
            this.voices = [];
            return;
        }
        // Get all English voices
        this.voices = this.synth.getVoices().filter(voice => voice.lang.startsWith('en'));
        // Dispatch ttsReady every time voices are updated, even if initially empty.
        (this as EventTarget).dispatchEvent(new CustomEvent('ttsReady'));
    }

    public get currentVoices(): SpeechSynthesisVoice[] {
        return [...this.voices];
    }
    public get IsRecognitionAvailable(): boolean {
        return !!this.recognition;
    }

    public get IsRecognizing(): boolean {
        return this._isRecognizingSpeech;
    }

    public toggleTTSAvailability(enable: boolean) {
        if (!this.synth) {
            return;
        }
        if (enable) {
            this.populateVoiceList(); // Re-populate voices if TTS is enabled
        } else {
            if (this.synth.speaking) this.synth.cancel();
        }
    }

    public playSentenceAudio(sentenceText: string) {
        if (!this.synth || !sentenceText || !this.settings || this.settings.voiceVolume === 0 || this.voices.length === 0) return;
        if (this.synth.speaking) this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(sentenceText);
        const selectedVoice = this.voices.find(voice => voice.name === this.settings!.ttsVoice);

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        } else if (this.voices.length > 0) {
            utterance.voice = this.voices[0]; // Fallback to first available voice
        }

        utterance.volume = this.settings.voiceVolume / 100;
        utterance.onerror = (event) => {
            console.error('SpeechSynthesis Error:', event);
            showToast(`TTS Error: ${event.error}`, 3000, 'error');
        };
        this.synth.speak(utterance);
    }

    public startRecognition(targetInput: HTMLTextAreaElement) {
        if (!this.recognition) {
            showToast("Speech input is not available.", 3000, 'error');
            return;
        }
        if (targetInput.disabled || targetInput.readOnly) {
            showToast("Cannot start voice input on a locked or completed field.", 3000, 'error');
            return;
        }

        // If currently recognizing, stop it first. Store the request to start later.
        if (this._isRecognizingSpeech) {
            console.warn("Already recognizing speech, stopping current recognition to restart.");
            this._pendingStartTarget = targetInput; // Store the target for when it stops
            this.recognition.stop(); // This will trigger onend
        } else {
            // If not recognizing, or was just stopped, try to start immediately.
            this._startRecognitionInternal(targetInput);
        }
    }

    private _startRecognitionInternal(targetInput: HTMLTextAreaElement) {
        // Ensure no redundant listeners from previous targets if somehow start is called directly
        this.removeInputTargetListeners();

        this.currentSpeechInputTarget = targetInput;
        this.addInputTargetListeners();

        try {
            this.recognition.start();
        } catch (e: any) {
            console.error("Error starting speech recognition:", e);
            showToast(`Mic start error: ${e.message}. Check permissions.`, 4000, 'error');
            this._isRecognizingSpeech = false;
            (this as EventTarget).dispatchEvent(new CustomEvent('speechEnd'));
            this.removeInputTargetListeners();
            this._pendingStartTarget = null; // Clear pending request on error
        }
    }

    public stopRecognition() {
        if (this.recognition && this._isRecognizingSpeech) {
            this.recognition.stop();
        }
        this._pendingStartTarget = null; // Cancel any pending start requests
        this.removeInputTargetListeners();
    }

    private addInputTargetListeners() {
        if (this.currentSpeechInputTarget) {
            this.currentTargetInputListener = this.handleManualInput.bind(this);
            this.currentTargetClickListener = this.handleManualInput.bind(this);

            this.currentSpeechInputTarget.addEventListener('input', this.currentTargetInputListener);
            this.currentSpeechInputTarget.addEventListener('click', this.currentTargetClickListener);
        }
    }

    private removeInputTargetListeners() {
        if (this.currentSpeechInputTarget) {
            if (this.currentTargetInputListener) {
                this.currentSpeechInputTarget.removeEventListener('input', this.currentTargetInputListener);
            }
            if (this.currentTargetClickListener) {
                this.currentSpeechInputTarget.removeEventListener('click', this.currentTargetClickListener);
            }
            this.currentSpeechInputTarget = null;
            this.currentTargetInputListener = null;
            this.currentTargetClickListener = null;
        }
    }

    private handleManualInput() {
        this.stopRecognition();
    }

    private handleSpeechResult(event: any) {
        if (!this.currentSpeechInputTarget) return;

        let fullTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            fullTranscript += event.results[i][0].transcript;
        }

        const trimmedTranscript = fullTranscript.trim();
        this.currentSpeechInputTarget.value = trimmedTranscript;

        (this as EventTarget).dispatchEvent(new CustomEvent('speechResult', {
            detail: { transcript: trimmedTranscript, isFinal: event.results[event.results.length - 1].isFinal }
        }));
    }

    private handleSpeechError(event: any) {
        console.error('Speech recognition error', event.error);
        let message = `Speech error: ${event.error}`;
        if (event.error === 'no-speech') message = 'No speech detected. Try again.';
        else if (event.error === 'audio-capture') message = 'Microphone problem. Check setup.';
        else if (event.error === 'not-allowed') message = 'Microphone access denied. Please enable permissions in browser/OS settings.';
        else if (event.error === 'network') message = 'Network error during speech recognition.';

        showToast(message, 4000, 'error');
        (this as EventTarget).dispatchEvent(new CustomEvent('speechError', { detail: { error: event.error } }));
        // Always ensure _isRecognizingSpeech is false and listeners are cleaned on error
        this._isRecognizingSpeech = false;
        this.removeInputTargetListeners();
        this._pendingStartTarget = null; // Clear any pending requests on error
        (this as EventTarget).dispatchEvent(new CustomEvent('speechEnd')); // Dispatch to update UI
    }

    private handleSpeechStart() {
        this._isRecognizingSpeech = true;
        (this as EventTarget).dispatchEvent(new CustomEvent('speechStart'));
    }

    private handleSpeechEnd() {
        this._isRecognizingSpeech = false;
        this.removeInputTargetListeners(); // Clean up listeners when recognition stops

        // If there's a pending start request, fulfill it now that recognition has truly ended.
        if (this._pendingStartTarget) {
            const target = this._pendingStartTarget;
            this._pendingStartTarget = null; // Clear the pending request
            this._startRecognitionInternal(target); // Start the new recognition
        }
        (this as EventTarget).dispatchEvent(new CustomEvent('speechEnd'));
    }
}

export const speechService = new SpeechService();