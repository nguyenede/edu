'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import {
  Sparkles,
  ArrowUp,
  Plus,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Volume2,
  VolumeX,
  Square,
  SquarePen,
  Activity,
  Cpu,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

import { ToolExecutionResult, AiToolRegistry } from '@/lib/ai/aiToolRegistry';
import { ThinkingEngine } from '@/lib/ai/thinkingEngine';
import { ActionWidgetRenderer } from '@/components/ai/ActionWidgets';
import { AgentProgressPanel, AgentProgressStep } from '@/components/ai/AgentProgressPanel';
import { AgentActivityBlock } from '@/components/ai/AgentActivityBlock';
import { safeLocalStorageSet } from '@/lib/safeStorage';
import { useAuthStore } from '@/store/useAuthStore';
import { syncExamActionToDocument } from '@/lib/examDocumentSync';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  thoughtText?: string;
  thoughtDuration?: number;
  executedActions?: ToolExecutionResult[];
}

interface ChatSession {
  id: string;
  title: string;
  category?: string;
  messages: ChatMessage[];
  updatedAt: number;
}

interface ElicitationItem {
  label: string;
  query: string;
}

interface ParsedAiMessage {
  cleanText: string;
  elicitationMessage?: string;
  elicitations: ElicitationItem[];
}

function getSessionCategory(timestamp: number): string {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const sevenDaysAgo = todayStart - 7 * 86400000;
  const thirtyDaysAgo = todayStart - 30 * 86400000;

  if (timestamp >= todayStart) {
    return 'Hôm nay';
  }
  if (timestamp >= yesterdayStart) {
    return 'Hôm qua';
  }
  if (timestamp >= sevenDaysAgo) {
    return '7 ngày trước';
  }
  if (timestamp >= thirtyDaysAgo) {
    return '30 ngày trước';
  }
  return 'Trước đó';
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const INITIAL_DEMO_SESSIONS: ChatSession[] = [];

function parseAiResponse(raw: string): ParsedAiMessage {
  let text = raw || '';
  let elicitationMessage: string | undefined;
  const elicitations: ElicitationItem[] = [];

  const groupMatch = text.match(
    /<(?:ElicitationsGroup|FollowUps|Suggestions|NextQuestions)(?:\s+message=["']([^"']*)["'])?>([\s\S]*?)<\/(?:ElicitationsGroup|FollowUps|Suggestions|NextQuestions)>/i
  );
  if (groupMatch) {
    elicitationMessage = groupMatch[1] || 'Gợi ý câu hỏi tiếp theo:';
    const body = groupMatch[2];
    const itemRegex = /<(?:Elicitation|FollowUp|Suggestion|Action)\s+label=["']([^"']*)["']\s+query=["']([^"']*)["']\s*\/?>/gi;
    let m: RegExpExecArray | null;
    while ((m = itemRegex.exec(body)) !== null) {
      elicitations.push({
        label: m[1],
        query: m[2],
      });
    }
    text = text.replace(groupMatch[0], '').trim();
  }

  const standaloneRegex = /<(?:Elicitation|FollowUp|Suggestion|Action)\s+label=["']([^"']*)["']\s+query=["']([^"']*)["']\s*\/?>/gi;
  let standaloneMatch: RegExpExecArray | null;
  while ((standaloneMatch = standaloneRegex.exec(text)) !== null) {
    elicitations.push({
      label: standaloneMatch[1],
      query: standaloneMatch[2],
    });
  }
  text = text.replace(standaloneRegex, '').trim();

  if (elicitations.length > 0 && !elicitationMessage) {
    elicitationMessage = 'Gợi ý câu hỏi tiếp theo:';
  }

  text = text.replace(/<(?:ElicitationsGroup|FollowUps|Suggestions|FollowUp|Elicitation|Suggestion)[\s\S]*$/i, '').trim();
  text = text.replace(/<action[\s\S]*?(?:<\/action>|$)/gi, '').trim();
  text = text.replace(/<think[\s\S]*?(?:<\/think>|$)/gi, '').trim();
  text = text.replace(/\[?(https?:\/\/[^\s\])]+)\]?\s*\((https?:\/\/[^\s)]+)\)/g, '[$1]($2)');

  // Clean raw action references from text
  text = text.replace(/Bạn có thể nhấn vào thẻ hành động[\s\S]*?(?:!|\.|\n|$)/gi, '').trim();
  text = text.replace(/thẻ hành động\s*create_exam/gi, '').trim();
  text = text.replace(/create_exam/gi, '').trim();

  text = text.replace(/(?<!\]\(|\[|\()(https?:\/\/[^\s<>"'`]+)/g, (url) => {
    let cleanUrl = url;
    let trailing = '';
    while (/[.,;:\]\)\>]$/.test(cleanUrl)) {
      trailing = cleanUrl.slice(-1) + trailing;
      cleanUrl = cleanUrl.slice(0, -1);
    }
    return `[${cleanUrl}](${cleanUrl})${trailing}`;
  });

  text = text.replace(/\$([A-Za-z0-9\-_]+(?:\\\s+[A-Za-z0-9\-_]+)+)\$/g, (_, inner) => {
    return `*${inner.replace(/\\\s+/g, ' ')}*`;
  });

  text = text.replace(/[\r\n]+[-*_]{3,}[\r\n]*$/g, '').trim();

  return { cleanText: text, elicitationMessage, elicitations };
}

