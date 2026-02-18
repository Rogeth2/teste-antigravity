const fs = require('fs');
const path = require('path');

// Read all source files
const files = [
    { label: 'js/utils.js', path: 'js/utils.js' },
    { label: 'js/InputHandler.js', path: 'js/InputHandler.js' },
    { label: 'js/Background.js', path: 'js/Background.js' },
    { label: 'js/entities/Entity.js', path: 'js/entities/Entity.js' },
    { label: 'js/entities/Projectile.js', path: 'js/entities/Projectile.js' },
    { label: 'js/entities/Drop.js', path: 'js/entities/Drop.js' },
    { label: 'js/entities/Enemy.js', path: 'js/entities/Enemy.js' },
    { label: 'js/entities/Player.js', path: 'js/entities/Player.js' },
    { label: 'js/entities/Boss.js', path: 'js/entities/Boss.js' },
    { label: 'js/AudioManager.js', path: 'js/AudioManager.js' },
    { label: 'js/Game.js', path: 'js/Game.js' },
];

const baseDir = __dirname;

// Read template HTML (everything before <script> and after </script>)
const bundled = fs.readFileSync(path.join(baseDir, 'game_bundled.html'), 'utf8');
const scriptStart = bundled.indexOf('<script>');
const scriptEnd = bundled.indexOf('</script>');

const htmlBefore = bundled.substring(0, scriptStart + '<script>'.length);
const htmlAfter = bundled.substring(scriptEnd);

// Build JS content
let jsContent = '\n';
files.forEach(f => {
    let code = fs.readFileSync(path.join(baseDir, f.path), 'utf8');
    // Remove import/export statements
    code = code.replace(/^import\s+.*;\s*$/gm, '');
    code = code.replace(/^export\s+default\s+/gm, '');
    code = code.replace(/^export\s+/gm, '');
    jsContent += `\n// --- ${f.label} ---\n`;
    jsContent += code;
});

// Add initialization code
jsContent += `
// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const game = new Game(canvas);

    document.getElementById('start-btn').addEventListener('click', () => {
        document.getElementById('start-screen').classList.add('hidden');
        game.audio.resume();
        game.start();
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
        document.getElementById('game-over-screen').classList.add('hidden');
        // Reset title for next death
        const title = document.querySelector('#game-over-screen h1');
        if (title) {
            title.textContent = 'MISSION FAILED';
            title.style.cssText = '';
        }
        game.restart();
    });

    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            document.getElementById('game-over-screen').classList.add('hidden');
            // Reset title for next death
            const title = document.querySelector('#game-over-screen h1');
            if (title) {
                title.textContent = 'MISSION FAILED';
                title.style.cssText = '';
            }
            game.continueAfterDeath();
        });
    }

    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'q') {
            if (game.player) game.player.switchWeapon();
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
`;

const output = htmlBefore + jsContent + '\n' + htmlAfter;
fs.writeFileSync(path.join(baseDir, 'game_bundled.html'), output, 'utf8');
console.log('Bundle created successfully! Lines:', output.split('\n').length);
