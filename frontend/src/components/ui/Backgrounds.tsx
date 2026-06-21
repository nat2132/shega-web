'use client';

import { useEffect, useRef } from 'react';

export function DotGrid({ className = '' }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 -z-10 ${className}`}
      style={{
        backgroundImage: `radial-gradient(circle, var(--border) 0.5px, transparent 0.5px)`,
        backgroundSize: '24px 24px',
      }}
    />
  );
}

export function GridPattern({ className = '' }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 -z-10 ${className}`}
      style={{
        backgroundImage: `
          linear-gradient(var(--border) 1px, transparent 1px),
          linear-gradient(90deg, var(--border) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }}
    />
  );
}

export function SoftGlow({ className = '' }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 -z-10 ${className}`}
      style={{
        background: `radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.03) 0%, transparent 60%)`,
      }}
    />
  );
}

export function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const color = isDark ? '255,255,255' : '0,0,0';

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      const count = Math.min(50, Math.floor((canvas.width * canvas.height) / 20000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, 0.15)`;
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(${color}, ${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 -z-10"
    />
  );
}

export function GradientBackground({ variant = 1 }: { variant?: number }) {
  const gradients = [
    'linear-gradient(180deg, var(--background) 0%, var(--muted) 50%, var(--background) 100%)',
    'linear-gradient(180deg, var(--muted) 0%, var(--background) 50%, var(--muted) 100%)',
    'linear-gradient(135deg, var(--background) 0%, var(--surface) 50%, var(--background) 100%)',
  ];

  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10"
      style={{ background: gradients[(variant - 1) % gradients.length] }}
    />
  );
}
