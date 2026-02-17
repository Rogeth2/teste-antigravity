export default class Entity {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = 0;
        this.height = 0;
        this.speed = 0;
        this.speedX = 0;
        this.speedY = 0;
        this.markedForDeletion = false;
        this.color = 'white';
    }

    update(deltaTime) {
        this.x += this.speedX;
        this.y += this.speedY;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}