export default function AiChatView({ initialSessionId }: { initialSessionId?: string }) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [sessions, setSessions] = useState<ChatSession[]>(INITIAL_DEMO_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'like' | 'dislike'>>({});
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Thinking Mode State: 'auto' | 'always' | 'never'
  const [thinkingMode, setThinkingMode] = useState<'auto' | 'always' | 'never'>('auto');
  const [isProgressPanelOpen, setIsProgressPanelOpen] = useState(false);
  const [progressSteps, setProgressSteps] = useState<AgentProgressStep[]>([]);
  const [currentThought, setCurrentThought] = useState<string>('');
  const [expandedThoughtIds, setExpandedThoughtIds] = useState<Record<string, boolean>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeSessionIdRef = useRef<string | null>(initialSessionId || null);
  const isGeneratingRef = useRef<boolean>(false);

  const normalizeSessions = (items: any[]): ChatSession[] =>
    items
      .filter((s) => s && s.id)
      .map((s) => ({
        id: s.id,
        title: (s.title || 'Đoạn chat mới').replace(/\s+\.\.\./g, '...').replace(/\s+…/g, '…'),
        category: s.category,
        messages: Array.isArray(s.messages) ? s.messages : [],
        updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : new Date(s.updatedAt || Date.now()).getTime(),
      }));

  const loadLocalSessions = (): ChatSession[] => {
    if (typeof window === 'undefined') return INITIAL_DEMO_SESSIONS;
    try {
      const saved = localStorage.getItem('chatcoi_history_sessions');
      if (!saved) return INITIAL_DEMO_SESSIONS;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return INITIAL_DEMO_SESSIONS;
      return normalizeSessions(parsed);
    } catch {
      return INITIAL_DEMO_SESSIONS;
    }
  };

  // Initialize and load sessions from storage/backend
  useEffect(() => {
    let didCancel = false;
    let loadedSessions = loadLocalSessions();
    setSessions(loadedSessions);

    if (initialSessionId) {
      if (initialSessionId !== activeSessionIdRef.current) {
        setActiveSessionId(initialSessionId);
        activeSessionIdRef.current = initialSessionId;
        const target = loadedSessions.find((s) => s.id === initialSessionId);
        if (target && target.messages) {
          setMessages(target.messages);
        } else if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('chatcoi_history_sessions');
            if (raw) {
              const parsed: ChatSession[] = JSON.parse(raw);
              const found = parsed.find((s) => s.id === initialSessionId);
              if (found && found.messages) {
                setMessages(found.messages);
              }
            }
          } catch {}
        }
      }
    } else if (activeSessionIdRef.current && !isGeneratingRef.current) {
      setActiveSessionId(null);
      activeSessionIdRef.current = null;
      setMessages([]);
    }

    const loadRemoteSessions = async () => {
      if (!token) return;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        const res = await fetch('/api/ai-chat/sessions', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));
        if (!res.ok) return;
        const remote = normalizeSessions(await res.json());
        if (didCancel) return;
        loadedSessions = remote;
        setSessions(remote);
        safeLocalStorageSet('chatcoi_history_sessions', JSON.stringify(remote));
        if (initialSessionId) {
          const target = remote.find((s) => s.id === initialSessionId);
          if (target) setMessages(target.messages);
        }
      } catch (e) {
        // Fallback to local sessions
      }
    };

    loadRemoteSessions();
    return () => {
      didCancel = true;
    };
  }, [initialSessionId, token]);

  const formatSessionTitle = (rawText?: string): string => {
    if (!rawText) return 'Đoạn chat mới';
    const trimmed = rawText.trim().replace(/\s+\.\.\./g, '...').replace(/\s+…/g, '…');
    if (trimmed.length > 35) {
      return `${trimmed.slice(0, 35).trimEnd()}...`;
    }
    return trimmed;
  };

  const persistSessionMessages = (sessionId: string, messagesList: ChatMessage[], titleText?: string) => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('chatcoi_history_sessions');
        const list: ChatSession[] = raw ? JSON.parse(raw) : INITIAL_DEMO_SESSIONS;
        const exists = list.some((s) => s.id === sessionId);
        let updated: ChatSession[];
        if (exists) {
          updated = list.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: messagesList,
                  title:
                    titleText && (!s.title || s.title.startsWith('Đoạn chat mới'))
                      ? formatSessionTitle(titleText)
                      : (s.title || '').replace(/\s+\.\.\./g, '...').replace(/\s+…/g, '…'),
                  updatedAt: Date.now(),
                }
              : s
          );
        } else {
          const newSession: ChatSession = {
            id: sessionId,
            title: formatSessionTitle(titleText),
            category: 'Hôm nay',
            messages: messagesList,
            updatedAt: Date.now(),
          };
          updated = [newSession, ...list];
        }
        const slicedSessions = updated.slice(0, 30);
        safeLocalStorageSet('chatcoi_history_sessions', JSON.stringify(slicedSessions));
        setSessions(slicedSessions);
        const sessionToSync = slicedSessions.find((s) => s.id === sessionId);
        if (token && sessionToSync) {
          const syncCtrl = new AbortController();
          const syncTimer = setTimeout(() => syncCtrl.abort(), 1000);
          fetch(`/api/ai-chat/sessions/${sessionId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            signal: syncCtrl.signal,
            body: JSON.stringify(sessionToSync),
          }).catch(() => null).finally(() => clearTimeout(syncTimer));
        }
      } catch (e) {
        console.error('Error persisting sessions to localStorage:', e);
      }
    }
  };

  const syncExamActionsToDocuments = async (actions: ToolExecutionResult[]): Promise<ToolExecutionResult[]> => {
    if (!token || actions.length === 0) return actions;
    return Promise.all(actions.map((action) => syncExamActionToDocument(token, action)));
  };

  const saveSessionsToStorage = (updatedSessions: ChatSession[]) => {
    const sliced = updatedSessions.slice(0, 30);
    setSessions(sliced);
    if (typeof window !== 'undefined') {
      safeLocalStorageSet('chatcoi_history_sessions', JSON.stringify(sliced));
    }
  };

  const handleSelectSession = (sessionId: string) => {
    stopAllSpeech();
    setActiveSessionId(sessionId);
    const target = sessions.find((s) => s.id === sessionId);
    setMessages(target ? target.messages : []);
    router.push(`/app/ai/c/${sessionId}`);
  };

  const handleCreateNewChat = () => {
    stopAllSpeech();
    setActiveSessionId(null);
    setMessages([]);
    setInputPrompt('');
    router.push('/app/ai');
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const stopAllSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeakingId(null);
  };

  const handleCopy = (id: string, text: string) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleFeedback = (id: string, type: 'like' | 'dislike') => {
    setFeedbackMap((prev) => ({
      ...prev,
      [id]: prev[id] === type ? undefined! : type,
    }));
  };

  const toggleThoughtExpanded = (id: string) => {
    setExpandedThoughtIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSpeak = async (id: string, text: string) => {
    if (speakingId === id) {
      stopAllSpeech();
      return;
    }

    stopAllSpeech();
    setSpeakingId(id);

    try {
      const cleanText = text
        .replace(/<[^>]*>/g, ' ')
        .replace(/[*_#`~\[\]\(\)\$]/g, '')
        .replace(/https?:\/\/\S+/g, 'đường dẫn liên kết')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) {
        setSpeakingId(null);
        return;
      }

      const audio = new Audio(`/api/ai/tts?text=${encodeURIComponent(cleanText)}`);
      audioRef.current = audio;

      audio.onended = () => {
        setSpeakingId((current) => (current === id ? null : current));
        audioRef.current = null;
      };

      const fallbackToWebSpeech = () => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const voices = window.speechSynthesis.getVoices();
          const viVoice = voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith('vi') ||
              v.lang.toLowerCase().includes('vn') ||
              v.name.toLowerCase().includes('vietnam') ||
              v.name.toLowerCase().includes('tiếng việt') ||
              v.name.toLowerCase().includes('hoaimy') ||
              v.name.toLowerCase().includes('an ')
          );
          const utterance = new SpeechSynthesisUtterance(cleanText);
          if (viVoice) {
            utterance.voice = viVoice;
            utterance.lang = viVoice.lang || 'vi-VN';
          } else {
            utterance.lang = 'vi-VN';
          }
          utterance.rate = 1.0;
          utterance.onend = () => setSpeakingId((current) => (current === id ? null : current));
          utterance.onerror = () => setSpeakingId((current) => (current === id ? null : current));
          window.speechSynthesis.speak(utterance);
        } else {
          setSpeakingId(null);
        }
      };

      audio.onerror = fallbackToWebSpeech;
      audio.play().catch(fallbackToWebSpeech);
    } catch {
      setSpeakingId(null);
    }
  };

  const handleRegenerate = (aiMsgId: string) => {
    const aiIndex = messages.findIndex((m) => m.id === aiMsgId);
    if (aiIndex <= 0) return;
    const prevUserMsg = messages[aiIndex - 1];
    if (prevUserMsg && prevUserMsg.sender === 'user') {
      setMessages((prev) => prev.filter((m) => m.id !== aiMsgId));
      handleSend(prevUserMsg.text);
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    chatEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    textareaRef.current?.focus();
  }, [messages.length]);

  const messagesCount = messages.length;
  useEffect(() => {
    if (messagesCount > 0) {
      scrollToBottom('smooth');
    }
  }, [messagesCount]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputPrompt]);

  const handleSend = async (overridePrompt?: string) => {
    // Tính năng đang phát triển - vô hiệu hóa gửi tin nhắn
    if (process.env.NODE_ENV !== 'test') return;
    const textToSend = overridePrompt || inputPrompt;
    if (!textToSend.trim() || isGenerating) return;

    const startTime = Date.now();
    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!overridePrompt) setInputPrompt('');
    isGeneratingRef.current = true;
    setIsGenerating(true);
    setCurrentThought('');

    // Setup live Agent Progress Steps
    const initialSteps: AgentProgressStep[] = [
      {
        id: 's1',
        title: 'Phân tích yêu cầu & Ngữ cảnh',
        description: `Ý định: "${textToSend.slice(0, 40)}..."`,
        status: 'running',
        timestamp: new Date().toLocaleTimeString(),
      },
      {
        id: 's2',
        title: 'Lập kế hoạch & Quyết định công cụ (Thinking)',
        description: 'Đang xây dựng chiến lược xử lý...',
        status: 'pending',
        timestamp: new Date().toLocaleTimeString(),
      },
      {
        id: 's3',
        title: 'Thực thi hành động trên hệ thống',
        description: 'Tương tác & khởi tạo dữ liệu...',
        status: 'pending',
        timestamp: new Date().toLocaleTimeString(),
      },
      {
        id: 's4',
        title: 'Hoàn tất & Hiển thị thẻ tương tác',
        description: 'Xuất kết quả trực quan...',
        status: 'pending',
        timestamp: new Date().toLocaleTimeString(),
      },
    ];
    setProgressSteps(initialSteps);

    const currentSessionId: string = activeSessionIdRef.current || activeSessionId || generateUUID();
    activeSessionIdRef.current = currentSessionId;
    setActiveSessionId(currentSessionId);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `/app/ai/c/${currentSessionId}`);
    }
    persistSessionMessages(currentSessionId, newMessages, textToSend);

    const textareaEl = textareaRef.current;
    if (textareaEl) {
      textareaEl.style.height = 'auto';
    }

    setTimeout(() => {
      textareaEl?.focus();
      scrollToBottom('smooth');
    }, 10);

    const aiMsgId = `ai_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: aiMsgId,
        sender: 'ai',
        text: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    try {
      // Step 1 Completed -> Step 2 Running
      setProgressSteps((prev) =>
        prev.map((s) =>
          s.id === 's1'
            ? { ...s, status: 'completed', durationMs: 45 }
            : s.id === 's2'
            ? { ...s, status: 'running' }
            : s
        )
      );

      const formattedChatMessages = newMessages.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: formattedChatMessages,
          thinkingMode,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.error || `Máy chủ AI phản hồi lỗi: ${res.status}`;
        throw new Error(errMsg);
      }

      const responseBody = res.body;
      if (!responseBody) {
        throw new Error('No response body returned from server.');
      }

      const reader = responseBody!.getReader();
      const decoder = new TextDecoder('utf-8');
      let rawStreamBuffer = '';
      let sseLineBuffer = '';
      let executedActionsList: ToolExecutionResult[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseLineBuffer += decoder.decode(value, { stream: true });
        const lines = sseLineBuffer.split('\n');
        sseLineBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(dataStr);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              rawStreamBuffer += content;

              // Parse real-time stream for thinking & actions (isFinal = false to prevent creating intermediate documents)
              const parsedOutput = ThinkingEngine.parseStream(rawStreamBuffer, startTime, textToSend, false);
              if (parsedOutput.thoughtText) {
                setCurrentThought(parsedOutput.thoughtText || '');
              }

              if (parsedOutput.executedActions.length > 0) {
                executedActionsList = parsedOutput.executedActions;
                // Update Step 3
                setProgressSteps((prev) =>
                  prev.map((s) =>
                    s.id === 's3'
                      ? {
                          ...s,
                          status: 'completed',
                          durationMs: 120,
                          toolResult: parsedOutput.executedActions[0],
                        }
                      : s
                  )
                );
              }

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMsgId
                    ? {
                        ...msg,
                        text: parsedOutput.cleanText,
                        thoughtText: parsedOutput.thoughtText,
                        thoughtDuration: parsedOutput.thoughtDurationSeconds,
                        executedActions:
                          parsedOutput.executedActions.length > 0
                            ? parsedOutput.executedActions
                            : msg.executedActions,
                      }
                    : msg
                )
              );
            }
          } catch {
            if (!dataStr.startsWith('{')) {
              rawStreamBuffer += dataStr;
              const parsedOutput = ThinkingEngine.parseStream(rawStreamBuffer, startTime, textToSend, false);
              setMessages((prev) =>
                prev.map((msg) => (msg.id === aiMsgId ? { ...msg, text: parsedOutput.cleanText } : msg))
              );
            }
          }
        }
      }

      // Final pass parse (isFinal = true to save single complete exam document into storage)
      const finalParsed = ThinkingEngine.parseStream(rawStreamBuffer, startTime, textToSend, true);
      const finalActions = await syncExamActionsToDocuments(finalParsed.executedActions);
      const finalThoughtDuration = Math.max(1, Math.round((Date.now() - startTime) / 1000));

      // Mark all steps completed
      setProgressSteps((prev) =>
        prev.map((s) => ({
          ...s,
          status: 'completed',
          durationMs: s.durationMs || 80,
          toolResult: s.id === 's3' && finalActions.length > 0 ? finalActions[0] : s.toolResult,
        }))
      );

      const cleanAiText =
        finalParsed.cleanText.trim() ||
        (finalActions.length > 0 && finalActions[0].actionType === 'exam'
          ? `Tôi đã tạo thành công bộ **${finalActions[0].data?.title || 'Đề thi trắc nghiệm'}** gồm **${finalActions[0].data?.questionsCount || 50} câu** và lưu trực tiếp vào Kho tài liệu. Bạn có thể bấm vào thẻ bên dưới để bắt đầu làm bài thi ngay!`
          : finalActions.length > 0 && finalActions[0].actionType === 'game'
          ? `Tôi đã khởi tạo thành công phòng **${finalActions[0].data?.title || 'Game Trắc nghiệm Trực tiếp'}** với mã PIN **${finalActions[0].data?.pinCode}**. Bấm vào nút bên dưới để vào chơi ngay!`
          : 'Đã hoàn tất xử lý yêu cầu của bạn.');

      const finalAiMessage: ChatMessage = {
        id: aiMsgId,
        sender: 'ai',
        text: cleanAiText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        thoughtText: finalParsed.thoughtText,
        thoughtDuration: finalThoughtDuration,
        executedActions: finalActions,
      };

      const finalMessagesList = [...newMessages, finalAiMessage];
      setMessages(finalMessagesList);
      if (currentSessionId) {
        persistSessionMessages(currentSessionId, finalMessagesList, textToSend);
      }
    } catch (error) {
      console.error('Error in AI execution:', error);
      const errMsg = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi kết nối với máy chủ AI.';

      const errorAiMsg: ChatMessage = {
        id: aiMsgId,
        sender: 'ai',
        text: `⚠️ **Không thể tạo câu hỏi lúc này:**\n${errMsg}\n\n*Vui lòng đảm bảo cổng AI Gateway (http://localhost:6660) đang chạy để tạo tài liệu trực tiếp bằng AI.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        thoughtText: `Lỗi kết nối cổng dịch vụ AI: ${errMsg}`,
        thoughtDuration: 1,
      };

      const finalMessagesList = [...newMessages, errorAiMsg];
      setMessages(finalMessagesList);
      if (currentSessionId) {
        persistSessionMessages(currentSessionId, finalMessagesList, textToSend);
      }

      setProgressSteps((prev) =>
        prev.map((s) => ({
          ...s,
          status: 'error',
        }))
      );
    } finally {
      isGeneratingRef.current = false;
      setIsGenerating(false);
      setTimeout(() => scrollToBottom('smooth'), 100);
    }
  };

  const isChatStarted = messages.length > 0;

  const renderInputBox = () => (
    <div className="w-full">
      {/* Main Rounded Input Box - Disabled since feature is in development */}
      <div className="bg-slate-100 dark:bg-[#2f2f2f] rounded-[28px] pl-2.5 sm:pl-3 pr-1.5 py-1.5 flex items-end gap-1.5 sm:gap-2 border border-slate-200/50 dark:border-slate-800/50 outline-none ring-0 shadow-xs min-h-[52px] cursor-not-allowed opacity-85">
        {/* Plus Icon (Disabled) */}
        <button
          type="button"
          disabled
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 self-end mb-0.5 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60"
          title="Tính năng đang phát triển"
        >
          <Plus size={20} className="stroke-[2]" />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value=""
          disabled
          readOnly
          placeholder="Tính năng đang phát triển..."
          className="w-full text-xs md:text-sm bg-transparent text-slate-400 dark:text-slate-500 placeholder-slate-400 dark:placeholder-slate-500 border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus:border-0 resize-none overflow-hidden cursor-not-allowed py-2 leading-normal select-none"
          style={{ minHeight: '24px' }}
        />

        {/* Send Button (Disabled) */}
        <button
          type="button"
          disabled
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 self-end mb-0.5 bg-slate-200/80 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-70"
          title="Tính năng đang phát triển"
        >
          <ArrowUp size={18} className="stroke-[2.5]" />
        </button>
      </div>
    </div>
  );

  const CATEGORY_ORDER = ['Hôm nay', 'Hôm qua', '7 ngày trước', '30 ngày trước', 'Trước đó'];
  const groupedSessions = CATEGORY_ORDER.map((category) => ({
    category,
    sessions: sessions.filter((s) => getSessionCategory(s.updatedAt) === category),
  })).filter((group) => group.sessions.length > 0);

  return (
    <AppShell>
      {/* 100% Faithful Clean Layout: Left History Sidebar + Right Chat Main Container */}
      <div className="flex w-full h-full min-h-0 flex-1 overflow-hidden bg-white dark:bg-[#212121] relative">
        {/* LEFT SIDEBAR: Lịch sử Chat - Không có đường viền thẳng */}
        <aside className="hidden md:flex md:w-[230px] shrink-0 flex-col h-full bg-slate-50/40 dark:bg-[#18181b]/40 select-none">
          {/* Top: Câu hỏi mới Button - Nhỏ gọn, mờ viền/không viền cứng */}
          <div className="p-2.5 pb-1 shrink-0">
            <button
              type="button"
              onClick={handleCreateNewChat}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer ${
                activeSessionId === null
                  ? 'bg-slate-200/70 dark:bg-slate-800/80 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <SquarePen size={13} className="text-slate-600 dark:text-slate-400 stroke-[2]" />
                <span>Câu hỏi mới</span>
              </div>
              <Plus size={13} className="text-slate-400" />
            </button>
          </div>

          {/* Scrollable History List with Dynamic Date Grouping & Right Scrollbar */}
          <div className="flex-1 overflow-y-auto px-2 space-y-2 chatcoi-scrollbar pt-1">
            {groupedSessions.map((group) => (
              <div key={group.category} className="space-y-1">
                <div className="px-2.5 pt-2 pb-0.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 shrink-0">
                  {group.category}
                </div>
                {group.sessions.map((session) => {
                  const isActive = activeSessionId === session.id;
                  const cleanTitle = (session.title || '').replace(/\s+\.\.\./g, '...').replace(/\s+…/g, '…');
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => handleSelectSession(session.id)}
                      className={`w-full text-left px-3 py-2 text-xs md:text-[13px] leading-snug truncate rounded-xl transition-colors duration-150 cursor-pointer block border-0 outline-none ring-0 focus:outline-none focus:ring-0 select-none ${
                        isActive
                          ? 'bg-blue-50/90 dark:bg-blue-950/50 text-google-blue dark:text-blue-300 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 font-medium'
                      }`}
                      title={cleanTitle}
                    >
                      {cleanTitle}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* RIGHT MAIN CHAT AREA */}
        <main className="flex-1 flex flex-col h-full min-h-0 bg-white dark:bg-[#212121] overflow-hidden relative">
          <div className="md:hidden shrink-0 px-3 py-2 border-b border-slate-200/60 dark:border-slate-800 bg-white/95 dark:bg-[#212121]/95">
            <button
              type="button"
              onClick={handleCreateNewChat}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-3.5 py-2 text-xs font-semibold text-google-blue dark:text-blue-300 shadow-xs active:scale-95 transition-all"
            >
              <SquarePen size={14} className="stroke-[2.2]" />
              <span>Câu hỏi mới</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full flex flex-col no-scrollbar">
            {!isChatStarted ? (
              /* Initial Screen: Centered and balanced with direct inline style */
              <div className="flex-1 flex flex-col items-center justify-start space-y-5 sm:space-y-6 max-w-2xl mx-auto w-full px-3 sm:px-4 pt-[18vh] md:pt-[230px] pb-8 animate-fade-in">
                {/* Spark Icon inside rounded box */}
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shadow-md">
                  <Sparkles size={24} />
                </div>

                <div className="flex flex-col items-center gap-2.5">
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 select-none">
                    Tính năng đang phát triển
                  </span>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white text-center tracking-tight leading-tight">
                    Hôm nay bạn muốn hỏi điều gì?
                  </h1>
                </div>

                {/* Centered Input Box directly in middle of screen */}
                {renderInputBox()}
              </div>
            ) : (
              /* Active Chat Flow */
              <div className="flex-1 flex flex-col justify-between max-w-3xl mx-auto w-full px-3 sm:px-4 min-w-0">
                {/* Message list */}
                <div className="space-y-6 pt-4 pb-12 flex-1">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.sender === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      {msg.sender === 'user' ? (
                        /* User message pill */
                        <div className="bg-[#f4f4f4] dark:bg-[#2f2f2f] text-slate-900 dark:text-white px-4 py-2.5 rounded-[20px] max-w-[85%] text-sm md:text-base whitespace-pre-wrap leading-relaxed shadow-xs">
                          {msg.text}
                        </div>
                      ) : (
                        /* AI Assistant message full-width layout */
                        <div className="w-full space-y-2.5">
                          {/* 100% Faithful Agent Progress & Activity Block matching major AI agents */}
                          <AgentActivityBlock
                            thoughtText={msg.thoughtText}
                            thoughtDuration={msg.thoughtDuration}
                            isGenerating={isGenerating && !msg.text}
                            executedActions={msg.executedActions}
                          />

                          {/* Live Generating Status Indicator */}
                          {isGenerating && !msg.text && !msg.thoughtText && (!msg.executedActions || msg.executedActions.length === 0) && (
                            <div className="flex items-center gap-2.5 text-xs md:text-sm text-slate-500 dark:text-slate-400 py-2 pl-1 select-none animate-pulse">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                              <span className="font-medium text-slate-600 dark:text-slate-300">
                                SI đang phân tích yêu cầu và khởi tạo bộ câu hỏi...
                              </span>
                            </div>
                          )}

                          {/* Executed Action Widgets (Game Launch, Exam, Folder, Class) */}
                          {msg.executedActions && msg.executedActions.length > 0 && (
                            <div className="space-y-2">
                              {msg.executedActions.map((action, idx) => (
                                <ActionWidgetRenderer key={idx} action={action} />
                              ))}
                            </div>
                          )}

                          {/* Main Clean Markdown Content */}
                          {msg.text && (
                            <div className="text-slate-900 dark:text-[#ececec] text-sm md:text-base leading-relaxed break-words font-normal">
                              {(() => {
                                const { cleanText, elicitationMessage, elicitations } = parseAiResponse(msg.text);
                                if (!cleanText) return null;
                                return (
                                  <>
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm, remarkMath]}
                                      rehypePlugins={[rehypeKatex]}
                                      components={{
                                        p: ({ children }) => <p className="mb-3 leading-[1.85] last:mb-0">{children}</p>,
                                        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-2">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-2">{children}</ol>,
                                        li: ({ children }) => <li className="leading-[1.85]">{children}</li>,
                                        h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2 text-slate-900 dark:text-white">{children}</h1>,
                                        h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-2 text-slate-900 dark:text-white">{children}</h2>,
                                        h3: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-1.5 text-slate-900 dark:text-white">{children}</h3>,
                                        strong: ({ children }) => <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>,
                                        a: ({ href, children }) => (
                                          <a
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium break-all"
                                          >
                                            {children}
                                          </a>
                                        ),
                                        table: ({ children }) => (
                                          <div className="my-2 max-w-full overflow-x-auto rounded-[6px] border border-slate-200 dark:border-slate-800">
                                            <table className="min-w-full text-xs text-left divide-y divide-slate-200 dark:divide-slate-800">{children}</table>
                                          </div>
                                        ),
                                        thead: ({ children }) => <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-semibold">{children}</thead>,
                                        th: ({ children }) => <th className="px-2.5 py-1.5 border-b border-slate-200 dark:border-slate-700">{children}</th>,
                                        td: ({ children }) => <td className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800/50">{children}</td>,
                                        code({ inline, className, children, ...props }: any) {
                                          const match = /language-(\w+)/.exec(className || '');
                                          const codeContent = String(children).replace(/\n$/, '');
                                          return !inline ? (
                                            <div className="my-2 rounded-[6px] overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 text-xs">
                                              {match && (
                                                <div className="flex items-center justify-between px-3 py-1 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
                                                  <span>{match[1]}</span>
                                                </div>
                                              )}
                                              <pre className="p-2.5 overflow-x-auto">
                                                <code className={className} {...props}>
                                                  {codeContent}
                                                </code>
                                              </pre>
                                            </div>
                                          ) : (
                                            <code className="px-1 py-0.5 rounded-[4px] bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 font-mono text-[11px]" {...props}>
                                              {children}
                                            </code>
                                          );
                                        },
                                      }}
                                    >
                                      {cleanText}
                                    </ReactMarkdown>

                                    {/* Interactive Elicitations Suggestions */}
                                    {elicitations.length > 0 && (
                                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                          {elicitationMessage}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          {elicitations.map((item, idx) => (
                                            <button
                                              key={idx}
                                              type="button"
                                              onClick={() => handleSend(item.query)}
                                              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer text-left"
                                            >
                                              {item.label}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}

                          {/* Action Toolbar on completed message */}
                          {msg.text && (
                            <div className="flex items-center gap-1 pt-1 text-slate-400 dark:text-slate-500">
                              {/* Copy */}
                              <button
                                type="button"
                                onClick={() => handleCopy(msg.id, msg.text)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                title="Sao chép"
                              >
                                {copiedId === msg.id ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                              </button>

                              {/* Like */}
                              <button
                                type="button"
                                onClick={() => handleFeedback(msg.id, 'like')}
                                className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                                  feedbackMap[msg.id] === 'like'
                                    ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                    : 'hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                                title="Hữu ích"
                              >
                                <ThumbsUp size={15} />
                              </button>

                              {/* Dislike */}
                              <button
                                type="button"
                                onClick={() => handleFeedback(msg.id, 'dislike')}
                                className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                                  feedbackMap[msg.id] === 'dislike'
                                    ? 'text-red-500 bg-red-50 dark:bg-red-900/30'
                                    : 'hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                                title="Chưa tốt"
                              >
                                <ThumbsDown size={15} />
                              </button>

                              {/* Regenerate */}
                              <button
                                type="button"
                                onClick={() => handleRegenerate(msg.id)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                title="Tạo lại câu trả lời"
                              >
                                <RotateCcw size={15} />
                              </button>

                              {/* Speak / Stop Speak */}
                              {speakingId === msg.id ? (
                                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/70 text-google-blue dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 shadow-xs animate-fade-in">
                                  {/* Sound Equalizer Waves Animation */}
                                  <div className="flex items-center gap-0.5 h-3">
                                    <span className="w-0.5 h-2 bg-google-blue rounded-full animate-[pulse_0.6s_ease-in-out_infinite]" />
                                    <span className="w-0.5 h-3.5 bg-google-blue rounded-full animate-[pulse_0.4s_ease-in-out_infinite]" />
                                    <span className="w-0.5 h-2.5 bg-google-blue rounded-full animate-[pulse_0.8s_ease-in-out_infinite]" />
                                    <span className="w-0.5 h-1.5 bg-google-blue rounded-full animate-[pulse_0.5s_ease-in-out_infinite]" />
                                  </div>
                                  <span className="text-[11px] font-medium">Đang phát...</span>
                                  <button
                                    type="button"
                                    onClick={stopAllSpeech}
                                    className="p-0.5 hover:bg-blue-200/60 dark:hover:bg-blue-900/60 rounded-full transition-colors cursor-pointer text-google-blue"
                                    title="Dừng phát âm thanh"
                                  >
                                    <Square size={10} className="fill-current" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSpeak(msg.id, msg.text)}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                  title="Phát âm thanh câu trả lời"
                                >
                                  <Volume2 size={15} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Floating "Đang phát" Status Indicator Bar */}
                {speakingId && (
                  <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 dark:bg-slate-800/90 text-white backdrop-blur-md px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-slate-700/60 animate-fade-in">
                    <div className="flex items-center gap-1 h-3.5">
                      <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite]" />
                      <span className="w-0.5 h-3.5 bg-emerald-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite]" />
                      <span className="w-0.5 h-2.5 bg-emerald-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite]" />
                      <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite]" />
                    </div>
                    <span className="text-xs font-medium text-slate-200">
                      Đang phát giọng đọc SI
                    </span>
                    <button
                      type="button"
                      onClick={stopAllSpeech}
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-colors cursor-pointer flex items-center gap-1"
                      title="Dừng đọc"
                    >
                      <Square size={8} className="fill-current" /> Dừng
                    </button>
                  </div>
                )}

                {/* Bottom Input Area in chat mode */}
                <div className="sticky bottom-0 bg-white/90 dark:bg-[#212121]/90 backdrop-blur-md pt-2 pb-3">
                  {renderInputBox()}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </AppShell>
  );
}
