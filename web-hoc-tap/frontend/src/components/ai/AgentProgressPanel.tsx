'use client';

import React from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  Sparkles,
  Wrench,
  X,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { ToolExecutionResult } from '@/lib/ai/aiToolRegistry';

export interface AgentProgressStep {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  timestamp: string;
  durationMs?: number;
  toolResult?: ToolExecutionResult;
}

interface AgentProgressPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isGenerating: boolean;
  steps: AgentProgressStep[];
  thoughtText?: string;
}

export function AgentProgressPanel({
  isOpen,
  onClose,
  isGenerating,
  steps,
  thoughtText,
}: AgentProgressPanelProps) {
  if (!isOpen) return null;

  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : isGenerating ? 40 : 100;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 md:w-96 bg-white dark:bg-[#1a1a1a] shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-[#202020]/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Activity size={18} className={isGenerating ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Agent Progress Panel</span>
              {isGenerating && (
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              )}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tiến trình hoạt động thời gian thực
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
          <span>Tiến độ thực thi tác vụ</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Body: Live Timeline & Logs */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {/* Realtime Reasoning summary */}
        {thoughtText && (
          <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">
              <Cpu size={14} />
              <span>Lập luận và Quyết định</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-4 leading-relaxed italic">
              &ldquo;{thoughtText}&rdquo;
            </p>
          </div>
        )}

        {/* Steps List */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Các bước thực hiện
          </div>

          {steps.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 space-y-2">
              <Layers size={28} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p>Chưa có tác vụ nào đang chạy.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {steps.map((step, idx) => {
                const isCompleted = step.status === 'completed';
                const isRunning = step.status === 'running';
                const isError = step.status === 'error';

                return (
                  <div key={step.id || idx} className="relative">
                    {/* Node Dot */}
                    <div
                      className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCompleted
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : isRunning
                          ? 'bg-blue-600 text-white animate-pulse'
                          : isError
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={12} />
                      ) : isRunning ? (
                        <Sparkles size={11} className="animate-spin" />
                      ) : isError ? (
                        <AlertCircle size={12} />
                      ) : (
                        idx + 1
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#202020]/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {step.title}
                        </span>
                        {step.durationMs && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            <Clock size={10} />
                            {step.durationMs}ms
                          </span>
                        )}
                      </div>

                      {step.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {step.description}
                        </p>
                      )}

                      {/* Tool execution badge */}
                      {step.toolResult && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          <Wrench size={12} />
                          <span>{step.toolResult.message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#202020]/50 text-center">
        <p className="text-[11px] text-slate-400">
          ChatCoi Web Autonomous Execution Engine
        </p>
      </div>
    </div>
  );
}
