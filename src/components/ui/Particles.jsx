import { useEffect, useRef } from 'react';

export function Particles({ density = 90, color = '#7dd3fc', speed = 0.35, interactive = true, className = '' }) {
  const ref = useRef(null);
  const mouse = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    let raf = 0;
    let w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let parts = [];

    const resize = () => {
      const rect = cvs.getBoundingClientRect();
      w = rect.width; h = rect.height;
      cvs.width = w * dpr; cvs.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      parts = Array.from({ length: density }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        r: Math.random() * 1.6 + 0.3,
        a: Math.random() * 0.6 + 0.2,
      }));
    };

    const onMove = (e) => {
      const rect = cvs.getBoundingClientRect();
      mouse.current.x = e.clientX - rect.left;
      mouse.current.y = e.clientY - rect.top;
    };
    const onLeave = () => { mouse.current.x = -9999; mouse.current.y = -9999; };

    resize();
    window.addEventListener('resize', resize);
    if (interactive) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseleave', onLeave);
    }

    const render = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        if (interactive) {
          const dx = p.x - mouse.current.x;
          const dy = p.y - mouse.current.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 14000) {
            const f = (14000 - d2) / 14000;
            const dist = Math.sqrt(d2 + 1);
            p.x += (dx / dist) * f * 1.4;
            p.y += (dy / dist) * f * 1.4;
          }
        }
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.globalAlpha = p.a;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      // connection lines
      ctx.globalAlpha = 1;
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const a = parts[i], b = parts[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 9000) {
            ctx.strokeStyle = color;
            ctx.globalAlpha = (1 - d2 / 9000) * 0.15;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, [density, color, speed, interactive]);

  return <canvas ref={ref} className={`absolute inset-0 h-full w-full ${className}`} />;
}
