'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, useImperativeHandle } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Trophy,
  Users,
  Sparkles,
  Award,
  Clock,
  Shuffle,
  Plus,
  Trash2,
  CheckCircle2,
  ChevronRight,
  Flag,
  Settings2,
  X,
  Crown
} from 'lucide-react';
import { gameAudio } from '@/lib/gameSound';
import { useThemeStore } from '@/store/useThemeStore';
import { RosterConfigModal } from './RosterConfigModal';
import { DuckRaceIcon } from './GameCustomIcons';

export interface DuckRaceGameHandle {
  startRace: () => void;
  resetRace: () => void;
}

export interface DuckRaceGameProps {
  students: string[];
  onSelectWinner?: (winner: string) => void;
  onRemoveStudent?: (student: string) => void;
  onBack?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  className?: string;
}

// 16 Vibrant colors for duck accessories / ribbons
const DUCK_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#ec4899', '#f43f5e', '#14b8a6', '#84cc16',
  '#0284c7', '#d97706', '#059669', '#7c3aed',
];

interface DuckEntity {
  id: number;
  name: string;
  color: string;
  x: number;
  y: number;
  baseLaneY: number;
  speed: number;
  burstTimer: number;
  burstMultiplier: number;
  bobOffset: number;
  quackTimer: number;
  finished: boolean;
  finishTime: number | null;
  rank: number | null;
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

export const DuckRaceGame = React.forwardRef<DuckRaceGameHandle, DuckRaceGameProps>(
  (
    {
      students: initialStudents,
      onSelectWinner,
      onRemoveStudent,
      onBack,
      soundEnabled: externalSound,
      onToggleSound,
      className,
    },
    ref
  ) => {
    const currentTheme = useThemeStore((state) => state.theme);
    const isDark = currentTheme === 'dark';

    const [students, setStudents] = useState<string[]>(
      initialStudents && initialStudents.length > 0 ? initialStudents : ['Học sinh 1', 'Học sinh 2', 'Học sinh 3']
    );

    // Sync when initialStudents changes
    useEffect(() => {
      if (initialStudents && initialStudents.length > 0) {
        setStudents(initialStudents);
      }
    }, [initialStudents]);

    // Race Config
    const [raceDuration, setRaceDuration] = useState<number>(30); // 15, 30, 45, 60s
    const [raceState, setRaceState] = useState<'idle' | 'countdown' | 'racing' | 'finished'>('idle');
    const [countdownNum, setCountdownNum] = useState<number | string>(3);
    const [localSound, setLocalSound] = useState(true);
    const soundActive = externalSound !== undefined ? externalSound : localSound;

    // Podium / Results
    const [rankings, setRankings] = useState<{ student: string; time: number; rank: number; color: string }[]>([]);
    const [isPodiumOpen, setIsPodiumOpen] = useState(false);
    const [isRosterOpen, setIsRosterOpen] = useState(false);
    const [rosterInput, setRosterInput] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Canvas Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number | null>(null);

    // Dynamic State Refs for 60fps flicker-free canvas loop
    const raceStateRef = useRef<'idle' | 'countdown' | 'racing' | 'finished'>(raceState);
    raceStateRef.current = raceState;
    const raceDurationRef = useRef<number>(raceDuration);
    raceDurationRef.current = raceDuration;
    const soundActiveRef = useRef<boolean>(soundActive);
    soundActiveRef.current = soundActive;
    const onSelectWinnerRef = useRef(onSelectWinner);
    onSelectWinnerRef.current = onSelectWinner;
    const isDarkRef = useRef<boolean>(isDark);
    isDarkRef.current = isDark;

    const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
    const finishCelebrationTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastFrameTimeRef = useRef<number>(0);

    const clearAllTimers = useCallback(() => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      if (finishCelebrationTimerRef.current) {
        clearTimeout(finishCelebrationTimerRef.current);
        finishCelebrationTimerRef.current = null;
      }
    }, []);

    const updateRaceState = useCallback((nextState: 'idle' | 'countdown' | 'racing' | 'finished') => {
      raceStateRef.current = nextState;
      setRaceState(nextState);
    }, []);

    // Game World State
    const ducksRef = useRef<DuckEntity[]>([]);
    const cameraXRef = useRef<number>(0);
    const trackLengthRef = useRef<number>(3800);
    const raceStartTimeRef = useRef<number>(0);
    const confettiRef = useRef<ConfettiParticle[]>([]);
    const riverFlowOffsetRef = useRef<number>(0);
    const logicalWidthRef = useRef<number>(1000);
    const logicalHeightRef = useRef<number>(500);

    // Initialize ducks based on student roster
    const initDucks = useCallback(() => {
      clearAllTimers();
      updateRaceState('idle');
      confettiRef.current = [];

      const total = students.length;
      trackLengthRef.current = Math.max(3000, raceDurationRef.current * 120);

      const riverTop = 75;
      const currentH = logicalHeightRef.current || 500;
      const riverHeight = Math.max(240, currentH - 130);
      const laneStep = total > 1 ? riverHeight / (total + 1) : riverHeight / 2;

      const list: DuckEntity[] = students.map((name, idx) => {
        const color = DUCK_COLORS[idx % DUCK_COLORS.length];
        const baseLaneY = riverTop + laneStep * (idx + 1);
        return {
          id: idx,
          name,
          color,
          x: 120 + Math.random() * 25,
          y: baseLaneY,
          baseLaneY,
          speed: 0,
          burstTimer: Math.random() * 120 + 60,
          burstMultiplier: 1.0,
          bobOffset: Math.random() * Math.PI * 2,
          quackTimer: Math.random() * 300 + 100,
          finished: false,
          finishTime: null,
          rank: null,
        };
      });

      ducksRef.current = list;
      cameraXRef.current = 0;
      setRankings([]);
      setIsPodiumOpen(false);
    }, [students, clearAllTimers, updateRaceState]);

    useEffect(() => {
      initDucks();
    }, [initDucks]);

    // Fullscreen helper
    const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen?.().catch(() => {});
        setIsFullscreen(true);
      } else {
        document.exitFullscreen?.().catch(() => {});
        setIsFullscreen(false);
      }
    };

    // Sound helper
    const toggleSound = () => {
      if (onToggleSound) {
        onToggleSound();
      } else {
        setLocalSound((prev) => !prev);
      }
    };

    // Confetti helper
    const triggerConfetti = (centerX: number, centerY: number) => {
      const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ffffff'];
      const particles: ConfettiParticle[] = [];
      for (let i = 0; i < 90; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 9 + 4;
        particles.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 7 + 4,
          rotation: Math.random() * 360,
          vRot: (Math.random() - 0.5) * 12,
          alpha: 1.0,
        });
      }
      confettiRef.current = [...confettiRef.current, ...particles];
    };

    // START RACE HANDLER
    const startRace = useCallback(() => {
      if (raceStateRef.current === 'countdown' || raceStateRef.current === 'racing' || students.length === 0) return;

      clearAllTimers();
      initDucks();
      updateRaceState('countdown');
      setCountdownNum(3);

      if (soundActiveRef.current) {
        gameAudio.playCountdownBeep(false);
      }

      let count = 3;
      countdownTimerRef.current = setInterval(() => {
        count--;
        if (count > 0) {
          setCountdownNum(count);
          if (soundActiveRef.current) {
            gameAudio.playCountdownBeep(false);
          }
        } else if (count === 0) {
          setCountdownNum('XUẤT PHÁT!');
          if (soundActiveRef.current) {
            gameAudio.playCountdownBeep(true);
            gameAudio.playAirHorn();
          }
        } else {
          clearAllTimers();
          const startNow = performance.now();
          raceStartTimeRef.current = startNow;
          lastFrameTimeRef.current = startNow;
          updateRaceState('racing');

          const finishX = trackLengthRef.current - 240;
          const totalDistance = finishX - 140;
          const targetDurationSec = raceDurationRef.current;
          const avgSpeed = totalDistance / (targetDurationSec * 60);

          ducksRef.current.forEach((d) => {
            d.speed = avgSpeed * (0.92 + Math.random() * 0.16);
            d.finished = false;
            d.finishTime = null;
            d.rank = null;
          });
        }
      }, 900);
    }, [students.length, initDucks, clearAllTimers, updateRaceState]);

    // RESET RACE
    const resetRace = useCallback(() => {
      clearAllTimers();
      updateRaceState('idle');
      initDucks();
    }, [initDucks, clearAllTimers, updateRaceState]);

    useImperativeHandle(
      ref,
      () => ({
        startRace,
        resetRace,
      }),
      [startRace, resetRace]
    );

    // MAIN ANIMATION LOOP
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let isSubscribed = true;

      const render = () => {
        if (!isSubscribed) return;

        const width = logicalWidthRef.current;
        const height = logicalHeightRef.current;
        const now = performance.now();
        const trackLength = trackLengthRef.current;
        const finishX = trackLength - 240;
        const currentRaceState = raceStateRef.current;
        const currentRaceDuration = raceDurationRef.current;
        const isSoundOn = soundActiveRef.current;
        const isDarkTheme = isDarkRef.current;

        // UPDATE RACING LOGIC
        if (currentRaceState === 'racing') {
          if (!lastFrameTimeRef.current) {
            lastFrameTimeRef.current = now;
          }
          const rawDeltaSec = (now - lastFrameTimeRef.current) / 1000;
          lastFrameTimeRef.current = now;
          const deltaSec = Math.max(0.001, Math.min(rawDeltaSec, 0.1));
          const frameMultiplier = deltaSec * 60; // 1.0 at 60fps baseline

          // Flow offset based on real frame time
          riverFlowOffsetRef.current = (riverFlowOffsetRef.current + 1.8 * frameMultiplier) % 80;

          const elapsedSec = (now - raceStartTimeRef.current) / 1000;
          const targetDurationSec = currentRaceDuration;
          const baseAvgSpeed = (finishX - 140) / (targetDurationSec * 60);

          let currentLeadX = 140;
          ducksRef.current.forEach((d) => {
            if (d.x > currentLeadX) currentLeadX = d.x;
          });
          const overallProgress = Math.max(0, Math.min(1, (currentLeadX - 140) / (finishX - 140)));
          const timeProgress = Math.min(1.5, elapsedSec / targetDurationSec);

          // Pacing factor: if ducks are lagging behind elapsed time (e.g. browser frame lag),
          // gently boost speed so ducks stay on schedule
          const pacingFactor = timeProgress > overallProgress
            ? 1 + Math.min(0.85, (timeProgress - overallProgress) * 1.6)
            : 1.0;

          // Adrenaline sprint when entering the final stretch (>75%)
          const sprintFactor = overallProgress > 0.75 ? 1.25 : 1.0;

          ducksRef.current.forEach((duck) => {
            if (!duck.finished) {
              duck.burstTimer -= frameMultiplier;
              if (duck.burstTimer <= 0) {
                duck.burstTimer = Math.random() * 90 + 40;
                const surge = Math.random();
                if (surge > 0.70) {
                  duck.burstMultiplier = 1.35 + Math.random() * 0.35;
                  if (isSoundOn && Math.random() > 0.65) {
                    gameAudio.playSplash();
                  }
                } else if (surge < 0.20) {
                  duck.burstMultiplier = 0.85;
                } else {
                  duck.burstMultiplier = 1.0 + (Math.random() - 0.5) * 0.25;
                }
              }

              duck.quackTimer -= frameMultiplier;
              if (duck.quackTimer <= 0) {
                duck.quackTimer = Math.random() * 400 + 200;
                if (isSoundOn && Math.random() > 0.7) {
                  gameAudio.playQuack();
                }
              }

              const currentTargetSpeed = baseAvgSpeed * duck.burstMultiplier * pacingFactor * sprintFactor;
              duck.speed += (currentTargetSpeed - duck.speed) * Math.min(1, 0.08 * frameMultiplier);
              duck.x += duck.speed * frameMultiplier;
              duck.y = duck.baseLaneY + Math.sin(now * 0.003 + duck.bobOffset) * 8;

              // Duck crosses finish line
              if (duck.x >= finishX) {
                duck.finished = true;
                duck.finishTime = Math.round(elapsedSec * 10) / 10;
                const currentFinished = ducksRef.current.filter((d) => d.finished);
                duck.rank = currentFinished.length;

                if (duck.rank === 1) {
                  const finishScreenX = finishX - cameraXRef.current;
                  triggerConfetti(Math.max(100, Math.min(width - 100, finishScreenX)), height / 3);
                  if (isSoundOn) {
                    gameAudio.playCheer();
                  }
                } else if (isSoundOn && duck.rank <= 3) {
                  gameAudio.playSplash();
                }
              }
            } else {
              // Cruising after crossing finish line
              duck.x += 1.4 * frameMultiplier;
              duck.y = duck.baseLaneY + Math.sin(now * 0.002 + duck.bobOffset) * 4;
            }
          });

          // Check if top 3 winners have actually crossed the finish line
          const topFinished = ducksRef.current
            .filter((d) => d.finished)
            .sort((a, b) => (a.rank || 0) - (b.rank || 0));
          const winnerTargetCount = Math.min(3, ducksRef.current.length);
          const hasTopWinners = topFinished.length >= winnerTargetCount;

          // ONLY trigger podium when top winners have ACTUALLY crossed the finish line!
          if (hasTopWinners && raceStateRef.current === 'racing') {
            if (!finishCelebrationTimerRef.current) {
              finishCelebrationTimerRef.current = setTimeout(() => {
                updateRaceState('finished');
                setIsPodiumOpen(true);

                const finalResults = topFinished.slice(0, 3).map((d, idx) => ({
                  student: d.name,
                  time: d.finishTime || Math.round(elapsedSec * 10) / 10,
                  rank: idx + 1,
                  color: d.color,
                }));
                setRankings(finalResults);

                if (finalResults[0] && onSelectWinnerRef.current) {
                  onSelectWinnerRef.current(finalResults[0].student);
                }
              }, 1200);
            }
          }
        } else {
          lastFrameTimeRef.current = now;
          riverFlowOffsetRef.current = (riverFlowOffsetRef.current + 1.2) % 80;
        }

        // UPDATE CAMERA TRACKING
        let leaderX = 0;
        ducksRef.current.forEach((d) => {
          if (d.x > leaderX) leaderX = d.x;
        });

        const targetCamX = Math.max(0, Math.min(leaderX - width * 0.42, trackLength - width));
        cameraXRef.current += (targetCamX - cameraXRef.current) * 0.08;
        const camX = cameraXRef.current;

        // ==========================================
        // DRAW CANVAS SCENE (THEME AWARE)
        // ==========================================
        ctx.clearRect(0, 0, width, height);

        const riverTop = 75;
        const riverBottom = height - 55;
        const riverH = riverBottom - riverTop;

        // 1. TOP RIVERBANK (Grass, Flowers, Rocks)
        const topBankGrad = ctx.createLinearGradient(0, 0, 0, riverTop);
        if (isDarkTheme) {
          topBankGrad.addColorStop(0, '#14532d');
          topBankGrad.addColorStop(0.7, '#166534');
          topBankGrad.addColorStop(1, '#15803d');
        } else {
          topBankGrad.addColorStop(0, '#16a34a');
          topBankGrad.addColorStop(0.7, '#22c55e');
          topBankGrad.addColorStop(1, '#4ade80');
        }
        ctx.fillStyle = topBankGrad;
        ctx.fillRect(0, 0, width, riverTop);

        // Sand bank edge
        ctx.fillStyle = isDarkTheme ? '#854d0e' : '#fde047';
        ctx.fillRect(0, riverTop - 4, width, 4);

        // 2. WATER RIVER TRACK
        const waterGrad = ctx.createLinearGradient(0, riverTop, 0, riverBottom);
        if (isDarkTheme) {
          waterGrad.addColorStop(0, '#0c4a6e');
          waterGrad.addColorStop(0.3, '#0369a1');
          waterGrad.addColorStop(0.7, '#0284c7');
          waterGrad.addColorStop(1, '#0c4a6e');
        } else {
          waterGrad.addColorStop(0, '#38bdf8');
          waterGrad.addColorStop(0.3, '#0ea5e9');
          waterGrad.addColorStop(0.7, '#0284c7');
          waterGrad.addColorStop(1, '#38bdf8');
        }
        ctx.fillStyle = waterGrad;
        ctx.fillRect(0, riverTop, width, riverH);

        // Water wave sparkle lines (drawn across the entire river from top to bottom)
        ctx.strokeStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const waveSpacing = 75;
        const waveRowSpacing = 42;
        const startWaveX = Math.floor(camX / waveSpacing) * waveSpacing - waveSpacing * 2;
        const endWaveX = camX + width + waveSpacing * 2;
        const maxWaveY = riverBottom - 10;

        for (let wy = riverTop + 25; wy < maxWaveY; wy += waveRowSpacing) {
          const rowIndex = Math.floor((wy - riverTop) / waveRowSpacing);
          const rowOffset = (rowIndex % 2) * (waveSpacing * 0.5);
          for (let wx = startWaveX; wx < endWaveX; wx += waveSpacing) {
            const screenWX = wx - camX - riverFlowOffsetRef.current + rowOffset;
            ctx.moveTo(screenWX, wy);
            ctx.quadraticCurveTo(screenWX + 20, wy - 6, screenWX + 40, wy);
            ctx.quadraticCurveTo(screenWX + 60, wy + 6, screenWX + 80, wy);
          }
        }
        ctx.stroke();

        // 3. BOTTOM RIVERBANK
        const bottomBankGrad = ctx.createLinearGradient(0, riverBottom, 0, height);
        if (isDarkTheme) {
          bottomBankGrad.addColorStop(0, '#15803d');
          bottomBankGrad.addColorStop(0.3, '#166534');
          bottomBankGrad.addColorStop(1, '#14532d');
        } else {
          bottomBankGrad.addColorStop(0, '#4ade80');
          bottomBankGrad.addColorStop(0.3, '#22c55e');
          bottomBankGrad.addColorStop(1, '#16a34a');
        }
        ctx.fillStyle = bottomBankGrad;
        ctx.fillRect(0, riverBottom, width, height - riverBottom);

        // Bottom sand bank border
        ctx.fillStyle = isDarkTheme ? '#854d0e' : '#fde047';
        ctx.fillRect(0, riverBottom, width, 4);

        // Flowers on bank
        const drawFlowersOnBank = (yPos: number) => {
          const flowerStep = 180;
          const startFlowerX = Math.floor(camX / flowerStep) * flowerStep - flowerStep;
          for (let fx = startFlowerX; fx < camX + width + flowerStep; fx += flowerStep) {
            const sx = fx - camX;
            ctx.fillStyle = (fx % 3 === 0) ? '#f43f5e' : (fx % 3 === 1) ? '#fbbf24' : '#ffffff';
            ctx.beginPath();
            ctx.arc(sx, yPos, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#eab308';
            ctx.beginPath();
            ctx.arc(sx, yPos, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        };
        drawFlowersOnBank(riverTop - 18);
        drawFlowersOnBank(riverBottom + 18);

        // 4. START LINE (at X = 160)
        const startLineX = 160 - camX;
        if (startLineX > -50 && startLineX < width + 50) {
          const boxSize = 14;
          const numBoxes = Math.ceil(riverH / boxSize);
          for (let b = 0; b < numBoxes; b++) {
            ctx.fillStyle = b % 2 === 0 ? '#ffffff' : '#0f172a';
            ctx.fillRect(startLineX - boxSize, riverTop + b * boxSize, boxSize, boxSize);
            ctx.fillStyle = b % 2 === 1 ? '#ffffff' : '#0f172a';
            ctx.fillRect(startLineX, riverTop + b * boxSize, boxSize, boxSize);
          }

          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(startLineX - 55, riverTop - 42, 110, 30, 8);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('XUẤT PHÁT', startLineX, riverTop - 22);

          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(startLineX, riverTop + 8, 9, 0, Math.PI * 2);
          ctx.arc(startLineX, riverBottom - 8, 9, 0, Math.PI * 2);
          ctx.fill();
        }

        // 5. DISTANCE MILESTONES (25%, 50%, 75%)
        const markers = [
          { pct: 0.25, label: '25%' },
          { pct: 0.5, label: '50%' },
          { pct: 0.75, label: '75%' },
        ];
        markers.forEach((m) => {
          const mx = 160 + (finishX - 160) * m.pct - camX;
          if (mx > -50 && mx < width + 50) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.moveTo(mx, riverTop);
            ctx.lineTo(mx, riverBottom);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = isDarkTheme ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)';
            ctx.strokeStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(mx - 32, riverTop + 8, 64, 22, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = isDarkTheme ? '#ffffff' : '#0f172a';
            ctx.font = 'bold 11px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(m.label, mx, riverTop + 23);
          }
        });

        // 6. FINISH LINE (at X = finishX)
        const finishLineScreenX = finishX - camX;
        if (finishLineScreenX > -100 && finishLineScreenX < width + 100) {
          const boxSize = 16;
          const numBoxes = Math.ceil(riverH / boxSize);
          for (let b = 0; b < numBoxes; b++) {
            ctx.fillStyle = b % 2 === 0 ? '#ffffff' : '#0f172a';
            ctx.fillRect(finishLineScreenX - boxSize, riverTop + b * boxSize, boxSize, boxSize);
            ctx.fillStyle = b % 2 === 1 ? '#ffffff' : '#0f172a';
            ctx.fillRect(finishLineScreenX, riverTop + b * boxSize, boxSize, boxSize);
          }

          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(finishLineScreenX - 70, riverTop - 46, 140, 36, 10);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#0f172a';
          ctx.font = 'black 14px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('VẠCH ĐÍCH', finishLineScreenX, riverTop - 23);

          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(finishLineScreenX, riverTop + 10, 12, 0, Math.PI * 2);
          ctx.arc(finishLineScreenX, riverBottom - 10, 12, 0, Math.PI * 2);
          ctx.fill();
        }

        // ==========================================
        // 7. DRAW DUCKS & LABELS
        // ==========================================
        const sortedDucks = [...ducksRef.current].sort((a, b) => a.y - b.y);

        let leaderDuckId = -1;
        let maxDist = -1;
        ducksRef.current.forEach((d) => {
          if (d.x > maxDist) {
            maxDist = d.x;
            leaderDuckId = d.id;
          }
        });

        sortedDucks.forEach((duck) => {
          const duckScreenX = duck.x - camX;
          const duckScreenY = duck.y;

          if (duckScreenX < -150 || duckScreenX > width + 150) return;

          const isLeader = duck.id === leaderDuckId && currentRaceState === 'racing' && !duck.finished;
          const bob = Math.sin(now * 0.007 + duck.bobOffset) * 3;
          const tilt = Math.sin(now * 0.005 + duck.bobOffset) * 0.06;

          ctx.save();
          ctx.translate(duckScreenX, duckScreenY + bob);
          ctx.rotate(tilt);

          // Swimming wake
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.beginPath();
          ctx.moveTo(-16, 10);
          ctx.lineTo(-45, 2);
          ctx.lineTo(-50, 14);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.ellipse(0, 12, 28, 9, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Duck Shadow
          ctx.fillStyle = 'rgba(2, 44, 34, 0.2)';
          ctx.beginPath();
          ctx.ellipse(2, 11, 24, 7, 0, 0, Math.PI * 2);
          ctx.fill();

          // Rubber Duck Body
          const bodyGrad = ctx.createRadialGradient(-4, 0, 4, 0, 0, 26);
          bodyGrad.addColorStop(0, '#fef08a');
          bodyGrad.addColorStop(0.4, '#facc15');
          bodyGrad.addColorStop(1, '#ca8a04');
          ctx.fillStyle = bodyGrad;

          ctx.beginPath();
          ctx.moveTo(-18, 4);
          ctx.quadraticCurveTo(-30, 2, -28, -8);
          ctx.quadraticCurveTo(-22, -4, -16, 0);
          ctx.quadraticCurveTo(-8, -4, 0, -6);
          ctx.quadraticCurveTo(18, -4, 20, 6);
          ctx.quadraticCurveTo(12, 16, -6, 14);
          ctx.quadraticCurveTo(-16, 12, -18, 4);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Wing
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.moveTo(-10, 4);
          ctx.quadraticCurveTo(-2, -1, 6, 2);
          ctx.quadraticCurveTo(0, 10, -8, 8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Head
          const headGrad = ctx.createRadialGradient(8, -16, 2, 8, -14, 16);
          headGrad.addColorStop(0, '#fef08a');
          headGrad.addColorStop(0.5, '#facc15');
          headGrad.addColorStop(1, '#ca8a04');
          ctx.fillStyle = headGrad;

          ctx.beginPath();
          ctx.arc(8, -14, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Beak
          const beakGrad = ctx.createLinearGradient(16, -15, 28, -12);
          beakGrad.addColorStop(0, '#fb923c');
          beakGrad.addColorStop(1, '#ea580c');
          ctx.fillStyle = beakGrad;

          ctx.beginPath();
          ctx.moveTo(17, -17);
          ctx.quadraticCurveTo(28, -16, 29, -12);
          ctx.quadraticCurveTo(25, -8, 17, -9);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#9a3412';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(18, -12);
          ctx.lineTo(26, -12);
          ctx.stroke();

          // Eye
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(11, -17, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(12.2, -18.2, 1.2, 0, Math.PI * 2);
          ctx.fill();

          // Cap / Headband
          ctx.fillStyle = duck.color;
          ctx.beginPath();
          ctx.arc(6, -24, 7, Math.PI, 0, false);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Number Badge on body
          ctx.fillStyle = duck.color;
          ctx.beginPath();
          ctx.arc(-2, 5, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'black 9px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${duck.id + 1}`, -2, 8);

          ctx.restore();

          // ==========================================
          // DUCK NAME BADGE (Clean Light/Dark Responsive)
          // ==========================================
          ctx.save();
          const tagY = duckScreenY + bob - 36;
          const tagX = duckScreenX;

          const displayName = duck.name.length > 14 ? duck.name.slice(0, 13) + '..' : duck.name;
          ctx.font = isLeader ? 'bold 12px system-ui, sans-serif' : '600 11px system-ui, sans-serif';
          const textWidth = ctx.measureText(displayName).width;
          const badgeWidth = Math.max(textWidth + 24, 64);
          const badgeHeight = 22;

          const badgeBg = isLeader ? '#f59e0b' : (isDarkTheme ? '#1e293b' : '#ffffff');
          const badgeBorder = isLeader ? '#ffffff' : duck.color;
          const badgeTextColor = isLeader ? '#0f172a' : (isDarkTheme ? '#ffffff' : '#0f172a');

          // Subtle shadow for legibility
          ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 2;

          ctx.fillStyle = badgeBg;
          ctx.strokeStyle = badgeBorder;
          ctx.lineWidth = isLeader ? 2 : 1.8;

          ctx.beginPath();
          ctx.roundRect(tagX - badgeWidth / 2, tagY - badgeHeight / 2, badgeWidth, badgeHeight, 11);
          ctx.fill();
          ctx.stroke();

          // Pointer arrow
          ctx.beginPath();
          ctx.moveTo(tagX - 5, tagY + badgeHeight / 2);
          ctx.lineTo(tagX + 5, tagY + badgeHeight / 2);
          ctx.lineTo(tagX, tagY + badgeHeight / 2 + 5);
          ctx.closePath();
          ctx.fill();

          ctx.shadowColor = 'transparent';

          if (isLeader) {
            const crownX = tagX - badgeWidth / 2 + 10;
            const crownY = tagY + 1;
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.moveTo(crownX - 5, crownY + 3);
            ctx.lineTo(crownX - 6, crownY - 3);
            ctx.lineTo(crownX - 2, crownY);
            ctx.lineTo(crownX, crownY - 4);
            ctx.lineTo(crownX + 2, crownY);
            ctx.lineTo(crownX + 6, crownY - 3);
            ctx.lineTo(crownX + 5, crownY + 3);
            ctx.closePath();
            ctx.fill();
          }

          ctx.fillStyle = badgeTextColor;
          ctx.font = isLeader ? 'bold 11px system-ui, sans-serif' : '700 11px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(displayName, isLeader ? tagX + 6 : tagX, tagY + 4);

          ctx.restore();
        });

        // 8. CONFETTI PARTICLES
        if (confettiRef.current.length > 0) {
          ctx.save();
          confettiRef.current.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.25;
            p.rotation += p.vRot;
            p.alpha -= 0.008;

            if (p.alpha > 0) {
              ctx.save();
              ctx.translate(p.x, p.y);
              ctx.rotate((p.rotation * Math.PI) / 180);
              ctx.fillStyle = p.color;
              ctx.globalAlpha = Math.max(0, p.alpha);
              ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
              ctx.restore();
            }
          });
          ctx.restore();
          confettiRef.current = confettiRef.current.filter((p) => p.alpha > 0 && p.y < height + 50);
        }

        animFrameRef.current = requestAnimationFrame(render);
      };

      const resizeCanvas = () => {
        if (!canvas || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const targetW = Math.round(rect.width * dpr);
        const targetH = Math.round(rect.height * dpr);

        logicalWidthRef.current = rect.width;
        logicalHeightRef.current = rect.height;

        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
          if (ctx.resetTransform) {
            ctx.resetTransform();
          } else {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
          }
          ctx.scale(dpr, dpr);
        }
      };

      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      let ro: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
        ro = new ResizeObserver(() => {
          resizeCanvas();
        });
        ro.observe(containerRef.current);
      }

      animFrameRef.current = requestAnimationFrame(render);

      return () => {
        isSubscribed = false;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        window.removeEventListener('resize', resizeCanvas);
        if (ro) ro.disconnect();
        clearAllTimers();
      };
    }, [clearAllTimers]);

    const handleRemoveWinnerAndContinue = (winnerName: string) => {
      const updated = students.filter((s) => s !== winnerName);
      setStudents(updated);
      if (onRemoveStudent) {
        onRemoveStudent(winnerName);
      }
      setIsPodiumOpen(false);
      updateRaceState('idle');
    };

    const handleSaveRoster = (newStudents: string[]) => {
      if (newStudents.length > 0) {
        setStudents(newStudents);
        setIsRosterOpen(false);
        updateRaceState('idle');
      }
    };

    const handleShuffleRoster = () => {
      setStudents([...students].sort(() => Math.random() - 0.5));
    };

    return (
      <div
        ref={containerRef}
        className={`relative w-full h-full flex-1 flex flex-col bg-white dark:bg-[#18191c] text-slate-900 dark:text-white select-none overflow-hidden font-sans min-h-0 ${className || ''}`}
      >
        {/* ======================================================== */}
        {/* MAIN GAME CANVAS ARENA */}
        {/* ======================================================== */}
        <div className="relative flex-1 w-full h-full overflow-hidden min-h-0">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block cursor-default" />

          {/* COUNTDOWN OVERLAY */}
          {raceState === 'countdown' && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-[2px]">
              <div className="animate-ping absolute w-48 h-48 rounded-full bg-amber-400/30" />
              <div className="relative text-center">
                <span className="text-6xl sm:text-8xl font-black text-amber-500 dark:text-amber-300 drop-shadow-[0_8px_20px_rgba(245,158,11,0.5)] tracking-wider">
                  {countdownNum}
                </span>
              </div>
            </div>
          )}

          {/* FLOATING ACTION LAUNCH BAR (When Idle) */}
          {raceState === 'idle' && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-white/95 dark:bg-[#1e1f20]/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl">
              {/* Duration selector pill */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 dark:text-zinc-400 font-semibold flex items-center gap-1">
                  <Clock size={13} className="text-amber-500" />
                  <span className="hidden sm:inline">Thời gian:</span>
                </span>
                <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200/80 dark:border-white/10">
                  {[15, 30, 45, 60].map((dur) => (
                    <button
                      key={dur}
                      onClick={() => {
                        setRaceDuration(dur);
                        raceDurationRef.current = dur;
                        trackLengthRef.current = Math.max(3000, dur * 120);
                        if (raceStateRef.current === 'finished') {
                          updateRaceState('idle');
                        }
                      }}
                      className={`px-2 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        raceDuration === dur
                          ? 'bg-amber-400 text-slate-950 shadow-xs'
                          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {dur}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Shuffle button */}
              <button
                onClick={handleShuffleRoster}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-white/10 transition cursor-pointer text-xs font-semibold flex items-center gap-1.5"
                title="Xáo trộn thứ tự xuất phát"
              >
                <Shuffle size={13} />
                <span className="hidden sm:inline">Xáo trộn</span>
              </button>

              {/* Start Race */}
              <button
                onClick={startRace}
                disabled={students.length === 0}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all transform hover:scale-[1.03] active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={16} className="fill-slate-950" />
                <span>BẮT ĐẦU ĐUA VỊT</span>
              </button>
            </div>
          )}

          {/* RACING ACTIONS BAR (When Racing) */}
          {raceState === 'racing' && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-white/95 dark:bg-[#1e1f20]/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl">
              <button
                onClick={() => {
                  const sortedByProgress = [...ducksRef.current].sort((a, b) => {
                    if (a.finished && b.finished) return (a.rank || 0) - (b.rank || 0);
                    if (a.finished) return -1;
                    if (b.finished) return 1;
                    return b.x - a.x;
                  });
                  const finalResults = sortedByProgress.slice(0, 3).map((d, idx) => ({
                    student: d.name,
                    time: d.finishTime || Math.round(((performance.now() - raceStartTimeRef.current) / 1000) * 10) / 10,
                    rank: idx + 1,
                    color: d.color,
                  }));
                  setRankings(finalResults);
                  updateRaceState('finished');
                  setIsPodiumOpen(true);
                  if (finalResults[0] && onSelectWinnerRef.current) {
                    onSelectWinnerRef.current(finalResults[0].student);
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
                title="Về đích ngay lập tức và trao giải Top 3"
              >
                <Flag size={14} className="fill-slate-950" />
                <span>Về Đích Ngay</span>
              </button>
              <button
                onClick={resetRace}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-zinc-200 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                title="Hủy cuộc đua và xếp lại vạch xuất phát"
              >
                <RotateCcw size={13} />
                <span>Hủy Đua</span>
              </button>
            </div>
          )}

          {/* RESTART BUTTON (When Finished & Podium Closed) */}
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
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer"
              >
                <RotateCcw size={15} />
                <span>Đua Lại Từ Đầu</span>
              </button>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* WINNER PODIUM & CELEBRATION MODAL (THEME SYNCHRONIZED) */}
        {/* ======================================================== */}
        {isPodiumOpen && rankings.length > 0 && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/40 dark:bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-white dark:bg-[#1a1b1e] border-2 border-amber-300 dark:border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-900 dark:text-white relative flex flex-col items-center animate-in zoom-in-95 duration-200">
              {/* Close Button */}
              <button
                onClick={() => setIsPodiumOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-500 dark:text-zinc-300 transition cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Victory Badge */}
              <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-400/20 text-amber-500 border border-amber-200 dark:border-amber-400/30 flex items-center justify-center text-3xl mb-3 shadow-md animate-bounce">
                <Crown size={32} className="text-amber-500 fill-amber-500" />
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight text-center">
                QUÁN QUÂN CUỘC ĐUA VỊT!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center mb-6 font-medium">
                Chúc mừng chú vịt đã xuất sắc bơi nhanh nhất về đích
              </p>

              {/* TOP 3 PODIUM DISPLAY */}
              <div className="flex items-end justify-center gap-2 sm:gap-4 w-full mb-6">
                {/* 2nd Place */}
                {rankings[1] && (
                  <div className="flex-1 flex flex-col items-center max-w-[130px]">
                    <div className="mb-1.5 flex items-center justify-center">
                      <DuckRaceIcon size={28} />
                    </div>
                    <div className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/10 text-xs font-bold text-slate-700 dark:text-zinc-300 truncate max-w-full text-center mb-1.5 shadow-2xs">
                      {rankings[1].student}
                    </div>
                    <div className="w-full h-24 bg-gradient-to-t from-slate-200 to-slate-100 dark:from-zinc-800 dark:to-zinc-700 rounded-t-2xl border-t-4 border-slate-400 flex flex-col items-center justify-center shadow-md">
                      <div className="flex items-center gap-1 text-slate-700 dark:text-zinc-200">
                        <Trophy size={16} className="fill-slate-300 stroke-slate-500" />
                        <span className="text-lg font-black">2</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400">{rankings[1].time.toFixed(1)}s</span>
                    </div>
                  </div>
                )}

                {/* 1st Place (Gold Stand) */}
                {rankings[0] && (
                  <div className="flex-1 flex flex-col items-center max-w-[160px] z-10">
                    <div className="mb-1.5 flex items-center justify-center filter drop-shadow">
                      <DuckRaceIcon size={42} />
                    </div>
                    <div className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs sm:text-sm truncate max-w-full shadow-md mb-2">
                      {rankings[0].student}
                    </div>
                    <div className="w-full h-32 bg-gradient-to-t from-amber-300 via-amber-200 to-amber-100 dark:from-amber-600/30 dark:to-amber-500/50 rounded-t-2xl border-t-4 border-amber-400 flex flex-col items-center justify-center shadow-xl">
                      <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                        <Crown size={22} className="fill-amber-400 stroke-amber-600" />
                        <span className="text-2xl font-black">1</span>
                      </div>
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-200">{rankings[0].time.toFixed(1)}s</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {rankings[2] && (
                  <div className="flex-1 flex flex-col items-center max-w-[130px]">
                    <div className="mb-1.5 flex items-center justify-center">
                      <DuckRaceIcon size={28} />
                    </div>
                    <div className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/10 text-xs font-bold text-slate-700 dark:text-zinc-300 truncate max-w-full text-center mb-1.5 shadow-2xs">
                      {rankings[2].student}
                    </div>
                    <div className="w-full h-20 bg-gradient-to-t from-amber-100 to-amber-50 dark:from-amber-950/40 dark:to-amber-900/40 rounded-t-2xl border-t-4 border-amber-600 flex flex-col items-center justify-center shadow-md">
                      <div className="flex items-center gap-1 text-amber-700 dark:text-amber-500">
                        <Trophy size={16} className="fill-amber-600/40 stroke-amber-700" />
                        <span className="text-lg font-black">3</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400">{rankings[2].time.toFixed(1)}s</span>
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
                    if (rankings[0]) {
                      handleRemoveWinnerAndContinue(rankings[0].student);
                    }
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

        {/* ======================================================== */}
        {/* ROSTER EDITOR MODAL (THEME SYNCHRONIZED, EXCEL & NUMBERS) */}
        {/* ======================================================== */}
        <RosterConfigModal
          isOpen={isRosterOpen}
          onClose={() => setIsRosterOpen(false)}
          students={students}
          onSave={handleSaveRoster}
          title="Danh sách tham gia Đua Vịt"
        />
      </div>
    );
  }
);

DuckRaceGame.displayName = 'DuckRaceGame';
