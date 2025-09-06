// components/assistant-ui.ts

import { AssistantHint } from '../services/assistant';

export class AssistantUI {
    private container: HTMLElement;
    private isVisible: boolean = false;

    constructor() {
        this.container = this.createContainer();
        document.body.appendChild(this.container);
    }

    private createContainer(): HTMLElement {
        const container = document.createElement('div');
        container.id = 'assistant-hint-container';
        container.className = 'assistant-hint-container';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--assistant-bg, #f8f9fa);
            border: 1px solid var(--assistant-border, #dee2e6);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            max-width: 90vw;
            width: 100%;
            max-width: 500px;
            display: none;
            font-family: inherit;
        `;
        
        // Додаємо обробник для автоматичного позиціонування над клавіатурою
        this.setupKeyboardHandling(container);
        
        return container;
    }

    private setupKeyboardHandling(container: HTMLElement) {
        // Відстежуємо відкриття клавіатури на мобільних пристроях
        let initialViewportHeight = window.innerHeight;
        
        window.addEventListener('resize', () => {
            const currentHeight = window.innerHeight;
            const heightDifference = initialViewportHeight - currentHeight;
            
            // Якщо висота змінилася більше ніж на 150px, ймовірно клавіатура відкрита
            if (heightDifference > 150) {
                // Переміщуємо контейнер над клавіатурою
                container.style.bottom = `${heightDifference + 20}px`;
            } else {
                // Клавіатура закрита, повертаємо до нормального положення
                container.style.bottom = '20px';
            }
        });
    }

    public showHint(hint: AssistantHint) {
        if (!hint) return;
        
        this.container.innerHTML = this.renderHint(hint);
        this.container.style.display = 'block';
        this.isVisible = true;
        
        // Додаємо обробник для закриття по кліку поза контейнером
        setTimeout(() => {
            const closeHandler = (e: MouseEvent) => {
                if (!this.container.contains(e.target as Node)) {
                    this.hide();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 100);
    }

    public hide() {
        this.container.style.display = 'none';
        this.isVisible = false;
    }

    public isVisibleState(): boolean {
        return this.isVisible;
    }

    private renderHint(hint: AssistantHint): string {
        return `
            <div class="assistant-hint-content">
                <div class="assistant-hint-header">
                    <h3 class="assistant-hint-title">${hint.title}</h3>
                    <button class="assistant-hint-close" onclick="document.getElementById('assistant-hint-container').style.display='none'">×</button>
                </div>
                <div class="assistant-hint-body">
                    <p class="assistant-hint-explanation">${hint.explanation}</p>
                    ${hint.examples.length > 0 ? `
                        <div class="assistant-hint-examples">
                            <h4>Examples:</h4>
                            <ul>
                                ${hint.examples.map(example => `<li>${example}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    public destroy() {
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

// CSS стилі для Assistant UI
const assistantStyles = `
    .assistant-hint-container {
        --assistant-bg: #f8f9fa;
        --assistant-border: #dee2e6;
        --assistant-text: #212529;
        --assistant-primary: #0d6efd;
        --assistant-secondary: #6c757d;
    }
    
    .dark .assistant-hint-container {
        --assistant-bg: #2d3748;
        --assistant-border: #4a5568;
        --assistant-text: #e2e8f0;
        --assistant-primary: #63b3ed;
        --assistant-secondary: #a0aec0;
    }
    
    .assistant-hint-content {
        padding: 16px;
        color: var(--assistant-text);
    }
    
    .assistant-hint-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        border-bottom: 1px solid var(--assistant-border);
        padding-bottom: 8px;
    }
    
    .assistant-hint-title {
        margin: 0;
        font-size: 1.1em;
        font-weight: 600;
        color: var(--assistant-primary);
    }
    
    .assistant-hint-close {
        background: none;
        border: none;
        font-size: 1.5em;
        cursor: pointer;
        color: var(--assistant-secondary);
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s;
    }
    
    .assistant-hint-close:hover {
        background-color: rgba(0, 0, 0, 0.1);
    }
    
    .assistant-hint-explanation {
        margin: 0 0 12px 0;
        line-height: 1.5;
    }
    
    .assistant-hint-examples {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--assistant-border);
    }
    
    .assistant-hint-examples h4 {
        margin: 0 0 8px 0;
        color: var(--assistant-primary);
        font-size: 0.9em;
        font-weight: 600;
    }
    
    .assistant-hint-examples ul {
        margin: 0;
        padding-left: 20px;
    }
    
    .assistant-hint-examples li {
        margin-bottom: 4px;
        font-size: 0.9em;
        line-height: 1.4;
    }
    
    @media (max-width: 768px) {
        .assistant-hint-container {
            bottom: 20px !important;
            left: 10px !important;
            right: 10px !important;
            transform: none !important;
            max-width: calc(100vw - 20px) !important;
        }
    }
`;

// Додаємо стилі до сторінки
const styleElement = document.createElement('style');
styleElement.textContent = assistantStyles;
document.head.appendChild(styleElement);

export const assistantUI = new AssistantUI();
