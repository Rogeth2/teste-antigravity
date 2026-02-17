import Entity from './Entity.js';
import Projectile from './Projectile.js';

export default class Boss extends Entity {
    constructor(game, bossLevel = 50) {
        super(game, 0, 0);
        this.isBoss = true;
        this.bossLevel = bossLevel;
        this.type = 'BOSS';
        this.markedForDeletion = false;

        if (bossLevel === 50) {
            // Boss 1 — DESTRUIDOR
            this.width = 120;
            this.height = 120;
            this.maxHp = 6000;
            this.hp = this.maxHp;
            this.scoreValue = 5000;
            this.creditsValue = 500;
            this.color = '#ff4400';
            this.speed = 1.5;
            this.attackPatterns = ['SPIRAL', 'BURST', 'RING'];
            this.projectileCount = 8;
            this.projectileSpeed = 4;
            this.bossName = '⚠ DESTRUIDOR ⚠';
            this.nameColor = '#ff6600';
        } else if (bossLevel === 100) {
            // Boss 2 — ANIQUILADOR
            this.width = 150;
            this.height = 150;
            this.maxHp = 50000;
            this.hp = this.maxHp;
            this.scoreValue = 10000;
            this.creditsValue = 1000;
            this.color = '#aa00ff';
            this.speed = 1.8;
            this.attackPatterns = ['CROSS', 'HOMING_BURST', 'SHOTGUN'];
            this.projectileCount = 10;
            this.projectileSpeed = 5;
            this.bossName = '💀 ANIQUILADOR 💀';
            this.nameColor = '#cc44ff';
        } else if (bossLevel === 300) {
            // Boss 3 — DEVASTADOR
            this.width = 170;
            this.height = 170;
            this.maxHp = 400000;
            this.hp = this.maxHp;
            this.scoreValue = 20000;
            this.creditsValue = 2000;
            this.color = '#00cc44';
            this.speed = 2.0;
            this.attackPatterns = ['HELIX', 'WAVE', 'NOVA'];
            this.projectileCount = Math.floor(10 * 1.2);
            this.projectileSpeed = Math.floor(5 * 1.2);
            this.bossName = '🔥 DEVASTADOR 🔥';
            this.nameColor = '#00ff66';
        } else if (bossLevel === 490) {
            // Boss 4 — GÊMEO
            this.width = 110;
            this.height = 110;
            this.maxHp = 1600000;
            this.hp = this.maxHp;
            this.scoreValue = 15000;
            this.creditsValue = 1500;
            this.color = '#ff0066';
            this.speed = 2.1;
            this.attackPatterns = ['DIAMOND', 'MIRROR_BURST', 'PULSE'];
            this.projectileCount = Math.floor(12 * 1.05);
            this.projectileSpeed = Math.floor(6 * 1.05);
            this.bossName = '👁 GÊMEO 👁';
            this.nameColor = '#ff3388';
        } else if (bossLevel === 7) {
            // New Early Boss — PERSEGUIDOR REI
            this.width = 100;
            this.height = 100;
            this.maxHp = 1500;
            this.hp = this.maxHp;
            this.scoreValue = 2000;
            this.creditsValue = 200;
            this.color = '#ffff00';
            this.speed = 2.0; // Follower speed
            this.attackPatterns = ['DOUBLE_HOMING'];
            this.projectileCount = 2;
            this.projectileSpeed = 5;
            this.bossName = '👑 PERSEGUIDOR REI 👑';
            this.nameColor = '#ffff00';
        }

        // Positioning
        this.x = (this.game.width - this.width) / 2;
        this.y = -this.height;
        this.targetY = 80;
        this.entering = true;

        // Attack
        this.attackTimer = 0;
        this.attackInterval = 2500;
        this.currentPatternIndex = 0;
        this.patternCycleTimer = 0;
        this.patternCycleDuration = 5000;

        // Movement
        this.moveTimer = 0;
        this.crossAngle = 0;

        // Twin offset (for Boss 4)
        this.twinOffset = 0;
    }

