// utils/effects.ts

export function triggerConfettiEffect(confettiContainer: HTMLElement) {
    const colors = ['#ff577f', '#ff884b', '#ffd384', '#fff9b0', '#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6'];
    const numParticles = 80;

    for (let i = 0; i < numParticles; i++) {
        const particle = document.createElement('div');
        particle.classList.add('confetti-particle');

        const type = Math.random();
        if (type < 0.5) {
            particle.style.width = `${Math.random() * 6 + 7}px`;
            particle.style.height = `${Math.random() * 10 + 8}px`;
        } else {
            const size = `${Math.random() * 5 + 8}px`;
            particle.style.width = size;
            particle.style.height = size;
        }
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.left = `${Math.random() * 100}vw`;

        const animDuration = (Math.random() * 1.5 + 2.5).toFixed(1);
        particle.style.animationDuration = `${animDuration}s`;
        particle.style.animationDelay = `${Math.random() * 0.3}s`;

        particle.style.transform = `rotateZ(${Math.random() * 360}deg) rotateX(${Math.random() * 360}deg)`;

        confettiContainer.appendChild(particle);

        setTimeout(() => {
            if (particle.parentElement) {
                particle.remove();
            }
        }, parseFloat(animDuration) * 1000 + 500);
    }
}

export function highlightNewGameButton(button: HTMLButtonElement) {
    const pulseClassName = 'new-game-button-pulse-animation';
    button.classList.add(pulseClassName);
    setTimeout(() => {
        button.classList.remove(pulseClassName);
    }, 350 * 2);
}