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
        } else if (this.type === 'KAMIKAZE') {
            this.color = '#ff3300';
            this.speed = 4;
            this.hp = 30;
            this.scoreValue = 250;
            this.creditsValue = 25;
            this.explodeRadius = 200;
            this.explodeDamage = 40;
            this.isPrepping = false;
            this.prepTimer = 0;
            this.prepDuration = 1000; // 1s warning before explode
            this.pulseTimer = 0;
        } else if (this.type === 'SHIELDED') {
            this.color = '#4488ff';
            this.hp = 50;
            this.scoreValue = 400;
            this.creditsValue = 40;
            this.shieldHits = 3;
            this.shieldActive = true;
        } else if (this.type === 'BOMBER') {
            this.width = 60;
            this.height = 30;
            this.color = '#ff8800';
            this.speed = 3;
            this.hp = 80;
            this.scoreValue = 500;
            this.creditsValue = 50;
            this.mineTimer = 0;
            this.mineInterval = 2000;
            // Start at a random side, fly horizontally
            this.x = Math.random() < 0.5 ? -this.width : this.game.width;
            // Multi-zone: top, center, or bottom
            const zone = Math.random();
            if (zone < 0.33) {
                this.y = 30 + Math.random() * 80; // Top
            } else if (zone < 0.66) {
                this.y = this.game.height * 0.4 + Math.random() * (this.game.height * 0.2); // Center
            } else {
                this.y = this.game.height * 0.75 + Math.random() * (this.game.height * 0.15); // Bottom
            }
            this.direction = this.x < 0 ? 1 : -1;
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
        } else if (this.type === 'KAMIKAZE') {
            // Chase player at high speed
            if (this.game.player) {
                const dx = this.game.player.x - this.x;
                const dy = this.game.player.y - this.y;
                const dist = Math.hypot(dx, dy);
                const angle = Math.atan2(dy, dx);
                this.rotation = angle;

                if (this.isPrepping) {
                    // Counting down to explosion
                    this.prepTimer += deltaTime;
                    this.pulseTimer += deltaTime;
                    if (this.prepTimer >= this.prepDuration) {
                        // EXPLODE!
                        this.kamikazeExplode();
                        return;
                    }
                } else if (dist < 100) {
                    // Close enough - start prepping
                    this.isPrepping = true;
                    this.prepTimer = 0;
                } else {
                    // Chase
                    this.x += Math.cos(angle) * this.speed;
                    this.y += Math.sin(angle) * this.speed;
                }
            }
        } else if (this.type === 'SHIELDED') {
            // Moves like NORMAL but with shield
            this.y += this.speedY;
            this.x += Math.sin(this.y * 0.05) * 1.5;
            this.rotation = Math.PI / 2;
        } else if (this.type === 'BOMBER') {
            // Fly horizontally across the top
            this.x += this.speed * this.direction;
            this.rotation = this.direction > 0 ? 0 : Math.PI;

            // Drop mines
            this.mineTimer += deltaTime;
            if (this.mineTimer >= this.mineInterval) {
                this.mineTimer = 0;
                this.dropMine();
            }

            // Exit off-screen
            if ((this.direction > 0 && this.x > this.game.width + this.width) ||
                (this.direction < 0 && this.x < -this.width * 2)) {
                this.markedForDeletion = true;
            }
        }

        if (this.canRandomShot && !this.hasRandomShotFired && this.y > 50) {
            this.hasRandomShotFired = true;
            const randomAngle = Math.random() * Math.PI * 2;
            const projectile = new Projectile(this.game, this.x + this.width / 2, this.y + this.height / 2, randomAngle);
            projectile.isEnemy = true;
            projectile.color = '#ff9900';
            projectile.damage = 10;
            this.game.projectiles.push(projectile);
            this.game.audio.playEnemyShoot();
        }

        if (this.type !== 'BOMBER' && (this.y > this.game.height || (this.type !== 'NORMAL' && this.type !== 'SHIELDED' && this.y > this.game.height + 100))) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        const drawRotation = (this.rotation !== undefined) ? this.rotation : Math.PI / 2;
        ctx.rotate(drawRotation + Math.PI / 2);

        if (this.type === 'KAMIKAZE') {
            // Pulsing red triangle
            const pulse = this.isPrepping ? (Math.sin(this.pulseTimer * 0.02) > 0 ? '#fff' : '#ff0000') : this.color;
            ctx.fillStyle = pulse;
            ctx.shadowColor = '#ff3300';
            ctx.shadowBlur = this.isPrepping ? 25 : 10;
            ctx.beginPath();
            ctx.moveTo(0, -this.height / 2);
            ctx.lineTo(this.width / 2, this.height / 2);
            ctx.lineTo(-this.width / 2, this.height / 2);
            ctx.closePath();
            ctx.fill();
            // Inner warning circle
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(0, 5, 6, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'SHIELDED') {
            // Blue triangle
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(0, -this.height / 2);
            ctx.lineTo(this.width / 2, this.height / 2);
            ctx.lineTo(-this.width / 2, this.height / 2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.stroke();

            // Shield arc (front)
            if (this.shieldActive) {
                ctx.strokeStyle = '#00ccff';
                ctx.lineWidth = 4;
                ctx.shadowColor = '#00ccff';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(0, -this.height / 2, this.width * 0.6, -Math.PI * 0.6, Math.PI * 0.6);
                ctx.stroke();
                // Shield hit indicators
                for (let i = 0; i < this.shieldHits; i++) {
                    ctx.fillStyle = '#00ffff';
                    ctx.beginPath();
                    ctx.arc(-8 + i * 8, -this.height / 2 - 8, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (this.type === 'BOMBER') {
            // Wide rectangle (bomber shape)
            ctx.rotate(-drawRotation - Math.PI / 2); // Undo rotation for bomber
            ctx.fillStyle = this.color;
            ctx.shadowColor = '#ff8800';
            ctx.shadowBlur = 10;
            // Body
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            // Wings
            ctx.fillStyle = '#cc6600';
            ctx.fillRect(-this.width / 2 - 5, -3, 10, 6);
            ctx.fillRect(this.width / 2 - 5, -3, 10, 6);
            // Cockpit
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(this.direction > 0 ? this.width / 3 : -this.width / 3, 0, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            // Default triangle (NORMAL, FOLLOWER, SHOOTER, HYBRID, SUBBOSS)
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(0, -this.height / 2);
            ctx.lineTo(this.width / 2, this.height / 2);
            ctx.lineTo(-this.width / 2, this.height / 2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.stroke();
        }

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
                this.game.audio.playEnemyShoot();
            }
            this.shootTimer = 0;
        } else {
            this.shootTimer += deltaTime;
        }
    }

    takeDamage(amount) {
        // SHIELDED: absorb hits with shield first
        if (this.type === 'SHIELDED' && this.shieldActive) {
            this.shieldHits--;
            this.game.spawnFloatingText(this.x + this.width / 2, this.y - 10, 'BLOCKED!', '#00ccff');
            if (this.shieldHits <= 0) {
                this.shieldActive = false;
                this.game.spawnFloatingText(this.x + this.width / 2, this.y - 20, 'SHIELD DOWN!', '#ff4444');
            }
            return; // No HP damage while shield is up
        }

        this.hp -= amount;
        if (this.hp <= 0) {
            // KAMIKAZE explodes on death too
            if (this.type === 'KAMIKAZE' && !this.hasExploded) {
                this.kamikazeExplode();
                return;
            }
            this.markedForDeletion = true;
            this.game.score += this.scoreValue;
            this.game.credits += this.creditsValue;
            if (this.game.onEnemyDeath) {
                this.game.onEnemyDeath(this);
            }
        }
    }

    kamikazeExplode() {
        this.hasExploded = true;
        this.markedForDeletion = true;
        this.game.score += this.scoreValue;
        this.game.credits += this.creditsValue;

        const ex = this.x + this.width / 2;
        const ey = this.y + this.height / 2;

        // Visual explosion
        this.game.explosions.push({
            x: ex, y: ey, radius: this.explodeRadius,
            currentRadius: 10,
            color: 'rgba(255, 50, 0, ',
            life: 500, maxLife: 500, alpha: 1
        });
        this.game.audio.playExplosion();

        // Damage player if in range
        if (this.game.player) {
            const px = this.game.player.x + this.game.player.width / 2;
            const py = this.game.player.y + this.game.player.height / 2;
            const dist = Math.hypot(px - ex, py - ey);
            if (dist <= this.explodeRadius) {
                this.game.player.takeDamage(this.explodeDamage);
                this.game.spawnFloatingText(this.game.player.x, this.game.player.y, `-${this.explodeDamage} 💣`, '#ff3300');
                this.game.audio.playDamage();
            }
        }

        if (this.game.onEnemyDeath) {
            this.game.onEnemyDeath(this);
        }
    }

    dropMine() {
        const mine = {
            x: this.x + this.width / 2 - 10,
            y: this.y + this.height,
            width: 20,
            height: 20,
            type: 'MINE',
            life: 10000, // 10 seconds
            markedForDeletion: false,
            pulseTimer: 0,
            explodeRadius: 80,
            explodeDamage: 25,
            update(deltaTime) {
                this.life -= deltaTime;
                this.pulseTimer += deltaTime;
                if (this.life <= 0) this.markedForDeletion = true;
            },
            draw(ctx) {
                ctx.save();
                const pulse = Math.sin(this.pulseTimer * 0.005) * 0.3 + 0.7;
                ctx.fillStyle = `rgba(255, 136, 0, ${pulse})`;
                ctx.shadowColor = '#ff4400';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 10, 0, Math.PI * 2);
                ctx.fill();
                // Inner dot
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        };
        this.game.drops.push(mine);
        this.game.audio.playEnemyShoot();
    }
}
