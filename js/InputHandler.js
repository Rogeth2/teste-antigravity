export default class InputHandler {
    constructor(game) {
        this.game = game;
        this.keys = new Set();
        this.mouse = { x: 0, y: 0, isDown: false };

        window.addEventListener('keydown', (e) => {
            this.keys.add(e.key.toLowerCase());
        });

        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.key.toLowerCase());
        });

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        window.addEventListener('mousedown', () => {
            this.mouse.isDown = true;
        });

        window.addEventListener('mouseup', () => {
            this.mouse.isDown = false;
        });
    }

    isKeyDown(key) {
        return this.keys.has(key.toLowerCase());
    }
}
