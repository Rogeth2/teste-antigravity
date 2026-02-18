import Entity from './Entity.js';
import Projectile from './Projectile.js';

export default class Player extends Entity {
    constructor(game) {
        super(game, game.width / 2, game.height / 2);
        this.width = 40;
        this.height = 40;
        this.speed = 5;
        this.color = '#0ff'; // Cyan

        // Stats
        this.maxHp = 100;
        this.hp = this.maxHp;
        this.damage = 10;
        this.weaponLevel = 1;
        this.currentWeaponLevel = 1;
        this.hasHoming = false;
        this.obliteratorAmmo = 0;
        this.maxHpLevel = 0; // 0, 1, 2

        // Shooting
        this.shootTimer = 0;
        this.shootInterval = 200; // ms

        // Laser Charge
        this.isCharging = false;
        this.chargeTimer = 0;
        this.maxCharge = 600; // ms to full charge

        // Shield Mechanic
        this.shieldTimer = 0; // ms

        // Damage Tracking (for Shield Drop Condition Lvl 400+)
        this.lastDamageTime = 0;
        this.damageSequenceCount = 0;
    }

    takeDamage(amount) {
        let finalDamage = amount;

        if (this.shieldTimer > 0) {
            // New: 100% immunity for the entire 25s duration
            finalDamage = 0;
        }

        this.hp -= finalDamage;
        if (finalDamage > 0) {
            this.game.spawnFloatingText(this.x + this.width / 2, this.y, `-${Math.floor(finalDamage)}`, '#ff4444');

            // Track Sequence
            const now = performance.now();
            if (now - this.lastDamageTime < 2000) { // Within 2 seconds
                this.damageSequenceCount++;
            } else {
                this.damageSequenceCount = 1;
            }
            this.lastDamageTime = now;
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.game.triggerGameOver();
        }
    }

