import TestingGame from './TestingGame.js';

window.addEventListener('load', () => {
    const canvas = document.getElementById('gameCanvas');
    const game = new TestingGame(canvas);

    // UI Buttons
    document.getElementById('start-btn').addEventListener('click', () => {
        document.getElementById('start-screen').classList.add('hidden');
        game.start();
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
        const goScreen = document.getElementById('game-over-screen');
        goScreen.classList.add('hidden');
        game.restart();
    });

    // Keys
    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'q' && game.player) {
            game.player.switchWeapon();
        }
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

    // Initial resize
    game.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', () => {
        game.resize(window.innerWidth, window.innerHeight);
    });
});
