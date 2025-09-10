// components/assistant-ui.ts

import { assistantService } from '../services/assistant';
import { settingsService } from '../services/settings';
import { showToast } from '../utils/dom-helpers';

export class AssistantUI {
    private hintElement: HTMLElement;
    private isVisible: boolean = false;

    constructor() {
        this.hintElement = this.createHintElement();
        document.body.appendChild(this.hintElement);
    }

    private createHintElement(): HTMLElement {
        const element = document.createElement('div');
        element.className = 'assistant-hint-container';
        element.innerHTML = `
            <div class="assistant-hint-header">
                <span class="assistant-hint-title">💡 Assistant Hint</span>
                <button class="assistant-hint-close">×</button>
            </div>
            <div class="assistant-hint-content"></div>
        `;
        
        const closeBtn = element.querySelector('.assistant-hint-close');
        closeBtn?.addEventListener('click', () => this.hideHint());
        
        return element;
    }

    public async showHint(incorrectSentence: string, correctSentence: string) {
        if (!settingsService.settings.assistantEnabled) {
            return;
        }

        const hintContent = this.hintElement.querySelector('.assistant-hint-content');
        if (!hintContent) return;

        // Show loading state
        hintContent.innerHTML = '<div class="assistant-loading">-thinking...</div>';
        this.showHintElement();

        try {
            const hint = await assistantService.getCorrectionHint(
                incorrectSentence,
                correctSentence,
                settingsService.settings.assistantLanguage,
                settingsService.settings.assistantModel
            );
            
            hintContent.innerHTML = `<div class="assistant-hint-text">${hint}</div>`;
        } catch (error: any) {
            console.error('Assistant hint error:', error);
            hintContent.innerHTML = '<div class="assistant-error">Failed to get hint. Please check your API key.</div>';
            showToast('Assistant error: ' + error.message, 3000, 'error');
        }
    }

    private showHintElement() {
        this.hintElement.classList.add('visible');
        this.isVisible = true;
        this.positionHint();
    }

    public hideHint() {
        this.hintElement.classList.remove('visible');
        this.isVisible = false;
    }

    private positionHint() {
        // Адаптивне позиціонування для мобільних пристроїв
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            this.hintElement.classList.add('mobile');
        } else {
            this.hintElement.classList.remove('mobile');
        }
    }

    public updatePosition() {
        if (this.isVisible) {
            this.positionHint();
        }
    }
}

// Додаємо CSS стилі
const assistantStyles = `
.assistant-hint-container {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 350px;
    max-height: 200px;
    background: var(--assistant-bg, #fff3cd);
    border: 1px solid var(--assistant-border, #ffeaa7);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    opacity: 0;
    transform: translateY(-20px);
    transition: all 0.3s ease;
    overflow: hidden;
}

.assistant-hint-container.visible {
    opacity: 1;
    transform: translateY(0);
}

.assistant-hint-container.mobile {
    position: fixed;
    top: auto;
    bottom: 20px;
    left: 20px;
    right: 20px;
    width: auto;
    max-height: 150px;
}

.assistant-hint-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--assistant-header-bg, #fff3cd);
    border-bottom: 1px solid var(--assistant-border, #ffeaa7);
}

.assistant-hint-title {
    font-weight: 600;
    color: var(--assistant-text, #856404);
    font-size: 14px;
}

.assistant-hint-close {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: var(--assistant-text, #856404);
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
}

.assistant-hint-close:hover {
    background-color: var(--assistant-close-hover, rgba(133, 100, 4, 0.1));
}

.assistant-hint-content {
    padding: 16px;
    font-size: 14px;
    line-height: 1.4;
    color: var(--assistant-text, #856404);
    overflow-y: auto;
    max-height: 140px;
}

.assistant-loading {
    text-align: center;
    color: var(--assistant-text, #856404);
    font-style: italic;
}

.assistant-error {
    color: var(--error-color, #dc3545);
    font-weight: 500;
}

/* Темна тема */
body.dark-mode .assistant-hint-container {
    --assistant-bg: #343a40;
    --assistant-border: #495057;
    --assistant-header-bg: #495057;
    --assistant-text: #f8f9fa;
    --assistant-close-hover: rgba(248, 249, 250, 0.1);
}

body.dark-mode .assistant-error {
    --error-color: #ff6b6b;
}

/* Адаптивність для клавіатури на мобільних */
@media (max-height: 600px) and (pointer: coarse) {
    .assistant-hint-container.mobile {
        bottom: 250px; /* Вище клавіатури */
    }
}
`;

// Додаємо стилі до сторінки
const styleElement = document.createElement('style');
styleElement.textContent = assistantStyles;
document.head.appendChild(styleElement);

// Створюємо глобальний екземпляр
export const assistantUI = new AssistantUI();