    update(deltaTime) {
        // Shield Timer
        if (this.shieldTimer > 0) {
            this.shieldTimer -= deltaTime;
            if (this.shieldTimer < 0) this.shieldTimer = 0;
        }

        // Reset speed
        this.speedX = 0;
        this.speedY = 0;

        // Movement
        if (this.game.input.isKeyDown('w') || this.game.input.isKeyDown('arrowup')) {
            this.speedY = -this.speed;
        }
        if (this.game.input.isKeyDown('s') || this.game.input.isKeyDown('arrowdown')) {
            this.speedY = this.speed;
        }
        if (this.game.input.isKeyDown('a') || this.game.input.isKeyDown('arrowleft')) {
            this.speedX = -this.speed;
        }
        if (this.game.input.isKeyDown('d') || this.game.input.isKeyDown('arrowright')) {
            this.speedX = this.speed;
        }

        // Apply movement
        this.x += this.speedX;
        this.y += this.speedY;

        // Boundaries
        if (this.x < 0) this.x = 0;
        if (this.x > this.game.width - this.width) this.x = this.game.width - this.width;
        if (this.y < 0) this.y = 0;
        if (this.y > this.game.height - this.height) this.y = this.game.height - this.height;

        // Calculate Aim Angle
        const angle = Math.atan2(
            this.game.input.mouse.y - (this.y + this.height / 2),
            this.game.input.mouse.x - (this.x + this.width / 2)
        );

        // Shoot Logic
        const activeLevel = this.currentWeaponLevel || 1;

        if (activeLevel === 4) { // Laser
            if (this.game.input.mouse.isDown) {
                if (this.shootTimer > 50) { // Fast fire cycle (20/sec)
                    // Fire Laser
                    const projectile = new Projectile(this.game, this.x + this.width / 2, this.y + this.height / 2, angle);
                    projectile.speed = 80; // Fast
                    projectile.damage = this.damage * 2; // Reduced per-tick damage for continuous fire, but high DPS
                    projectile.width = 10;
                    projectile.height = 1000;
                    projectile.color = '#0ff'; // Cyan beam
                    projectile.velocity.x = Math.cos(angle) * projectile.speed;
                    projectile.velocity.y = Math.sin(angle) * projectile.speed;

                    this.game.projectiles.push(projectile);
                    this.game.audio.playShoot();
                    this.shootTimer = 0;
                } else {
                    this.shootTimer += deltaTime;
                }
            } else {
                this.shootTimer = 1000; // Ready to shoot immediately on click
            }
        } else {
            // Normal Weapon Levels
            if (this.game.input.mouse.isDown) {
                if (this.shootTimer > this.shootInterval) {
                    // Weapon Levels logic
                    // Buff: 40% chance to be homing
                    const applyHoming = this.hasHoming && Math.random() < 0.4;
                    const projectileSpeed = applyHoming ? 7 : 10;

                    if (activeLevel === 1) {
                        const projectile = new Projectile(this.game, this.x + this.width / 2, this.y + this.height / 2, angle);
                        projectile.speed = projectileSpeed;
                        projectile.velocity.x = Math.cos(angle) * projectile.speed;
                        projectile.velocity.y = Math.sin(angle) * projectile.speed;
                        projectile.damage = this.damage;
                        projectile.isHoming = applyHoming;
                        this.game.projectiles.push(projectile);
                        this.game.audio.playShoot();
                    } else if (activeLevel === 2) {
                        // Double Shot
                        const offset = 10;
                        const p1 = new Projectile(this.game, this.x + this.width / 2 + Math.cos(angle + Math.PI / 2) * offset, this.y + this.height / 2 + Math.sin(angle + Math.PI / 2) * offset, angle);
                        const p2 = new Projectile(this.game, this.x + this.width / 2 + Math.cos(angle - Math.PI / 2) * offset, this.y + this.height / 2 + Math.sin(angle - Math.PI / 2) * offset, angle);

                        p1.speed = projectileSpeed; p2.speed = projectileSpeed;
                        p1.velocity.x = Math.cos(angle) * p1.speed; p1.velocity.y = Math.sin(angle) * p1.speed;
                        p2.velocity.x = Math.cos(angle) * p2.speed; p2.velocity.y = Math.sin(angle) * p2.speed;

                        p1.damage = this.damage; p2.damage = this.damage;
                        p1.isHoming = applyHoming; p2.isHoming = applyHoming;
                        this.game.projectiles.push(p1, p2);
                        this.game.audio.playShoot();
                    } else if (activeLevel === 5) {
                        // Quintuple Shot - Divergent + 40% Homing per shot
                        const divergence = 0.2; // 0, +/- 0.2, +/- 0.4
                        for (let i = -2; i <= 2; i++) {
                            const shotAngle = angle + i * divergence;
                            const projectile = new Projectile(this.game, this.x + this.width / 2, this.y + this.height / 2, shotAngle);

                            const homingChance = Math.random() < 0.4;
                            projectile.speed = homingChance ? 7 : 10;
                            projectile.velocity.x = Math.cos(shotAngle) * projectile.speed;
                            projectile.velocity.y = Math.sin(shotAngle) * projectile.speed;
                            projectile.damage = this.damage;
                            projectile.isHoming = homingChance;

                            // 1/10 of homing shots are critical (yellow explosion)
                            if (homingChance && Math.random() < 0.1) {
                                projectile.isCriticalQuintuple = true;
                                projectile.color = '#ffdd00'; // Yellow glow
                            }

                            this.game.projectiles.push(projectile);
                        }
                        this.game.audio.playShoot();
                    } else if (activeLevel === 6) {
                        // Arc Shot - Semi-circle + 2x Damage
                        const projectile = new Projectile(this.game, this.x + this.width / 2, this.y + this.height / 2, angle);
                        projectile.isArc = true;
                        projectile.radius = 50;
                        projectile.initialRadius = 50;
                        projectile.damage = this.damage * 4;
                        projectile.color = '#ff4d4d'; // Reddish arc
                        projectile.speed = 12; // Slightly faster
                        projectile.velocity.x = Math.cos(angle) * projectile.speed;
                        projectile.velocity.y = Math.sin(angle) * projectile.speed;

                        // Buff: 40% chance for homing on Redmoon Shot
                        if (Math.random() < 0.4) {
                            projectile.isHoming = true;
                            projectile.speed = 9; // Slightly slower when homing
                            projectile.velocity.x = Math.cos(angle) * projectile.speed;
                            projectile.velocity.y = Math.sin(angle) * projectile.speed;
                        }

                        this.game.projectiles.push(projectile);
                        this.game.audio.playShoot();
                    } else if (activeLevel === 3) {
                        // Triple Shot - Divergent (-40% spread)
                        const divergence = 0.156;

                        const p1 = new Projectile(this.game, this.x + this.width / 2, this.y + this.height / 2, angle - divergence);
                        const p2 = new Projectile(this.game, this.x + this.width / 2, this.y + this.height / 2, angle + divergence);
                        const p3 = new Projectile(this.game, this.x + this.width / 2, this.y + this.height / 2, angle);

                        p1.speed = projectileSpeed; p2.speed = projectileSpeed; p3.speed = projectileSpeed;
                        p1.velocity.x = Math.cos(angle - divergence) * p1.speed; p1.velocity.y = Math.sin(angle - divergence) * p1.speed;
                        p2.velocity.x = Math.cos(angle + divergence) * p2.speed; p2.velocity.y = Math.sin(angle + divergence) * p2.speed;
                        p3.velocity.x = Math.cos(angle) * p3.speed; p3.velocity.y = Math.sin(angle) * p3.speed;

                        p1.damage = this.damage; p2.damage = this.damage; p3.damage = this.damage;
                        p1.isHoming = applyHoming; p2.isHoming = applyHoming; p3.isHoming = applyHoming;
                        this.game.projectiles.push(p1, p2, p3);
                        this.game.audio.playShoot();
                    }

                    this.shootTimer = 0;
                } else {
                    this.shootTimer += deltaTime;
                }
            }
        }
    }

