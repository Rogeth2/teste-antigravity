import Entity from './Entity.js';
import Projectile from './Projectile.js';

export default class Enemy extends Entity {
    constructor(game, type = 'NORMAL') {
        super(game, 0, 0);
        this.width = 40;
        this.height = 40;
        this.x = Math.random() * (this.game.width - this.width);
        this.y = -this.height;
        this.speedY = Math.random() * 2 + 1;
        this.color = '#f00';
        this.type = type;

        this.hp = 20;
        this.scoreValue = 100;
        this.creditsValue = 10;

        // Type specific stats
        if (this.type === 'FOLLOWER') {
            this.color = '#f0f';
            this.speed = 2;
            this.hp = 40;
            this.scoreValue = 200;
        } else if (this.type === 'SHOOTER') {
            this.color = '#0f0';
            this.hp = 60;
            this.scoreValue = 300;
            this.shootTimer = 0;
            this.shootInterval = 2000;
        } else if (this.type === 'HYBRID') {
            this.color = '#fff';
            this.speed = 2;
            this.hp = 100;
            this.scoreValue = 500;
            this.shootTimer = 0;
            this.shootInterval = 1500;
        } else if (this.type === 'SUBBOSS') {
            this.width = 80;
            this.height = 80;
            this.color = '#ffcc00';
            this.speed = 2;
            this.hp = 500;
            this.scoreValue = 2000;
            this.creditsValue = 200;
            this.shootTimer = 0;
            this.shootInterval = 1200;
        }

        this.canRandomShot = (this.game.level >= 5 && Math.random() < 0.02);
        this.hasRandomShotFired = false;
        this.oscillationMult = (this.game.level >= 60 && this.type === 'NORMAL' && Math.random() < 0.05) ? 4 : 1;
    }

    update(deltaTime) {
        let moveSpeed = this.speed;
        let fireRateMult = 1;
        let projectileSpeedMult = 1;

        if (this.game.globalFollowerSpeedMult > 1 && (this.type === 'FOLLOWER' || this.type === 'HYBRID' || this.type === 'SUBBOSS')) {
            if (this.type !== 'SUBBOSS') {
                moveSpeed *= this.game.globalFollowerSpeedMult;
            }
        }
        if (this.game.globalEnemyFireRateMult > 1) {
            fireRateMult = this.game.globalEnemyFireRateMult;
        }
        if (this.game.globalEnemyProjectileSpeedMult > 1) {
            projectileSpeedMult = this.game.globalEnemyProjectileSpeedMult;
        }

        if (this.type === 'NORMAL') {
            this.y += this.speedY;
            this.x += Math.sin(this.y * 0.05) * 2 * this.oscillationMult;
            this.rotation = Math.PI / 2;
        } else if (this.type === 'FOLLOWER') {
            if (this.game.player) {
                const dx = this.game.player.x - this.x;
                const dy = this.game.player.y - this.y;
                const angle = Math.atan2(dy, dx);
                this.x += Math.cos(angle) * moveSpeed;
                this.y += Math.sin(angle) * moveSpeed;
                this.rotation = angle;
            }
        } else if (this.type === 'SHOOTER') {
            this.y += this.speedY * 0.5;
            this.rotation = Math.PI / 2;
            this.handleShooting(deltaTime, fireRateMult, projectileSpeedMult);
        } else if (this.type === 'HYBRID' || this.type === 'SUBBOSS') {
            if (this.game.player) {
                const dx = this.game.player.x - this.x;
                const dy = this.game.player.y - this.y;
                const angle = Math.atan2(dy, dx);
                this.x += Math.cos(angle) * moveSpeed;
                this.y += Math.sin(angle) * moveSpeed;
                this.rotation = angle;
            }
            this.handleShooting(deltaTime, fireRateMult, projectileSpeedMult);
        }

        if (this.canRandomShot && !this.hasRandomShotFired && this.y > 50) {
            this.hasRandomShotFired = true;
            const randomAngle = Math.random() * Math.PI * 2;
            const projectile = new Projectile(this.game, this.x + this.width / 2, this.y + this.height / 2, randomAngle);
            projectile.isEnemy = true;
            projectile.color = '#ff9900';
            projectile.damage = 10;
            this.game.projectiles.push(projectile);
        }

        if (this.y > this.game.height || (this.type !== 'NORMAL' && this.y > this.game.height + 100)) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        const drawRotation = (this.rotation !== undefined) ? this.rotation : Math.PI / 2;
        ctx.rotate(drawRotation + Math.PI / 2);

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2);
        ctx.lineTo(this.width / 2, this.height / 2);
        ctx.lineTo(-this.width / 2, this.height / 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.stroke();
        ctx.restore();
    }

    handleShooting(deltaTime, fireRateMult, projectileSpeedMult) {
        if (this.shootTimer > (this.shootInterval / fireRateMult)) {
            if (this.game.player) {
                const angle = Math.atan2(
                    this.game.player.y - (this.y + this.height / 2),
                    this.game.player.x - (this.x + this.width / 2)
                );

                const shotCount = this.game.level >= 400 ? 2 : 1;
                const offset = 8;

                for (let i = 0; i < shotCount; i++) {
                    let spawnX = this.x + this.width / 2;
                    let spawnY = this.y + this.height / 2;

                    if (shotCount === 2) {
                        const sideOffset = (i === 0 ? 1 : -1) * offset;
                        spawnX += Math.cos(angle + Math.PI / 2) * sideOffset;
                        spawnY += Math.sin(angle + Math.PI / 2) * sideOffset;
                    }

                    const projectile = new Projectile(this.game, spawnX, spawnY, angle);
                    projectile.isEnemy = true;
                    projectile.color = '#0f0';
                    projectile.damage = 10;
                    projectile.speed *= projectileSpeedMult;
                    projectile.velocity.x = Math.cos(angle) * projectile.speed;
                    projectile.velocity.y = Math.sin(angle) * projectile.speed;
                    this.game.projectiles.push(projectile);
                }
            }
            this.shootTimer = 0;
        } else {
            this.shootTimer += deltaTime;
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.markedForDeletion = true;
            this.game.score += this.scoreValue;
            this.game.credits += this.creditsValue;
            if (this.game.onEnemyDeath) {
                this.game.onEnemyDeath(this);
            }
        }
    }
}