    update(deltaTime) {
        // Entry animation
        if (this.entering) {
            this.y += 1.5;
            if (this.y >= this.targetY) {
                this.y = this.targetY;
                this.entering = false;
            }
            return;
        }

        // Movement Logic
        this.moveTimer += deltaTime;
        const centerX = (this.game.width - this.width) / 2 + this.twinOffset;

        if (this.bossLevel === 7) {
            // Level 7: Follower movement (already reaches edges by following player, but clamping will handle it)
            if (this.game.player) {
                const dx = this.game.player.x + this.game.player.width / 2 - (this.x + this.width / 2);
                const dy = this.game.player.y + this.game.player.height / 2 - (this.y + this.height / 2);
                const angle = Math.atan2(dy, dx);
                this.x += Math.cos(angle) * this.speed;
                this.y += Math.sin(angle) * this.speed;
            }
        } else if (this.bossLevel === 300) {
            // Boss 3 (Devastador): Hybrid Horizontal + Semi-Circular (reaching center)
            const hpRatio = this.hp / this.maxHp;
            // REVERTED: Original horizontal range for Devastador
            const horizontalDist = this.game.width * 0.35;
            // Phase: 30% HP -> 3/4 screen radius
            const verticalDistBase = this.game.height * 0.3;
            const verticalDistPhase = this.game.height * 0.75;
            const verticalDist = hpRatio <= 0.3 ? verticalDistPhase : verticalDistBase;

            this.x = centerX + Math.cos(this.moveTimer * 0.001 * this.speed) * horizontalDist;

            // 20% HP Phase: Alternating superior/inferior semi-circle
            if (hpRatio <= 0.2) {
                const cycle = Math.floor(this.moveTimer / 4000) % 2; // Every 4 seconds
                const wave = Math.sin(this.moveTimer * 0.001 * this.speed);
                if (cycle === 0) {
                    // Superior (Default)
                    this.y = this.targetY + Math.abs(wave) * verticalDist;
                } else {
                    // Inferior Inverted (Bottom up)
                    // Offset targetY by height + verticalDist to start from bottom
                    const bottomY = this.game.height - this.height - 50;
                    this.y = bottomY - Math.abs(wave) * verticalDist;
                }
            } else {
                this.y = this.targetY + Math.abs(Math.sin(this.moveTimer * 0.001 * this.speed)) * verticalDist;
            }
        } else if (this.bossLevel === 490) {
            // Boss 4 (Gêmeos): Independent Movements
            const isAlpha = this.bossName.includes('ALFA');
            const hpRatio = this.hp / this.maxHp;
            const direction = isAlpha ? 1 : -1;
            // Anti-Camping Range: 5px from edges
            const horizontalDist = (this.game.width - this.width) / 2 - 5;
            const speedFactor = isAlpha ? 1.0 : 1.2;

            if (isAlpha && hpRatio <= 0.4) {
                // Alpha Phase: 40% HP -> Vertical movement (80% screen) at 20% less speed
                const verticalRange = this.game.height * 0.8;
                const verticalSpeed = 0.0005 * this.speed * 0.8;
                this.x = centerX + Math.sin(this.moveTimer * 0.0008 * this.speed * direction) * horizontalDist;
                this.y = this.targetY + (Math.sin(this.moveTimer * verticalSpeed) + 1) / 2 * verticalRange;
            } else {
                this.x = centerX + Math.sin(this.moveTimer * 0.0008 * this.speed * speedFactor * direction) * horizontalDist;
                this.y = this.targetY + Math.cos(this.moveTimer * 0.0015 * speedFactor) * 40;
            }
        } else {
            // Default oscillation (Boss 50 & 100)
            const isAniquilador = this.bossLevel === 100;
            // REVERTED: Original range for Aniquilador, Keep extended for Destruidor (50)
            const moveRange = isAniquilador ? (this.game.width * 0.3) : ((this.game.width - this.width) / 2 - 5);
            this.x = centerX + Math.sin(this.moveTimer * 0.001 * this.speed) * moveRange;
        }

        // Clamp to screen (5px limit)
        if (this.x < 5) this.x = 5;
        if (this.x > this.game.width - this.width - 5) this.x = this.game.width - this.width - 5;

        // Pattern cycling
        this.patternCycleTimer += deltaTime;
        if (this.patternCycleTimer >= this.patternCycleDuration) {
            this.patternCycleTimer = 0;
            this.currentPatternIndex = (this.currentPatternIndex + 1) % this.attackPatterns.length;
        }

        // Shooting
        this.attackTimer += deltaTime;
        if (this.attackTimer >= this.attackInterval) {
            this.attackTimer = 0;
            this.executePattern(this.attackPatterns[this.currentPatternIndex]);

            // Devastador 20% HP Anti-Camping Shots
            if (this.bossLevel === 300 && (this.hp / this.maxHp) <= 0.2 && Math.random() < 0.1) {
                this.fireDualHoming(this.x + this.width / 2, this.y + this.height / 2);
            }
        }

        // Cross/rotation angle
        this.crossAngle += deltaTime * 0.002;
    }

