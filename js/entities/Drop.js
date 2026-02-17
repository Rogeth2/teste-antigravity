import Entity from './Entity.js';

export default class Drop extends Entity {
    constructor(game, x, y, type = 'OBLITERATOR') {
        super(game, x, y);
        this.width = 20;
        this.height = 20;
        this.type = type;
        this.speedY = 1; // Drifts down slowly

        // Blink effect
        this.blinkTimer = 0;
        this.visible = true;
        this.markedForDeletion = false;

        if (this.type === 'OBLITERATOR') {
            this.color = '#ff4d4d'; // Reddish
        } else if (this.type === 'ARMOR_1') {
            this.color = '#4dff4d'; // Green
        } else if (this.type === 'ARMOR_2') {
            this.color = '#ffff00'; // Yellow/Gold
        } else if (this.type === 'SHIELD') {
            this.color = '#00ffff'; // Cyan/Shield
        } else if (this.type === 'REPAIR') {
            this.color = '#ff66aa'; // Pinkish
        } else {
            this.color = '#ffffff';
        }
    }

    update(deltaTime) {
        this.y += this.speedY;

        // Blinking
        this.blinkTimer += deltaTime;
        if (this.blinkTimer > 200) {
            this.visible = !this.visible;
            this.blinkTimer = 0;
        }

        if (this.y > this.game.height) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        if (!this.visible) return;

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'black';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let label = 'N';
        if (this.type === 'ARMOR_1') label = 'A1';
        else if (this.type === 'ARMOR_2') label = 'A2';
        else if (this.type === 'SHIELD') label = 'S';
        else if (this.type === 'REPAIR') label = '+';

        ctx.fillText(label, 0, 0);

        ctx.restore();
    }
}
