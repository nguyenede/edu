'use client';

import React, { useState, useEffect, useRef, useLayoutEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuthStore } from '@/store/useAuthStore';
import { parseDocxFile, ParsedQuiz } from '@/lib/docParser';
import { parseExamFileStructure, validateDeterministicResult } from '@/lib/examStructureParser';
import { extractFileForAi } from '@/lib/fileExtractor';
import { safeLocalStorageSet } from '@/lib/safeStorage';
import {
  idbSyncAndGetAll,
  idbSaveAllDocuments,
  idbSaveAllFolders,
  idbDeleteDocument,
  idbDeleteFolder,
  idbGetAllDocuments,
  isDocumentTombstoned,
  addDeletedDocTombstone,
  removeDeletedDocTombstone,
  isNameMatch,
} from '@/lib/indexedDbStorage';
import {
  createDocumentFile,
  createDocumentFolder,
  deleteDocumentFile,
  deleteDocumentFolder,
  listDocuments,
  moveDocumentFile,
  moveDocumentFolder,
  renameDocumentFile,
  renameDocumentFolder,
  matchDocId,
} from '@/lib/documentsApi';
import {
  FolderPlus,
  FilePlus,
  Folder,
  FileText,
  ChevronRight,
  Home,
  Trash2,
  CheckCircle2,
  Upload,
  BookOpen,
  Sparkles,
  Search,
  Edit2,
  FolderOpen,
  Download,
  RotateCw,
  MoreVertical,
  FolderUp,
  Copy,
  Scissors,
  ClipboardPaste,
  X,
  Check,
  Gamepad2,
  Lock,
} from 'lucide-react';

