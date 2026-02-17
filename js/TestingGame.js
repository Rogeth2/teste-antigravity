import Game from './Game.js';
import Enemy from './entities/Enemy.js';
import { checkCollision } from './utils.js';

export default class TestingGame extends Game {
    constructor(canvas) {
        super(canvas);
        console.log("TestingBed Engine: STABILIZING TARGETS...");
    }

    start() {
        this.initTestingMission();
    }

    initTestingMission() {
        // Unlock everything for testing
        this.credits = 999999;
        this.score = 1000000; // High score for visibility
        this.level = 500; // Max level

        // Reset state
        this.entities = [];
        this.projectiles = [];
        this.drops = [];
        this.floatingTexts = [];

        // Spawn Static Dummy
        const dummy = new Enemy(this, 'NORMAL');
        // Positioning - center of screen
        dummy.width = 60;
        dummy.height = 60;
        dummy.x = this.width / 2 - dummy.width / 2;
        dummy.y = this.height / 2 - 100;

        // Stats
        dummy.hp = 10000;
        dummy.maxHp = 10000;
        dummy.speedY = 0;
        dummy.color = '#777'; // Grey target

        // Force static behavior and auto-heal
        dummy.update = function (deltaTime) {
            // No movement logic here
        };

        dummy.takeDamage = function (amount) {
            this.hp -= amount;
            if (this.hp <= 0) {
                this.hp = 10000;
                this.markedForDeletion = false; // Never die
            }
        };

        this.entities.push(dummy);
        this.testDummy = dummy;

        console.log("TestingBed Ready: Dummy at", dummy.x, dummy.y);
        this.player = new Player(this);
        this.isRunning = true;
        this.lastTime = performance.now();
        this.loop(this.lastTime);
        this.updateUI();
        console.log("TestingBed Ready: Mission Started.");
    }

    update(deltaTime) {
        if (!this.player) return;

        // Suppress spawners
        this.enemyTimer = -999999;
        this.boss = null;
        this.bosses = [];

        // Basic physics/logic update
        this.background.update(deltaTime);
        this.player.update(deltaTime);

        this.entities.forEach(e => e.update(deltaTime));
        this.projectiles.forEach(p => p.update(deltaTime));

        // Manual Collision Logic
        this.projectiles.forEach(p => {
            if (!p.isEnemy && !p.markedForDeletion) {
                this.entities.forEach(e => {
                    let collided = false;
                    if (p.isArc) {
                        // For Arc/Crescent, check if enemy is within the arc radius
                        // We use the center of the arc and the enemy's center
                        const dist = Math.hypot(
                            (p.x) - (e.x + e.width / 2),
                            (p.y) - (e.y + e.height / 2)
                        );
                        // Collision if distance is less than arc radius + enemy bounding radius
                        if (dist < p.radius + 20) { // 20 is approx enemy radius
                            collided = true;
                        }
                    } else {
                        collided = checkCollision(p, e);
                    }

                    if (collided) {
                        const dmg = p.damage;
                        this.spawnFloatingText(e.x + e.width / 2, e.y, `-${dmg}`, '#ffff00');
                        e.takeDamage(dmg);

                        // 1/7 chance for Redmoon Barrage on Arc Shot hit
                        if (p.isArc && Math.random() < 0.1428) {
                            this.triggerRedmoonBarrage();
                        }

                        p.markedForDeletion = true;
                    }
                });
            }
        });

        // Neutralization Logic for TestingBed
        this.projectiles.forEach(projectile => {
            if (projectile.isEnemy && !projectile.markedForDeletion) {
                this.projectiles.forEach(p2 => {
                    if (p2.isArc && !p2.isEnemy && !p2.markedForDeletion) {
                        const dist = Math.hypot(p2.x - projectile.x, p2.y - projectile.y);
                        if (dist < p2.radius) {
                            // Homing is IMMUNE
                            if (projectile.isHoming) return;

                            const chance = 0.1428; // 1/7
                            if (Math.random() < chance) {
                                projectile.markedForDeletion = true;
                                this.spawnFloatingText(projectile.x, projectile.y, "NEUTRALIZED", "#00ffff");
                            }
                        }
                    }
                });
            }
        });

        // Cleanup
        this.entities = this.entities.filter(e => !e.markedForDeletion);
        this.projectiles = this.projectiles.filter(p => !p.markedForDeletion);

        // Visual effects (floating text, explosions)
        this.floatingTexts.forEach(ft => {
            ft.y -= 1;
            ft.life -= deltaTime;
            ft.alpha = Math.max(0, ft.life / ft.maxLife);
        });
        this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);

