export default class Background {
    constructor(game) {
        this.game = game;
        this.stars = [];
        this.nebulae = [];
        this.createStars();
    }

    createStars() {
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * this.game.width,
                y: Math.random() * this.game.height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 3 + 0.5,
                color: `rgba(255, 255, 255, ${Math.random()})`
            });
        }
    }

    createNebula() {
        // Random colors for variety
        const colors = [
            'rgba(255, 0, 255, 0.15)', // Purple
            'rgba(0, 255, 255, 0.15)', // Cyan
            'rgba(255, 100, 0, 0.15)', // Orange
            'rgba(0, 100, 255, 0.15)', // Deep Blue
            'rgba(100, 255, 0, 0.15)', // Green
            'rgba(255, 255, 255, 0.1)'  // White/Galaxy
        ];
        const color = colors[Math.floor(Math.random() * colors.length)];

        // 20% chance to be 50% larger
        const scale = Math.random() < 0.2 ? 1.5 : 1.0;

        this.nebulae.push({
            x: Math.random() * this.game.width,
            y: -400, // Start above
            radius: (200 + Math.random() * 300) * scale,
            speed: 0.1 + Math.random() * 0.2, // Very slow drift
            color: color,
            isGalaxy: Math.random() < 0.3 // Visual flag
        });
    }

    update(deltaTime) {
        // Spawn nebulas/galaxies randomly (rarer: 80% less frequent)
        if (Math.random() < 0.001) {
            this.createNebula();
        }
        // Update Stars
        this.stars.forEach(star => {
            star.y += star.speed;
            if (star.y > this.game.height) {
                star.y = 0;
                star.x = Math.random() * this.game.width;
            }
        });

        // Update Nebulae
        this.nebulae.forEach(nebula => {
            nebula.y += nebula.speed;
            // Optionally remove if far off screen, but they are rare enough
        });
        this.nebulae = this.nebulae.filter(n => n.y < this.game.height + n.radius);
    }

    draw(ctx) {
        // Draw Nebulae first (bottom layer)
        ctx.save();
        this.nebulae.forEach(nebula => {
            const gradient = ctx.createRadialGradient(
                nebula.x, nebula.y, 0,
                nebula.x, nebula.y, nebula.radius
            );
            gradient.addColorStop(0, nebula.color);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(nebula.x, nebula.y, nebula.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        // Draw Stars
        this.stars.forEach(star => {
            ctx.fillStyle = star.color;
            ctx.fillRect(star.x, star.y, star.size, star.size);
        });
    }
}
