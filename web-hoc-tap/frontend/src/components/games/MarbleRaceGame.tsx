'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Trophy,
  Shuffle,
  Trash2,
  CheckCircle2,
  X,
  Crown,
  Volume2,
  VolumeX,
  Music,
  Maximize2,
  Zap,
  Radio,
} from 'lucide-react';
import { gameAudio } from '@/lib/gameSound';

export interface MarbleRaceGameProps {
  students: string[];
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onSelectWinner?: (winner: string) => void;
  onRemoveStudent?: (student: string) => void;
  className?: string;
}

const MARBLE_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#ec4899', '#f43f5e', '#14b8a6', '#84cc16',
  '#0284c7', '#d97706', '#059669', '#7c3aed',
];

interface MarbleEntity {
  id: number;
  name: string;
  color: string;
  initial: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  finished: boolean;
  finishTime: number | null;
  rank: number | null;
  lastBumperTime: number;
}

interface Peg {
  x: number;
  y: number;
  radius: number;
  color?: string;
  isBumper?: boolean;
}

interface Windmill {
  x: number;
  y: number;
  radius: number;
  angle: number;
  speed: number;
  blades: number;
  color: string;
}

interface BoostPad {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ChicaneWall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
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

const TRACK_VIRTUAL_WIDTH = 720;
const TRACK_TOTAL_HEIGHT = 2500;
const FINISH_LINE_Y = 2280;

export const MarbleRaceGame: React.FC<MarbleRaceGameProps> = ({
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
  const [musicActive, setMusicActive] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2 | 3>(1);
  const [cameraMode, setCameraMode] = useState<'lead' | 'top10'>('lead');

  const [raceState, setRaceState] = useState<'idle' | 'countdown' | 'racing' | 'finished'>('idle');
  const [countdownNum, setCountdownNum] = useState<number | string>(3);
  const [timerText, setTimerText] = useState<string>('0.00');
  const [finishedCount, setFinishedCount] = useState<number>(0);
  const [commentary, setCommentary] = useState<string>('Chuẩn bị thả bi!');
  const [commentaryKey, setCommentaryKey] = useState<number>(0);

  const [rankings, setRankings] = useState<{ student: string; time: number; rank: number; color: string; initial: string }[]>([]);
  const [liveLeaderboard, setLiveLeaderboard] = useState<{ id: number; name: string; color: string; initial: string; rank: number; progress: number; finished: boolean }[]>([]);
  const [isPodiumOpen, setIsPodiumOpen] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);

  const marblesRef = useRef<MarbleEntity[]>([]);
  const pegsRef = useRef<Peg[]>([]);
  const windmillsRef = useRef<Windmill[]>([]);
  const boostPadsRef = useRef<BoostPad[]>([]);
  const chicanesRef = useRef<ChicaneWall[]>([]);
  const confettiRef = useRef<ConfettiParticle[]>([]);

  const raceStartTimeRef = useRef<number>(0);
  const finishOrderRef = useRef<MarbleEntity[]>([]);
  const lastSoundTickRef = useRef<number>(0);
  const lastCommentaryTimeRef = useRef<number>(0);
  const firstWindmillTriggeredRef = useRef<boolean>(false);
  const firstBoostTriggeredRef = useRef<boolean>(false);
  const lastLeaderIdRef = useRef<number | null>(null);

  const cameraYRef = useRef<number>(0);
  const stageWidthRef = useRef<number>(720);
  const stageHeightRef = useRef<number>(800);

  // Background Synth Music Generator using Web Audio API
  const musicIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const triggerCommentary = useCallback((text: string) => {
    setCommentary(text);
    setCommentaryKey((prev) => prev + 1);
  }, []);

  // Web Audio BGM chords
  useEffect(() => {
    if (!musicActive || raceState !== 'racing') {
      if (musicIntervalRef.current) {
        clearInterval(musicIntervalRef.current);
        musicIntervalRef.current = null;
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current && AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const chords = [
        [261.63, 329.63, 392.0], // C
        [220.0, 261.63, 329.63], // Am
        [174.61, 220.0, 261.63], // F
        [196.0, 246.94, 293.66], // G
      ];
      let chordIdx = 0;

      const playChord = () => {
        if (!musicActive || raceState !== 'racing') return;
        const currentChord = chords[chordIdx % chords.length];
        chordIdx++;
        const now = ctx.currentTime;

        currentChord.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq * 1.5, now);
          gain.gain.setValueAtTime(0.015, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 1.0);
        });
      };

      playChord();
      musicIntervalRef.current = setInterval(playChord, 1000);
    } catch (e) {}

    return () => {
      if (musicIntervalRef.current) {
        clearInterval(musicIntervalRef.current);
        musicIntervalRef.current = null;
      }
    };
  }, [musicActive, raceState]);

  // Build the Obstacle Track
  const buildTrack = useCallback(() => {
    const W = TRACK_VIRTUAL_WIDTH;

    // 1. Pegs & Spring Bouncers (Section 1: Y 280 -> 720)
    const pegs: Peg[] = [];
    const rows = 7;
    for (let r = 0; r < rows; r++) {
      const y = 300 + r * 60;
      const isOdd = r % 2 === 1;
      const cols = isOdd ? 9 : 10;
      const colStep = (W - 160) / cols;

      for (let c = 0; c < cols; c++) {
        const x = 80 + (c + 0.5) * colStep + (Math.sin(r * 2 + c) * 8);
        const isBumper = (r === 2 && (c === 2 || c === 6)) || (r === 5 && (c === 3 || c === 7));
        pegs.push({
          x,
          y,
          radius: isBumper ? 13 : 7,
          color: isBumper ? '#facc15' : '#475569',
          isBumper,
        });
      }
    }

    // 2. Dual Rotating Windmills / Cối xay gió (Section 2: Y 850 -> 1220)
    const windmills: Windmill[] = [
      {
        x: W * 0.32,
        y: 980,
        radius: 76,
        angle: 0,
        speed: 0.042,
        blades: 4,
        color: '#ec4899',
      },
      {
        x: W * 0.68,
        y: 1040,
        radius: 76,
        angle: Math.PI / 4,
        speed: -0.042,
        blades: 4,
        color: '#06b6d4',
      },
      {
        x: W * 0.5,
        y: 1220,
        radius: 65,
        angle: Math.PI / 2,
        speed: 0.05,
        blades: 4,
        color: '#facc15',
      },
    ];

    // 3. Speed Boost Pads (Section 3: Y 1350 -> 1600)
    const boostPads: BoostPad[] = [
      { x: W * 0.22, y: 1390, w: 90, h: 48 },
      { x: W * 0.5 - 45, y: 1470, w: 90, h: 48 },
      { x: W * 0.78 - 90, y: 1390, w: 90, h: 48 },
      { x: W * 0.35, y: 1580, w: 90, h: 48 },
      { x: W * 0.65 - 90, y: 1580, w: 90, h: 48 },
    ];

    // 4. Chicane Slalom Walls (Section 4: Y 1720 -> 2120)
    const chicanes: ChicaneWall[] = [
      { x1: 50, y1: 1740, x2: W * 0.45, y2: 1820 },
      { x1: W - 50, y1: 1860, x2: W * 0.55, y2: 1940 },
      { x1: 50, y1: 1980, x2: W * 0.42, y2: 2060 },
      { x1: W - 50, y1: 2100, x2: W * 0.58, y2: 2170 },
    ];

    pegsRef.current = pegs;
    windmillsRef.current = windmills;
    boostPadsRef.current = boostPads;
    chicanesRef.current = chicanes;
  }, []);

  // Initialize Marbles
  const initMarbles = useCallback(() => {
    const W = TRACK_VIRTUAL_WIDTH;
    const count = students.length;
    const startXMin = 90;
    const startXMax = W - 90;
    const span = startXMax - startXMin;
    const step = count > 1 ? span / (count - 1) : span / 2;

    const list: MarbleEntity[] = students.map((name, idx) => {
      const x = count === 1 ? W / 2 : startXMin + idx * step + (Math.random() - 0.5) * 6;
      const y = 80 + (idx % 3) * 26;
      const initial = (name.trim()[0] || 'A').toUpperCase();
      return {
        id: idx,
        name,
        color: MARBLE_COLORS[idx % MARBLE_COLORS.length],
        initial,
        x,
        y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 0,
        radius: 13,
        finished: false,
        finishTime: null,
        rank: null,
        lastBumperTime: 0,
      };
    });

    marblesRef.current = list;
    finishOrderRef.current = [];
    confettiRef.current = [];
    cameraYRef.current = 0;
    firstWindmillTriggeredRef.current = false;
    firstBoostTriggeredRef.current = false;
    lastLeaderIdRef.current = null;
    setFinishedCount(0);
    setTimerText('0.00');

    // Initial Live Leaderboard
    setLiveLeaderboard(
      list.map((m, idx) => ({
        id: m.id,
        name: m.name,
        color: m.color,
        initial: m.initial,
        rank: idx + 1,
        progress: 0,
        finished: false,
      }))
    );
  }, [students]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (!stageRef.current || !canvasRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(rect.width, 320);
      const h = Math.max(rect.height, 400);

      canvasRef.current.width = w * dpr;
      canvasRef.current.height = h * dpr;

      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);

      stageWidthRef.current = w;
      stageHeightRef.current = h;

      buildTrack();
      if (raceState === 'idle') {
        initMarbles();
      }
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (stageRef.current) observer.observe(stageRef.current);

    return () => observer.disconnect();
  }, [buildTrack, initMarbles, raceState]);

  // Confetti Generator
  const spawnConfetti = (centerX: number, centerY: number) => {
    const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899', '#facc15'];
    for (let i = 0; i < 90; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      confettiRef.current.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 7 + 4,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        alpha: 1,
      });
    }
  };

  // Start Race Handler
  const startRace = () => {
    if (raceState !== 'idle') return;
    setRaceState('countdown');
    setCountdownNum(3);
    triggerCommentary('Chuẩn bị thả bi!');
    if (soundActive) gameAudio.playCountdownBeep(false);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdownNum(count);
        if (soundActive) gameAudio.playCountdownBeep(false);
      } else if (count === 0) {
        setCountdownNum('THẢ BI!');
        triggerCommentary('Cuộc đua bi chính thức bùng nổ!');
        if (soundActive) gameAudio.playAirHorn();
      } else {
        clearInterval(interval);
        setRaceState('racing');
        raceStartTimeRef.current = performance.now();
        // Give marbles initial impulse
        marblesRef.current.forEach((m) => {
          m.vy = Math.random() * 3 + 2;
          m.vx = (Math.random() - 0.5) * 3;
        });
      }
    }, 850);
  };

  const endRaceNow = () => {
    if (raceState !== 'racing' && raceState !== 'countdown') return;
    const marbles = [...marblesRef.current].sort((a, b) => b.y - a.y);
    const now = performance.now();
    const finalResults = marbles.map((m, idx) => ({
      student: m.name,
      time: m.finishTime || Number(((now - raceStartTimeRef.current) / 1000).toFixed(2)),
      rank: idx + 1,
      color: m.color,
      initial: m.initial,
    }));
    setRankings(finalResults);
    setRaceState('finished');
    setIsPodiumOpen(true);
    triggerCommentary(`Cuộc đua đã kết thúc! ${finalResults[0]?.student || ''} chiến thắng!`);
    if (finalResults[0] && onSelectWinner) {
      onSelectWinner(finalResults[0].student);
    }
  };

  const resetRace = () => {
    setRaceState('idle');
    setIsPodiumOpen(false);
    setRankings([]);
    triggerCommentary('Sẵn sàng cho cuộc đua bi mới!');
    initMarbles();
  };

  const handleShuffle = () => {
    setStudents([...students].sort(() => Math.random() - 0.5));
    triggerCommentary('Đã xáo trộn vị trí các viên bi!');
  };

  // Main Physics and Canvas Rendering Loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      const minimap = minimapRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const stageW = stageWidthRef.current;
      const stageH = stageHeightRef.current;
      const W = TRACK_VIRTUAL_WIDTH;
      const scale = stageW / W;
      const viewportVirtualH = stageH / scale;

      const now = performance.now();
      const marbles = marblesRef.current;

      // Update Timer
      if (raceState === 'racing') {
        const elapsedSec = (now - raceStartTimeRef.current) / 1000;
        setTimerText(elapsedSec.toFixed(2));
      }

      // Physics Steps based on Speed Multiplier
      const steps = raceState === 'racing' ? speedMultiplier : 0;
      const gravity = 0.082;
      const friction = 0.988;
      const bounce = 0.58;

      for (let s = 0; s < steps; s++) {
        // Spin Windmills
        windmillsRef.current.forEach((wm) => {
          wm.angle += wm.speed * 0.6;
        });

        marbles.forEach((m) => {
          if (m.finished) return;

          m.vy += gravity;
          m.vx *= friction;
          m.vy *= friction;

          // Clamp terminal velocity for smooth ~15-18s race
          m.vx = Math.max(-6, Math.min(6, m.vx));
          m.vy = Math.max(-3, Math.min(4.8, m.vy));

          m.x += m.vx;
          m.y += m.vy;

          // Side Rails Collision
          const leftRail = 55 + m.radius;
          const rightRail = W - 55 - m.radius;
          if (m.x < leftRail) {
            m.x = leftRail;
            m.vx = Math.abs(m.vx) * bounce + 0.4;
          } else if (m.x > rightRail) {
            m.x = rightRail;
            m.vx = -Math.abs(m.vx) * bounce - 0.4;
          }

          // Pegs and Bumpers Collision
          pegsRef.current.forEach((peg) => {
            const dx = m.x - peg.x;
            const dy = m.y - peg.y;
            const dist = Math.hypot(dx, dy);
            const minDist = m.radius + peg.radius;

            if (dist < minDist && dist > 0) {
              const nx = dx / dist;
              const ny = dy / dist;
              const overlap = minDist - dist;
              m.x += nx * overlap;
              m.y += ny * overlap;

              const dot = m.vx * nx + m.vy * ny;
              const bCoeff = peg.isBumper ? 1.45 : bounce;
              m.vx = (m.vx - 2 * dot * nx) * bCoeff + (Math.random() - 0.5) * 1.5;
              m.vy = (m.vy - 2 * dot * ny) * bCoeff + (Math.random() - 0.5) * 1.5;

              if (soundActive && now - lastSoundTickRef.current > 60) {
                lastSoundTickRef.current = now;
                gameAudio.playTick();
              }
            }
          });

          // Windmills Paddle Collision
          windmillsRef.current.forEach((wm) => {
            const dx = m.x - wm.x;
            const dy = m.y - wm.y;
            const dist = Math.hypot(dx, dy);
            if (dist < wm.radius + m.radius) {
              // Trigger commentary when first marble hits windmills
              if (!firstWindmillTriggeredRef.current) {
                firstWindmillTriggeredRef.current = true;
                triggerCommentary(`${m.name} lao vào cối xay gió trước tiên!`);
              }

              const pushAngle = wm.angle + Math.atan2(dy, dx);
              m.vx += Math.cos(pushAngle) * 4.2;
              m.vy += Math.sin(pushAngle) * 4.2;

              if (soundActive && now - lastSoundTickRef.current > 90) {
                lastSoundTickRef.current = now;
                gameAudio.playPop();
              }
            }
          });

          // Boost Pads Collision
          boostPadsRef.current.forEach((pad) => {
            if (
              m.x >= pad.x &&
              m.x <= pad.x + pad.w &&
              m.y >= pad.y &&
              m.y <= pad.y + pad.h
            ) {
              m.vy = Math.max(m.vy + 1.2, 5.0);
              if (!firstBoostTriggeredRef.current) {
                firstBoostTriggeredRef.current = true;
                triggerCommentary(`${m.name} kích hoạt cổng tăng tốc!`);
              }
            }
          });

          // Chicane Walls Collision
          chicanesRef.current.forEach((w) => {
            // Segment distance
            const l2 = (w.x2 - w.x1) ** 2 + (w.y2 - w.y1) ** 2;
            let t = ((m.x - w.x1) * (w.x2 - w.x1) + (m.y - w.y1) * (w.y2 - w.y1)) / l2;
            t = Math.max(0, Math.min(1, t));
            const projX = w.x1 + t * (w.x2 - w.x1);
            const projY = w.y1 + t * (w.y2 - w.y1);
            const d = Math.hypot(m.x - projX, m.y - projY);

            if (d < m.radius + 6) {
              const nx = (m.x - projX) / (d || 1);
              const ny = (m.y - projY) / (d || 1);
              m.x = projX + nx * (m.radius + 6);
              m.y = projY + ny * (m.radius + 6);
              const dot = m.vx * nx + m.vy * ny;
              m.vx = (m.vx - 2 * dot * nx) * bounce;
              m.vy = (m.vy - 2 * dot * ny) * bounce;
            }
          });

          // Check Finish Line
          if (m.y >= FINISH_LINE_Y && !m.finished) {
            m.finished = true;
            m.finishTime = Number(((now - raceStartTimeRef.current) / 1000).toFixed(2));
            finishOrderRef.current.push(m);
            m.rank = finishOrderRef.current.length;
            setFinishedCount(finishOrderRef.current.length);

            if (finishOrderRef.current.length === 1) {
              spawnConfetti(m.x, FINISH_LINE_Y);
              triggerCommentary(`${m.name} cán đích đầu tiên - Quán quân xuất sắc!`);
              if (soundActive) gameAudio.playCheer();
            } else if (soundActive) {
              gameAudio.playPop();
            }

            // Stop condition: Top 3 or all finished
            if (finishOrderRef.current.length >= Math.min(marbles.length, 3)) {
              setTimeout(() => {
                const results = finishOrderRef.current.map((item, idx) => ({
                  student: item.name,
                  time: item.finishTime || 10,
                  rank: idx + 1,
                  color: item.color,
                  initial: item.initial,
                }));
                setRankings(results);
                setRaceState('finished');
                setIsPodiumOpen(true);
                if (results[0] && onSelectWinner) {
                  onSelectWinner(results[0].student);
                }
              }, 700);
            }
          }
        });
      }

      // Update Live Leaderboard & Check Lead Changes
      const sortedMarbles = [...marbles].sort((a, b) => {
        if (a.finished && b.finished) return (a.rank || 99) - (b.rank || 99);
        if (a.finished) return -1;
        if (b.finished) return 1;
        return b.y - a.y;
      });

      if (sortedMarbles.length > 0 && raceState === 'racing') {
        const currentLeader = sortedMarbles[0];
        if (lastLeaderIdRef.current !== currentLeader.id) {
          lastLeaderIdRef.current = currentLeader.id;
          if (now - lastCommentaryTimeRef.current > 3500 && !currentLeader.finished) {
            lastCommentaryTimeRef.current = now;
            triggerCommentary(`${currentLeader.name} bứt tốc ngoạn mục vươn lên dẫn đầu!`);
          }
        }
      }

      const boardItems = sortedMarbles.map((m, idx) => {
        const progress = Math.min(100, Math.max(0, Math.round(((m.y - 80) / (FINISH_LINE_Y - 80)) * 100)));
        return {
          id: m.id,
          name: m.name,
          color: m.color,
          initial: m.initial,
          rank: m.finished ? (m.rank || idx + 1) : idx + 1,
          progress: m.finished ? 100 : progress,
          finished: m.finished,
        };
      });
      setLiveLeaderboard(boardItems);

      // Smooth Camera Tracking
      let targetCamY = 0;
      if (raceState === 'racing' || raceState === 'finished') {
        if (cameraMode === 'lead') {
          const leader = sortedMarbles[0];
          if (leader) {
            targetCamY = leader.y - viewportVirtualH * 0.38;
          }
        } else {
          // Top 10 focus: average position of top 5
          const topMarbles = sortedMarbles.slice(0, 5);
          const avgY = topMarbles.reduce((acc, m) => acc + m.y, 0) / (topMarbles.length || 1);
          targetCamY = avgY - viewportVirtualH * 0.45;
        }
      }
      targetCamY = Math.max(0, Math.min(TRACK_TOTAL_HEIGHT - viewportVirtualH, targetCamY));
      cameraYRef.current += (targetCamY - cameraYRef.current) * 0.12;
      const camY = cameraYRef.current;

      // ==========================================
      // CANVAS RENDERING (MAIN STAGE)
      // ==========================================
      ctx.clearRect(0, 0, stageW, stageH);
      ctx.save();
      ctx.scale(scale, scale);
      ctx.translate(0, -camY);

      // Background Gradient
      const bgGrad = ctx.createLinearGradient(0, camY, 0, camY + viewportVirtualH);
      bgGrad.addColorStop(0, '#070b1d');
      bgGrad.addColorStop(0.5, '#0b112c');
      bgGrad.addColorStop(1, '#070b1d');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, camY, W, viewportVirtualH);

      // Background High-tech grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridStartY = Math.floor(camY / 40) * 40;
      for (let gy = gridStartY; gy < camY + viewportVirtualH + 40; gy += 40) {
        ctx.beginPath();
        ctx.moveTo(50, gy);
        ctx.lineTo(W - 50, gy);
        ctx.stroke();
      }

      // Raceway Neon Side Rails
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(40, 40, 16, TRACK_TOTAL_HEIGHT - 80);
      ctx.fillRect(W - 56, 40, 16, TRACK_TOTAL_HEIGHT - 80);

      // Neon glowing line on rails
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = 'rgba(236, 72, 153, 0.6)';
      ctx.shadowBlur = 8;
      ctx.fillRect(52, 40, 4, TRACK_TOTAL_HEIGHT - 80);
      ctx.fillRect(W - 56, 40, 4, TRACK_TOTAL_HEIGHT - 80);
      ctx.shadowBlur = 0;

      // 1. Starting Gate Platform
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(56, 40, W - 112, 50, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = '900 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CỔNG XUẤT PHÁT ĐUA BI', W / 2, 70);

      // 2. Chicane Slalom Walls
      chicanesRef.current.forEach((w) => {
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(w.x1, w.y1);
        ctx.lineTo(w.x2, w.y2);
        ctx.stroke();

        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 3;
        ctx.stroke();
      });

      // 3. Speed Boost Pads
      boostPadsRef.current.forEach((pad) => {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(pad.x, pad.y, pad.w, pad.h, 10);
        ctx.fill();
        ctx.stroke();

        // Animated Chevron Arrows >>>
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('▼ ▼ ▼', pad.x + pad.w / 2, pad.y + pad.h / 2);
      });

      // 4. Rotating Windmills / Cối xay gió
      windmillsRef.current.forEach((wm) => {
        ctx.save();
        ctx.translate(wm.x, wm.y);
        ctx.rotate(wm.angle);

        // Windmill 4 paddles
        for (let p = 0; p < wm.blades; p++) {
          ctx.rotate((Math.PI * 2) / wm.blades);
          ctx.fillStyle = wm.color;
          ctx.shadowColor = wm.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.roundRect(-7, 0, 14, wm.radius, 7);
          ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Center hub
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.restore();
      });

      // 5. Pegs / Bumpers
      pegsRef.current.forEach((peg) => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
        if (peg.isBumper) {
          const grad = ctx.createRadialGradient(peg.x - 3, peg.y - 3, 2, peg.x, peg.y, peg.radius);
          grad.addColorStop(0, '#fef08a');
          grad.addColorStop(1, '#f59e0b');
          ctx.fillStyle = grad;
          ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
          ctx.shadowBlur = 12;
        } else {
          ctx.fillStyle = peg.color || '#475569';
          ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 6. Checkered Finish Line
      const finishHeight = 28;
      const boxSize = 16;
      const numBoxes = Math.floor((W - 112) / boxSize);
      for (let i = 0; i < numBoxes; i++) {
        for (let j = 0; j < 2; j++) {
          ctx.fillStyle = (i + j) % 2 === 0 ? '#ffffff' : '#000000';
          ctx.fillRect(56 + i * boxSize, FINISH_LINE_Y + j * (finishHeight / 2), boxSize, finishHeight / 2);
        }
      }

      // Finish Laser Arch
      ctx.fillStyle = '#facc15';
      ctx.font = '900 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VẠCH ĐÍCH ĐUA BI', W / 2, FINISH_LINE_Y - 12);

      // 7. Draw Marbles (3D Spheres with specularity)
      marbles.forEach((m) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);

        // 3D Sphere Radial Gradient
        const mGrad = ctx.createRadialGradient(
          m.x - m.radius * 0.35,
          m.y - m.radius * 0.35,
          m.radius * 0.1,
          m.x,
          m.y,
          m.radius
        );
        mGrad.addColorStop(0, '#ffffff');
        mGrad.addColorStop(0.3, m.color);
        mGrad.addColorStop(1, '#000000');
        ctx.fillStyle = mGrad;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 3;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Floating Name Tag
        ctx.font = 'bold 11px system-ui, sans-serif';
        const textWidth = ctx.measureText(m.name).width;
        const badgeW = textWidth + 14;
        const badgeH = 18;
        const badgeX = m.x - badgeW / 2;
        const badgeY = m.y - m.radius - 16;

        ctx.fillStyle = '#0f172ad8';
        ctx.strokeStyle = m.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(m.name, m.x, badgeY + 13);

        ctx.restore();
      });

      // Confetti
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

      ctx.restore();

      // ==========================================
      // MINIMAP RENDERING
      // ==========================================
      if (minimap) {
        const mctx = minimap.getContext('2d');
        if (mctx) {
          const mw = minimap.width;
          const mh = minimap.height;
          const miniScaleX = mw / W;
          const miniScaleY = mh / TRACK_TOTAL_HEIGHT;

          mctx.clearRect(0, 0, mw, mh);
          mctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
          mctx.fillRect(0, 0, mw, mh);

          // Rails
          mctx.fillStyle = 'rgba(236, 72, 153, 0.4)';
          mctx.fillRect(40 * miniScaleX, 0, 2, mh);
          mctx.fillRect((W - 40) * miniScaleX, 0, 2, mh);

          // Finish Line
          mctx.fillStyle = '#facc15';
          mctx.fillRect(40 * miniScaleX, FINISH_LINE_Y * miniScaleY, (W - 80) * miniScaleX, 2);

          // Viewport Camera Frame Box
          const vpY = camY * miniScaleY;
          const vpH = viewportVirtualH * miniScaleY;
          mctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
          mctx.lineWidth = 1.5;
          mctx.strokeRect(30 * miniScaleX, vpY, (W - 60) * miniScaleX, vpH);

          // Marbles as dots
          marbles.forEach((m) => {
            mctx.beginPath();
            mctx.arc(m.x * miniScaleX, m.y * miniScaleY, 2.5, 0, Math.PI * 2);
            mctx.fillStyle = m.color;
            mctx.fill();
          });
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [cameraMode, speedMultiplier, raceState, soundActive, triggerCommentary, onSelectWinner]);

  return (
    <div
      className={`mr-root relative w-full h-full flex flex-col md:flex-row bg-[#070b1d] text-white select-none overflow-hidden font-sans min-h-0 ${className || ''}`}
    >
      <style>{`
        .mr-root {
          position: relative;
          display: flex;
          background: #070b1d;
          color: #fff;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
          user-select: none;
          overflow: hidden;
        }
        .mr-stage {
          position: relative;
          flex: 1 1 auto;
          min-width: 0;
          min-height: 0;
        }
        .mr-stage canvas {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: block;
        }
        .mr-comment {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translate(-50%);
          max-width: calc(100% - 24px);
          padding: 8px 18px;
          border-radius: 999px;
          background: #0f172ad1;
          border: 1px solid rgba(236,72,153,.6);
          font-weight: 700;
          font-size: clamp(13px, 1.5vw, 18px);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          animation: mr-pop .35s ease-out;
          pointer-events: none;
          z-index: 10;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        }
        @keyframes mr-pop {
          0% { transform: translate(-50%) scale(.85); opacity: 0; }
          to { transform: translate(-50%) scale(1); opacity: 1; }
        }
        .mr-center {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          pointer-events: none;
          text-align: center;
          z-index: 20;
        }
        .mr-count {
          font-size: clamp(64px, 12vw, 150px);
          font-weight: 900;
          color: #facc15;
          text-shadow: 0 6px 30px rgba(236,72,153,.8);
          animation: mr-count .7s ease-out;
        }
        @keyframes mr-count {
          0% { transform: scale(1.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .mr-panel {
          flex: 0 0 300px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 12px;
          background: #0b1026;
          border-left: 1px solid rgba(255,255,255,.08);
          min-height: 0;
        }
        .mr-hud {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .mr-timer {
          font-family: ui-monospace, SF Mono, Menlo, Consolas, monospace;
          font-size: 32px;
          font-weight: 800;
          color: #facc15;
          font-variant-numeric: tabular-nums;
        }
        .mr-finished {
          padding: 4px 10px;
          border-radius: 999px;
          background: #ec48992e;
          border: 1px solid rgba(236,72,153,.5);
          font-weight: 800;
          font-size: 12px;
          white-space: nowrap;
          color: #f472b6;
        }
        .mr-minimap {
          width: 100%;
          height: 64px;
          border-radius: 8px;
          display: block;
        }
        .mr-board-title {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          opacity: .7;
          text-transform: uppercase;
          color: #94a3b8;
        }
        .mr-board {
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 6px;
          align-content: start;
        }
        .mr-row {
          display: grid;
          grid-template-columns: 20px 22px 1fr;
          align-items: center;
          gap: 4px;
          padding: 3px 5px;
          border-radius: 6px;
          background: #ffffff0a;
          font-size: 12px;
          min-width: 0;
        }
        .mr-row.win {
          background: #facc1536;
          border: 1px solid #facc1555;
        }
        .mr-rank {
          font-weight: 800;
          opacity: .8;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .mr-ava {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
          color: #fff;
        }
        .mr-row-main {
          min-width: 0;
        }
        .mr-row-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 700;
          font-size: 11px;
        }
        .mr-bar {
          height: 3px;
          border-radius: 2px;
          background: #ffffff1f;
          overflow: hidden;
          margin-top: 2px;
        }
        .mr-bar > div {
          height: 100%;
          background: #ec4899;
          transition: width .2s linear;
        }
        .mr-row.done .mr-bar > div {
          background: #22c55e;
        }
        .mr-controls {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .mr-ctrl-row {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .mr-ctrl-row .mr-btn {
          flex: 1;
          padding: 7px 8px;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .mr-ctrl-label {
          font-size: 11px;
          opacity: .65;
          width: 54px;
          flex: 0 0 54px;
          color: #cbd5e1;
          font-weight: 700;
        }
        .mr-btn {
          border: none;
          border-radius: 10px;
          padding: 8px 14px;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          color: #1f2937;
          background: #facc15;
          transition: transform .1s, filter .15s;
          white-space: nowrap;
        }
        .mr-btn:hover {
          filter: brightness(1.08);
        }
        .mr-btn:active {
          transform: scale(.96);
        }
        .mr-btn.ghost {
          background: #ffffff1a;
          color: #fff;
          border: 1px solid rgba(255,255,255,.18);
        }
        .mr-btn.ghost.on {
          background: #1a73e8;
          border-color: #1a73e8;
          color: #fff;
        }
        .mr-btn.danger {
          background: #ef4444;
          color: #fff;
        }
        @media (max-width: 640px) {
          .mr-root {
            flex-direction: column;
          }
          .mr-panel {
            flex: 0 0 auto;
            max-height: 42%;
            border-left: none;
            border-top: 1px solid rgba(255,255,255,.08);
            padding: 8px 10px;
            gap: 6px;
          }
          .mr-minimap {
            display: none;
          }
          .mr-timer {
            font-size: 24px;
          }
          .mr-board {
            grid-template-columns: 1fr 1fr;
            max-height: 16vh;
          }
          .mr-ctrl-label {
            display: none;
          }
        }
      `}</style>

      {/* LEFT: MAIN STAGE WITH CANVAS */}
      <div ref={stageRef} className="mr-stage relative flex-1 min-w-0 min-h-0 overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block cursor-default" />

        {/* Live Commentary Ticker */}
        {commentary && (
          <div key={commentaryKey} className="mr-comment flex items-center justify-center gap-1.5">
            <Radio size={14} className="text-amber-400 animate-pulse shrink-0" />
            <span>{commentary}</span>
          </div>
        )}

        {/* Big Countdown Overlay */}
        {raceState === 'countdown' && (
          <div className="mr-center">
            <span className="mr-count">{countdownNum}</span>
          </div>
        )}

        {/* Floating Launch Control Bar (When Idle) */}
        {raceState === 'idle' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-white/95 dark:bg-[#1e1f20]/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl">
            <button
              onClick={handleShuffle}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-zinc-200 transition cursor-pointer text-xs font-semibold flex items-center gap-1.5"
              title="Xáo trộn vị trí các viên bi"
            >
              <Shuffle size={13} />
              <span className="hidden sm:inline">Xáo trộn bi</span>
            </button>

            <button
              onClick={startRace}
              disabled={students.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all transform hover:scale-[1.03] active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={16} className="fill-white" />
              <span>THẢ BI XUẤT PHÁT</span>
            </button>
          </div>
        )}

        {/* Floating In-Race Control Bar (When Racing) */}
        {raceState === 'racing' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-white/95 dark:bg-[#1e1f20]/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl">
            <button
              onClick={endRaceNow}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Trophy size={14} className="fill-slate-950" />
              <span>Về Đích Ngay</span>
            </button>
            <button
              onClick={resetRace}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-zinc-200 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Hủy Đua</span>
            </button>
          </div>
        )}

        {/* Restart bar (When Finished & Podium Closed) */}
        {raceState === 'finished' && !isPodiumOpen && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-white/95 dark:bg-[#1e1f20]/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl">
            {rankings.length > 0 && (
              <button
                onClick={() => setIsPodiumOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Trophy size={15} className="fill-slate-950" />
                <span>Xem Bảng Vàng</span>
              </button>
            )}
            <button
              onClick={resetRace}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-zinc-200 font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer"
            >
              <RotateCcw size={15} />
              <span>Đua Lại Từ Đầu</span>
            </button>
          </div>
        )}
      </div>

      {/* RIGHT: RACE CONTROL & LEADERBOARD PANEL */}
      <aside className="mr-panel shrink-0">
        {/* HUD: Timer & Finished counter */}
        <div className="mr-hud">
          <span className="mr-timer">{timerText}</span>
          <span className="mr-finished">
            VỀ ĐÍCH {finishedCount}/{students.length}
          </span>
        </div>

        {/* Real-time Minimap */}
        <canvas ref={minimapRef} className="mr-minimap" width={275} height={64} />

        {/* Leaderboard title */}
        <div className="mr-board-title">BẢNG XẾP HẠNG</div>

        {/* Live Leaderboard Grid */}
        <div className="mr-board">
          {liveLeaderboard.map((item) => (
            <div
              key={item.id}
              className={`mr-row ${item.rank === 1 ? 'win' : ''} ${item.finished ? 'done' : ''}`}
            >
              <span className="mr-rank">{item.rank}</span>
              <span className="mr-ava" style={{ backgroundColor: item.color }}>
                {item.initial}
              </span>
              <div className="mr-row-main">
                <div className="mr-row-name" title={item.name}>
                  {item.name}
                </div>
                <div className="mr-bar">
                  <div style={{ width: `${item.progress}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Controls row */}
        <div className="mr-controls">
          {/* Sound / Music / Fullscreen */}
          <div className="mr-ctrl-row">
            <button
              onClick={() => {
                if (onToggleSound) onToggleSound();
              }}
              className={`mr-btn ghost ${soundActive ? 'on' : ''}`}
              title={soundActive ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
            >
              {soundActive ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={() => setMusicActive((prev) => !prev)}
              className={`mr-btn ghost ${musicActive ? 'on' : ''}`}
              title={musicActive ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
            >
              {musicActive ? <Music size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={() => {
                // Toggle browser full screen if supported
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                } else {
                  document.exitFullscreen().catch(() => {});
                }
              }}
              className="mr-btn ghost"
              title="Toàn màn hình trình duyệt"
            >
              <Maximize2 size={16} />
            </button>
          </div>

          {/* Speed Multiplier */}
          <div className="mr-ctrl-row">
            <span className="mr-ctrl-label">Tốc độ</span>
            <button
              onClick={() => setSpeedMultiplier(1)}
              className={`mr-btn ghost ${speedMultiplier === 1 ? 'on' : ''}`}
            >
              x1
            </button>
            <button
              onClick={() => setSpeedMultiplier(2)}
              className={`mr-btn ghost ${speedMultiplier === 2 ? 'on' : ''}`}
            >
              x2
            </button>
            <button
              onClick={() => setSpeedMultiplier(3)}
              className={`mr-btn ghost ${speedMultiplier === 3 ? 'on' : ''}`}
            >
              x3
            </button>
          </div>

          {/* Camera Mode */}
          <div className="mr-ctrl-row">
            <span className="mr-ctrl-label">Camera</span>
            <button
              onClick={() => setCameraMode('lead')}
              className={`mr-btn ghost ${cameraMode === 'lead' ? 'on' : ''}`}
            >
              Dẫn đầu
            </button>
            <button
              onClick={() => setCameraMode('top10')}
              className={`mr-btn ghost ${cameraMode === 'top10' ? 'on' : ''}`}
            >
              Top 10
            </button>
          </div>

          {/* End Race button */}
          <div className="mr-ctrl-row">
            <button
              onClick={endRaceNow}
              disabled={raceState !== 'racing'}
              className="mr-btn danger w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Kết thúc
            </button>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* WINNER PODIUM & CELEBRATION MODAL (THEME SYNCHRONIZED) */}
      {/* ======================================================== */}
      {isPodiumOpen && rankings.length > 0 && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/40 dark:bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-[#1a1b1e] border-2 border-amber-300 dark:border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-900 dark:text-white relative flex flex-col items-center animate-in zoom-in-95 duration-200 font-sans">
            {/* Close Button */}
            <button
              onClick={() => setIsPodiumOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-500 dark:text-zinc-300 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Victory Crown Badge */}
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-400/20 text-amber-500 border border-amber-200 dark:border-amber-400/30 flex items-center justify-center text-3xl mb-3 shadow-md animate-bounce">
              <Crown size={32} className="text-amber-500 fill-amber-500" />
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight text-center">
              QUÁN QUÂN CUỘC ĐUA BI!
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center mb-6 font-medium">
              Chúc mừng viên bi xuất sắc vượt chướng ngại vật về đích đầu tiên
            </p>

            {/* TOP 3 PODIUM DISPLAY */}
            <div className="flex items-end justify-center gap-2 sm:gap-4 w-full mb-6">
              {/* 2nd Place Stand */}
              {rankings[1] && (
                <div className="flex-1 flex flex-col items-center max-w-[130px]">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-md mb-1.5 border-2 border-white/80 dark:border-white/20"
                    style={{ backgroundColor: rankings[1].color }}
                  >
                    {rankings[1].initial}
                  </div>
                  <div className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/10 text-xs font-bold text-slate-700 dark:text-zinc-300 truncate max-w-full text-center mb-1.5 shadow-2xs">
                    {rankings[1].student}
                  </div>
                  <div className="w-full h-24 bg-gradient-to-t from-slate-200 to-slate-100 dark:from-zinc-800 dark:to-zinc-700 rounded-t-2xl border-t-4 border-slate-400 flex flex-col items-center justify-center shadow-md">
                    <div className="flex items-center gap-1 text-slate-700 dark:text-zinc-200">
                      <Trophy size={16} className="fill-slate-300 stroke-slate-500" />
                      <span className="text-lg font-black">2</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400">{rankings[1].time}s</span>
                  </div>
                </div>
              )}

              {/* 1st Place (Gold Stand) */}
              {rankings[0] && (
                <div className="flex-1 flex flex-col items-center max-w-[160px] z-10">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center font-black text-white text-xl shadow-lg mb-2 border-4 border-amber-300"
                    style={{ backgroundColor: rankings[0].color }}
                  >
                    {rankings[0].initial}
                  </div>
                  <div className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs sm:text-sm truncate max-w-full shadow-md mb-2">
                    {rankings[0].student}
                  </div>
                  <div className="w-full h-32 bg-gradient-to-t from-amber-300 via-amber-200 to-amber-100 dark:from-amber-600/30 dark:to-amber-500/50 rounded-t-2xl border-t-4 border-amber-400 flex flex-col items-center justify-center shadow-xl">
                    <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                      <Crown size={22} className="fill-amber-400 stroke-amber-600" />
                      <span className="text-2xl font-black">1</span>
                    </div>
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-200">{rankings[0].time}s</span>
                  </div>
                </div>
              )}

              {/* 3rd Place Stand */}
              {rankings[2] && (
                <div className="flex-1 flex flex-col items-center max-w-[130px]">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-md mb-1.5 border-2 border-white/80 dark:border-white/20"
                    style={{ backgroundColor: rankings[2].color }}
                  >
                    {rankings[2].initial}
                  </div>
                  <div className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/10 text-xs font-bold text-slate-700 dark:text-zinc-300 truncate max-w-full text-center mb-1.5 shadow-2xs">
                    {rankings[2].student}
                  </div>
                  <div className="w-full h-20 bg-gradient-to-t from-amber-100 to-amber-50 dark:from-amber-950/40 dark:to-amber-900/40 rounded-t-2xl border-t-4 border-amber-600 flex flex-col items-center justify-center shadow-md">
                    <div className="flex items-center gap-1 text-amber-700 dark:text-amber-500">
                      <Trophy size={16} className="fill-amber-600/40 stroke-amber-700" />
                      <span className="text-lg font-black">3</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400">{rankings[2].time}s</span>
                  </div>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
              <button
                onClick={() => {
                  if (rankings[0] && onSelectWinner) {
                    onSelectWinner(rankings[0].student);
                  }
                  setIsPodiumOpen(false);
                }}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>Gọi Bạn Quán Quân</span>
              </button>

              <button
                onClick={() => {
                  if (rankings[0] && onRemoveStudent) {
                    onRemoveStudent(rankings[0].student);
                  }
                  resetRace();
                }}
                className="px-4 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-rose-200 dark:border-rose-900/40 transition cursor-pointer"
              >
                <Trash2 size={15} />
                <span>Loại bạn này & Đua tiếp</span>
              </button>

              <button
                onClick={resetRace}
                className="sm:col-span-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-zinc-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-200 dark:border-white/10 transition cursor-pointer"
              >
                <RotateCcw size={15} />
                <span>Đua Lại Từ Đầu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
