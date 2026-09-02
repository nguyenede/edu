'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, ChevronUp, Gamepad2, FileText, Folder, GraduationCap, Sparkles, Cpu } from 'lucide-react';
import { ToolExecutionResult } from '@/lib/ai/aiToolRegistry';

export interface AgentActivityActionItem {
  actionVerb: string;
  icon?: React.ReactNode;
  targetName: string;
  badge?: string;
  badgeType?: 'success' | 'info' | 'diff';
}

interface AgentActivityBlockProps {
  thoughtText?: string;
  thoughtDuration?: number;
  isGenerating?: boolean;
  executedActions?: ToolExecutionResult[];
}

export function AgentActivityBlock({
  thoughtText,
  thoughtDuration,
  isGenerating,
  executedActions = [],
}: AgentActivityBlockProps) {
  const [isThinkingOpen, setIsThinkingOpen] = useState(true);

  if (!thoughtText && executedActions.length === 0 && !isGenerating) {
    return null;
  }

  // 1. Build Activity Action Items from executedActions
  const actionItems: AgentActivityActionItem[] = [];

  for (const act of executedActions) {
    if (act.actionType === 'game' && act.data) {
      actionItems.push({
        actionVerb: 'Created',
        icon: <Gamepad2 size={14} className="text-violet-500 inline" />,
        targetName: act.data.title || 'Phòng Game Live Quiz',
        badge: `PIN: ${act.data.pinCode}`,
        badgeType: 'success',
      });
    } else if (act.actionType === 'exam' && act.data) {
      actionItems.push({
        actionVerb: 'Created',
        icon: <FileText size={14} className="text-blue-500 inline" />,
        targetName: `${act.data.title}.docx`,
        badge: `+${act.data.questionsCount || 5} câu`,
        badgeType: 'diff',
      });
    } else if (act.actionType === 'folder' && act.data) {
      actionItems.push({
        actionVerb: 'Created',
        icon: <Folder size={14} className="text-amber-500 inline" />,
        targetName: act.data.name,
        badgeType: 'info',
      });
    } else if (act.actionType === 'class' && act.data) {
      actionItems.push({
        actionVerb: 'Created',
        icon: <GraduationCap size={14} className="text-emerald-500 inline" />,
        targetName: act.data.name,
        badge: `Code: ${act.data.code}`,
        badgeType: 'success',
      });
    }
  }

  // Explored summary pill
  const exploredSummary =
    executedActions.length > 0
      ? `Explored ${executedActions.length} ${executedActions.length > 1 ? 'tools' : 'tool'}, ${actionItems.length} ${actionItems.length > 1 ? 'items' : 'item'}`
      : isGenerating
      ? 'Exploring workspace & analyzing context'
      : undefined;

  // Extract thought title and body
  let thoughtTitle = '';
  let thoughtBody = thoughtText || '';

  if (thoughtText) {
    const lines = thoughtText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const firstLine = lines[0].replace(/^#+\s*|\*\*|\*/g, '');
      if (firstLine.length < 55) {
        thoughtTitle = firstLine;
        thoughtBody = lines.slice(1).join('\n\n');
      }
    }
  }

  return (
    <div className="space-y-2 mb-3 text-xs md:text-[13px] select-text">
      {/* 1. Explored Summary Pill (100% like image) */}
      {exploredSummary && (
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] bg-[#f0f0f0] dark:bg-[#2a2a2a] text-slate-700 dark:text-[#ececec] font-normal hover:bg-[#e6e6e6] dark:hover:bg-[#333] transition-colors cursor-pointer select-none">
            <span>{exploredSummary}</span>
            <ChevronRight size={13} className="text-slate-400" />
          </div>
        </div>
      )}

      {/* 2. Action Logs (Edited / Created line items with icon + badge) */}
      {actionItems.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 text-slate-700 dark:text-[#ececec] py-0.5">
          <span className="text-slate-500 dark:text-[#8e8e8e] font-normal">{item.actionVerb}</span>
          <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            {item.icon}
            <span>{item.targetName}</span>
          </span>
          {item.badge && (
            <span
              className={`text-[11px] font-mono font-medium px-1.5 py-0.2 rounded ${
                item.badgeType === 'diff'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40'
              }`}
            >
              {item.badge}
            </span>
          )}
        </div>
      ))}

      {/* 3. Thinking Header & Collapsible Details (100% like image) */}
      {(thoughtText || isGenerating) && (
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setIsThinkingOpen(!isThinkingOpen)}
            className="flex items-center gap-1 text-slate-500 dark:text-[#8e8e8e] hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer select-none font-normal"
          >
            <span>
              Thinking{isGenerating ? '...' : '.'}
            </span>
            {isThinkingOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {/* Expanded Thinking Body */}
          {isThinkingOpen && (
            <div className="mt-2 pl-0.5 max-h-56 overflow-y-auto chatcoi-scrollbar pr-2 space-y-2 text-slate-600 dark:text-slate-300 text-xs md:text-[13px] leading-relaxed">
              {thoughtTitle && (
                <h5 className="font-bold text-slate-900 dark:text-white text-xs md:text-[13px]">
                  {thoughtTitle}
                </h5>
              )}

              <div className="whitespace-pre-wrap font-normal text-slate-600 dark:text-slate-300">
                {renderFormattedThought(thoughtBody || (isGenerating ? 'Đang phân tích cấu trúc yêu cầu và lập kế hoạch thực hiện...' : ''))}
                {isGenerating && (
                  <span className="inline-block w-1.5 h-3.5 ml-1 bg-amber-500 animate-pulse align-middle" />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function renderFormattedThought(text: string) {
  if (!text) return null;

  // Format inline code and references with subtle pink/red code badge like screenshot
  const parts = text.split(/(`[^`]+`)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          const code = part.slice(1, -1);
          return (
            <code
              key={index}
              className="px-1 py-0.5 mx-0.5 rounded-[4px] bg-red-50 dark:bg-red-950/30 text-[#c7254e] dark:text-[#f87171] font-mono text-[11px]"
            >
              {code}
            </code>
          );
        }
        return part;
      })}
    </>
  );
}