    draw(ctx) {
        // Shield Aura (draw behind player)
        if (this.shieldTimer > 0) {
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

            // Flashing in the last 3s
            let alpha = 0.3;
            if (this.shieldTimer < 3000) {
                // Flash at 10Hz
                if (Math.floor(this.shieldTimer / 100) % 2 === 0) {
                    alpha = 0.05;
                }
            }

            ctx.fillStyle = `rgba(0, 255, 255, ${alpha})`;
            ctx.strokeStyle = `rgba(0, 255, 255, ${alpha + 0.2})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 90, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        // Rotate towards mouse
        const angle = Math.atan2(
            this.game.input.mouse.y - (this.y + this.height / 2),
            this.game.input.mouse.x - (this.x + this.width / 2)
        );
        ctx.rotate(angle);

        // Render
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;

        if (this.maxHpLevel === 0) {
            // Default Triangle
            ctx.beginPath();
            ctx.moveTo(20, 0);
            ctx.lineTo(-15, 15);
            ctx.lineTo(-10, 0);
            ctx.lineTo(-15, -15);
            ctx.closePath();
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.stroke();
        } else if (this.maxHpLevel === 1) {
            // "True Spaceship"
            ctx.fillStyle = '#0a0';
            ctx.beginPath();
            ctx.moveTo(25, 0);
            ctx.lineTo(-15, 20);
            ctx.lineTo(-5, 5);
            ctx.lineTo(-20, 0);
            ctx.lineTo(-5, -5);
            ctx.lineTo(-15, -20);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Wings
            ctx.beginPath();
            ctx.moveTo(-5, 15);
            ctx.lineTo(-5, 25);
            ctx.lineTo(10, 10);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(-5, -15);
            ctx.lineTo(-5, -25);
            ctx.lineTo(10, -10);
            ctx.stroke();

        } else if (this.maxHpLevel === 2) {
            // "Parruda"
            ctx.fillStyle = '#aa0';
            ctx.fillRect(-20, -10, 40, 20);
            ctx.beginPath();
            ctx.moveTo(20, -10);
            ctx.lineTo(35, 0);
            ctx.lineTo(20, 10);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#555';
            ctx.fillRect(-25, -25, 15, 50);
            ctx.strokeRect(-25, -25, 15, 50);
        } else if (this.maxHpLevel >= 3) {
            // "Suprema" - Sleek silver/blue advanced fighter
            ctx.fillStyle = '#4488cc';
            ctx.shadowColor = '#00ccff';
            ctx.shadowBlur = 15;

            // Main body (elongated diamond)
            ctx.beginPath();
            ctx.moveTo(35, 0);
            ctx.lineTo(5, 12);
            ctx.lineTo(-25, 8);
            ctx.lineTo(-30, 0);
            ctx.lineTo(-25, -8);
            ctx.lineTo(5, -12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Top wing
            ctx.fillStyle = '#336699';
            ctx.beginPath();
            ctx.moveTo(5, -12);
            ctx.lineTo(-10, -30);
            ctx.lineTo(-25, -28);
            ctx.lineTo(-20, -8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Bottom wing
            ctx.beginPath();
            ctx.moveTo(5, 12);
            ctx.lineTo(-10, 30);
            ctx.lineTo(-25, 28);
            ctx.lineTo(-20, 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Cockpit
            ctx.fillStyle = '#aaddff';
            ctx.beginPath();
            ctx.arc(10, 0, 6, 0, Math.PI * 2);
            ctx.fill();

            // Thruster glow
            ctx.fillStyle = `rgba(0, 200, 255, ${0.5 + Math.random() * 0.3})`;
            ctx.beginPath();
            ctx.moveTo(-30, -4);
            ctx.lineTo(-40 - Math.random() * 8, 0);
            ctx.lineTo(-30, 4);
            ctx.closePath();
            ctx.fill();

            ctx.shadowBlur = 0;
        }


        ctx.restore();
    }

    switchWeapon() {
        if (this.weaponLevel <= 1) return;
        this.currentWeaponLevel++;
        if (this.currentWeaponLevel > this.weaponLevel) {
            this.currentWeaponLevel = 1;
        }
    }
}