    executePattern(pattern) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        switch (pattern) {
            // Boss 1 patterns
            case 'SPIRAL': this.fireSpiral(cx, cy); break;
            case 'BURST': this.fireBurst(cx, cy); break;
            case 'RING': this.fireRing(cx, cy); break;
            // Boss 2 patterns
            case 'CROSS': this.fireCross(cx, cy); break;
            case 'HOMING_BURST': this.fireHomingBurst(cx, cy); break;
            case 'SHOTGUN': this.fireShotgun(cx, cy); break;
            // Boss 3 patterns
            case 'HELIX': this.fireHelix(cx, cy); break;
            case 'WAVE': this.fireWave(cx, cy); break;
            case 'NOVA': this.fireNova(cx, cy); break;
            // Boss 4 patterns
            case 'DIAMOND': this.fireDiamond(cx, cy); break;
            case 'MIRROR_BURST': this.fireMirrorBurst(cx, cy); break;
            case 'PULSE': this.firePulse(cx, cy); break;
            // Level 7 pattern
            case 'DOUBLE_HOMING': this.fireDoubleHoming(cx, cy); break;
        }
    }

    // === Boss 1 Patterns ===

    fireSpiral(cx, cy) {
        let count = this.projectileCount;
        const hpRatio = this.hp / this.maxHp;
        if (this.bossLevel === 50) {
            if (hpRatio <= 0.2) {
                count *= 3; // Triple density (damage handled in spawnProjectile)
            } else if (hpRatio <= 0.3) count *= 2; // Double density
        }
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + this.crossAngle;
            this.spawnProjectile(cx, cy, angle, this.projectileSpeed, '#ff6622');
        }
    }

    fireBurst(cx, cy) {
        if (!this.game.player) return;
        const baseAngle = Math.atan2(this.game.player.y - cy, this.game.player.x - cx);
        const hpRatio = this.hp / this.maxHp;
        let count = 12;
        if (this.bossLevel === 50) {
            if (hpRatio <= 0.2) {
                count = 36; // Triple density (damage handled in spawnProjectile)
            } else if (hpRatio <= 0.3) count = 24; // Double density
        }
        const spread = 0.8;
        for (let i = 0; i < count; i++) {
            const angle = baseAngle - spread / 2 + (spread / (count - 1)) * i;
            this.spawnProjectile(cx, cy, angle, this.projectileSpeed * 1.2, '#ffaa00');
        }
    }

    fireRing(cx, cy) {
        let count = 16;
        const hpr = this.hp / this.maxHp;
        if (this.bossLevel === 50) {
            if (hpr <= 0.2) {
                count = 48; // Triple density (damage handled in spawnProjectile)
            } else if (hpr <= 0.3) count = 32; // Double density
        }
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            this.spawnProjectile(cx, cy, angle, this.projectileSpeed * 0.8, '#ff2200');
        }
    }

    // === Boss 2 Patterns ===

    fireCross(cx, cy) {
        const arms = 4;
        const perArm = Math.floor(this.projectileCount / arms);
        for (let a = 0; a < arms; a++) {
            const baseAngle = this.crossAngle + (Math.PI * 2 / arms) * a;
            for (let i = 0; i < perArm; i++) {
                const speed = this.projectileSpeed * (0.6 + i * 0.3);
                this.spawnProjectile(cx, cy, baseAngle, speed, '#cc00ff');
            }
        }
    }

    fireHomingBurst(cx, cy) {
        const count = 6;
        const hpRatio = this.hp / this.maxHp;
        const isPhase2 = (this.bossLevel === 100 && hpRatio <= 0.3);
        const isPhase3 = (this.bossLevel === 100 && hpRatio <= 0.2);

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            let speed = this.projectileSpeed * 0.7;
            let timeMult = 1;

            if (isPhase3) {
                speed *= 1.8; // +80%
                timeMult = 1.8;
            } else if (isPhase2) {
                speed *= 1.7; // +70%
                timeMult = 1.7;
            }

            const p = this.spawnProjectile(cx, cy, angle, speed, '#00ffff');
            if (p) {
                p.isHoming = true;
                if (isPhase2 || isPhase3) {
                    p.homingTimer *= timeMult;
                }
            }
        }
    }

    fireShotgun(cx, cy) {
        if (!this.game.player) return;
        const baseAngle = Math.atan2(this.game.player.y - cy, this.game.player.x - cx);
        const count = 20;
        const spread = 1.2;
        for (let i = 0; i < count; i++) {
            const angle = baseAngle - spread / 2 + (spread / (count - 1)) * i;
            const speed = this.projectileSpeed * (0.8 + Math.random() * 0.5);
            this.spawnProjectile(cx, cy, angle, speed, '#ff00aa');
        }
    }

    // === Boss 3 Patterns ===

    fireHelix(cx, cy) {
        // Two interleaved spirals going in opposite directions
        const count = this.projectileCount;
        for (let i = 0; i < count; i++) {
            const angle1 = this.crossAngle + (Math.PI * 2 / count) * i;
            const angle2 = -this.crossAngle + (Math.PI * 2 / count) * i + Math.PI;
            this.spawnProjectile(cx, cy, angle1, this.projectileSpeed, '#00ff44');
            this.spawnProjectile(cx, cy, angle2, this.projectileSpeed * 0.9, '#44ff00');
        }
    }

    fireWave(cx, cy) {
        // Sine wave of projectiles downward
        if (!this.game.player) return;
        const count = 14;
        for (let i = 0; i < count; i++) {
            const xOff = (i - count / 2) * 30;
            const angle = Math.PI / 2 + Math.sin(i * 0.8 + this.crossAngle) * 0.4;
            this.spawnProjectile(cx + xOff, cy, angle, this.projectileSpeed * 1.1, '#00ffaa');
        }
    }

    fireNova(cx, cy) {
        // Expanding ring followed by a contracting ring
        const count = 24;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const speed = this.projectileSpeed * (i % 2 === 0 ? 1.0 : 0.5);
            this.spawnProjectile(cx, cy, angle, speed, '#88ff00');
        }
    }

    // === Boss 4 Patterns ===

    fireDiamond(cx, cy) {
        // Diamond shape burst
        const count = this.projectileCount;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.PI / 4;
            const speed = this.projectileSpeed * (1 + 0.3 * Math.abs(Math.sin(angle * 2)));
            this.spawnProjectile(cx, cy, angle, speed, '#ff0066');
        }
    }

    // === Level 7 & Buff Patterns ===

    fireDoubleHoming(cx, cy) {
        if (!this.game.player) return;
        const count = 2;
        const spread = 0.5;
        const angleToPlayer = Math.atan2(this.game.player.y - cy, this.game.player.x - cx);
        for (let i = 0; i < count; i++) {
            const angle = angleToPlayer - spread / 2 + spread * i;
            const p = this.spawnProjectile(cx, cy, angle, this.projectileSpeed, '#ffff00');
            if (p) {
                p.isHoming = true;
                p.homingTimer = 4000;
            }
        }
        // Varied interval 2s to 4s
        this.attackInterval = 2000 + Math.random() * 2000;
    }

    fireDualHoming(cx, cy) {
        if (!this.game.player) return;
        const count = 2;
        const spread = 0.3;
        const angleToPlayer = Math.atan2(this.game.player.y - cy, this.game.player.x - cx);
        for (let i = 0; i < count; i++) {
            const angle = angleToPlayer - spread / 2 + spread * i;
            // High speed and 4x damage
            const p = this.spawnProjectile(cx, cy, angle, this.projectileSpeed * 1.5, '#00ff44');
            if (p) {
                p.damage *= 4;
                p.isHoming = true;
                p.homingTimer = 5000;
            }
        }
    }

    fireMirrorBurst(cx, cy) {
        // Fire mirrored projectiles (both sides simultaneously)
        if (!this.game.player) return;
        const baseAngle = Math.atan2(this.game.player.y - cy, this.game.player.x - cx);
        const count = 10;
        const spread = 1.0;
        for (let i = 0; i < count; i++) {
            const angle = baseAngle - spread / 2 + (spread / (count - 1)) * i;
            this.spawnProjectile(cx, cy, angle, this.projectileSpeed * 1.3, '#ff3388');
            // Mirror
            this.spawnProjectile(cx, cy, Math.PI - angle, this.projectileSpeed * 1.1, '#ff6699');
        }
    }

    firePulse(cx, cy) {
        // Concentric rings at different speeds
        const rings = 3;
        const perRing = Math.floor(this.projectileCount / rings);
        for (let r = 0; r < rings; r++) {
            for (let i = 0; i < perRing; i++) {
                const angle = (Math.PI * 2 / perRing) * i + r * 0.3;
                const speed = this.projectileSpeed * (0.5 + r * 0.4);
                this.spawnProjectile(cx, cy, angle, speed, '#ff1155');
            }
        }
    }

    spawnProjectile(x, y, angle, speed, color) {
        const projectile = new Projectile(this.game, x, y, angle);
        projectile.isEnemy = true;
        projectile.isBossBeam = true;
        projectile.color = color;
        projectile.damage = 15;
        // Boss 50 Damage Buff at 20% HP
        const hpRatio = this.hp / this.maxHp;
        if (this.bossLevel === 50 && hpRatio <= 0.2) {
            projectile.damage *= 5; // MASSIVE BUFF (5x)
        }
        projectile.speed = speed;
        projectile.width = 6;
        projectile.height = 6;
        projectile.velocity.x = Math.cos(angle) * speed;
        projectile.velocity.y = Math.sin(angle) * speed;

        // Beta Phase: 40% HP -> 20% chance of slow homing shots
        const isBeta = this.bossName.includes('BETA');
        if (isBeta && hpRatio <= 0.4 && Math.random() < 0.20) {
            projectile.isHoming = true;
            projectile.speed *= 0.5; // 50% slower
            projectile.velocity.x *= 0.5;
            projectile.velocity.y *= 0.5;
            projectile.color = '#00ffff';
        }

        this.game.projectiles.push(projectile);
        return projectile;
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.markedForDeletion = true;
            this.game.score += this.scoreValue;
            this.game.credits += this.creditsValue;

            if (this.game.onBossDeath) {
                this.game.onBossDeath(this);
            }
        }
    }

    draw(ctx) {
        ctx.save();
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        if (this.bossLevel === 7) {
            this.drawBoss7(ctx, cx, cy);
        } else if (this.bossLevel === 50) {
            this.drawBoss1(ctx, cx, cy);
        } else if (this.bossLevel === 100) {
            this.drawBoss2(ctx, cx, cy);
        } else if (this.bossLevel === 300) {
            this.drawBoss3(ctx, cx, cy);
        } else if (this.bossLevel === 490) {
            this.drawBoss4(ctx, cx, cy);
        }

        // HP Bar (always visible)
        this.drawHpBar(ctx);

        ctx.restore();
    }

    drawBoss7(ctx, cx, cy) {
        // Large Golden Diamond/Star
        const s = this.width / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 30;

        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.8, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.8, 0);
        ctx.closePath();
        ctx.fill();

        // Inner crown-like center
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();
    }

    drawBoss1(ctx, cx, cy) {
        // Octagon - red/orange
        const s = this.width / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 20;

        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i - Math.PI / 8;
            const x = Math.cos(angle) * s * 0.9;
            const y = Math.sin(angle) * s * 0.9;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const x = Math.cos(angle) * s * 0.5;
            const y = Math.sin(angle) * s * 0.5;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f00';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.08, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i - Math.PI / 8;
            const x = Math.cos(angle) * s * 0.9;
            const y = Math.sin(angle) * s * 0.9;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    drawBoss2(ctx, cx, cy) {
        // Star shape - purple/cyan
        const s = this.width / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.shadowColor = '#aa00ff';
        ctx.shadowBlur = 30;

        ctx.fillStyle = '#7700cc';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 / 10) * i - Math.PI / 2;
            const r = i % 2 === 0 ? s * 0.95 : s * 0.5;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#cc44ff';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i;
            const x = Math.cos(angle) * s * 0.35;
            const y = Math.sin(angle) * s * 0.35;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0ff';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.08, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#dd66ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 / 10) * i - Math.PI / 2;
            const r = i % 2 === 0 ? s * 0.95 : s * 0.5;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    drawBoss3(ctx, cx, cy) {
        // Hexagonal fortress - green/toxic
        const s = this.width / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.shadowColor = '#00ff44';
        ctx.shadowBlur = 35;

        // Rotating outer hexagon
        ctx.fillStyle = '#006622';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i + this.crossAngle * 0.5;
            const x = Math.cos(angle) * s * 0.95;
            const y = Math.sin(angle) * s * 0.95;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();

        // Inner rotating triangle
        ctx.fillStyle = '#00cc44';
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 / 3) * i - this.crossAngle;
            const x = Math.cos(angle) * s * 0.55;
            const y = Math.sin(angle) * s * 0.55;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();

        // Toxic core
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.12, 0, Math.PI * 2);
        ctx.fill();

        // Outer border
        ctx.strokeStyle = '#44ff88';
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i + this.crossAngle * 0.5;
            const x = Math.cos(angle) * s * 0.95;
            const y = Math.sin(angle) * s * 0.95;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    drawBoss4(ctx, cx, cy) {
        // Crystal/diamond shape - pink/red
        const s = this.width / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.shadowColor = '#ff0066';
        ctx.shadowBlur = 25;

        // Diamond body
        ctx.fillStyle = '#cc0044';
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.9);
        ctx.lineTo(s * 0.7, 0);
        ctx.lineTo(0, s * 0.9);
        ctx.lineTo(-s * 0.7, 0);
        ctx.closePath();
        ctx.fill();

        // Inner cross
        ctx.fillStyle = '#ff3366';
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.4);
        ctx.lineTo(s * 0.3, 0);
        ctx.lineTo(0, s * 0.4);
        ctx.lineTo(-s * 0.3, 0);
        ctx.closePath();
        ctx.fill();

        // Eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff0088';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.06, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#ff6699';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.9);
        ctx.lineTo(s * 0.7, 0);
        ctx.lineTo(0, s * 0.9);
        ctx.lineTo(-s * 0.7, 0);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    drawHpBar(ctx) {
        const barWidth = this.width + 60;
        const barHeight = 14;
        const barX = this.x + this.width / 2 - barWidth / 2;
        const barY = this.y - 25;
        const hpRatio = Math.max(0, this.hp / this.maxHp);

        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // HP fill (green to red gradient)
        const r = Math.floor(255 * (1 - hpRatio));
        const g = Math.floor(255 * hpRatio);
        ctx.fillStyle = `rgb(${r}, ${g}, 0)`;
        ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // HP Text — doubled font size
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.hp} / ${this.maxHp}`, this.x + this.width / 2, barY - 6);

        // Boss Name — doubled font size
        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = this.nameColor || '#fff';
        ctx.shadowColor = this.nameColor || '#fff';
        ctx.shadowBlur = 15;
        ctx.fillText(this.bossName || 'BOSS', this.x + this.width / 2, barY - 30);
    }
}
