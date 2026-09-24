'use client';

import React, { useEffect, useRef } from 'react';

export default function HarvestBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    // Resize and scale for High-DPI / Retina displays (zero blur)
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Stalk generation parameters
    const stalkCount = Math.floor(window.innerWidth / 12);
    const stalks: { x: number; height: number; speed: number; phase: number; curve: number; width: number }[] = [];

    for (let i = 0; i < stalkCount; i++) {
      stalks.push({
        x: Math.random() * window.innerWidth,
        height: 180 + Math.random() * 140,
        speed: 0.8 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        curve: 20 + Math.random() * 35,
        width: 1.5 + Math.random() * 2,
      });
    }

    // Atmospheric breeze & pollen particles
    const particles: { x: number; y: number; size: number; speedX: number; speedY: number; alpha: number }[] = [];
    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: 1 + Math.random() * 3,
        speedX: 0.8 + Math.random() * 1.6,
        speedY: -0.2 - Math.random() * 0.5,
        alpha: 0.2 + Math.random() * 0.6,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.018;
      ctx.clearRect(0, 0, width, height);

      // Deep atmospheric sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#06261c');    // Rich forest emerald
      skyGrad.addColorStop(0.5, '#0b3d2e');  // Deep farm green
      skyGrad.addColorStop(0.85, '#1b4d3e'); // Twilight field horizon
      skyGrad.addColorStop(1, '#2d5a3f');    // Earthy meadow base
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Ambient warm sun glow behind crops
      const sunGrad = ctx.createRadialGradient(width * 0.75, height * 0.45, 10, width * 0.75, height * 0.45, width * 0.5);
      sunGrad.addColorStop(0, 'rgba(251, 191, 36, 0.18)'); // Golden hour glow
      sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, width, height);

      // Render swaying wind currents & drifting pollen
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY + Math.sin(time + p.x * 0.01) * 0.3;

        if (p.x > width) p.x = -10;
        if (p.y < 0) p.y = height + 10;

        ctx.fillStyle = `rgba(253, 224, 71, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Render individual swaying crop stalks
      stalks.forEach((s) => {
        const windSway = Math.sin(time * s.speed + s.phase) * s.curve;
        const baseY = height;
        const tipX = s.x + windSway;
        const tipY = height - s.height;
        const midX = s.x + windSway * 0.4;
        const midY = height - s.height * 0.5;

        // Crop stalk
        ctx.strokeStyle = 'rgba(74, 138, 90, 0.45)';
        ctx.lineWidth = s.width;
        ctx.beginPath();
        ctx.moveTo(s.x, baseY);
        ctx.quadraticCurveTo(midX, midY, tipX, tipY);
        ctx.stroke();

        // Golden grain ear / corn tip swaying at head
        ctx.fillStyle = 'rgba(234, 179, 8, 0.6)';
        ctx.beginPath();
        ctx.ellipse(tipX, tipY, s.width * 2.2, s.width * 5, (windSway * Math.PI) / 180, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden select-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
      {/* Subtle frost sheet for clean readability over UI elements */}
      <div className="absolute inset-0 bg-stone-950/20 backdrop-blur-[1.5px]" />
    </div>
  );
}