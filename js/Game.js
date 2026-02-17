import InputHandler from './InputHandler.js';
import Player from './entities/Player.js';
import Enemy from './entities/Enemy.js';
import Boss from './entities/Boss.js';
import Background from './Background.js';
import Drop from './entities/Drop.js';
import { checkCollision } from './utils.js';
import AudioManager from './AudioManager.js';

export default class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.lastTime = 0;
        this.isRunning = false;

        this.input = new InputHandler(this);
        this.background = new Background(this);
        this.audio = new AudioManager();

        // Game State
        this.entities = [];
        this.projectiles = [];
        this.drops = [];
        this.floatingTexts = [];
        this.explosions = [];
        this.player = null;
        this.score = 0;
        this.credits = 0;
        this.level = 1;
        this.gameOver = false;

        this.enemyTimer = 0;
        this.enemyInterval = 1000;
        this.explosionCheckTimer = 0;

        // Boss State
        this.boss = null;
        this.bosses = []; // For twin bosses
        this.bossDefeated7 = false;
        this.bossDefeated50 = false;
        this.bossDefeated100 = false;
        this.bossDefeated300 = false;
        this.bossDefeated490 = false;

        this.lastNebulaLevel = 1;

        // Healing Cooldown
        this.healSpawnCooldown = 0; // ms

        // Upgrade Tracking
        this.upgradeLog = [];

        this.animationId = null;
        this.continuesRemaining = 20;

        this.isRunning = false;
        this.loop = this.loop.bind(this);
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;
        if (this.background) this.background.stars = [];
        if (this.background) this.background.createStars();
    }

    start() {
        this.initGame();
    }

    initGame() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.isRunning = true;
        this.gameOver = false;
        this.score = 0;
        this.credits = 0;
        this.level = 1;
        this.entities = [];
        this.projectiles = [];
        this.drops = [];
        this.floatingTexts = [];
        this.explosions = [];

        this.enemyTimer = 0;
        this.enemyInterval = 1000;
        this.explosionCheckTimer = 0;

        this.boss = null;
        this.bosses = [];
        this.bossDefeated7 = false;
        this.bossDefeated50 = false;
        this.bossDefeated100 = false;
        this.bossDefeated300 = false;
        this.bossDefeated490 = false;
        this.hasArmor1 = false;
        this.hasArmor2 = false;
        this.healSpawnCooldown = 0;
        this.upgradeLog = [];

        this.player = new Player(this);
        console.log("Mission Initiated.");
        this.updateUI();
        this.lastTime = performance.now();
        this.loop(this.lastTime);
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) continueBtn.classList.add('hidden');
    }

    restart() {
        this.start();
    }

    continueAfterDeath() {
        if (this.continuesRemaining <= 0 || this.level < 20) return;

        this.continuesRemaining--;
        this.gameOver = false;
        this.isRunning = true;

        // Determine highest achieved checkpoint
        let targetScore = 0;
        let targetLevel = 1;

        if (this.level >= 400) {
            targetScore = 399000;
            targetLevel = 400;
        } else if (this.level >= 290) {
            targetScore = 289000;
            targetLevel = 290;
        } else if (this.level >= 90) {
            targetScore = 89000;
            targetLevel = 90;
        } else if (this.level >= 20) {
            targetScore = 19000;
            targetLevel = 20;
        }

        this.score = targetScore;
        this.level = targetLevel;

        // Restore Player
        if (this.player) {
            this.player.hp = this.player.maxHp;
            this.player.x = this.width / 2;
            this.player.y = this.height / 2;
            this.player.shieldTimer = 0; // Reset shield
        }

        // Clear screen
        this.entities = [];
        this.projectiles = [];
        this.explosions = [];
        this.floatingTexts = [];
        this.boss = null;
        this.bosses = [];

        this.updateUI();
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    loop(timeStamp) {
        if (!this.isRunning) return;

        const deltaTime = timeStamp - this.lastTime;
        this.lastTime = timeStamp;

        this.update(deltaTime);
        this.draw();

        this.animationId = requestAnimationFrame(this.loop);
    }

    update(deltaTime) {
        if (!this.player) return;

        // Healing Cooldown
        if (this.healSpawnCooldown > 0) {
            this.healSpawnCooldown -= deltaTime;
            if (this.healSpawnCooldown < 0) this.healSpawnCooldown = 0;
        }

        this.background.update(deltaTime);
        this.player.update(deltaTime);

        // Difficulty Scaling: Increase enemies every 10 levels (10000 points)
        // Level 1 = 0-999, Level 10 = 9000-9999
        // Spawn interval decreases by 50ms per level, capped at 200ms
        // Synchronize State
        this.level = Math.floor(this.score / 1000) + 1;

        // Difficulty Scaling

        // Background: Galaxies and Nebulae every 20 levels
        if (this.level >= this.lastNebulaLevel + 20) {
            this.lastNebulaLevel = this.level;
            this.background.createNebula();
        }

        // Spawn Rate Cap (Level 70+: Stop increasing density)
        let effectiveLevel = Math.min(this.level, 70);
        const difficultyModifier = Math.floor(effectiveLevel / 10) * 100;
        this.enemyInterval = Math.max(200, 1000 - (effectiveLevel * 20) - difficultyModifier);

        // Level 400-500: Increase enemy density every 30 levels
        if (this.level >= 400 && this.level < 500) {
            const tiers = Math.floor((this.level - 400) / 30);
            this.enemyInterval = Math.max(80, this.enemyInterval - tiers * 50);
        }

        // Global Modifiers - Tiered Scaling
        if (this.level >= 400) {
            this.globalFollowerSpeedMult = 7;
            this.globalEnemyFireRateMult = 4;
            this.globalEnemyProjectileSpeedMult = 4;
            this.globalCollisionDamageMult = 2.5;
        } else if (this.level >= 300) {
            this.globalFollowerSpeedMult = 5;
            this.globalEnemyFireRateMult = 3;
            this.globalEnemyProjectileSpeedMult = 3;
            this.globalCollisionDamageMult = 2;
        } else if (this.level >= 150) {
            this.globalFollowerSpeedMult = 3;
            this.globalEnemyFireRateMult = (this.level >= 80) ? 2 : 1;
            this.globalEnemyProjectileSpeedMult = (this.level >= 80) ? 2 : 1;
            this.globalCollisionDamageMult = 1;
        } else {
            this.globalFollowerSpeedMult = 1;
            this.globalEnemyFireRateMult = (this.level >= 80) ? 2 : 1;
            this.globalEnemyProjectileSpeedMult = (this.level >= 80) ? 2 : 1;
            this.globalCollisionDamageMult = 1;
        }

        // Boss Spawn Logic
        if (this.level >= 50 && !this.bossDefeated50 && !this.boss && this.bosses.length === 0) {
            this.boss = new Boss(this, 50);
            this.entities.push(this.boss);
        } else if (this.level >= 100 && this.bossDefeated50 && !this.bossDefeated100 && !this.boss && this.bosses.length === 0) {
            this.boss = new Boss(this, 100);
            this.entities.push(this.boss);
        } else if (this.level >= 300 && this.bossDefeated100 && !this.bossDefeated300 && !this.boss && this.bosses.length === 0) {
            this.boss = new Boss(this, 300);
            this.entities.push(this.boss);
        } else if (this.level >= 490 && this.bossDefeated300 && !this.bossDefeated490 && !this.boss && this.bosses.length === 0) {
            // Twin Bosses
            const twin1 = new Boss(this, 490);
            twin1.twinOffset = -120;
            twin1.bossName = '👁 GÊMEO ALFA 👁';
            const twin2 = new Boss(this, 490);
            twin2.twinOffset = 120;
            twin2.bossName = '👁 GÊMEO BETA 👁';
            twin2.moveTimer = 3000; // Phase offset for different movement
            this.bosses = [twin1, twin2];
            this.entities.push(twin1, twin2);
        } else if (this.level >= 7 && !this.bossDefeated7 && !this.boss && this.bosses.length === 0) {
            // New Early Boss: Perseguidor Rei
            this.boss = new Boss(this, 7);
            this.entities.push(this.boss);
        }


        // Update Boss(es)
        if (this.boss && !this.boss.markedForDeletion) {
            this.boss.update(deltaTime);
        } else if (this.boss && this.boss.markedForDeletion) {
            this.boss = null;
        }

        this.bosses.forEach(b => {
            if (!b.markedForDeletion) b.update(deltaTime);
        });
        if (this.bosses.length > 0 && this.bosses.every(b => b.markedForDeletion)) {
            this.bosses = [];
        }

        // Determine spawn suppression
        let spawnSuppressed = false;
        let spawnReducedRate = 1; // 1 = normal, 10 = 1/10th, 2 = 1/2, etc.

        const activeBoss = this.boss || (this.bosses.length > 0 ? this.bosses[0] : null);
        if (activeBoss && !activeBoss.markedForDeletion) {
            if (activeBoss.bossLevel === 7 || activeBoss.bossLevel === 50 || activeBoss.bossLevel === 100) {
                spawnSuppressed = true;
            } else if (activeBoss.bossLevel === 300 || activeBoss.bossLevel === 490) {
                spawnReducedRate = 10; // 1/10th spawn rate
            }
        }

        // Sub-boss spawn reduction (1/2)
        const subbossActive = this.entities.some(e => e.type === 'SUBBOSS' && !e.markedForDeletion);
        if (subbossActive && !spawnSuppressed) {
            spawnReducedRate = Math.max(spawnReducedRate, 2);
        }

        // Spawner
        if (!spawnSuppressed) {
            const effectiveInterval = this.enemyInterval * spawnReducedRate;
            if (this.enemyTimer > effectiveInterval) {
                let type = 'NORMAL';
                const random = Math.random();
                const score = this.score;

                // Sub-boss level 5+ (1/100 chance)
                if (this.level >= 5 && random < 0.01) {
                    type = 'SUBBOSS';
                } else if (this.level >= 300 && random < 0.15) {
                    type = 'HYBRID';
                } else if (this.level >= 300 && random < 0.30) {
                    type = 'FOLLOWER';
                } else if (score >= 49000 && random < 0.03) {
                    type = 'HYBRID';
                } else if (score >= 39000 && random < 0.12) {
                    type = 'FOLLOWER';
                } else if (score >= 29000 && random < 0.05) {
                    type = 'FOLLOWER';
                } else if (score >= 19000 && random < 0.10) {
                    type = 'SHOOTER';
                } else if (score >= 9000 && random < 0.05) {
                    type = 'SHOOTER';
                }

                const enemy = new Enemy(this, type);

                // HP Scaling: +10% every 90 levels after 110
                if (this.level >= 110) {
                    const hpMult = 1 + (Math.floor((this.level - 110) / 90) + 1) * 0.1;
                    enemy.hp *= hpMult;
                    enemy.maxHp = enemy.hp;
                }

                this.entities.push(enemy);
                this.enemyTimer = 0;
            } else {
                this.enemyTimer += deltaTime;
            }
        } else {
            this.enemyTimer = 0;
        }

        // Projectiles
        this.projectiles.forEach(projectile => projectile.update(deltaTime));
        this.projectiles = this.projectiles.filter(p => !p.markedForDeletion);

        // Remove enemy projectiles if they hit player or get neutralized by Redmoon
        this.projectiles.forEach(projectile => {
            if (projectile.isEnemy && !projectile.markedForDeletion) {
                // Hit player
                if (this.player && checkCollision(projectile, this.player)) {
                    projectile.markedForDeletion = true;
                    const dmg = 10;
                    this.player.takeDamage(dmg);
                }

                // Neutralization by Redmoon Shot
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

        // Drops
        this.drops.forEach(drop => {
            drop.update(deltaTime);
            if (this.player && checkCollision(this.player, drop)) {
                drop.markedForDeletion = true;
                if (drop.type === 'OBLITERATOR') {
                    if (this.player.obliteratorAmmo < 3) {
                        this.player.obliteratorAmmo++;
                    }
                } else if (drop.type === 'ARMOR_1') {
                    if (!this.hasArmor1) {
                        this.hasArmor1 = true;
                        this.player.maxHpLevel = 1;
                        this.player.maxHp = 150; // +50%
                        this.player.hp = this.player.maxHp;
                    }
                } else if (drop.type === 'ARMOR_2') {
                    if (!this.hasArmor2) {
                        this.hasArmor2 = true;
                        this.player.maxHpLevel = 2;
                        this.player.maxHp = 200; // ~+33% of 150
                        this.player.hp = this.player.maxHp;
                    }
                } else if (drop.type === 'SHIELD') {
                    this.player.shieldTimer = 15000;
                    this.spawnFloatingText(this.player.x + this.player.width / 2, this.player.y, 'ESCUDO ATIVADO (15s)!', '#0ff');
                } else if (drop.type === 'REPAIR') {
                    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30);
                    this.healSpawnCooldown = 120000; // 2 minutes
                    this.spawnFloatingText(this.player.x + this.player.width / 2, this.player.y, '+30 HP (REPARO)', '#ff66aa');
                    this.audio.playUpgrade();
                }
                this.updateUI();
            }
        });
        this.drops = this.drops.filter(d => !d.markedForDeletion);

        // Enemies (skip boss - updated separately)
        this.entities.forEach(entity => {
            if (entity.isBoss) return; // Boss updated above
            entity.update(deltaTime);

            // Collision: Player vs Enemy
            if (this.player && checkCollision(this.player, entity)) {
                if (this.player.shieldTimer > 0) {
                    // Hit-kill for common enemies when shielded
                    if (!entity.isBoss) {
                        entity.takeDamage(999999); // Hit-kill
                        this.spawnFloatingText(entity.x + entity.width / 2, entity.y, "CRUSHED!", "#0ff");
                    }
                    // Player takes NO damage
                } else {
                    if (!entity.isBoss) {
                        entity.markedForDeletion = true;
                    }
                    const baseDamage = entity.isBoss ? 50 : 20;
                    const collisionMult = (entity.type === 'NORMAL') ? (this.globalCollisionDamageMult || 1) : 1;
                    const dmg = Math.floor(baseDamage * collisionMult);
                    this.player.takeDamage(dmg);
                }
            }

            // Collision: Projectile vs Enemy
            this.projectiles.forEach(projectile => {
                if (!projectile.isEnemy && !projectile.markedForDeletion) {
                    let collided = false;
                    if (projectile.isArc) {
                        const dist = Math.hypot(
                            (projectile.x) - (entity.x + entity.width / 2),
                            (projectile.y) - (entity.y + entity.height / 2)
                        );
                        if (dist < projectile.radius + 20) collided = true;
                    } else {
                        collided = checkCollision(projectile, entity);
                    }

                    if (collided) {
                        const dmg = projectile.damage;
                        this.spawnFloatingText(entity.x + entity.width / 2, entity.y, `-${dmg}`, '#ffff00');
                        entity.takeDamage(dmg);

                        // 1/7 chance for Redmoon Barrage on Arc Shot hit
                        if (projectile.isArc && Math.random() < 0.1428) { // 1/7
                            this.triggerRedmoonBarrage();
                        }

                        projectile.markedForDeletion = true;
                    }
                }
            });
        });

        // Boss collision handling (single bosses)
        const currentBoss = this.boss;
        if (currentBoss && !currentBoss.markedForDeletion) {
            if (this.player && checkCollision(this.player, currentBoss)) {
                const dmg = 50;
                this.player.takeDamage(dmg);
            }
            this.projectiles.forEach(projectile => {
                if (currentBoss.markedForDeletion) return; // Boss already dead this frame
                if (!projectile.isEnemy && !projectile.markedForDeletion) {
                    let collided = false;
                    if (projectile.isArc) {
                        const dist = Math.hypot(
                            (projectile.x) - (currentBoss.x + currentBoss.width / 2),
                            (projectile.y) - (currentBoss.y + currentBoss.height / 2)
                        );
                        if (dist < projectile.radius + 40) collided = true; // Bosses are bigger
                    } else {
                        collided = checkCollision(projectile, currentBoss);
                    }

                    if (collided) {
                        const dmg = projectile.damage;
                        this.spawnFloatingText(currentBoss.x + currentBoss.width / 2, currentBoss.y, `-${dmg}`, '#ffff00');
                        currentBoss.takeDamage(dmg);

                        if (projectile.isArc && Math.random() < 0.1428) {
                            this.triggerRedmoonBarrage();
                        }

                        projectile.markedForDeletion = true;
                    }
                }
            });
        }

        // Twin boss collision handling
        this.bosses.forEach(b => {
            if (b.markedForDeletion) return;
            if (this.player && checkCollision(this.player, b)) {
                const dmg = 50;
                this.player.takeDamage(dmg);
            }
            this.projectiles.forEach(projectile => {
                if (b.markedForDeletion) return; // Boss already dead this frame
                if (!projectile.isEnemy && !projectile.markedForDeletion) {
                    let collided = false;
                    if (projectile.isArc) {
                        const dist = Math.hypot(
                            (projectile.x) - (b.x + b.width / 2),
                            (projectile.y) - (b.y + b.height / 2)
                        );
                        if (dist < projectile.radius + 40) collided = true;
                    } else {
                        collided = checkCollision(projectile, b);
                    }

                    if (collided) {
                        const dmg = projectile.damage;
                        this.spawnFloatingText(b.x + b.width / 2, b.y, `-${dmg}`, '#ffff00');
                        b.takeDamage(dmg);

                        if (projectile.isArc && Math.random() < 0.1428) {
                            this.triggerRedmoonBarrage();
                        }

                        projectile.markedForDeletion = true;
                    }
                }
            });
        });

        // Check twin bosses
        this.bosses = this.bosses.filter(b => !b.markedForDeletion);
        if (this.bossDefeated300 && !this.bossDefeated490 && this.bosses.length === 0 && this.level >= 490) {
            // Check if twins were spawned and both are now dead
            const anyTwinAlive = this.entities.some(e => e.isBoss && e.bossLevel === 490 && !e.markedForDeletion);
            if (!anyTwinAlive) {
                this.bossDefeated490 = true;
                this.triggerVictory(); // Win only on twin death
            }
        }

        this.entities = this.entities.filter(entity => !entity.markedForDeletion);

        // Exploding Enemies (Level 5+): 5% of enemies explode every 2 seconds — EXCLUDE bosses
        if (this.level >= 5) {
            this.explosionCheckTimer += deltaTime;
            if (this.explosionCheckTimer >= 2000) {
                this.explosionCheckTimer = 0;
                this.entities.forEach(entity => {
                    if (!entity.markedForDeletion && !entity.isBoss && Math.random() < 0.05) {
                        this.triggerEnemyExplosion(entity);
                    }
                });
            }
        }

        // Update Floating Texts
        this.floatingTexts.forEach(ft => {
            ft.y -= 1;
            ft.life -= deltaTime;
            ft.alpha = Math.max(0, ft.life / ft.maxLife);
        });
        this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);

        // Update Explosions
        this.explosions.forEach(ex => {
            ex.life -= deltaTime;
            ex.alpha = Math.max(0, ex.life / ex.maxLife);
            ex.currentRadius = ex.radius * (1 - ex.alpha) + ex.radius * 0.3;
        });
        this.explosions = this.explosions.filter(ex => ex.life > 0);

        // Update UI
        this.updateUI();
    }

    draw() {
        // Clear screen with trail effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (this.background) this.background.draw(this.ctx);

        if (this.player) this.player.draw(this.ctx);

        this.drops.forEach(drop => drop.draw(this.ctx));
        this.projectiles.forEach(projectile => projectile.draw(this.ctx));
        this.entities.forEach(entity => entity.draw(this.ctx));

        // Draw Explosions
        this.explosions.forEach(ex => {
            this.ctx.save();
            this.ctx.globalAlpha = ex.alpha;
            this.ctx.beginPath();
            this.ctx.arc(ex.x, ex.y, ex.currentRadius, 0, Math.PI * 2);
            const baseColor = ex.color || 'rgba(255, 100, 0, ';
            this.ctx.fillStyle = `${baseColor}${ex.alpha * 0.5})`;
            this.ctx.fill();
            this.ctx.strokeStyle = ex.color ? `rgba(0, 255, 255, ${ex.alpha})` : `rgba(255, 200, 0, ${ex.alpha})`;
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            // Inner glow
            this.ctx.beginPath();
            this.ctx.arc(ex.x, ex.y, ex.currentRadius * 0.5, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 200, ${ex.alpha * 0.7})`;
            this.ctx.fill();
            this.ctx.restore();
        });

        // Draw Floating Damage Texts
        this.floatingTexts.forEach(ft => {
            this.ctx.save();
            this.ctx.globalAlpha = ft.alpha;
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillStyle = ft.color;
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 2;
            this.ctx.textAlign = 'center';
            this.ctx.strokeText(ft.text, ft.x, ft.y);
            this.ctx.fillText(ft.text, ft.x, ft.y);
            this.ctx.restore();
        });

        // Draw Score in top-right
        this.ctx.save();
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillStyle = '#0ff';
        this.ctx.textAlign = 'right';
        this.ctx.shadowColor = '#0ff';
        this.ctx.shadowBlur = 10;
        this.ctx.fillText(`Score: ${this.score}`, this.width - 20, 35);
        this.ctx.restore();
    }

    triggerGameOver() {
        this.gameOver = true;
        this.isRunning = false;
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) {
            gameOverScreen.classList.remove('hidden');
            const scoreDisplay = document.getElementById('final-score');
            if (scoreDisplay) scoreDisplay.innerText = this.score;
            // Level
            const levelDisplay = document.getElementById('final-level');
            if (levelDisplay) levelDisplay.innerText = this.level;

            // Continue Button (Multi-checkpoint: Lvl 20, 90, 290, 400)
            const continueBtn = document.getElementById('continue-btn');
            const continueCount = document.getElementById('continue-count');
            if (continueBtn && this.level >= 20 && this.continuesRemaining > 0) {
                continueBtn.classList.remove('hidden');
                if (continueCount) continueCount.innerText = this.continuesRemaining;
            } else if (continueBtn) {
                continueBtn.classList.add('hidden');
            }
        }
        this.audio.playGameOver();
    }

    triggerVictory() {
        this.gameOver = true;
        this.isRunning = false;
        this.entities = [];
        this.projectiles = [];
        this.drops = [];
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) {
            gameOverScreen.classList.remove('hidden');
            // Override title
            const title = gameOverScreen.querySelector('h1');
            if (title) {
                title.textContent = '🏆 VOCÊ VENCEU A GUERRA ESPACIAL! 🏆';
                title.style.cssText = 'color: gold; font-size: 3rem; text-shadow: 0 0 30px gold; letter-spacing: 3px;';
            }
            const scoreDisplay = document.getElementById('final-score');
            if (scoreDisplay) scoreDisplay.innerText = this.score;
            const levelDisplay = document.getElementById('final-level');
            if (levelDisplay) levelDisplay.innerText = 500;
            // Change restart button text
            const restartBtn = document.getElementById('restart-btn');
            if (restartBtn) restartBtn.textContent = 'JOGAR NOVAMENTE';
        }
        this.audio.playVictory();
    }

    spawnFloatingText(x, y, text, color) {
        this.floatingTexts.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y,
            text: text,
            color: color,
            life: 800,
            maxLife: 800,
            alpha: 1
        });
    }

    triggerEnemyExplosion(enemy) {
        const ex = enemy.x + enemy.width / 2;
        const ey = enemy.y + enemy.height / 2;
        const radius = 240;

        enemy.markedForDeletion = true;

        this.explosions.push({
            x: ex, y: ey, radius: radius,
            currentRadius: 10,
            life: 600, maxLife: 600, alpha: 1
        });
        this.audio.playExplosion();

        if (this.player) {
            const px = this.player.x + this.player.width / 2;
            const py = this.player.y + this.player.height / 2;
            const dist = Math.hypot(px - ex, py - ey);
            if (dist <= radius) {
                const dmg = 30;
                this.player.hp -= dmg;
                this.spawnFloatingText(this.player.x + this.player.width / 2, this.player.y, `-${dmg} 💥`, '#ff6600');
                if (this.player.hp <= 0) this.triggerGameOver();
            }
        }
    }

    triggerMegaExplosion(ex, ey) {
        const radius = 720;
        const damageMult = 10;
        const explosionDamage = this.player ? this.player.damage * damageMult : 100;

        // Visual effect - Cyan color
        this.explosions.push({
            x: ex, y: ey, radius: radius,
            currentRadius: 20,
            color: 'rgba(0, 255, 255, ',
            life: 1000, maxLife: 1000, alpha: 1
        });
        this.audio.playExplosion();

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
        if (this.player) {
            this.spawnFloatingText(this.player.x, this.player.y, "CYAN BLAST IMMUNITY!", "#0ff");
        }
    }

    triggerRedmoonBarrage() {
        // Redmoon Barrage: 3 Mega Explosions in random top-half locations
        for (let i = 0; i < 3; i++) {
            const rx = Math.random() * this.width;
            const ry = Math.random() * (this.height / 2);
            this.triggerMegaExplosion(rx, ry);
        }
    }

    onBossDeath(boss) {
        // 1. Set Defeated Flags
        if (boss.bossLevel === 7) this.bossDefeated7 = true;
        if (boss.bossLevel === 50) this.bossDefeated50 = true;
        if (boss.bossLevel === 100) this.bossDefeated100 = true;
        if (boss.bossLevel === 300) this.bossDefeated300 = true;

        if (boss.bossLevel === 490) {
            // Check if both twins are dead
            const anyTwinAlive = this.bosses.some(b => b !== boss && !b.markedForDeletion);
            if (!anyTwinAlive) {
                this.bossDefeated490 = true;
                this.triggerVictory();
            }
        }

        // 2. Clear Boss-specific Projectiles
        this.projectiles.forEach(p => {
            if (p.isBossBeam) p.markedForDeletion = true;
        });

        // 3. Visual Effects
        const cx = boss.x + boss.width / 2;
        const cy = boss.y + boss.height / 2;
        for (let i = 0; i < 5; i++) {
            this.explosions.push({
                x: cx + (Math.random() - 0.5) * 100,
                y: cy + (Math.random() - 0.5) * 100,
                radius: 120 + Math.random() * 80,
                currentRadius: 10,
                life: 800, maxLife: 800, alpha: 1
            });
        }
        this.spawnFloatingText(cx, cy - 40, 'BOSS DERROTADO!', '#ffdd00');

        // 4. Nullify single boss reference if applicable
        if (this.boss === boss) this.boss = null;
    }

    toggleShop() {
        this.isRunning = !this.isRunning;
        const shopScreen = document.getElementById('shop-screen');
        if (!shopScreen) return;

        if (!this.isRunning) {
            shopScreen.classList.remove('hidden');
            if (this.animationId) cancelAnimationFrame(this.animationId);
        } else {
            shopScreen.classList.add('hidden');
            this.lastTime = performance.now();
            this.loop(this.lastTime);
        }
    }

    buyUpgrade(type) {
        if (!this.player) return;

        let cost = 0;
        let purchased = false;
        let upgradeName = '';
        switch (type) {
            case 'health':
                cost = 100;
                if (this.credits >= cost && this.player.hp < this.player.maxHp) {
                    this.credits -= cost;
                    this.player.hp = Math.min(this.player.hp + 50, this.player.maxHp);
                    purchased = true;
                    upgradeName = 'Hull Repair (+50 HP)';
                }
                break;
            case 'speed':
                cost = 200;
                // Limit to 7 upgrades
                const speedUpgrades = this.upgradeLog.filter(u => u === 'speed').length;
                if (this.credits >= cost && speedUpgrades < 7) {
                    this.credits -= cost;
                    this.player.speed += 1;
                    purchased = true;
                    upgradeName = `Engine Boost (Speed: ${this.player.speed})`;
                    this.upgradeLog.push('speed');

                    // Check if max reached
                    if (speedUpgrades + 1 >= 7) {
                        const btn = document.querySelector('.shop-item[data-upgrade="speed"] .buy-btn');
                        if (btn) {
                            btn.innerText = 'BOOST MAXIMUN';
                            // btn.disabled = true; // Optional: let them click and fail naturally or disable
                        }
                        const p = document.querySelector('.shop-item[data-upgrade="speed"] p');
                        if (p) p.innerText = 'Boost Maximun Reached';
                    }
                }
                break;
            case 'damage':
                cost = 500;
                if (this.credits >= cost) {
                    this.credits -= cost;
                    this.player.damage += 5;
                    purchased = true;
                    upgradeName = `Weapon Upgrade (Dmg: ${this.player.damage})`;
                }
                break;
            case 'weapon':
                cost = 1000;
                if (this.credits >= cost) {
                    if (this.player.weaponLevel < 3) {
                        this.credits -= cost;
                        this.player.weaponLevel++;
                        purchased = true;
                        upgradeName = `Multi Shot (Lv ${this.player.weaponLevel})`;
                    }
                }
                break;
            case 'homing':
                cost = 2000;
                if (this.credits >= cost && !this.player.hasHoming) {
                    this.credits -= cost;
                    this.player.hasHoming = true;
                    purchased = true;
                    upgradeName = 'Homing Missiles';
                }
                break;
            case 'obliterator':
                cost = 2500;
                if (this.credits >= cost && this.player.obliteratorAmmo < 3) {
                    this.credits -= cost;
                    this.player.obliteratorAmmo++;
                    purchased = true;
                    upgradeName = `Obliterator (x${this.player.obliteratorAmmo})`;
                }
                break;
            case 'laser':
                cost = 5000;
                if (this.credits >= cost && this.player.weaponLevel < 4 && this.level >= 250) {
                    this.credits -= cost;
                    this.player.weaponLevel = Math.max(this.player.weaponLevel, 4);
                    this.player.currentWeaponLevel = 4;
                    purchased = true;
                    upgradeName = 'Laser Cannon';
                }
                break;
            case 'quintuple':
                cost = 3000;
                if (this.credits >= cost && this.player.weaponLevel < 5 && this.level >= 200) {
                    this.credits -= cost;
                    this.player.weaponLevel = Math.max(this.player.weaponLevel, 5);
                    this.player.currentWeaponLevel = 5;
                    purchased = true;
                    upgradeName = 'Quintuple Shot';
                }
                break;
            case 'redmoon':
                cost = 12000;
                if (this.credits >= cost && this.player.weaponLevel < 6 && this.level >= 400) {
                    this.credits -= cost;
                    this.player.weaponLevel = Math.max(this.player.weaponLevel, 6);
                    this.player.currentWeaponLevel = 6;
                    purchased = true;
                    upgradeName = 'Endgame redmoon-gun';
                }
                break;
        }
        this.updateUI();
        if (purchased) this.audio.playUpgrade();
    }

    fireObliterator() {
        if (!this.player || this.player.obliteratorAmmo <= 0) return;

        this.player.obliteratorAmmo--;
        this.updateUI();
        this.audio.playObliterator();

        // Kill all enemies (except bosses)
        this.entities.forEach(entity => {
            if (entity.isBoss) return; // Bosses are immune!

            entity.hp = 0;
            entity.markedForDeletion = true;
            this.score += entity.scoreValue;
            this.credits += entity.creditsValue;
        });

        // Visual flash
        const flash = document.createElement('div');
        flash.style.position = 'absolute';
        flash.style.top = '0';
        flash.style.left = '0';
        flash.style.width = '100vw';
        flash.style.height = '100vh';
        flash.style.backgroundColor = 'white';
        flash.style.opacity = '0.8';
        flash.style.pointerEvents = 'none';
        flash.style.transition = 'opacity 0.5s';
        document.body.appendChild(flash);
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 500);
        }, 50);
    }

    onEnemyDeath(enemy) {
        const random = Math.random();

        // Level 450+ Credit Buff: +200% (3x total)
        if (this.level >= 450) {
            this.credits += enemy.creditsValue * 2; // Adding 200% extra
        }

        // 1. Escudo (Prioridade 1)
        if (this.player) {
            let canDrop = false;
            // Level 400+ Condition: 2 sequential damages
            if (this.level >= 400) {
                if (this.player.damageSequenceCount >= 2) {
                    canDrop = true;
                    this.player.damageSequenceCount = 0; // Reset after drop chance
                }
            } else if (this.player.hp <= 50) {
                // Legacy condition for lower levels
                canDrop = true;
            }

            if (canDrop && random < 0.1) { // 1/10
                this.createDrop(enemy.x, enemy.y, 'SHIELD');
                return;
            }
        }

        // 2. Reparo (Prioridade 2): 1/40 chance se Lvl 30+ e sem cooldown
        if (this.level >= 30 && this.healSpawnCooldown <= 0) {
            if (random < 0.025) { // 1/40
                this.createDrop(enemy.x, enemy.y, 'REPAIR');
                return;
            }
        }

        // 3. ARMOR 2: Level 90+, 1/120 chance
        if (this.level >= 90 && !this.hasArmor2 && this.hasArmor1) {
            if (random < (1 / 120)) {
                this.createDrop(enemy.x, enemy.y, 'ARMOR_2');
                return;
            }
        }

        // 4. ARMOR 1: Level 30+, 1/50 chance
        if (this.level >= 30 && !this.hasArmor1) {
            if (random < 0.02) {
                this.createDrop(enemy.x, enemy.y, 'ARMOR_1');
                return;
            }
        }

        // 5. Obliterator
        let nukeChance = 0.05;
        if (this.level >= 120) nukeChance = 1 / 120;
        else if (this.level >= 70) nukeChance = 1 / 60;

        if (random < nukeChance) {
            this.createDrop(enemy.x, enemy.y, 'OBLITERATOR');
        }
    }

    // Drops logic handled in createDrop

    createDrop(x, y, type) {
        // Import must be handled at top, assume we add it later or dynamic import? No, static import.
        // Or if I'm lazy, I can define Drop here if I can't modify top of file easily with replace_file_content... 
        // No, I should add import at the top separately.
        // Wait, for this tool call, I can't add import at line 4 easily without a separate call or multi_replace.
        // I'll stick to logic here and modify import in next call.

        this.drops.push(new Drop(this, x, y, type));
    }

    updateUI() {
        if (document.getElementById('score-display')) document.getElementById('score-display').innerText = this.score;
        if (document.getElementById('hp-display')) document.getElementById('hp-display').innerText = this.player ? this.player.hp : 0;
        if (document.getElementById('credits-display')) document.getElementById('credits-display').innerText = this.credits;
        if (document.getElementById('level-display')) document.getElementById('level-display').innerText = this.level;
        if (document.getElementById('ammo-display')) document.getElementById('ammo-display').innerText = this.player ? this.player.obliteratorAmmo : 0;
        if (document.getElementById('weapon-display')) document.getElementById('weapon-display').innerText = this.player ? this.player.currentWeaponLevel : 1;
    }
}
