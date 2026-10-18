'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Shuffle,
  Trash2,
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { gameAudio } from '@/lib/gameSound';

export interface BlindDuckPondGameProps {
  students: string[];
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onSelectWinner?: (winner: string) => void;
  onRemoveStudent?: (student: string) => void;
  className?: string;
}

const DUCK_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#ec4899', '#f43f5e', '#14b8a6', '#84cc16',
  '#0284c7', '#d97706', '#059669', '#7c3aed',
];

interface DuckSwimEntity {
  id: number;
  name: string;
  initial: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  angle: number;
  speed: number;
  size: number;
  isTarget: boolean;
  isWinner: boolean;
  quackTimer: number;
}

interface LilyPad {
  x: number;
  y: number;
  radius: number;
  angle: number;
  hasFlower: boolean;
}

interface WaterRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  vRot: number;
  alpha: number;
}

export const BlindDuckPondGame: React.FC<BlindDuckPondGameProps> = ({
  students: initialStudents,
  soundEnabled: externalSound,
  onToggleSound,
  onSelectWinner,
  onRemoveStudent,
  className,
}) => {
  const [students, setStudents] = useState<string[]>(
    initialStudents && initialStudents.length > 0 ? initialStudents : ['Học sinh 1', 'Học sinh 2', 'Học sinh 3']
  );

  useEffect(() => {
    if (initialStudents && initialStudents.length > 0) {
      setStudents(initialStudents);
    }
  }, [initialStudents]);

  const soundActive = externalSound ?? true;
  const [lowPerfMode, setLowPerfMode] = useState<boolean>(false);

  const [gameState, setGameState] = useState<'idle' | 'chasing' | 'revealed'>('idle');
  const [winnerDuck, setWinnerDuck] = useState<DuckSwimEntity | null>(null);
  const [isBannerOpen, setIsBannerOpen] = useState(false);
  const [commentary, setCommentary] = useState<string>('🎙️ Chuẩn bị bắt vịt!');
  const [commentaryKey, setCommentaryKey] = useState<number>(0);

  // Position state for floating HTML labels over ducks
  const [duckLabels, setDuckLabels] = useState<{ id: number; name: string; color: string; x: number; y: number; isTarget: boolean; isWinner: boolean }[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const ducksRef = useRef<DuckSwimEntity[]>([]);
  const lilyPadsRef = useRef<LilyPad[]>([]);
  const ripplesRef = useRef<WaterRipple[]>([]);
  const confettiRef = useRef<ConfettiParticle[]>([]);
  const waterTimeRef = useRef<number>(0);

  const netPosRef = useRef<{ x: number; y: number; scale: number; visible: boolean }>({
    x: 0,
    y: 0,
    scale: 1,
    visible: false,
  });

  const widthRef = useRef<number>(1000);
  const heightRef = useRef<number>(600);

  const triggerCommentary = useCallback((text: string) => {
    setCommentary(text);
    setCommentaryKey((prev) => prev + 1);
  }, []);

  // Initialize Pond & Swimming Ducks
  const initPond = useCallback(() => {
    const w = widthRef.current || 1000;
    const h = heightRef.current || 600;

    // Generate floating lilypads
    const pads: LilyPad[] = [];
    for (let i = 0; i < 8; i++) {
      pads.push({
        x: Math.random() * (w - 180) + 90,
        y: Math.random() * (h - 180) + 90,
        radius: Math.random() * 18 + 26,
        angle: Math.random() * Math.PI * 2,
        hasFlower: i % 2 === 0,
      });
    }
    lilyPadsRef.current = pads;

    // Generate ducks
    const list: DuckSwimEntity[] = students.map((name, idx) => {
      const x = Math.random() * (w - 240) + 120;
      const y = Math.random() * (h - 240) + 120;
      const initial = (name.trim()[0] || 'A').toUpperCase();
      return {
        id: idx,
        name,
        initial,
        color: DUCK_COLORS[idx % DUCK_COLORS.length],
        x,
        y,
        vx: 0,
        vy: 0,
        targetX: Math.random() * (w - 240) + 120,
        targetY: Math.random() * (h - 240) + 120,
        angle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.8 + 1.2,
        size: 26,
        isTarget: false,
        isWinner: false,
        quackTimer: Math.random() * 400 + 200,
      };
    });

    ducksRef.current = list;
    ripplesRef.current = [];
    confettiRef.current = [];
    netPosRef.current = { x: w / 2, y: -80, scale: 1, visible: false };
    setWinnerDuck(null);
    setIsBannerOpen(false);
  }, [students]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(rect.width, 320);
      const h = Math.max(rect.height, 400);

      canvasRef.current.width = w * dpr;
      canvasRef.current.height = h * dpr;

      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);

      widthRef.current = w;
      heightRef.current = h;

      initPond();
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [initPond]);

  // Confetti Generator
  const spawnConfetti = (centerX: number, centerY: number) => {
    const colors = ['#f59e0b', '#ec4899', '#10b981', '#3b82f6', '#f43f5e', '#a855f7', '#facc15'];
    for (let i = 0; i < 90; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      confettiRef.current.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 7 + 4,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        alpha: 1,
      });
    }
  };

  // Catch Duck Handler (Dramatic Chasing Sequence)
  const handleCatchDuck = (chosenTarget?: DuckSwimEntity) => {
    if (gameState !== 'idle') return;
    const ducks = ducksRef.current;
    if (ducks.length === 0) return;

    const target = chosenTarget || ducks[Math.floor(Math.random() * ducks.length)];
    setGameState('chasing');
    triggerCommentary('🎙️ Đang tìm mục tiêu để bắt...');
    if (soundActive) gameAudio.playPop();

    // Select 1-2 diversion near-miss ducks first
    const diversionDucks = ducks.filter((d) => d.id !== target.id).slice(0, 2);

    netPosRef.current.visible = true;
    netPosRef.current.x = widthRef.current / 2;
    netPosRef.current.y = -80;

    let step = 0;

    const runChaseStep = () => {
      if (step < diversionDucks.length) {
        // Swoop near diversion duck
        const nearMiss = diversionDucks[step];
        nearMiss.isTarget = true;
        triggerCommentary(`🎙️ Suýt nữa thì tóm được ${nearMiss.name}!`);
        if (soundActive) gameAudio.playWhistle();

        const startX = netPosRef.current.x;
        const startY = netPosRef.current.y;
        const endX = nearMiss.x + (Math.random() - 0.5) * 50;
        const endY = nearMiss.y + (Math.random() - 0.5) * 50;

        const startTime = performance.now();
        const duration = 600;

        const animNear = (now: number) => {
          const p = Math.min((now - startTime) / duration, 1);
          const ease = Math.sin((p * Math.PI) / 2);
          netPosRef.current.x = startX + (endX - startX) * ease;
          netPosRef.current.y = startY + (endY - startY) * ease;

          if (p < 1) {
            requestAnimationFrame(animNear);
          } else {
            nearMiss.isTarget = false;
            // Near-miss duck flees fast!
            nearMiss.speed = 3.5;
            nearMiss.targetX = Math.random() * (widthRef.current - 200) + 100;
            nearMiss.targetY = Math.random() * (heightRef.current - 200) + 100;
            step++;
            setTimeout(runChaseStep, 350);
          }
        };
        requestAnimationFrame(animNear);
      } else {
        // Final plunge toward actual winner duck!
        target.isTarget = true;
        triggerCommentary(`🎙️ Đang áp sát chú vịt ${target.name}!`);

        const startX = netPosRef.current.x;
        const startY = netPosRef.current.y;
        const endX = target.x;
        const endY = target.y;

        const startTime = performance.now();
        const duration = 800;

        const animFinal = (now: number) => {
          const p = Math.min((now - startTime) / duration, 1);
          const ease = p * p; // Accelerate downward
          netPosRef.current.x = startX + (target.x - startX) * ease;
          netPosRef.current.y = startY + (target.y - startY) * ease;

          if (p < 1) {
            requestAnimationFrame(animFinal);
          } else {
            // TÓM ĐƯỢC!
            target.isWinner = true;
            setWinnerDuck(target);
            setGameState('revealed');
            triggerCommentary(`🎙️ Tóm gọn chú vịt ${target.name} rồi!`);

            if (soundActive) {
              gameAudio.playSplash();
              setTimeout(() => gameAudio.playAirHorn(), 150);
              setTimeout(() => gameAudio.playCheer(), 400);
            }

            spawnConfetti(target.x, target.y);
            setIsBannerOpen(true);
            if (onSelectWinner) onSelectWinner(target.name);
          }
        };
        requestAnimationFrame(animFinal);
      }
    };

    runChaseStep();
  };

  const handleReset = () => {
    setGameState('idle');
    setWinnerDuck(null);
    setIsBannerOpen(false);
    triggerCommentary('🎙️ Thả đàn vịt tung tăng bơi tiếp!');
    initPond();
  };

  const handleShuffle = () => {
    setStudents([...students].sort(() => Math.random() - 0.5));
    triggerCommentary('🎙️ Đã xáo trộn vị trí các chú vịt!');
  };

  // Click on canvas directly to grab a duck!
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'idle') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const ducks = ducksRef.current;
    for (let i = 0; i < ducks.length; i++) {
      const d = ducks[i];
      const dist = Math.hypot(clickX - d.x, clickY - d.y);
      if (dist <= d.size + 24) {
        handleCatchDuck(d);
        return;
      }
    }
  };

  // Main Pond Animation & Canvas Physics Loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = widthRef.current;
      const h = heightRef.current;
      waterTimeRef.current += 0.02;
      const t = waterTimeRef.current;

      ctx.clearRect(0, 0, w, h);

      // 1. Crystal Clear Pond Water Gradient
      const waterGrad = ctx.createLinearGradient(0, 0, w, h);
      waterGrad.addColorStop(0, '#bae6fd');
      waterGrad.addColorStop(0.5, '#7dd3fc');
      waterGrad.addColorStop(1, '#38bdf8');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, 0, w, h);

      // Water Caustics / Ripple highlights
      if (!lowPerfMode) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          const waveX = (w * 0.2 * i + Math.sin(t + i) * 60 + w) % w;
          const waveY = (h * 0.25 * i + Math.cos(t * 0.8 + i) * 40 + h) % h;
          ctx.ellipse(waveX, waveY, 90, 35, (i * Math.PI) / 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Draw Floating Lilypads with Water Lilies
      lilyPadsRef.current.forEach((pad) => {
        ctx.save();
        ctx.translate(pad.x, pad.y);
        ctx.rotate(pad.angle);

        // Shadow under pad
        ctx.fillStyle = 'rgba(2, 132, 199, 0.25)';
        ctx.beginPath();
        ctx.arc(3, 4, pad.radius, 0.2, Math.PI * 1.85);
        ctx.lineTo(3, 4);
        ctx.fill();

        // Lilypad leaf
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(0, 0, pad.radius, 0.25, Math.PI * 1.85);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();

        // Leaf veins
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, pad.radius * 0.65, 0.35, Math.PI * 1.75);
        ctx.stroke();

        // Pink Water Lily Lotus Flower
        if (pad.hasFlower) {
          ctx.fillStyle = '#f472b6';
          for (let petal = 0; petal < 6; petal++) {
            ctx.rotate(Math.PI / 3);
            ctx.beginPath();
            ctx.ellipse(0, -9, 4, 8, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // 3. Draw Water Ripples
      ripplesRef.current.forEach((r) => {
        ctx.strokeStyle = `rgba(255, 255, 255, ${r.alpha * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();

        r.radius += 0.8;
        r.alpha -= 0.015;
      });
      ripplesRef.current = ripplesRef.current.filter((r) => r.alpha > 0);

      // 4. Update & Draw Ducks
      const ducks = ducksRef.current;
      const currentLabels: typeof duckLabels = [];

      ducks.forEach((d) => {
        // AI Swimming movement
        const dx = d.targetX - d.x;
        const dy = d.targetY - d.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 30 || Math.random() < 0.005) {
          d.targetX = Math.random() * (w - 240) + 120;
          d.targetY = Math.random() * (h - 240) + 120;
          d.speed = Math.random() * 0.8 + 1.2;
        }

        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - d.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        d.angle += angleDiff * 0.06;

        d.vx = Math.cos(d.angle) * d.speed;
        d.vy = Math.sin(d.angle) * d.speed;

        d.x += d.vx;
        d.y += d.vy;

        // Keep inside bounds
        d.x = Math.max(60, Math.min(w - 60, d.x));
        d.y = Math.max(60, Math.min(h - 60, d.y));

        // Spawn swimming ripple wakes
        if (Math.random() < 0.08 && !lowPerfMode) {
          ripplesRef.current.push({
            x: d.x - Math.cos(d.angle) * (d.size * 0.8),
            y: d.y - Math.sin(d.angle) * (d.size * 0.8),
            radius: 4,
            maxRadius: 28,
            alpha: 0.8,
          });
        }

        // Random Duck Quack sound
        d.quackTimer--;
        if (d.quackTimer <= 0) {
          d.quackTimer = Math.random() * 800 + 400;
          if (soundActive && Math.random() < 0.25) {
            gameAudio.playQuack();
          }
        }

        // DRAW DUCK
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.angle);

        // Water wake underneath
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.beginPath();
        ctx.ellipse(-8, 0, d.size * 1.1, d.size * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();

        // Duck Body (Vibrant Yellow with subtle shading)
        const bodyGrad = ctx.createRadialGradient(-2, -3, 2, 0, 0, d.size * 0.8);
        bodyGrad.addColorStop(0, '#fef08a');
        bodyGrad.addColorStop(0.7, '#facc15');
        bodyGrad.addColorStop(1, '#eab308');
        ctx.fillStyle = bodyGrad;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;

        ctx.beginPath();
        ctx.ellipse(0, 0, d.size * 0.8, d.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Duck Tail Feather
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(-d.size * 0.7, 0);
        ctx.lineTo(-d.size * 1.15, -4);
        ctx.lineTo(-d.size * 0.6, 6);
        ctx.closePath();
        ctx.fill();

        // Duck Head
        ctx.beginPath();
        ctx.arc(d.size * 0.6, -d.size * 0.2, d.size * 0.42, 0, Math.PI * 2);
        ctx.fill();

        // Orange Beak
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(d.size * 0.9, -d.size * 0.28);
        ctx.lineTo(d.size * 1.35, -d.size * 0.2);
        ctx.lineTo(d.size * 0.9, -d.size * 0.12);
        ctx.closePath();
        ctx.fill();

        // Shiny Eye
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(d.size * 0.75, -d.size * 0.3, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(d.size * 0.78, -d.size * 0.33, 0.9, 0, Math.PI * 2);
        ctx.fill();

        // Colored Ribbon on Duck
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.size * 0.35, -d.size * 0.1, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Collect floating HTML label info
        currentLabels.push({
          id: d.id,
          name: d.name,
          color: d.color,
          x: d.x,
          y: d.y - d.size - 8,
          isTarget: d.isTarget,
          isWinner: d.isWinner,
        });
      });

      setDuckLabels(currentLabels);

      // 5. Draw Net / Bamboo Scoop
      const net = netPosRef.current;
      if (net.visible) {
        ctx.save();
        ctx.translate(net.x, net.y);

        // Bamboo Handle
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(70, -140);
        ctx.stroke();

        // Metallic Net Rim Hoop
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 4;
        ctx.shadowColor = 'rgba(250, 204, 21, 0.6)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(0, 0, 36, 26, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Net Mesh Mesh
        ctx.fillStyle = 'rgba(254, 240, 138, 0.28)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 36, 26, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 6. Draw Confetti Particles
      confettiRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.rotation += p.vRot;
        p.alpha -= 0.008;

        if (p.alpha > 0) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });
      confettiRef.current = confettiRef.current.filter((p) => p.alpha > 0);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [gameState, lowPerfMode, soundActive]);

  return (
    <div
      ref={containerRef}
      className={`bd-root relative w-full h-full flex flex-col bg-[#cfe8f3] text-slate-900 select-none overflow-hidden font-sans min-h-0 ${className || ''}`}
    >
      <style>{`
        .bd-root {
          position: relative;
          width: 100%;
          height: 100%;
          background: #cfe8f3;
          color: #fff;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
          user-select: none;
          overflow: hidden;
        }
        .bd-stage {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
        }
        .bd-stage > div:first-child {
          position: absolute !important;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
        }
        .bd-labels {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .bd-label {
          position: absolute;
          left: 0;
          top: 0;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 2px 9px 2px 6px;
          border-radius: 999px;
          background: #ffffffeb;
          color: #1f2937;
          font-weight: 800;
          font-size: clamp(11px, 1.15vw, 15px);
          white-space: nowrap;
          box-shadow: 0 2px 6px #0000002e;
          opacity: 1;
          transition: opacity .2s;
          will-change: transform;
        }
        .bd-label:before {
          content: "";
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--bd-dot, #fff);
          flex: 0 0 auto;
        }
        .bd-label.target {
          box-shadow: 0 0 0 2px #ef4444, 0 2px 8px rgba(239, 68, 68, 0.4);
          transform: scale(1.15);
          transition: transform 0.15s ease-out;
        }
        .bd-label.win {
          background: #facc15;
          font-size: clamp(15px, 1.8vw, 24px);
          padding: 4px 14px 4px 9px;
          box-shadow: 0 0 0 3px #16a34a, 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        .bd-comment {
          position: absolute;
          top: 14px;
          left: 50%;
          transform: translate(-50%);
          max-width: calc(100% - 24px);
          padding: 8px 18px;
          border-radius: 999px;
          background: #14321ed1;
          border: 1px solid rgba(250, 204, 21, .6);
          font-weight: 700;
          font-size: clamp(13px, 1.5vw, 18px);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          animation: bd-pop .35s ease-out;
          pointer-events: none;
          z-index: 10;
          box-shadow: 0 4px 16px rgba(0,0,0,0.25);
          color: #fff;
        }
        @keyframes bd-pop {
          0% { transform: translate(-50%) scale(.85); opacity: 0; }
          to { transform: translate(-50%) scale(1); opacity: 1; }
        }
        .bd-banner {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 24px 36px;
          border-radius: 24px;
          background: linear-gradient(135deg, #16a34af2, #ca8a04f2);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          animation: bd-banner-in .5s cubic-bezier(.2, 1.4, .4, 1);
          transition: all .45s ease;
          text-align: center;
          max-width: calc(100% - 32px);
          z-index: 50;
        }
        @keyframes bd-banner-in {
          0% { transform: translate(-50%, -50%) scale(.4); opacity: 0; }
          to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        .bd-banner-title {
          font-size: clamp(24px, 4vw, 44px);
          font-weight: 900;
          letter-spacing: 1px;
          color: #fef08a;
          text-shadow: 0 3px 0 rgba(0, 0, 0, .25);
        }
        .bd-banner-avatar {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          border: 5px solid #facc15;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          font-weight: 900;
          color: #1e1b4b;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }
        .bd-banner-name {
          font-size: clamp(22px, 3.2vw, 36px);
          font-weight: 900;
          color: #fff;
        }
        .bd-controls, .bd-controls-left, .bd-controls-right {
          position: absolute;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          z-index: 20;
        }
        .bd-controls {
          right: 12px;
          bottom: 12px;
        }
        .bd-controls-left {
          left: 12px;
          top: 12px;
        }
        .bd-controls-right {
          right: 12px;
          top: 12px;
          justify-content: flex-end;
          max-width: calc(100% - 130px);
        }
        .bd-btn {
          border: none;
          border-radius: 12px;
          padding: 8px 16px;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          color: #1f2937;
          background: #facc15;
          transition: transform .1s, filter .15s;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .bd-btn:hover {
          filter: brightness(1.08);
        }
        .bd-btn:active {
          transform: scale(.96);
        }
        .bd-btn.ghost {
          background: #14321e99;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, .25);
        }
        .bd-btn.ghost.on {
          background: #16a34a;
          border-color: #16a34a;
          color: #fff;
        }
        .bd-btn.danger {
          background: #ef4444;
          color: #fff;
        }
        .bd-check {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .bd-check input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }
        .bd-check-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 2px solid #fff;
          background: #ffffff1f;
          font-size: 12px;
          line-height: 1;
          font-weight: 900;
        }
        .bd-check.on .bd-check-box {
          background: #fff;
          color: #16a34a;
        }
      `}</style>

      {/* MAIN POND STAGE */}
      <div className="bd-stage">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full h-full block cursor-pointer"
          title="Bấm vào chú vịt bất kỳ để tóm ngay!"
        />

        {/* Dynamic Floating Labels over Ducks */}
        <div className="bd-labels">
          {duckLabels.map((lbl) => (
            <div
              key={lbl.id}
              className={`bd-label ${lbl.isTarget ? 'target' : ''} ${lbl.isWinner ? 'win' : ''}`}
              style={
                {
                  '--bd-dot': lbl.color,
                  transform: `translate(${lbl.x}px, ${lbl.y}px) translate(-50%, -100%)`,
                } as React.CSSProperties
              }
            >
              <span className="bd-label-name">{lbl.name}</span>
            </div>
          ))}
        </div>

        {/* Live Commentary Ticker */}
        {commentary && (
          <div key={commentaryKey} className="bd-comment">
            {commentary}
          </div>
        )}

        {/* Top-Left Exit Button */}
        <div className="bd-controls-left">
          <button onClick={handleReset} className="bd-btn danger">
            ✕ Đặt lại
          </button>
        </div>

        {/* Top-Right Audio & View Controls */}
        <div className="bd-controls-right">
          <button
            onClick={() => {
              if (onToggleSound) onToggleSound();
            }}
            className={`bd-btn ghost ${soundActive ? 'on' : ''}`}
            title={soundActive ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundActive ? '🔊' : '🔇'}
          </button>

          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen().catch(() => {});
              }
            }}
            className="bd-btn ghost"
            title="Toàn màn hình trình duyệt"
          >
            ⛶ Toàn màn hình
          </button>

          <label
            className={`bd-btn ghost bd-check ${lowPerfMode ? 'on' : ''}`}
            title="Giảm bớt hiệu ứng gợn sóng nước để chạy siêu mượt"
          >
            <input
              type="checkbox"
              checked={lowPerfMode}
              onChange={(e) => setLowPerfMode(e.target.checked)}
            />
            <span className="bd-check-box">{lowPerfMode ? '✓' : ''}</span>
            <span>Máy yếu</span>
          </label>
        </div>

        {/* Bottom-Right "Bắt luôn" Quick Action */}
        <div className="bd-controls">
          <button
            onClick={() => handleCatchDuck()}
            disabled={gameState !== 'idle'}
            className="bd-btn shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ⏭ Bắt luôn
          </button>
        </div>

        {/* Bottom-Center Floating Launch Bar (When Idle) */}
        {gameState === 'idle' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-[#14321ed9] backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/20 shadow-2xl">
            <button
              onClick={handleShuffle}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer text-xs font-semibold flex items-center gap-1.5"
              title="Xáo trộn vị trí đàn vịt"
            >
              <Shuffle size={13} />
              <span className="hidden sm:inline">Xáo trộn vịt</span>
            </button>

            <button
              onClick={() => handleCatchDuck()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/30 transition-all transform hover:scale-[1.03] active:scale-95 cursor-pointer"
            >
              <Play size={16} className="fill-slate-950" />
              <span>BẮT VỊT NGẪU NHIÊN</span>
            </button>
          </div>
        )}
      </div>

      {/* CELEBRATION WINNER BANNER */}
      {isBannerOpen && winnerDuck && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bd-banner relative flex flex-col items-center">
            {/* Close Button */}
            <button
              onClick={() => setIsBannerOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="text-4xl mb-1 animate-bounce">🦆</div>

            <div className="bd-banner-title">CHÚNG TA ĐÃ TÓM ĐƯỢC!</div>

            {/* Winner Avatar Circle */}
            <div
              className="bd-banner-avatar"
              style={{ backgroundColor: winnerDuck.color, color: '#fff' }}
            >
              {winnerDuck.initial}
            </div>

            <div className="bd-banner-name">{winnerDuck.name}</div>

            <p className="text-xs sm:text-sm text-yellow-100/90 font-medium max-w-sm">
              Chúc mừng chú vịt may mắn đã được chiếc vợt thần kỳ bắt trúng!
            </p>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full mt-2">
              <button
                onClick={() => {
                  if (winnerDuck && onSelectWinner) {
                    onSelectWinner(winnerDuck.name);
                  }
                  setIsBannerOpen(false);
                }}
                className="px-5 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>Gọi Bạn Này</span>
              </button>

              <button
                onClick={() => {
                  if (winnerDuck && onRemoveStudent) {
                    onRemoveStudent(winnerDuck.name);
                  }
                  handleReset();
                }}
                className="px-4 py-3 rounded-xl bg-rose-500/30 hover:bg-rose-500/40 text-rose-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-rose-500/40 transition cursor-pointer"
              >
                <Trash2 size={15} />
                <span>Loại bạn này & Bắt tiếp</span>
              </button>

              <button
                onClick={handleReset}
                className="sm:col-span-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RotateCcw size={15} />
                <span>Thả Vịt Bơi Tiếp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
