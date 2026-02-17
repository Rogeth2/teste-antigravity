import Game from './Game.js';

window.addEventListener('load', () => {
    const canvas = document.getElementById('gameCanvas');
    const game = new Game(canvas);

    // UI Buttons
    document.getElementById('start-btn').addEventListener('click', () => {
        document.getElementById('start-screen').classList.add('hidden');
        game.start();
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
        const goScreen = document.getElementById('game-over-screen');
        goScreen.classList.add('hidden');
        // Reset title in case it was changed by victory
        const title = goScreen.querySelector('h1');
        if (title) {
            title.textContent = 'MISSION FAILED';
            title.style.cssText = '';
        }
        game.restart();
    });

    document.getElementById('continue-btn').addEventListener('click', () => {
        const goScreen = document.getElementById('game-over-screen');
        goScreen.classList.add('hidden');
        game.continueAfterDeath();
    });

    // Shop Toggle (Key 'P' or similar, or a button if we had one. For now let's add a key listener)
    window.addEventListener('keydown', (e) => {
        // Weapon Switching
        if (e.key.toLowerCase() === 'q' && game.player) {
            game.player.switchWeapon();
        }
        // Obliterator
        if (e.key.toLowerCase() === 'e') {
            game.fireObliterator();
        }
        if (e.key.toLowerCase() === 'p') {
            game.toggleShop();
        }
    });

    document.getElementById('close-shop-btn').addEventListener('click', () => {
        game.toggleShop();
    });

    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const item = e.target.parentElement;
            const type = item.getAttribute('data-upgrade');
            game.buyUpgrade(type);
        });
    });

    // Global Button Polish (Scale and Color Feedback)
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('mousedown', () => {
            const colors = ['#f0f', '#0ff', '#ff0', '#0f0', '#f00', '#fff'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            btn.dataset.originalColor = btn.style.backgroundColor || '';
            btn.style.backgroundColor = randomColor;
        });
        btn.addEventListener('mouseup', () => {
            setTimeout(() => {
                btn.style.backgroundColor = btn.dataset.originalColor || '';
            }, 100);
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.backgroundColor = btn.dataset.originalColor || '';
        });
    });

    // Initial resize
    game.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', () => {
        game.resize(window.innerWidth, window.innerHeight);
    });
});