        this.explosions.forEach(ex => {
            ex.life -= deltaTime;
            ex.alpha = Math.max(0, ex.life / ex.maxLife);
            ex.currentRadius = ex.radius * (1 - ex.alpha) + ex.radius * 0.3;
        });
        this.explosions = this.explosions.filter(ex => ex.life > 0);

        this.updateUI();
    }

    buyUpgrade(type) {
        if (!this.player) return;

        let purchased = false;
        let upgradeName = '';

        switch (type) {
            case 'health':
                this.player.hp = this.player.maxHp;
                purchased = true;
                upgradeName = 'Testing Repair';
                break;
            case 'speed':
                // Mirror the 7x cap in testing too, why not
                const speedUpgrades = this.upgradeLog.filter(u => u === 'speed').length;
                if (speedUpgrades < 7) {
                    this.player.speed += 1;
                    purchased = true;
                    upgradeName = `Testing Speed Buff (${speedUpgrades + 1}/7)`;
                    this.upgradeLog.push('speed');
                } else {
                    upgradeName = 'BOOST MAXIMUN';
                    purchased = true; // Still allow sound/text
                }
                break;
            case 'damage':
                this.player.damage += 10;
                purchased = true;
                upgradeName = 'Testing Damage Buff';
                break;
            case 'weapon':
                if (this.player.weaponLevel < 3) {
                    this.player.weaponLevel++;
                    purchased = true;
                    upgradeName = `Testing Weapon Lv ${this.player.weaponLevel}`;
                }
                break;
            case 'homing':
                this.player.hasHoming = true;
                purchased = true;
                upgradeName = 'Homing Enabled';
                break;
            case 'obliterator':
                this.player.obliteratorAmmo = 3;
                purchased = true;
                upgradeName = 'Ammo Refilled';
                break;
            case 'laser':
                this.player.weaponLevel = 4;
                this.player.currentWeaponLevel = 4;
                purchased = true;
                upgradeName = 'Laser Equipped';
                break;
            case 'quintuple':
                this.player.weaponLevel = 5;
                this.player.currentWeaponLevel = 5;
                purchased = true;
                upgradeName = 'Testing Quintuple';
                break;
            case 'arc_shot':
                this.player.weaponLevel = 6;
                this.player.currentWeaponLevel = 6;
                purchased = true;
                upgradeName = 'Testing Arc Shot';
                break;
        }

        if (purchased) {
            this.spawnFloatingText(this.player.x, this.player.y, upgradeName.toUpperCase(), '#f0f');
        }
        this.updateUI();
    }

    updateUI() {
        super.updateUI();

        // Add Dummy Status to HUD area or screen
        if (this.testDummy) {
            const ctx = this.ctx;
            ctx.save();
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`TARGET HP: ${Math.floor(this.testDummy.hp)}`, this.testDummy.x + this.testDummy.width / 2, this.testDummy.y - 20);

            // Health bar for dummy
            const barW = 120;
            const barX = this.testDummy.x + this.testDummy.width / 2 - barW / 2;
            ctx.fillStyle = '#222';
            ctx.fillRect(barX, this.testDummy.y - 45, barW, 8);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(barX, this.testDummy.y - 45, barW * (this.testDummy.hp / 10000), 8);
            ctx.restore();
        }
    }

    triggerMegaExplosion(ex, ey) {
        const radius = 720;
        const damageMult = 10;
        const explosionDamage = this.player ? this.player.damage * damageMult : 100;

        // Visual effect - Cyan
        this.explosions.push({
            x: ex, y: ey, radius: radius,
            currentRadius: 20,
            color: 'rgba(0, 255, 255, ',
            life: 1000, maxLife: 1000, alpha: 1
        });

        // Damage enemies in range
        this.entities.forEach(entity => {
            const dist = Math.hypot(
                (entity.x + entity.width / 2) - ex,
                (entity.y + entity.height / 2) - ey
            );
            if (dist <= radius) {
                this.spawnFloatingText(entity.x + entity.width / 2, entity.y, `ULTIMATE 💥 -${explosionDamage}`, '#00ffff');
                entity.takeDamage(explosionDamage);
            }
        });

        // Player is immune (no damage check needed)
        this.spawnFloatingText(this.player.x, this.player.y, "CYAN BLAST IMMUNITY!", "#0ff");
    }

    triggerRedmoonBarrage() {
        // Redmoon Barrage: 3 Mega Explosions in random top-half locations
        for (let i = 0; i < 3; i++) {
            const rx = Math.random() * this.width;
            const ry = Math.random() * (this.height / 2);
            this.triggerMegaExplosion(rx, ry);
        }
    }
}