interface DocumentFolderItem {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

interface DocumentFileItem {
  id: string;
  name: string;
  parentId: string | null;
  fileType: string;
  mimeType?: string | null;
  storageKey?: string | null;
  parsedQuiz: ParsedQuiz;
  createdAt: string;
}

function DocumentsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token } = useAuthStore();

  const isTeacher = useMemo(() => {
    if (!user) return false;
    const r = (user.role || '').toUpperCase();
    return r === 'TEACHER' || r === 'ADMIN' || r === 'GIAOVIEN';
  }, [user]);

  // BẢO MẬT: Chuyển hướng học sinh về Lớp học nếu truy cập kho tài liệu của giáo viên
  useEffect(() => {
    if (user && !isTeacher) {
      router.replace('/classes');
    }
  }, [user, isTeacher, router]);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  useEffect(() => {
    const fId = searchParams.get('folderId');
    if (fId) {
      setCurrentFolderId(fId);
      if (typeof window !== 'undefined' && window.location.search) {
        window.history.replaceState(null, '', '/documents');
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const fId = e.state?.folderId ?? (new URLSearchParams(window.location.search).get('folderId') || null);
      setCurrentFolderId(fId);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [folders, setFolders] = useState<DocumentFolderItem[]>([]);
  const [files, setFiles] = useState<DocumentFileItem[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Load from and sync with localStorage
  const isInitialLoaded = useRef(false);

  // Helper: Deduplicate strictly by unique file ID and content fingerprint to eliminate duplicate AI-generated exams
  const deduplicateFiles = (fileList: DocumentFileItem[]): DocumentFileItem[] => {
    const map = new Map<string, DocumentFileItem>();
    const fingerprintMap = new Map<string, string>();
    const duplicateIdsToDelete: string[] = [];

    for (const f of fileList) {
      if (!f || !f.id) continue;
      // Skip and auto-purge any tombstoned / deleted document
      if (isDocumentTombstoned(f.id, f.name, f.parsedQuiz?.title)) {
        duplicateIdsToDelete.push(f.id);
        continue;
      }
      if (f.parsedQuiz && Array.isArray(f.parsedQuiz.questions)) {
        for (const q of f.parsedQuiz.questions) {
          if (q && q.explanation) {
            q.explanation = q.explanation
              .replace(/\*\*?Lời giải chi tiết & Phân tích chuyên sâu[:\*\s\S]*$/gi, '')
              .replace(/\*\*?Phân tích từng phương án lựa chọn[:\*\s\S]*$/gi, '')
              .replace(/[-*+]\s*\*\*?Phương án (?:đúng|sai)[^\n]*/gi, '')
              .replace(/[-*+]\s*\*\*?Kết luận: Chọn đáp án[^\n]*/gi, '')
              .trim();
          }
        }
      }

      // Check for duplicate file ID
      if (map.has(f.id)) continue;

      // Check for identical duplicate exam (same parentId, same name, same question count, same first question)
      const qCount = f.parsedQuiz?.questions?.length || 0;
      const firstQ = (f.parsedQuiz?.questions?.[0]?.content || '').slice(0, 40).trim().toLowerCase();
      const fingerprint = `${f.parentId || 'root'}__${f.name.trim().toLowerCase()}__${qCount}__${firstQ}`;

      if (qCount > 0 && fingerprintMap.has(fingerprint)) {
        // This is an identical duplicate copy created simultaneously by the duplicate generation bug
        duplicateIdsToDelete.push(f.id);
        continue;
      }

      if (qCount > 0) {
        fingerprintMap.set(fingerprint, f.id);
      }
      map.set(f.id, f);
    }

    // Auto-clean duplicate IDs from IndexedDB in the background
    if (duplicateIdsToDelete.length > 0 && typeof window !== 'undefined') {
      setTimeout(() => {
        duplicateIdsToDelete.forEach((dupId) => {
          idbDeleteDocument(dupId).catch(() => null);
        });
      }, 300);
    }

    return Array.from(map.values());
  };

  useEffect(() => {
    if (!isTeacher) return;
    if (typeof window !== 'undefined') {
      let didCancel = false;

      // 1. Fast immediate synchronous load from localStorage (instant UI without flicker)
      try {
        const savedFiles = localStorage.getItem('app_documents_files');
        if (savedFiles) {
          const parsed = JSON.parse(savedFiles);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const clean = parsed.filter(
              (f: any) => f && !isDocumentTombstoned(f.id, f.name, f.parsedQuiz?.title)
            );
            setFiles(deduplicateFiles(clean));
          }
        }
        const savedFolders = localStorage.getItem('app_documents_folders');
        if (savedFolders) {
          const parsed = JSON.parse(savedFolders);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFolders(parsed);
          }
        }
      } catch (err) {
        console.error('Error reading localStorage in documents:', err);
      }

      // 2. Load 100% full dataset from IndexedDB (unlimited storage, preserves all files)
      idbSyncAndGetAll()
        .then(({ documents: idbDocs, folders: idbFolders }) => {
          if (didCancel) return;
          if (idbDocs.length > 0) {
            setFiles((prev) => deduplicateFiles([...(idbDocs as any), ...prev]));
          }
          if (idbFolders.length > 0) {
            setFolders((prev) => {
              const map = new Map<string, DocumentFolderItem>();
              for (const f of idbFolders) if (f && f.id) map.set(f.id, f);
              for (const f of prev) if (f && f.id && !map.has(f.id)) map.set(f.id, f);
              return Array.from(map.values());
            });
          }
          isInitialLoaded.current = true;
        })
        .catch((e) => {
          console.warn('idbSyncAndGetAll load error:', e);
          isInitialLoaded.current = true;
        });

      return () => {
        didCancel = true;
      };
    }
  }, []);

  useEffect(() => {
    if (!token || !isTeacher) return;
    let didCancel = false;

    const loadRemoteDocuments = async () => {
      try {
        const data = await listDocuments(token);
        if (didCancel) return;
        if (Array.isArray(data.folders) && data.folders.length > 0) {
          setFolders((prev) => {
            const map = new Map<string, DocumentFolderItem>();
            for (const f of data.folders) {
              if (f && f.id) map.set(f.id, f);
            }
            for (const f of prev) {
              if (f && f.id && !map.has(f.id)) map.set(f.id, f);
            }
            return Array.from(map.values());
          });
        }
        if (Array.isArray(data.files) && data.files.length > 0) {
          setFiles((prev) => {
            return deduplicateFiles([...data.files, ...prev]);
          });
        }
        setSyncError(null);
      } catch (err: any) {
        if (!didCancel) {
          const msg = err.message || '';
          if (!msg.includes('fetch') && !msg.includes('Failed') && !msg.includes('NetworkError')) {
            setSyncError(msg || 'Không thể tải tài liệu từ máy chủ');
          }
        }
      } finally {
        isInitialLoaded.current = true;
      }
    };

    loadRemoteDocuments();
    return () => {
      didCancel = true;
    };
  }, [token]);

  // Persist all documents and folders to IndexedDB and sync to localStorage
  useEffect(() => {
    if (!isInitialLoaded.current) return;
    if (typeof window !== 'undefined') {
      try {
        // 1. IndexedDB: stores full array without limits
        idbSaveAllDocuments(files);
        idbSaveAllFolders(folders);

        // 2. localStorage: safely sync (uses lightweight compression if over 5MB quota)
        safeLocalStorageSet('app_documents_files', JSON.stringify(files));
        safeLocalStorageSet('app_documents_folders', JSON.stringify(folders));
      } catch (err) {
        console.error('Error saving documents to storage:', err);
      }
    }
  }, [files, folders]);

  // Open file in the current tab with dynamic route /app/documents/[id]/view
  const handleOpenFile = (fileItem: DocumentFileItem) => {
    if (typeof window !== 'undefined') {
      idbSaveAllDocuments(files);
      safeLocalStorageSet('app_documents_files', JSON.stringify(files));
      safeLocalStorageSet('app_documents_folders', JSON.stringify(folders));
    }
    router.push(`/documents/${encodeURIComponent(fileItem.id)}`);
  };

  // Search filter
  const [filterText, setFilterText] = useState('');

  // Modals state
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [isUploadDocxOpen, setIsUploadDocxOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<ParsedQuiz | null>(null);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    active: boolean;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Batch Deletion State
  const [batchDeleteModal, setBatchDeleteModal] = useState<{
    isOpen: boolean;
    fileIds: string[];
    folderIds: string[];
  } | null>(null);

  // Drag and Drop State & Toast
  const [draggedItem, setDraggedItem] = useState<{ type: 'file' | 'folder'; id: string } | null>(null);
  const [draggedItemIds, setDraggedItemIds] = useState<string[]>([]);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Clipboard State (Copy / Cut)
  const [clipboard, setClipboard] = useState<{
    mode: 'copy' | 'cut';
    type: 'file' | 'folder';
    item: DocumentFileItem | DocumentFolderItem;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const handleCopy = (type: 'file' | 'folder', item: DocumentFileItem | DocumentFolderItem) => {
    setClipboard({ mode: 'copy', type, item });
    showToast(`Đã sao chép ${type === 'folder' ? 'thư mục' : 'tệp'} "${item.name}" (Ctrl+C)`);
  };

  const handleCut = (type: 'file' | 'folder', item: DocumentFileItem | DocumentFolderItem) => {
    setClipboard({ mode: 'cut', type, item });
    showToast(`Đã cắt ${type === 'folder' ? 'thư mục' : 'tệp'} "${item.name}" (Ctrl+X)`);
  };

  const handlePaste = async (targetFolderId: string | null) => {
    if (!clipboard) return;

    const targetFolder = targetFolderId ? folders.find((f) => f.id === targetFolderId) : null;
    const targetName = targetFolder ? `thư mục "${targetFolder.name}"` : 'Tài liệu của tôi';

    if (clipboard.mode === 'cut') {
      handleItemMove(clipboard.type, clipboard.item.id, targetFolderId);
      setClipboard(null);
    } else if (clipboard.mode === 'copy') {
      if (clipboard.type === 'file') {
        const srcFile = clipboard.item as DocumentFileItem;
        const cleanName = srcFile.name.replace(/\.[^/.]+$/, '');
        const ext = '.json';
        const newFile: DocumentFileItem = {
          id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: `${cleanName} - Bản sao${ext}`,
          parentId: targetFolderId || null,
          fileType: 'json',
          storageKey: `exams/teacher/file_${Date.now()}.json`,
          parsedQuiz: JSON.parse(JSON.stringify(srcFile.parsedQuiz || { title: cleanName, questions: [] })),
          createdAt: new Date().toISOString(),
        };
        setFiles((prev) => [newFile, ...prev]);
        if (token) {
          try {
            await createDocumentFile(token, newFile);
          } catch (err) {
            console.error('Error creating copied file:', err);
          }
        }
        showToast(`Đã dán bản sao "${newFile.name}" vào ${targetName}`);
      } else if (clipboard.type === 'folder') {
        const srcFolder = clipboard.item as DocumentFolderItem;
        const newFolderId = `folder_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newFolder: DocumentFolderItem = {
          id: newFolderId,
          name: `${srcFolder.name} - Bản sao`,
          parentId: targetFolderId || null,
          createdAt: new Date().toISOString(),
        };
        const subFiles = files
          .filter((f) => f.parentId === srcFolder.id)
          .map((f) => ({
            ...f,
            id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            parentId: newFolderId,
            createdAt: new Date().toISOString(),
            parsedQuiz: JSON.parse(JSON.stringify(f.parsedQuiz || { title: f.name, questions: [] })),
          }));
        setFolders((prev) => [newFolder, ...prev]);
        if (subFiles.length > 0) {
          setFiles((prev) => [...subFiles, ...prev]);
        }
        if (token) {
          try {
            await createDocumentFolder(token, { name: newFolder.name, parentId: newFolder.parentId });
          } catch (err) {
            console.error('Error creating copied folder:', err);
          }
        }
        showToast(`Đã dán bản sao thư mục "${newFolder.name}" vào ${targetName}`);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, type: 'file' | 'folder', id: string) => {
    const isPartOfSelection = selectedItemIds.includes(id) && selectedItemIds.length > 1;
    const idsToDrag = isPartOfSelection ? selectedItemIds : [id];

    if (!selectedItemIds.includes(id)) {
      setSelectedItemIds([id]);
      setSelectedItemId(id);
    }

    setDraggedItem({ type, id });
    setDraggedItemIds(idsToDrag);
    e.dataTransfer.effectAllowed = 'move';

    try {
      e.dataTransfer.setData('text/plain', JSON.stringify({ ids: idsToDrag, type, id }));
    } catch {}

    // Find dragged item name and icon
    const draggedFolder = folders.find((f) => f.id === id);
    const draggedFile = files.find((f) => f.id === id);
    const itemName = draggedFolder?.name || draggedFile?.name || (type === 'folder' ? 'Thư mục' : 'Tài liệu');
    const isFolder = type === 'folder' || !!draggedFolder;

    // Single Clean Google Drive Drag Ghost Pill with Count Badge
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const ghost = document.createElement('div');
    ghost.style.position = 'fixed';
    ghost.style.top = '-9999px';
    ghost.style.left = '-9999px';
    ghost.style.zIndex = '99999';
    ghost.style.pointerEvents = 'none';

    const countBadge =
      idsToDrag.length > 1
        ? `
      <div style="
        position: absolute;
        top: -8px;
        right: -8px;
        min-width: 20px;
        height: 20px;
        padding: 0 4px;
        background: #0b57d0;
        color: #ffffff;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid ${isDark ? '#1e1f20' : '#ffffff'};
        box-shadow: 0 2px 6px rgba(11,87,208,0.4);
      ">
        ${idsToDrag.length}
      </div>
    `
        : '';

    const safeName = itemName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const topIconSvg = isFolder
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="${isDark ? '#f3f4f6' : '#374151'}" style="flex-shrink:0;"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`
      : `<div style="width:18px;height:18px;border-radius:3px;background:#185abd;color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0;">W</div>`;

    ghost.innerHTML = `
      <div style="
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: ${isDark ? '#1e1f20' : '#ffffff'};
        color: ${isDark ? '#f3f4f6' : '#1f2937'};
        padding: 8px 16px 8px 12px;
        border-radius: 10px;
        border: 1px solid ${isDark ? '#3c4043' : '#dadce0'};
        box-shadow: 0 6px 20px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        max-width: 240px;
      ">
        ${topIconSvg}
        <span style="font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; line-height: 1.2;">
          ${safeName}
        </span>
        ${countBadge}
      </div>
    `;

    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 8, 8);
    setTimeout(() => {
      if (document.body.contains(ghost)) {
        document.body.removeChild(ghost);
      }
    }, 100);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDraggedItemIds([]);
    setDragOverTargetId(null);
  };

  const handleBatchMove = async (itemIds: string[], targetFolderId: string | null) => {
    if (!itemIds || itemIds.length === 0) return;

    const targetFolder = targetFolderId ? folders.find((f) => f.id === targetFolderId) : null;
    const targetName = targetFolder ? `thư mục "${targetFolder.name}"` : 'Tài liệu của tôi';

    const filesToMove = files.filter((f) => itemIds.includes(f.id) && f.parentId !== targetFolderId);
    const foldersToMove = folders.filter((f) => {
      if (!itemIds.includes(f.id) || f.parentId === targetFolderId || f.id === targetFolderId) return false;
      // Prevent moving folder into its own descendants
      let isDescendant = false;
      let curr = targetFolderId;
      while (curr) {
        if (curr === f.id) {
          isDescendant = true;
          break;
        }
        const parent = folders.find((p) => p.id === curr);
        curr = parent?.parentId || null;
      }
      return !isDescendant;
    });

    const fileIdsToMove = filesToMove.map((f) => f.id);
    const folderIdsToMove = foldersToMove.map((f) => f.id);
    const totalCount = fileIdsToMove.length + folderIdsToMove.length;

    if (totalCount === 0) return;

    // Optimistic UI updates
    setFiles((prev) =>
      prev.map((f) => (fileIdsToMove.includes(f.id) ? { ...f, parentId: targetFolderId } : f))
    );
    setFolders((prev) =>
      prev.map((f) => (folderIdsToMove.includes(f.id) ? { ...f, parentId: targetFolderId } : f))
    );
    setSelectedItemIds([]);
    setSelectedItemId(null);
    setDraggedItem(null);
    setDraggedItemIds([]);

    showToast(
      totalCount === 1
        ? `Đã chuyển "${filesToMove[0]?.name || foldersToMove[0]?.name}" vào ${targetName}`
        : `Đã chuyển ${totalCount} mục vào ${targetName}`
    );

    if (token) {
      try {
        await Promise.all([
          ...fileIdsToMove.map((id) => moveDocumentFile(token, id, targetFolderId)),
          ...folderIdsToMove.map((id) => moveDocumentFolder(token, id, targetFolderId)),
        ]);
      } catch (err) {
        console.error('Batch move server error:', err);
      }
    }
  };

  const handleItemMove = async (
    itemType: 'file' | 'folder',
    itemId: string,
    targetFolderId: string | null
  ) => {
    handleBatchMove([itemId], targetFolderId);
  };

  const handleDropOnTarget = (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);

    let idsToMove = draggedItemIds;
    if (!idsToMove || idsToMove.length === 0) {
      if (draggedItem?.id) {
        idsToMove = [draggedItem.id];
      } else {
        try {
          const raw = e.dataTransfer.getData('text/plain');
          if (raw) {
            const data = JSON.parse(raw);
            idsToMove = data.ids || (data.id ? [data.id] : []);
          }
        } catch {}
      }
    }

    if (idsToMove && idsToMove.length > 0) {
      handleBatchMove(idsToMove, targetFolderId);
    }
    setDraggedItem(null);
    setDraggedItemIds([]);
  };

  // Context Menu State
  const menuRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    rawY?: number;
    type: 'canvas' | 'folder' | 'file';
    folder?: DocumentFolderItem;
    file?: DocumentFileItem;
    timestamp?: number;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    type: 'canvas',
  });

  // Dynamically fine-tune context menu position using exact DOM bounding box
  useLayoutEffect(() => {
    if (contextMenu.isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const winWidth = window.innerWidth;
      const winHeight = window.innerHeight;

      let newX = contextMenu.x;
      let newY = contextMenu.y;

      if (contextMenu.rawY !== undefined) {
        // If near bottom of the screen, flip UPWARDS above cursor
        if (contextMenu.rawY + rect.height > winHeight - 8) {
          newY = Math.max(8, contextMenu.rawY - rect.height);
        } else {
          // Default: open DOWNWARDS from cursor
          newY = contextMenu.rawY;
        }
      }

      if (newX + rect.width > winWidth - 8) {
        newX = Math.max(8, winWidth - rect.width - 8);
      }

      if (newX !== contextMenu.x || newY !== contextMenu.y) {
        setContextMenu((prev) => ({ ...prev, x: newX, y: newY }));
      }
    }
  }, [contextMenu.isOpen, contextMenu.timestamp]);

  // Rename Modal State
  const [renameItem, setRenameItem] = useState<{
    type: 'folder' | 'file';
    id: string;
    name: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Delete Confirmation State
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'folder' | 'file';
    id: string;
    name: string;
    title?: string;
  } | null>(null);

  // Marquee Drag Selection Event Listeners
  useEffect(() => {
    if (!selectionBox) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dist = Math.hypot(e.clientX - selectionBox.startX, e.clientY - selectionBox.startY);
      if (dist > 3) {
        const boxLeft = Math.min(selectionBox.startX, e.clientX);
        const boxRight = Math.max(selectionBox.startX, e.clientX);
        const boxTop = Math.min(selectionBox.startY, e.clientY);
        const boxBottom = Math.max(selectionBox.startY, e.clientY);

        setSelectionBox((prev) =>
          prev ? { ...prev, currentX: e.clientX, currentY: e.clientY, active: true } : null
        );

        if (containerRef.current) {
          const selectableEls = containerRef.current.querySelectorAll('[data-selectable-id]');
          const newlySelected: string[] = [];
          selectableEls.forEach((el) => {
            const rect = el.getBoundingClientRect();
            const isIntersecting = !(
              rect.right < boxLeft ||
              rect.left > boxRight ||
              rect.bottom < boxTop ||
              rect.top > boxBottom
            );
            if (isIntersecting) {
              const id = el.getAttribute('data-selectable-id');
              if (id) newlySelected.push(id);
            }
          });
          setSelectedItemIds(newlySelected);
        }
      }
    };

    const handleMouseUp = () => {
      setSelectionBox(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [selectionBox]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary left mouse button
    const target = e.target as HTMLElement;
    if (
      target.closest(
        'button, input, select, textarea, [data-interactive="true"], a, [role="dialog"], [data-no-marquee="true"]'
      )
    ) {
      return;
    }

    const isCard = target.closest('[data-selectable-id]');
    if (!isCard) {
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
        setSelectedItemIds([]);
        setSelectedItemId(null);
      }
      setSelectionBox({
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        active: false,
      });
    }
  };

  const handleBatchDeleteRequest = () => {
    if (selectedItemIds.length === 0) return;
    const fileIds = selectedItemIds.filter((id) => files.some((f) => f.id === id));
    const folderIds = selectedItemIds.filter((id) => folders.some((f) => f.id === id));
    setBatchDeleteModal({
      isOpen: true,
      fileIds,
      folderIds,
    });
  };

  const handleConfirmBatchDelete = async () => {
    if (!batchDeleteModal) return;
    const { fileIds, folderIds } = batchDeleteModal;
    setBatchDeleteModal(null);
    const totalCount = fileIds.length + folderIds.length;

    // Collect info on files being deleted
    const deletedFiles = files.filter((f) => fileIds.includes(f.id));
    for (const df of deletedFiles) {
      addDeletedDocTombstone(df.id, df.name, df.parsedQuiz?.title);
    }
    for (const fId of fileIds) {
      addDeletedDocTombstone(fId);
    }

    // Optimistic UI updates
    setFiles((prev) =>
      prev.filter(
        (f) =>
          !fileIds.includes(f.id) &&
          !folderIds.includes(f.parentId || '') &&
          !isDocumentTombstoned(f.id, f.name, f.parsedQuiz?.title)
      )
    );
    setFolders((prev) =>
      prev.filter((f) => !folderIds.includes(f.id) && !folderIds.includes(f.parentId || ''))
    );
    setSelectedItemIds([]);
    setSelectedItemId(null);

    // Direct local persistence cleanup in IndexedDB and localStorage
    try {
      for (const df of deletedFiles) {
        await idbDeleteDocument(df.id, df.name, df.parsedQuiz?.title);
      }
      for (const id of fileIds) {
        await idbDeleteDocument(id);
      }
      for (const id of folderIds) {
        await idbDeleteFolder(id);
      }
      const rawF = localStorage.getItem('app_documents_files');
      if (rawF) {
        const updated = JSON.parse(rawF).filter(
          (f: any) =>
            !fileIds.includes(f.id) &&
            !folderIds.includes(f.parentId || '') &&
            !isDocumentTombstoned(f.id, f.name, f.parsedQuiz?.title)
        );
        safeLocalStorageSet('app_documents_files', JSON.stringify(updated));
      }
      const rawFold = localStorage.getItem('app_documents_folders');
      if (rawFold) {
        const updated = JSON.parse(rawFold).filter(
          (f: any) => !folderIds.includes(f.id) && !folderIds.includes(f.parentId || '')
        );
        safeLocalStorageSet('app_documents_folders', JSON.stringify(updated));
      }
      const rawCustom = localStorage.getItem('custom_uploaded_files');
      if (rawCustom) {
        const updatedCustom = JSON.parse(rawCustom).filter(
          (f: any) =>
            !fileIds.includes(f.id) &&
            !folderIds.includes(f.parentId || '') &&
            !isDocumentTombstoned(f.id, f.name, f.parsedQuiz?.title)
        );
        safeLocalStorageSet('custom_uploaded_files', JSON.stringify(updatedCustom));
      }
    } catch (e) {
      console.warn('Batch delete storage purge error:', e);
    }

    showToast(`Đã xóa nhanh ${totalCount} mục thành công!`);

    if (token) {
      try {
        await Promise.all([
          ...deletedFiles.map((df) => deleteDocumentFile(token, df.id, df.name, df.parsedQuiz?.title)),
          ...fileIds.map((id) => deleteDocumentFile(token, id)),
          ...folderIds.map((id) => deleteDocumentFolder(token, id)),
        ]);
      } catch (err) {
        console.error('Batch delete server error:', err);
      }
    }
  };

  // Close context menu on outside interaction, keyboard shortcuts and global context menu interceptor
  useEffect(() => {
    const handleClose = (e?: MouseEvent) => {
      if (e) {
        const target = e.target as HTMLElement | null;
        if (target?.closest('[data-context-menu]') || target?.closest('[data-menu-trigger]')) {
          return;
        }
      }
      setContextMenu((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
        setSelectedItemId(null);
        setSelectedItemIds([]);
      }

      // Don't intercept if typing in an input
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      // Ctrl+A / Cmd+A selects all visible items
      if (isCmdOrCtrl && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const allVisibleIds = [...currentFolders.map((f) => f.id), ...currentFiles.map((f) => f.id)];
        setSelectedItemIds(allVisibleIds);
        return;
      }

      // Delete / Backspace key deletes selected items
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedItemIds.length > 0) {
          e.preventDefault();
          handleBatchDeleteRequest();
          return;
        } else if (selectedItemId) {
          const file = files.find((f) => f.id === selectedItemId);
          if (file) {
            e.preventDefault();
            setItemToDelete({ type: 'file', id: file.id, name: file.name, title: file.parsedQuiz?.title });
            return;
          }
          const folder = folders.find((f) => f.id === selectedItemId);
          if (folder) {
            e.preventDefault();
            setItemToDelete({ type: 'folder', id: folder.id, name: folder.name });
            return;
          }
        }
      }

      // F2 key renames selected item
      if (e.key === 'F2') {
        if (selectedItemId) {
          const file = files.find((f) => f.id === selectedItemId);
          if (file) {
            e.preventDefault();
            handleOpenRename('file', file.id, file.name);
            return;
          }
          const folder = folders.find((f) => f.id === selectedItemId);
          if (folder) {
            e.preventDefault();
            handleOpenRename('folder', folder.id, folder.name);
            return;
          }
        }
      }

      if (isCmdOrCtrl && e.key.toLowerCase() === 'c') {
        if (selectedItemId) {
          const file = files.find((f) => f.id === selectedItemId);
          if (file) {
            e.preventDefault();
            handleCopy('file', file);
          } else {
            const folder = folders.find((f) => f.id === selectedItemId);
            if (folder) {
              e.preventDefault();
              handleCopy('folder', folder);
            }
          }
        }
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'x') {
        if (selectedItemId) {
          const file = files.find((f) => f.id === selectedItemId);
          if (file) {
            e.preventDefault();
            handleCut('file', file);
          } else {
            const folder = folders.find((f) => f.id === selectedItemId);
            if (folder) {
              e.preventDefault();
              handleCut('folder', folder);
            }
          }
        }
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'v') {
        if (clipboard) {
          e.preventDefault();
          handlePaste(currentFolderId);
        }
      }
    };

    const handleGlobalContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Always prevent native browser right-click menu
      e.preventDefault();

      // If click was inside an active modal dialog, input, or textarea, allow native behavior
      if (target.closest('[role="dialog"]') || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // If click was on top navbar or sidebar, do not open the document context menu
      if (target.closest('header') || target.closest('aside')) {
        return;
      }

      // Inside main document workspace: open canvas context menu if not clicking an item
      if (!target.closest('[data-context-item]')) {
        openContextMenu(e, 'canvas');
      }
    };

    window.addEventListener('click', handleClose);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleGlobalContextMenu);
    };
  }, [selectedItemId, files, folders, clipboard, currentFolderId]);

  const openContextMenu = (
    e: React.MouseEvent | MouseEvent,
    type: 'canvas' | 'folder' | 'file',
    folder?: DocumentFolderItem,
    file?: DocumentFileItem
  ) => {
    if ('preventDefault' in e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if ('stopPropagation' in e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }

    const approxHeight = type === 'file' ? 165 : type === 'folder' ? 105 : 165;
    const approxWidth = 160;

    let initX = e.clientX;
    let initY = e.clientY;

    if (typeof window !== 'undefined') {
      // If close to the bottom of the window/taskbar, flip upwards
      if (initY + approxHeight > window.innerHeight - 8) {
        initY = Math.max(8, initY - approxHeight);
      }
      if (initX + approxWidth > window.innerWidth - 8) {
        initX = Math.max(8, window.innerWidth - approxWidth - 8);
      }
    }

    setContextMenu({
      isOpen: true,
      x: initX,
      y: initY,
      rawY: e.clientY,
      type,
      folder,
      file,
      timestamp: Date.now(),
    });
  };

  const handleOpenRename = (type: 'folder' | 'file', id: string, name: string) => {
    setRenameItem({ type, id, name });
    setRenameValue(name);
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameItem || !renameValue.trim()) return;

    if (renameItem.type === 'folder') {
      if (token) {
        try {
          await renameDocumentFolder(token, renameItem.id, renameValue.trim());
        } catch (err: any) {
          setSyncError(err.message || 'Không thể đổi tên thư mục');
        }
      }
      setFolders((prev) =>
        prev.map((f) => (f.id === renameItem.id ? { ...f, name: renameValue.trim() } : f))
      );
      setRenameItem(null);
    } else {
      if (token) {
        try {
          await renameDocumentFile(token, renameItem.id, renameValue.trim());
        } catch (err: any) {
          setSyncError(err.message || 'Không thể đổi tên tệp');
        }
      }
      setFiles((prev) =>
        prev.map((f) =>
          f.id === renameItem.id
            ? {
                ...f,
                name: renameValue.trim(),
                parsedQuiz: {
                  ...f.parsedQuiz,
                  title: renameValue.trim(),
                },
              }
            : f
        )
      );
      setRenameItem(null);
    }
  };

  const handleDownloadFile = (fileItem: DocumentFileItem) => {
    const rawQuiz = fileItem.parsedQuiz || { title: fileItem.name, questions: [] };
    const cleanedQuiz = {
      ...rawQuiz,
      questions: (rawQuiz.questions || []).map((q: any) => {
        const cleanQ = (q.content || '')
          .replace(/^(?:(?:Câu|câu|CÂU|Question|QUESTION|Bài\s*tập|BÀI\s*TẬP|Bài|BÀI|CH|Ví\s*dụ|VÍ\s*DỤ|Luyện\s*tập|Vận\s*dụng|Dạng)\s*(?:\d+|[IVXLCDM]+)[\s:.-]*|(?:\d+)[\.\)]\s+)/i, '')
          .replace(/^[:.-]+\s*/, '')
          .trim();
        return {
          ...q,
          content: cleanQ || q.content,
        };
      }),
    };
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(cleanedQuiz, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${fileItem.name.replace(/\.[^/.]+$/, '')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const navigateToFolder = (fId: string | null) => {
    setCurrentFolderId(fId);
    setSelectedItemId(null);
    if (typeof window !== 'undefined') {
      window.history.pushState({ folderId: fId }, '', '/documents');
    }
  };

  // Filter current folder items
  const currentFolders = folders.filter((f) => {
    const isMatchingParent = currentFolderId ? f.parentId === currentFolderId : (!f.parentId || f.parentId === null);
    return isMatchingParent && f.name.toLowerCase().includes(filterText.toLowerCase());
  });
  const currentFiles = files.filter((f) => {
    const isMatchingParent = currentFolderId ? f.parentId === currentFolderId : (!f.parentId || f.parentId === null);
    return isMatchingParent && f.name.toLowerCase().includes(filterText.toLowerCase());
  });

  // Breadcrumbs calculation
  const getBreadcrumbs = () => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'Tài liệu của tôi' }];
    let curr = currentFolderId;
    const path: DocumentFolderItem[] = [];
    while (curr) {
      const f = folders.find((item) => item.id === curr);
      if (f) {
        path.unshift(f);
        curr = f.parentId || null;
      } else {
        break;
      }
    }
    return [...crumbs, ...path.map((p) => ({ id: p.id, name: p.name }))];
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const folderPayload: DocumentFolderItem = {
      id: `folder_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: newFolderName.trim(),
      parentId: currentFolderId || null,
      createdAt: new Date().toISOString(),
    };

    if (token) {
      try {
        const created = await createDocumentFolder(token, {
          name: newFolderName.trim(),
          parentId: currentFolderId || null,
        });
        if (created && created.id) {
          setFolders((prev) => [created, ...prev.filter((f) => f.id !== created.id)]);
          setNewFolderName('');
          setIsCreateFolderOpen(false);
          setSyncError(null);
          return;
        }
      } catch (err: any) {
        console.error('Error creating folder:', err);
      }
    }

    setFolders((prev) => [folderPayload, ...prev.filter((f) => f.id !== folderPayload.id)]);
    setNewFolderName('');
    setIsCreateFolderOpen(false);
  };

  // Direct local file and folder upload input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
      setIsParsing(true);
      try {
        // 1. Chạy thuật toán nhận diện cấu trúc trước (100% dữ liệu thật từ file, 0ms, không tốn AI)
        const deterministicResult = await parseExamFileStructure(file);
        const isAlgoValid = validateDeterministicResult(deterministicResult);
        if (isAlgoValid && deterministicResult && deterministicResult.questions.length > 0) {
          setParsedPreview({
            title: deterministicResult.title || file.name.replace(/\.[^/.]+$/, ''),
            description: `Đề thi môn ${deterministicResult.subject || 'Kiến thức tổng hợp'} nhận diện từ cấu trúc file`,
            questions: deterministicResult.questions.map((q: any, idx: number) => ({
              id: `q_${Date.now()}_${idx + 1}`,
              rawLabel: q.rawLabel,
              content: q.content,
              points: q.points || 1.0,
              options: q.options || [],
              explanation: q.explanation,
              type: q.type,
              answer: q.answer,
            })),
          });
          setIsUploadDocxOpen(true);
          return;
        }

        const extracted = await extractFileForAi(file);
        const res = await fetch('/api/si/generate-exam', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: extracted.type === 'image' ? 'ocr' : 'document',
            documentText: extracted.text || '',
            imageBase64: extracted.imageBase64 || null,
            fileName: file.name,
            model: 'gemini-3.5-flash',
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success || !data.exam) {
          throw new Error(data.error || 'SI không thể bóc tách đề thi từ file này. 100% không dùng dữ liệu giả.');
        }

        const exam = data.exam;
        if (!Array.isArray(exam.questions) || exam.questions.length === 0) {
          throw new Error('SI không tìm thấy câu hỏi hợp lệ trong tài liệu. Tuyệt đối không tạo dữ liệu giả.');
        }

        setParsedPreview({
          title: exam.title || file.name.replace(/\.[^/.]+$/, ''),
          description: '',
          questions: exam.questions.map((q: any, idx: number) => ({
            id: `q_${Date.now()}_${idx + 1}`,
            rawLabel: q.rawLabel || `Câu ${idx + 1}`,
            content: q.content,
            points: q.points || 1.0,
            options: q.options || [],
            explanation: q.explanation,
            type: q.type || (q.options?.length >= 2 ? 'multiple_choice' : 'essay'),
            answer: q.answer,
          })),
        });
        setIsUploadDocxOpen(true);
      } catch (err: any) {
        console.error('Error parsing file with SI:', err);
        alert(err.message || 'Lỗi bóc tách câu hỏi bằng SI. Hệ thống 100% không làm giả dữ liệu.');
      } finally {
        setIsParsing(false);
      }
    }
    e.target.value = '';
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    // Detect folder name from webkitRelativePath
    const firstPath = fileList[0].webkitRelativePath || '';
    const folderName = firstPath ? firstPath.split('/')[0] : 'Thư mục mới tải lên';

    let newFolder: DocumentFolderItem = {
      id: `folder_${Date.now()}`,
      name: folderName,
      parentId: currentFolderId,
      createdAt: new Date().toISOString(),
    };

    const uploadedFiles: DocumentFileItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (['.docx', '.txt', '.pdf', '.xlsx', '.tex', '.azt'].includes(ext)) {
        try {
          // Ưu tiên chạy thuật toán nhận diện cấu trúc trước (100% dữ liệu thật, không tốn AI)
          const detRes = await parseExamFileStructure(file);
          const isDetValid = validateDeterministicResult(detRes);
          if (isDetValid && detRes && detRes.questions.length > 0) {
            const parsed: ParsedQuiz = {
              title: detRes.title || file.name.replace(/\.[^/.]+$/, ''),
              description: `Đề thi môn ${detRes.subject || 'Kiến thức tổng hợp'} nhận diện từ cấu trúc file`,
              questions: detRes.questions.map((q: any, idx: number) => ({
                id: `q_${Date.now()}_${i}_${idx + 1}`,
                rawLabel: q.rawLabel,
                content: q.content,
                points: q.points || 1.0,
                options: q.options || [],
                explanation: q.explanation,
                type: q.type,
                answer: q.answer,
              })),
            };
            uploadedFiles.push({
              id: `file_${Date.now()}_${i}`,
              name: `${file.name.replace(/\.[^/.]+$/, '')}.json`,
              parentId: newFolder.id,
              fileType: 'json',
              storageKey: `exams/teacher/file_${Date.now()}_${i}.json`,
              createdAt: new Date().toISOString(),
              parsedQuiz: parsed,
            });
            continue;
          }

          const extracted = await extractFileForAi(file);
          const res = await fetch('/api/si/generate-exam', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: extracted.type === 'image' ? 'ocr' : 'document',
              documentText: extracted.text || '',
              imageBase64: extracted.imageBase64 || null,
              fileName: file.name,
              model: 'gemini-3.5-flash',
            }),
          });
          const data = await res.json();
          if (res.ok && data.success && data.exam && Array.isArray(data.exam.questions) && data.exam.questions.length > 0) {
            const parsed: ParsedQuiz = {
              title: data.exam.title || file.name.replace(/\.[^/.]+$/, ''),
              description: '',
              questions: data.exam.questions.map((q: any, idx: number) => ({
                id: `q_${Date.now()}_${i}_${idx + 1}`,
                content: q.content,
                points: q.points || 1.0,
                options: q.options || [],
              })),
            };
            uploadedFiles.push({
              id: `file_${Date.now()}_${i}`,
              name: `${file.name.replace(/\.[^/.]+$/, '')}.json`,
              parentId: newFolder.id,
              fileType: 'json',
              storageKey: `exams/teacher/file_${Date.now()}_${i}.json`,
              createdAt: new Date().toISOString(),
              parsedQuiz: parsed,
            });
          } else {
            console.warn(`File ${file.name} did not produce valid questions from AI, skipping fake generation.`);
          }
        } catch (err) {
          console.error(`Error processing file ${file.name} with AI:`, err);
        }
      }
    }

    if (uploadedFiles.length === 0) {
      alert('Không thể tạo câu hỏi từ các file trong thư mục bằng SI. Hệ thống 100% không làm giả dữ liệu.');
      e.target.value = '';
      return;
    }

    if (token) {
      try {
        newFolder = await createDocumentFolder(token, {
          name: newFolder.name,
          parentId: newFolder.parentId,
        });

        const savedFiles: DocumentFileItem[] = [];
        for (const file of uploadedFiles) {
          savedFiles.push(
            await createDocumentFile(token, {
              ...file,
              parentId: newFolder.id,
            })
          );
        }
        uploadedFiles.splice(0, uploadedFiles.length, ...savedFiles);
        setSyncError(null);
      } catch (err: any) {
        setSyncError(err.message || 'Không thể lưu thư mục lên máy chủ');
        e.target.value = '';
        return;
      }
    }

    setFolders((prev) => [...prev, newFolder]);
    if (uploadedFiles.length > 0) {
      setFiles((prev) => [...uploadedFiles, ...prev]);
    }

    e.target.value = '';
  };

  const handleConfirmUpload = async () => {
    if (!parsedPreview) return;

    const finalTitle = (uploadTitle.trim() || selectedFile?.name || 'Tài liệu đề thi').replace(/\.[^/.]+$/, '');
    let newDocFile: DocumentFileItem = {
      id: `file_${Date.now()}`,
      name: `${finalTitle}.json`,
      parentId: currentFolderId,
      fileType: 'json',
      mimeType: 'application/json',
      storageKey: `exams/teacher/file_${Date.now()}.json`,
      createdAt: new Date().toISOString(),
      parsedQuiz: {
        ...parsedPreview,
        title: finalTitle,
      },
    };

    removeDeletedDocTombstone(newDocFile.id, newDocFile.name);

    if (token) {
      try {
        newDocFile = await createDocumentFile(token, newDocFile);
        setSyncError(null);
      } catch (err: any) {
        setSyncError(err.message || 'Không thể lưu tài liệu lên máy chủ');
      }
    }

    const updatedFiles = [newDocFile, ...files];
    setFiles(updatedFiles);
    setIsUploadDocxOpen(false);
    setSelectedFile(null);
    setParsedPreview(null);
    setUploadTitle('');
  };

  const handleDeleteFolder = async (folderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // 1. Immediately update UI state
    setFolders((prev) => prev.filter((f) => f.id !== folderId && f.parentId !== folderId));
    setFiles((prev) => prev.filter((f) => f.parentId !== folderId));

    // 2. Direct local cleanup in IndexedDB & localStorage
    try {
      await idbDeleteFolder(folderId);
      const childFileIds = files.filter((f) => f.parentId === folderId).map((f) => f.id);
      for (const cfId of childFileIds) {
        await idbDeleteDocument(cfId);
      }
      const rawFold = localStorage.getItem('app_documents_folders');
      if (rawFold) {
        const updated = JSON.parse(rawFold).filter((f: any) => f.id !== folderId && f.parentId !== folderId);
        safeLocalStorageSet('app_documents_folders', JSON.stringify(updated));
      }
      const rawF = localStorage.getItem('app_documents_files');
      if (rawF) {
        const updated = JSON.parse(rawF).filter((f: any) => f.parentId !== folderId);
        safeLocalStorageSet('app_documents_files', JSON.stringify(updated));
      }
    } catch (err) {
      console.warn('Local delete folder error:', err);
    }

    // 3. Remote server sync
    if (token) {
      try {
        await deleteDocumentFolder(token, folderId);
        setSyncError(null);
      } catch (err: any) {
        console.warn('Server delete folder warning:', err);
      }
    }
    showToast('Đã xóa thư mục thành công');
  };

  const handleDeleteFile = async (fileId: string, fileName?: string, fileTitle?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const targetFile = files.find((f) => f.id === fileId || matchDocId(f.id, fileId));
    const resolvedName = fileName || targetFile?.name;
    const resolvedTitle = fileTitle || targetFile?.parsedQuiz?.title;

    // 1. Immediately record tombstone
    addDeletedDocTombstone(fileId, resolvedName, resolvedTitle);

    // 2. Immediately update UI state
    setFiles((prev) =>
      prev.filter((f) => {
        if (!f) return false;
        if (f.id === fileId || matchDocId(f.id, fileId)) return false;
        if (resolvedName && isNameMatch(f.name, resolvedName)) return false;
        if (resolvedTitle && isNameMatch(f.parsedQuiz?.title, resolvedTitle)) return false;
        if (isDocumentTombstoned(f.id, f.name, f.parsedQuiz?.title)) return false;
        return true;
      })
    );

    // 3. Direct local cleanup in IndexedDB & localStorage
    try {
      await idbDeleteDocument(fileId, resolvedName, resolvedTitle);

      const raw = localStorage.getItem('app_documents_files');
      if (raw) {
        const updated = JSON.parse(raw).filter((f: any) => {
          if (!f) return false;
          if (f.id === fileId || matchDocId(f.id, fileId)) return false;
          if (resolvedName && isNameMatch(f.name, resolvedName)) return false;
          if (resolvedTitle && isNameMatch(f.parsedQuiz?.title, resolvedTitle)) return false;
          if (isDocumentTombstoned(f.id, f.name, f.parsedQuiz?.title)) return false;
          return true;
        });
        safeLocalStorageSet('app_documents_files', JSON.stringify(updated));
      }
      const rawCustom = localStorage.getItem('custom_uploaded_files');
      if (rawCustom) {
        const updatedCustom = JSON.parse(rawCustom).filter((f: any) => {
          if (!f) return false;
          if (f.id === fileId || matchDocId(f.id, fileId)) return false;
          if (resolvedName && isNameMatch(f.name, resolvedName)) return false;
          if (resolvedTitle && isNameMatch(f.parsedQuiz?.title, resolvedTitle)) return false;
          if (isDocumentTombstoned(f.id, f.name, f.parsedQuiz?.title)) return false;
          return true;
        });
        safeLocalStorageSet('custom_uploaded_files', JSON.stringify(updatedCustom));
      }

      // Purge matching sessions from chatcoi_history_sessions
      const rawSessions = localStorage.getItem('chatcoi_history_sessions');
      if (rawSessions) {
        const sessions = JSON.parse(rawSessions);
        if (Array.isArray(sessions)) {
          let changed = false;
          for (const s of sessions) {
            for (const msg of s.messages || []) {
              if (Array.isArray(msg.executedActions)) {
                msg.executedActions = msg.executedActions.filter((act: any) => {
                  if (act.actionType === 'exam' && act.data) {
                    if (
                      matchDocId(act.data.examId, fileId) ||
                      (resolvedName && isNameMatch(act.data.title, resolvedName)) ||
                      (resolvedTitle && isNameMatch(act.data.title, resolvedTitle))
                    ) {
                      changed = true;
                      return false;
                    }
                  }
                  return true;
                });
              }
            }
          }
          if (changed) {
            safeLocalStorageSet('chatcoi_history_sessions', JSON.stringify(sessions));
          }
        }
      }
    } catch (err) {
      console.warn('Local delete file error:', err);
    }

    // 4. Remote server sync
    if (token) {
      try {
        await deleteDocumentFile(token, fileId, resolvedName, resolvedTitle);
        setSyncError(null);
      } catch (err: any) {
        console.warn('Server delete document warning:', err);
      }
    }
    showToast('Đã xóa tài liệu thành công');
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'folder') {
      await handleDeleteFolder(itemToDelete.id);
    } else {
      await handleDeleteFile(itemToDelete.id, itemToDelete.name, itemToDelete.title);
    }
    if (selectedItemId === itemToDelete.id) {
      setSelectedItemId(null);
    }
    setItemToDelete(null);
  };

  const handleGoToCreate = () => {
    if (typeof window !== 'undefined') {
      if (currentFolderId) {
        const curFolder = folders.find((f) => f.id === currentFolderId);
        sessionStorage.setItem('app_active_folder_id', currentFolderId);
        sessionStorage.setItem('app_active_folder_name', curFolder?.name || '');
      } else {
        sessionStorage.removeItem('app_active_folder_id');
        sessionStorage.removeItem('app_active_folder_name');
      }
    }
    router.push('/documents/create');
  };

  if (user && !isTeacher) {
    return (
      <AppShell title="Kho tài liệu">
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
            <Lock size={32} />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Khu vực dành riêng cho Giáo viên
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tài khoản học sinh không thể truy cập kho quản lý tài liệu và đề thi của giáo viên. Vui lòng vào mục Lớp học để xem các bài tập và đề thi được giao.
            </p>
          </div>
          <Button onClick={() => router.push('/classes')} className="mt-2">
            Về lớp học của tôi
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
          {getBreadcrumbs().map((crumb, idx, arr) => {
            const isDropTarget =
              draggedItem &&
              dragOverTargetId === (crumb.id || '__root__') &&
              !(draggedItem.type === 'folder' && draggedItem.id === crumb.id);

            const isLast = idx === arr.length - 1;

            return (
              <React.Fragment key={crumb.id || 'root'}>
                <button
                  type="button"
                  onClick={() => navigateToFolder(crumb.id)}
                  onDragOver={(e) => {
                    if (draggedItem) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      const target = crumb.id || '__root__';
                      if (dragOverTargetId !== target) {
                        setDragOverTargetId(target);
                      }
                    }
                  }}
                  onDragLeave={() => {
                    setDragOverTargetId((prev) =>
                      prev === (crumb.id || '__root__') ? null : prev
                    );
                  }}
                  onDrop={(e) => handleDropOnTarget(e, crumb.id)}
                  className={`cursor-pointer font-normal ${
                    isLast ? 'truncate min-w-0' : 'shrink-0 whitespace-nowrap'
                  } ${
                    isDropTarget
                      ? 'text-google-blue underline'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {crumb.name}
                </button>
                {idx < arr.length - 1 && (
                  <BreadcrumbChevron
                    folderId={crumb.id}
                    allFolders={folders}
                    allFiles={files}
                    fallbackToStaticChevron={true}
                    onNavigateFolder={(id) => navigateToFolder(id)}
                    onNavigateFile={(fileId) => {
                      const fItem = files.find((f) => f.id === fileId);
                      if (fItem) {
                        handleOpenFile(fItem);
                      } else {
                        router.push(`/documents/${encodeURIComponent(fileId)}`);
                      }
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      }
      action={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsCreateFolderOpen(true)}>
            <FolderPlus size={16} className="mr-1.5 text-google-blue" />
            Tạo thư mục mới
          </Button>

          <Button size="sm" onClick={handleGoToCreate}>
            <Sparkles size={16} className="mr-1.5" />
            Tạo mới
          </Button>
        </div>
      }
    >
      {/* Selection Marquee Rectangle Box (Bôi đen để chọn nhiều) */}
      {selectionBox && selectionBox.active && (
        <div
          className="fixed z-50 pointer-events-none bg-blue-500/15 border border-blue-500/60 rounded-xs"
          style={{
            left: Math.min(selectionBox.startX, selectionBox.currentX),
            top: Math.min(selectionBox.startY, selectionBox.currentY),
            width: Math.abs(selectionBox.currentX - selectionBox.startX),
            height: Math.abs(selectionBox.currentY - selectionBox.startY),
          }}
        />
      )}



      <div
        id="document-canvas-container"
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className="space-y-5 min-h-full flex-1 w-full pb-16 flex flex-col select-none"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedItemId(null);
            setSelectedItemIds([]);
          }
        }}
        onContextMenu={(e) => openContextMenu(e, 'canvas')}
      >
        {syncError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            {syncError}
          </div>
        )}

        {/* Toast Feedback Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900/95 text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-200 backdrop-blur-sm border border-slate-700/40 dark:border-slate-300/40">
            <CheckCircle2 size={18} className="text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Smooth Container for Current Folder View */}
        <div key={currentFolderId || 'root'} className="space-y-5 flex-1 flex flex-col animate-in fade-in-0 duration-150">
          {/* FOLDERS SECTION */}
          {currentFolders.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {currentFolders.map((folder) => {
                const isBeingDragged = draggedItemIds.includes(folder.id);
                const isMultiBeingDragged = draggedItemIds.length > 1 && draggedItemIds.includes(folder.id);
                const isDropTarget =
                  draggedItem &&
                  dragOverTargetId === folder.id &&
                  !draggedItemIds.includes(folder.id);
                const isCut =
                  clipboard?.mode === 'cut' && clipboard.type === 'folder' && clipboard.item.id === folder.id;
                const isSelected = selectedItemIds.includes(folder.id) || selectedItemId === folder.id;

                return (
                  <div
                    key={folder.id}
                    data-selectable-id={folder.id}
                    data-context-item="folder"
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, 'folder', folder.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => {
                      if (draggedItem && !draggedItemIds.includes(folder.id)) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverTargetId !== folder.id) {
                          setDragOverTargetId(folder.id);
                        }
                      }
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget === e.target) {
                        setDragOverTargetId((prev) => (prev === folder.id ? null : prev));
                      }
                    }}
                    onDrop={(e) => handleDropOnTarget(e, folder.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (e.ctrlKey || e.metaKey || e.shiftKey) {
                        setSelectedItemIds((prev) =>
                          prev.includes(folder.id)
                            ? prev.filter((id) => id !== folder.id)
                            : [...prev, folder.id]
                        );
                        return;
                      }
                      if (selectedItemIds.length > 1) {
                        setSelectedItemIds([folder.id]);
                        return;
                      }
                      setSelectedItemId(folder.id);
                      navigateToFolder(folder.id);
                    }}
                    onContextMenu={(e) => {
                      if (!selectedItemIds.includes(folder.id)) {
                        setSelectedItemIds([]);
                        setSelectedItemId(null);
                      }
                      openContextMenu(e, 'folder', folder);
                    }}
                    className={`group relative h-12 px-3.5 rounded-[12px] flex items-center justify-between transition-all duration-200 cursor-pointer select-none ${
                      isDropTarget
                        ? 'bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-500 scale-[1.04] shadow-lg z-20'
                        : isMultiBeingDragged || isBeingDragged
                        ? 'opacity-40 border border-dashed border-blue-500/70 bg-blue-500/5'
                        : isCut
                        ? 'opacity-40 border border-dashed border-slate-400 bg-slate-100 dark:bg-[#282a2c]'
                        : isSelected
                        ? 'ring-2 ring-blue-500 bg-blue-500/10 dark:bg-blue-500/15 text-slate-900 dark:text-white shadow-xs'
                        : 'bg-[#f0f4f9] hover:bg-[#e4ebf5] dark:bg-[#282a2c] dark:hover:bg-[#323437] text-slate-800 dark:text-zinc-200 shadow-2xs hover:shadow-xs active:scale-[0.99]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 py-1">
                      <Folder
                        size={20}
                        className={`shrink-0 fill-current transition-colors ${
                          isDropTarget
                            ? 'text-google-blue dark:text-blue-400'
                            : isSelected
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-700 dark:text-zinc-300 group-hover:text-google-blue dark:group-hover:text-blue-400'
                        }`}
                      />
                      <span className="text-xs md:text-sm font-medium truncate">
                        {folder.name}
                      </span>
                      {isDropTarget && (
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-300 ml-auto mr-1 animate-pulse bg-blue-200/60 dark:bg-blue-950/80 px-2 py-0.5 rounded-full">
                          Thả {draggedItemIds.length > 1 ? `${draggedItemIds.length} mục` : ''} vào đây
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        data-no-marquee="true"
                        data-menu-trigger="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.nativeEvent?.stopImmediatePropagation?.();
                          setSelectedItemId(null);
                          setSelectedItemIds([]);
                          openContextMenu(e, 'folder', folder);
                        }}
                        onContextMenu={(e) => {
                          e.stopPropagation();
                          e.nativeEvent?.stopImmediatePropagation?.();
                          setSelectedItemId(null);
                          setSelectedItemIds([]);
                          openContextMenu(e, 'folder', folder);
                        }}
                        className="p-1 rounded-full text-slate-600 dark:text-slate-400 hover:bg-slate-300/60 dark:hover:bg-slate-700/70 transition-colors shrink-0 cursor-pointer outline-none focus:outline-none focus:ring-0"
                        title="Tùy chọn"
                      >
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* FILES / GENERATED EXAMS SECTION */}
          {currentFiles.length === 0 && currentFolders.length === 0 ? (
            <div className="py-24 text-center select-none flex flex-col items-center justify-center max-w-md mx-auto px-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 text-slate-400 dark:text-zinc-500 flex items-center justify-center mb-3 shadow-2xs">
                <FolderOpen size={32} strokeWidth={1.75} />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
                {currentFolderId ? 'Thư mục này đang trống' : 'Chưa có tài liệu'}
              </p>
            </div>
          ) : currentFiles.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
              {currentFiles.map((fileItem) => {
                const isBeingDragged = draggedItemIds.includes(fileItem.id);
                const isMultiBeingDragged = draggedItemIds.length > 1 && draggedItemIds.includes(fileItem.id);
                const isCut =
                  clipboard?.mode === 'cut' && clipboard.type === 'file' && clipboard.item.id === fileItem.id;
                const isSelected = selectedItemIds.includes(fileItem.id) || selectedItemId === fileItem.id;
                const qCount = fileItem.parsedQuiz.questions.length;

                return (
                  <div
                    key={fileItem.id}
                    data-selectable-id={fileItem.id}
                    data-context-item="file"
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, 'file', fileItem.id)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (e.ctrlKey || e.metaKey || e.shiftKey) {
                        setSelectedItemIds((prev) =>
                          prev.includes(fileItem.id)
                            ? prev.filter((id) => id !== fileItem.id)
                            : [...prev, fileItem.id]
                        );
                        return;
                      }
                      if (selectedItemIds.length > 1) {
                        setSelectedItemIds([fileItem.id]);
                        return;
                      }
                      setSelectedItemId(fileItem.id);
                      handleOpenFile(fileItem);
                    }}
                    onContextMenu={(e) => {
                      if (!selectedItemIds.includes(fileItem.id)) {
                        setSelectedItemIds([]);
                        setSelectedItemId(null);
                      }
                      openContextMenu(e, 'file', undefined, fileItem);
                    }}
                    className={`group relative rounded-[12px] p-2.5 flex flex-col justify-between max-w-[200px] w-full aspect-square transition-all duration-200 select-none cursor-pointer ${
                      isMultiBeingDragged || isBeingDragged
                        ? 'opacity-40 ring-1 ring-blue-500/60 bg-blue-500/5'
                        : isCut
                        ? 'opacity-40 border border-dashed border-slate-400 bg-slate-100 dark:bg-[#282a2c]'
                        : isSelected
                        ? 'ring-2 ring-blue-500 bg-blue-500/10 dark:bg-blue-500/15 shadow-xs'
                        : 'bg-[#f0f4f9] hover:bg-[#e4ebf5] dark:bg-[#282a2c] dark:hover:bg-[#323437] shadow-2xs hover:shadow-xs active:scale-[0.99]'
                    }`}
                  >
                    {/* Top File Title Bar */}
                    <div className="flex items-center justify-between gap-1.5 w-full min-w-0 px-0.5 py-0.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <div className="w-4 h-4 rounded-[3px] bg-[#185abd] text-white flex items-center justify-center font-bold text-[8px] shrink-0 shadow-2xs">
                          W
                        </div>
                        <span className="text-[11px] font-medium text-slate-800 dark:text-zinc-200 truncate">
                          {fileItem.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          data-no-marquee="true"
                          data-menu-trigger="true"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.nativeEvent?.stopImmediatePropagation?.();
                            setSelectedItemId(null);
                            setSelectedItemIds([]);
                            openContextMenu(e, 'file', undefined, fileItem);
                          }}
                          onContextMenu={(e) => {
                            e.stopPropagation();
                            e.nativeEvent?.stopImmediatePropagation?.();
                            setSelectedItemId(null);
                            setSelectedItemIds([]);
                            openContextMenu(e, 'file', undefined, fileItem);
                          }}
                          className="p-1 rounded-full text-slate-600 dark:text-slate-400 hover:bg-slate-300/60 dark:hover:bg-slate-700/70 transition-colors shrink-0 cursor-pointer outline-none focus:outline-none focus:ring-0"
                          title="Tùy chọn"
                        >
                          <MoreVertical size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Real 100% Document Paper Preview (Trang giấy thuần không viền) */}
                    <div className="bg-white dark:bg-[#18181b] rounded-lg flex-1 mt-1.5 shadow-2xs overflow-hidden p-2 flex flex-col justify-between text-left select-none">
                      {/* Exam Header */}
                      <div className="pb-0.5 mb-1 flex justify-between items-start text-[6px] leading-tight text-slate-700 dark:text-slate-300">
                        <div>
                          <p className="font-bold uppercase tracking-tight text-slate-800 dark:text-slate-200">
                            BỘ GIÁO DỤC VÀ ĐÀO TẠO
                          </p>
                          <p className="text-[5px] text-slate-400">ĐỀ THI CHÍNH THỨC</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            MÃ ĐỀ: 101
                          </p>
                          <p className="text-[5px] text-slate-400">90 phút</p>
                        </div>
                      </div>

                      {/* Real Questions Content */}
                      <div className="space-y-1 overflow-hidden flex-1 text-[6.5px] leading-tight text-slate-800 dark:text-slate-200">
                        {fileItem.parsedQuiz.questions.slice(0, 2).map((q, qIdx) => (
                          <div key={q.id || qIdx} className="space-y-0.5">
                            <p className="font-bold line-clamp-1">
                              <span className="text-slate-900 dark:text-white">Câu {qIdx + 1}: </span>
                              {q.content}
                            </p>
                            <div className="grid grid-cols-2 gap-x-1 gap-y-0 text-[5.5px] text-slate-600 dark:text-slate-400 pl-0.5">
                              {q.options.slice(0, 4).map((opt, optIdx) => {
                                const label = String.fromCharCode(65 + optIdx);
                                return (
                                  <span
                                    key={optIdx}
                                    className={`truncate ${
                                      opt.isCorrect
                                        ? 'font-bold text-google-blue dark:text-blue-400'
                                        : ''
                                    }`}
                                  >
                                    {label}. {opt.content}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        {fileItem.parsedQuiz.questions.length > 2 && (
                          <p className="text-[5px] text-slate-400 italic text-center">
                            ... và {fileItem.parsedQuiz.questions.length - 2} câu hỏi khác ...
                          </p>
                        )}
                      </div>

                      {/* Bottom Watermark / Question summary */}
                      <div className="pt-0.5 flex justify-between items-center text-[5.5px] text-slate-400">
                        <span>Trang 1/1</span>
                        <span className="font-semibold text-slate-500 dark:text-slate-400">
                          Tổng {qCount} câu
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {/* Custom Context Menu */}
      {contextMenu.isOpen && (
        <div
          ref={menuRef}
          data-context-menu="true"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
          className="fixed z-50 w-56 min-w-[210px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-slate-200/70 dark:border-white/10 py-1.5 text-xs text-slate-700 dark:text-slate-200 select-none overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {contextMenu.type === 'canvas' && (
            <>
              {clipboard && (
                <button
                  onClick={() => {
                    handlePaste(currentFolderId);
                    setContextMenu((prev) => ({ ...prev, isOpen: false }));
                  }}
                  className="w-full px-3.5 py-2 flex items-center justify-between gap-6 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-google-blue dark:text-blue-400 transition-colors text-left font-semibold cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 whitespace-nowrap">
                    <ClipboardPaste size={16} className="shrink-0" />
                    <span>Dán ({clipboard.mode === 'cut' ? 'Di chuyển' : 'Tạo bản sao'})</span>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tracking-wider ml-auto pl-4 shrink-0">Ctrl+V</span>
                </button>
              )}

              <button
                onClick={() => {
                  setIsCreateFolderOpen(true);
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left font-medium cursor-pointer whitespace-nowrap"
              >
                <FolderPlus size={16} className="text-google-yellow shrink-0" />
                <span>Thư mục mới</span>
              </button>

              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left font-medium cursor-pointer whitespace-nowrap"
              >
                <Upload size={16} className="text-emerald-500 shrink-0" />
                <span>Tải tệp lên</span>
              </button>

              <button
                onClick={() => {
                  folderInputRef.current?.click();
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left font-medium cursor-pointer whitespace-nowrap"
              >
                <FolderUp size={16} className="text-amber-500 shrink-0" />
                <span>Tải thư mục lên</span>
              </button>

              <button
                onClick={() => {
                  handleGoToCreate();
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left font-medium cursor-pointer whitespace-nowrap"
              >
                <Sparkles size={16} className="text-google-blue shrink-0" />
                <span>Tạo mới</span>
              </button>

              <button
                onClick={() => {
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left text-slate-500 cursor-pointer whitespace-nowrap"
              >
                <RotateCw size={15} className="shrink-0" />
                <span>Làm mới danh sách</span>
              </button>
            </>
          )}

          {contextMenu.type === 'folder' && contextMenu.folder && (
            <>
              <button
                onClick={() => {
                  setCurrentFolderId(contextMenu.folder!.id);
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left font-medium cursor-pointer whitespace-nowrap"
              >
                <FolderOpen size={16} className="text-google-yellow shrink-0" />
                <span>Mở thư mục</span>
              </button>

              <button
                onClick={() => {
                  handleCopy('folder', contextMenu.folder!);
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-3.5 py-2 flex items-center justify-between gap-6 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left font-medium cursor-pointer"
              >
                <div className="flex items-center gap-2.5 whitespace-nowrap">
                  <Copy size={15} className="text-slate-500 shrink-0" />
                  <span>Sao chép</span>
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tracking-wider ml-auto pl-4 shrink-0">Ctrl+C</span>
              </button>

              <button
                onClick={() => {
                  handleCut('folder', contextMenu.folder!);
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-3.5 py-2 flex items-center justify-between gap-6 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left font-medium cursor-pointer"
              >
                <div className="flex items-center gap-2.5 whitespace-nowrap">
                  <Scissors size={15} className="text-slate-500 shrink-0" />
                  <span>Cắt</span>
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tracking-wider ml-auto pl-4 shrink-0">Ctrl+X</span>
              </button>

              <button
                onClick={() => {
                  handleOpenRename('folder', contextMenu.folder!.id, contextMenu.folder!.name);
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left font-medium cursor-pointer whitespace-nowrap"
              >
                <Edit2 size={15} className="text-slate-500 shrink-0" />
                <span>Đổi tên</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedItemIds.length > 1 && selectedItemIds.includes(contextMenu.folder!.id)) {
                    handleBatchDeleteRequest();
                  } else {
                    setItemToDelete({
                      type: 'folder',
                      id: contextMenu.folder!.id,
                      name: contextMenu.folder!.name,
                    });
                  }
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors text-left font-medium cursor-pointer whitespace-nowrap border-t border-slate-100 dark:border-slate-800"
              >
                <Trash2 size={15} className="shrink-0" />
                <span>Xóa</span>
              </button>
            </>
          )}

          {contextMenu.type === 'file' && contextMenu.file && (
            <>
              <button
                onClick={() => {
                  handleCopy('file', contextMenu.file!);
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-3.5 py-2 flex items-center justify-between gap-6 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left font-medium cursor-pointer"
              >
                <div className="flex items-center gap-2.5 whitespace-nowrap">
                  <Copy size={15} className="text-slate-500 shrink-0" />
                  <span>Sao chép</span>
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tracking-wider ml-auto pl-4 shrink-0">Ctrl+C</span>
              </button>

              <button
                onClick={() => {
                  handleCut('file', contextMenu.file!);
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-3.5 py-2 flex items-center justify-between gap-6 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left font-medium cursor-pointer"
              >
                <div className="flex items-center gap-2.5 whitespace-nowrap">
                  <Scissors size={15} className="text-slate-500 shrink-0" />
                  <span>Cắt</span>
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tracking-wider ml-auto pl-4 shrink-0">Ctrl+X</span>
              </button>

              <button
                onClick={() => {
                  handleDownloadFile(contextMenu.file!);
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left font-medium cursor-pointer whitespace-nowrap"
              >
                <Download size={15} className="text-slate-500 shrink-0" />
                <span>Tải xuống</span>
              </button>

              <button
                onClick={() => {
                  handleOpenRename('file', contextMenu.file!.id, contextMenu.file!.name);
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left font-medium cursor-pointer whitespace-nowrap"
              >
                <Edit2 size={15} className="text-slate-500 shrink-0" />
                <span>Đổi tên</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedItemIds.length > 1 && selectedItemIds.includes(contextMenu.file!.id)) {
                    handleBatchDeleteRequest();
                  } else {
                    setItemToDelete({
                      type: 'file',
                      id: contextMenu.file!.id,
                      name: contextMenu.file!.name,
                      title: contextMenu.file?.parsedQuiz?.title,
                    });
                  }
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors text-left font-medium cursor-pointer whitespace-nowrap border-t border-slate-100 dark:border-slate-800"
              >
                <Trash2 size={15} className="shrink-0" />
                <span>Xóa</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Modal: Rename Item */}
      <Modal
        isOpen={!!renameItem}
        onClose={() => setRenameItem(null)}
        title={renameItem?.type === 'folder' ? 'Đổi tên thư mục' : 'Đổi tên tệp đề thi'}
      >
        <form onSubmit={handleSaveRename} className="space-y-4">
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Nhập tên..."
            required
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setRenameItem(null)}>
              Hủy
            </Button>
            <Button size="sm" type="submit">
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 1: Create New Folder */}
      <Modal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        title="Tạo thư mục tài liệu mới"
        description="Nhập tên thư mục để lưu trữ và phân loại các tệp đề thi"
      >
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <Input
            label="Tên thư mục"
            placeholder="Ví dụ: Đề thi thử Toán 12, Đề Kiểm Tra Tiếng Anh..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreateFolderOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" size="sm">
              Tạo thư mục
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Upload File .docx & Auto Generate Quiz */}
      <Modal
        isOpen={isUploadDocxOpen}
        onClose={() => {
          setIsUploadDocxOpen(false);
          setParsedPreview(null);
        }}
        title="Tải lên File Word (.docx) & Tự động tạo Đề thi"
        description="Hệ thống sẽ tự động bóc tách danh sách câu hỏi trắc nghiệm A, B, C, D từ file của bạn"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Chọn File Word (.docx) hoặc Text (.txt)
            </label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-google-blue rounded-2xl p-5 text-center cursor-pointer transition-colors relative bg-slate-50/50 dark:bg-slate-900/40">
              <input
                type="file"
                accept=".docx,.txt"
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="space-y-2">
                <Upload size={24} className="mx-auto text-google-blue" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {selectedFile ? selectedFile.name : 'Bấm vào đây để chọn file .docx hoặc kéo thả file vào'}
                </p>
                <p className="text-[10px] text-slate-400">Hỗ trợ định dạng Microsoft Word (.docx) và Plain Text (.txt)</p>
              </div>
            </div>
          </div>

          {selectedFile && (
            <Input
              label="Tên đề thi"
              placeholder="Nhập tiêu đề đề thi..."
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
            />
          )}

          {isParsing && (
            <div className="p-4 bg-google-blue/10 rounded-2xl text-center text-xs text-google-blue font-semibold flex items-center justify-center gap-2">
              <Sparkles size={16} className="animate-spin" />
              Đang phân tích cấu trúc đề thi từ file...
            </div>
          )}

          {parsedPreview && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} />
                  Đã bóc tách thành công {parsedPreview.questions.length} câu hỏi!
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {parsedPreview.questions.slice(0, 3).map((q, i) => (
                  <div key={i} className="p-2 bg-white dark:bg-slate-900 rounded-xl text-[11px] border border-slate-200/60 dark:border-slate-800">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                      <span className="font-bold text-google-blue dark:text-blue-400 mr-1.5 whitespace-nowrap">
                        {((q as any).rawLabel || `Câu ${i + 1}`).replace(/[:.]\s*$/, '')}:
                      </span>
                      <span>{(q.content || '').replace(/^Câu\s*\d+\s*[:.]\s*/i, '')}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {(q as any).type === 'essay'
                        ? 'Tự luận'
                        : (q as any).type === 'fill_blank'
                        ? 'Điền từ / Trả lời ngắn'
                        : `${q.options?.length || 0} lựa chọn (A, B, C, D)`}
                    </p>
                  </div>
                ))}
                {parsedPreview.questions.length > 3 && (
                  <p className="text-[10px] text-slate-500 italic text-center">... và {parsedPreview.questions.length - 3} câu hỏi khác</p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsUploadDocxOpen(false);
                setParsedPreview(null);
              }}
            >
              Hủy
            </Button>
            <Button size="sm" disabled={!parsedPreview} onClick={handleConfirmUpload}>
              Tạo Đề Thi Ngay
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Folder / File Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={itemToDelete?.type === 'folder' ? 'Xóa thư mục?' : 'Xóa tài liệu đề thi?'}
        message={`Bạn có chắc chắn muốn xóa ${
          itemToDelete?.type === 'folder' ? 'thư mục' : 'tài liệu'
        } "${itemToDelete?.name}"? ${
          itemToDelete?.type === 'folder'
            ? 'Tất cả tài liệu bên trong thư mục này cũng sẽ bị xóa.'
            : 'Hành động này không thể hoàn tác.'
        }`}
        isDestructive
        confirmText="Xóa vĩnh viễn"
      />

      {/* Batch Delete Confirmation Dialog (Xóa nhiều mục khi bôi đen / chọn) */}
      <ConfirmDialog
        isOpen={!!batchDeleteModal}
        onClose={() => setBatchDeleteModal(null)}
        onConfirm={handleConfirmBatchDelete}
        title={`Xóa ${
          batchDeleteModal ? batchDeleteModal.fileIds.length + batchDeleteModal.folderIds.length : 0
        } mục đã chọn?`}
        message={`Bạn có chắc chắn muốn xóa ${
          batchDeleteModal?.folderIds.length
            ? `${batchDeleteModal.folderIds.length} thư mục (kèm toàn bộ tài liệu con bên trong)`
            : ''
        }${
          batchDeleteModal?.folderIds.length && batchDeleteModal?.fileIds.length ? ' và ' : ''
        }${
          batchDeleteModal?.fileIds.length ? `${batchDeleteModal.fileIds.length} tệp tài liệu đề thi` : ''
        }? Thao tác này sẽ xóa vĩnh viễn và không thể hoàn tác.`}
        isDestructive
        confirmText={`Xóa ${
          batchDeleteModal ? batchDeleteModal.fileIds.length + batchDeleteModal.folderIds.length : 0
        } mục`}
      />

      {/* Hidden File and Folder Upload Inputs for Direct Local Picking */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".docx,.txt,.pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        type="file"
        ref={folderInputRef}
        {...({ webkitdirectory: '', directory: '', multiple: true } as any)}
        onChange={handleFolderSelect}
        className="hidden"
      />
    </AppShell>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-medium">Đang tải tài liệu...</div>}>
      <DocumentsPageContent />
    </Suspense>
  );
}
