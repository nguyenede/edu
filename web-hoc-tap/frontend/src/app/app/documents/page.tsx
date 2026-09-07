'use client';

import React, { useState, useEffect, useRef, useLayoutEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuthStore } from '@/store/useAuthStore';
import { parseDocxFile, ParsedQuiz } from '@/lib/docParser';
import { safeLocalStorageSet } from '@/lib/safeStorage';
import {
  createDocumentFile,
  createDocumentFolder,
  deleteDocumentFile,
  deleteDocumentFolder,
  listDocuments,
  renameDocumentFile,
  renameDocumentFolder,
} from '@/lib/documentsApi';
import {
  FolderPlus,
  FilePlus,
  Folder,
  FileText,
  ChevronRight,
  Home,
  Trash2,
  Play,
  CheckCircle2,
  FileCode,
  Upload,
  BookOpen,
  Sparkles,
  Search,
  Edit2,
  FolderOpen,
  Download,
  RotateCw,
  Eye,
  MoreVertical,
  FolderUp,
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
  fileType: 'docx' | 'txt' | 'pdf' | 'other';
  parsedQuiz: ParsedQuiz;
  createdAt: string;
}

function DocumentsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token } = useAuthStore();

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  useEffect(() => {
    const fId = searchParams.get('folderId');
    if (fId) {
      setCurrentFolderId(fId);
    }
  }, [searchParams]);

  const [folders, setFolders] = useState<DocumentFolderItem[]>([]);
  const [files, setFiles] = useState<DocumentFileItem[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Load from and sync with localStorage
  const isInitialLoaded = useRef(false);

  // Helper: Tự động dọn dẹp và gộp các file trùng lặp/snapshot rác (giữ lại file có số câu nhiều nhất)
  const deduplicateFiles = (fileList: DocumentFileItem[]): DocumentFileItem[] => {
    const map = new Map<string, DocumentFileItem>();
    for (const f of fileList) {
      if (!f || !f.name) continue;
      const key = `${f.parentId || 'root'}_${f.name.trim().toLowerCase()}`;
      const existing = map.get(key);
      const fCount = f.parsedQuiz?.questions?.length || 0;
      const existingCount = existing?.parsedQuiz?.questions?.length || 0;
      if (!existing || fCount >= existingCount) {
        map.set(key, f);
      }
    }
    return Array.from(map.values());
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedFiles = localStorage.getItem('app_documents_files');
        if (savedFiles) {
          const parsed = JSON.parse(savedFiles);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cleaned = deduplicateFiles(parsed);
            setFiles(cleaned);
            safeLocalStorageSet('app_documents_files', JSON.stringify(cleaned));
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
      } finally {
        isInitialLoaded.current = true;
      }
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    let didCancel = false;

    const loadRemoteDocuments = async () => {
      try {
        const data = await listDocuments(token, currentFolderId);
        if (didCancel) return;
        setFolders(Array.isArray(data.folders) ? data.folders : []);
        setFiles(Array.isArray(data.files) ? data.files : []);
        setSyncError(null);
      } catch (err: any) {
        if (!didCancel) {
          setSyncError(err.message || 'Không thể tải tài liệu từ máy chủ');
        }
      } finally {
        isInitialLoaded.current = true;
      }
    };

    loadRemoteDocuments();
    return () => {
      didCancel = true;
    };
  }, [token, currentFolderId]);

  useEffect(() => {
    if (!isInitialLoaded.current) return;
    if (typeof window !== 'undefined') {
      try {
        const slicedFiles = Array.isArray(files) ? files.slice(0, 25) : [];
        safeLocalStorageSet('app_documents_files', JSON.stringify(slicedFiles));
        safeLocalStorageSet('app_documents_folders', JSON.stringify(folders));
      } catch (err) {
        console.error('Error saving documents to localStorage:', err);
      }
    }
  }, [files, folders]);

  // Open file in the current tab with dynamic route /app/documents/[id]/view
  const handleOpenFile = (fileItem: DocumentFileItem) => {
    if (typeof window !== 'undefined') {
      const slicedFiles = Array.isArray(files) ? files.slice(0, 25) : [];
      safeLocalStorageSet('app_documents_files', JSON.stringify(slicedFiles));
      safeLocalStorageSet('app_documents_folders', JSON.stringify(folders));
    }
    router.push(`/app/documents/${encodeURIComponent(fileItem.id)}/view`);
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

  // Close context menu on outside interaction and global context menu interceptor
  useEffect(() => {
    const handleClose = () => {
      setContextMenu((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
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
  }, []);

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
          const updated = await renameDocumentFolder(token, renameItem.id, renameValue.trim());
          setFolders((prev) => prev.map((f) => (f.id === renameItem.id ? updated : f)));
          setRenameItem(null);
          return;
        } catch (err: any) {
          setSyncError(err.message || 'Không thể đổi tên thư mục');
        }
      }
      setFolders((prev) =>
        prev.map((f) => (f.id === renameItem.id ? { ...f, name: renameValue.trim() } : f))
      );
    } else {
      if (token) {
        try {
          const updated = await renameDocumentFile(token, renameItem.id, renameValue.trim());
          setFiles((prev) =>
            prev.map((f) =>
              f.id === renameItem.id
                ? {
                    ...updated,
                    parsedQuiz: {
                      ...(updated.parsedQuiz || f.parsedQuiz),
                      title: renameValue.trim(),
                    },
                  }
                : f
            )
          );
          setRenameItem(null);
          return;
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
                parsedQuiz: { ...f.parsedQuiz, title: renameValue.trim() },
              }
            : f
        )
      );
    }
    setRenameItem(null);
  };

  const handleDownloadFile = (fileItem: DocumentFileItem) => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(fileItem.parsedQuiz, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${fileItem.name.replace(/\.[^/.]+$/, '')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filter current folder items
  const currentFolders = folders.filter((f) => f.parentId === currentFolderId && f.name.toLowerCase().includes(filterText.toLowerCase()));
  const currentFiles = files.filter((f) => f.parentId === currentFolderId && f.name.toLowerCase().includes(filterText.toLowerCase()));

  // Breadcrumbs calculation
  const getBreadcrumbs = () => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'Tài liệu của tôi' }];
    let curr = currentFolderId;
    const path: DocumentFolderItem[] = [];
    while (curr) {
      const f = folders.find((item) => item.id === curr);
      if (f) {
        path.unshift(f);
        curr = f.parentId;
      } else {
        break;
      }
    }
    return [...crumbs, ...path.map((p) => ({ id: p.id, name: p.name }))];
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    if (token) {
      try {
        const created = await createDocumentFolder(token, {
          name: newFolderName.trim(),
          parentId: currentFolderId,
        });
        setFolders((prev) => [created, ...prev]);
        setNewFolderName('');
        setIsCreateFolderOpen(false);
        setSyncError(null);
        return;
      } catch (err: any) {
        setSyncError(err.message || 'Không thể tạo thư mục');
      }
    }
    const newFolder: DocumentFolderItem = {
      id: `folder_${Date.now()}`,
      name: newFolderName.trim(),
      parentId: currentFolderId,
      createdAt: new Date().toISOString(),
    };
    setFolders([...folders, newFolder]);
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
      setUploadTitle(file.name.replace(/\.(docx|txt)$/i, ''));
      setIsParsing(true);
      try {
        const parsed = await parseDocxFile(file);
        setParsedPreview(parsed);
      } catch (err) {
        console.error('Error parsing docx file:', err);
      } finally {
        setIsParsing(false);
      }
      setIsUploadDocxOpen(true);
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
      if (file.name.endsWith('.docx') || file.name.endsWith('.txt') || file.name.endsWith('.pdf')) {
        let parsed: ParsedQuiz;
        try {
          if (file.name.endsWith('.docx')) {
            parsed = await parseDocxFile(file);
          } else {
            parsed = {
              title: file.name.replace(/\.[^/.]+$/, ''),
              description: 'Tài liệu tải lên từ thư mục',
              questions: [
                {
                  id: `q_${Date.now()}_${i}`,
                  content: `Nội dung tài liệu từ file ${file.name}`,
                  points: 1.0,
                  options: [
                    { content: 'Đáp án A', isCorrect: true },
                    { content: 'Đáp án B', isCorrect: false },
                    { content: 'Đáp án C', isCorrect: false },
                    { content: 'Đáp án D', isCorrect: false },
                  ],
                },
              ],
            };
          }
        } catch {
          parsed = {
            title: file.name.replace(/\.[^/.]+$/, ''),
            description: 'Tài liệu từ thư mục',
            questions: [],
          };
        }

        uploadedFiles.push({
          id: `file_${Date.now()}_${i}`,
          name: file.name,
          parentId: newFolder.id,
          fileType: file.name.endsWith('.docx') ? 'docx' : file.name.endsWith('.pdf') ? 'pdf' : 'txt',
          createdAt: new Date().toISOString(),
          parsedQuiz: parsed,
        });
      }
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

    let newDocFile: DocumentFileItem = {
      id: `file_${Date.now()}`,
      name: (uploadTitle.trim() || selectedFile?.name || 'Tài liệu đề thi') + (selectedFile?.name.endsWith('.docx') ? '.docx' : '.txt'),
      parentId: currentFolderId,
      fileType: selectedFile?.name.endsWith('.docx') ? 'docx' : 'txt',
      createdAt: new Date().toISOString(),
      parsedQuiz: {
        ...parsedPreview,
        title: uploadTitle.trim() || parsedPreview.title,
      },
    };

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

  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (token) {
      try {
        await deleteDocumentFolder(token, folderId);
        setSyncError(null);
      } catch (err: any) {
        setSyncError(err.message || 'Không thể xóa thư mục');
        return;
      }
    }
    setFolders(folders.filter((f) => f.id !== folderId && f.parentId !== folderId));
    setFiles(files.filter((f) => f.parentId !== folderId));
  };

  const handleDeleteFile = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (token) {
      try {
        await deleteDocumentFile(token, fileId);
        setSyncError(null);
      } catch (err: any) {
        setSyncError(err.message || 'Không thể xóa tệp');
        return;
      }
    }
    setFiles(files.filter((f) => f.id !== fileId));
  };

  const handleGoToCreate = () => {
    if (currentFolderId) {
      const curFolder = folders.find((f) => f.id === currentFolderId);
      router.push(
        `/app/documents/create?folderId=${currentFolderId}&folderName=${encodeURIComponent(curFolder?.name || '')}`
      );
    } else {
      router.push('/app/documents/create');
    }
  };

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1 text-2xl font-[450] tracking-tight text-slate-900 dark:text-slate-100 flex-wrap -ml-2">
          {getBreadcrumbs().map((crumb, idx, arr) => (
            <React.Fragment key={crumb.id || 'root'}>
              <button
                type="button"
                onClick={() => setCurrentFolderId(crumb.id)}
                className={`transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 ${
                  idx === arr.length - 1
                    ? 'text-slate-900 dark:text-white font-[450]'
                    : 'text-slate-700 dark:text-slate-300 font-[450]'
                }`}
              >
                {crumb.name}
              </button>
              {idx < arr.length - 1 && (
                <ChevronRight size={20} className="text-slate-400 dark:text-slate-500 shrink-0 stroke-[1.75]" />
              )}
            </React.Fragment>
          ))}
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
      <div
        id="document-canvas-container"
        className="space-y-5 min-h-full flex-1 w-full pb-10 flex flex-col"
        onClick={() => setSelectedItemId(null)}
        onContextMenu={(e) => openContextMenu(e, 'canvas')}
      >
        {syncError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            {syncError}
          </div>
        )}

        {/* FOLDERS SECTION */}
        {currentFolders.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {currentFolders.map((folder) => {
              const isSelected = selectedItemId === folder.id;
              return (
                <div
                  key={folder.id}
                  data-context-item="folder"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItemId(folder.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setCurrentFolderId(folder.id);
                  }}
                  onContextMenu={(e) => {
                    setSelectedItemId(folder.id);
                    openContextMenu(e, 'folder', folder);
                  }}
                  className={`group h-12 px-3.5 rounded-[12px] flex items-center justify-between transition-colors cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#c2e7ff] text-[#001d35] dark:bg-blue-900/40 dark:text-blue-200'
                      : 'bg-[#f0f4f9] hover:bg-[#e1e5ea] dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div
                    className="flex items-center gap-3 min-w-0 flex-1"
                    onClick={() => setCurrentFolderId(folder.id)}
                  >
                    <Folder
                      size={20}
                      className={`shrink-0 ${
                        isSelected
                          ? 'text-[#001d35] dark:text-blue-300 fill-current'
                          : 'text-slate-700 dark:text-slate-300 fill-current'
                      }`}
                    />
                    <span className="text-xs md:text-sm font-medium truncate">
                      {folder.name}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItemId(folder.id);
                      openContextMenu(e, 'folder', folder);
                    }}
                    className="p-1 rounded-full text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition-colors shrink-0 cursor-pointer"
                    title="Tùy chọn"
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* FILES / GENERATED EXAMS SECTION */}
        {currentFiles.length === 0 && currentFolders.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-3 select-none">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-google-blue/10 text-google-blue flex items-center justify-center">
              <FileCode size={28} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Chưa có tệp đề thi nào trong thư mục này</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Hãy nhấn chuột phải vào vùng trống hoặc nhấn nút "Tạo / Upload đề từ file (.docx)" ở góc trên để tạo đề thi ngay.
              </p>
            </div>
            <Button size="sm" onClick={() => setIsUploadDocxOpen(true)}>
              <Upload size={15} className="mr-1.5" />
              Upload File Word (.docx) Tạo Đề
            </Button>
          </div>
        ) : currentFiles.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
            {currentFiles.map((fileItem) => {
              const isSelected = selectedItemId === fileItem.id;
              const qCount = fileItem.parsedQuiz.questions.length;
              return (
                <div
                  key={fileItem.id}
                  data-context-item="file"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItemId(fileItem.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleOpenFile(fileItem);
                  }}
                  onContextMenu={(e) => {
                    setSelectedItemId(fileItem.id);
                    openContextMenu(e, 'file', undefined, fileItem);
                  }}
                  className={`group rounded-[12px] p-2.5 flex flex-col justify-between max-w-[200px] w-full aspect-square transition-colors cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#c2e7ff] dark:bg-blue-900/40'
                      : 'bg-[#f0f4f9] hover:bg-[#e1e5ea] dark:bg-slate-800/80 dark:hover:bg-slate-800'
                  }`}
                >
                  {/* Top File Title Bar */}
                  <div className="flex items-center justify-between gap-1.5 w-full min-w-0">
                    <div
                      className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer"
                      onClick={() => handleOpenFile(fileItem)}
                    >
                      <div className="w-4 h-4 rounded-[3px] bg-[#185abd] text-white flex items-center justify-center font-bold text-[8px] shrink-0 shadow-2xs">
                        W
                      </div>
                      <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate">
                        {fileItem.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItemId(fileItem.id);
                        openContextMenu(e, 'file', undefined, fileItem);
                      }}
                      className="p-0.5 rounded-full text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition-colors shrink-0 cursor-pointer"
                      title="Tùy chọn"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>

                  {/* Real 100% Document Paper Preview (Trang giấy thuần không viền) */}
                  <div
                    onClick={() => handleOpenFile(fileItem)}
                    className="bg-white dark:bg-slate-900 rounded-lg flex-1 mt-1.5 shadow-2xs overflow-hidden p-2 flex flex-col justify-between text-left select-none"
                  >
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

      {/* Custom Context Menu */}
      {contextMenu.isOpen && (
        <div
          ref={menuRef}
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
          className="fixed z-50 w-max min-w-0 bg-white dark:bg-slate-900 rounded-[6px] shadow-[0_4px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] p-0 text-xs text-slate-700 dark:text-slate-200 select-none overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {contextMenu.type === 'canvas' && (
            <>
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
                  handleOpenRename('folder', contextMenu.folder!.id, contextMenu.folder!.name);
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left font-medium cursor-pointer whitespace-nowrap"
              >
                <Edit2 size={15} className="text-slate-500 shrink-0" />
                <span>Đổi tên</span>
              </button>

              <button
                onClick={(e) => {
                  handleDeleteFolder(contextMenu.folder!.id, e);
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors text-left font-medium cursor-pointer whitespace-nowrap"
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
                  handleOpenFile(contextMenu.file!);
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left font-medium text-google-blue cursor-pointer whitespace-nowrap"
              >
                <Eye size={16} className="shrink-0" />
                <span>Xem chi tiết</span>
              </button>

              <button
                onClick={() => {
                  router.push('/app/quizzes');
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left font-medium cursor-pointer whitespace-nowrap"
              >
                <Play size={15} className="text-emerald-500 shrink-0" />
                <span>Tạo phòng thi</span>
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
                  handleDeleteFile(contextMenu.file!.id, e);
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors text-left font-medium cursor-pointer whitespace-nowrap"
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
                      Câu {i + 1}: {q.content}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{q.options.length} lựa chọn (A, B, C, D)</p>
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
