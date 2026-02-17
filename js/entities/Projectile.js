import Entity from './Entity.js';

export default class Projectile extends Entity {
    constructor(game, x, y, angle) {
        super(game, x, y);
        this.width = 4;
        this.height = 10;
        this.speed = 10;
        this.damage = 10;
        this.color = '#ff0';
        this.isEnemy = false;
        this.isHoming = false;
        this.isBossBeam = false;
        this.isArc = false;
        this.radius = 0;
        this.initialRadius = 0;
        this.startX = x;
        this.startY = y;
        this.homingTimer = 8000; // ms
        this.angle = angle;

        this.velocity = {
            x: Math.cos(angle) * this.speed,
            y: Math.sin(angle) * this.speed
        };
    }

    update(deltaTime) {
        if (this.isHoming && !this.isEnemy) {
            // Find nearest enemy
            let nearest = null;
            let minBottomDist = Infinity;

            this.game.entities.forEach(enemy => {
                const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (dist < minBottomDist) {
                    minBottomDist = dist;
                    nearest = enemy;
                }
            });

            if (nearest) {
                const targetAngle = Math.atan2(
                    nearest.y - this.y,
                    nearest.x - this.x
                );
                this.angle = targetAngle;
                this.velocity.x = Math.cos(this.angle) * this.speed;
                this.velocity.y = Math.sin(this.angle) * this.speed;
            }
        } else if (this.isHoming && this.isEnemy && this.game.player) {
            // Boss homing projectile — targets the player
            if (this.homingTimer > 0) {
                this.homingTimer -= deltaTime;
                const targetAngle = Math.atan2(
                    this.game.player.y - this.y,
                    this.game.player.x - this.x
                );
                // Gentle steering (lerp angle)
                let diff = targetAngle - this.angle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                this.angle += diff * 0.03;
                this.velocity.x = Math.cos(this.angle) * this.speed;
                this.velocity.y = Math.sin(this.angle) * this.speed;
            }
        }

        // Radius Growth for Arc/Crescent Shot
        if (this.isArc && this.initialRadius > 0) {
            const dist = Math.hypot(this.x - this.startX, this.y - this.startY);
            // Growth: 5px per 30px distance
            this.radius = this.initialRadius + (dist / 30) * 5;

            // Update AABB for broad-phase collision if needed
            this.width = this.radius * 2;
            this.height = this.radius * 2;
        }

        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Cleanup if off screen
        if (this.x < 0 || this.x > this.game.width ||
            this.y < 0 || this.y > this.game.height) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const rotationAngle = Math.atan2(this.velocity.y, this.velocity.x);
        ctx.rotate(rotationAngle + Math.PI / 2);
        ctx.fillStyle = this.color;

        if (this.isArc && this.radius > 0) {
            // Crescent Moon Shape (Thinner)
            ctx.beginPath();
            // Outer Curve
            ctx.arc(0, 0, this.radius, Math.PI, 0, false);
            // Inner Curve (closer and offset to create a thinner crescent)
            ctx.arc(0, this.radius * 0.1, this.radius * 0.98, 0, Math.PI, true);
            ctx.closePath();
            ctx.fill();
        } else {
            // Standard rectangle
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        }
        ctx.restore();
    }
}
