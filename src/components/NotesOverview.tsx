import React, { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion, MotionConfig } from 'motion/react';
import {
  StickyNote,
  FileText,
  Search,
  Plus,
  BookOpen,
  Pin,
  Trash2,
  Edit2,
  Copy,
  Check,
  X,
  FolderOpen,
  FolderPlus,
  Folder,
  Upload,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  ExternalLink,
  Image as ImageIcon,
  Type,
  Eye,
  Sparkles,
  CheckSquare,
  Clock,
  RotateCcw,
  CheckCircle2,
  ZoomIn,
  ArrowUpDown,
} from 'lucide-react';
import { NoteItem, NoteFolder, StudyFile, StickyNoteItem, StudyTask } from '../types';
import { getAllTasksFromStorage, saveAllTasksToStorage } from '../utils/fileStorage';
import { playTaskCompleteSound, playTaskUndoSound } from '../utils/pomodoroAudio';
import { ImageZoomLightbox } from './ImageZoomLightbox';
import {
  RichStickyContent,
  clipboardToStickyMarkdown,
  stickyContentToPlainPreview,
} from '../utils/richStickyFormat';

export interface FileStickyNoteEntry {
  fileId: string;
  fileName: string;
  file: StudyFile;
  note: StickyNoteItem;
}

interface NotesOverviewProps {
  notes: NoteItem[];
  folders: NoteFolder[];
  studyFiles?: StudyFile[];
  onSelectNoteToEdit: (noteId: string) => void;
  onStartNewNote: () => void;
  onTogglePinNote: (noteId: string, currentPin?: boolean) => void;
  onDeleteNote: (noteId: string) => void;
  onOpenFileAtPage?: (file: StudyFile, pageNumber: number) => void;
  onUpdateStickyNote?: (fileId: string, updatedNote: StickyNoteItem) => void;
  onDeleteStickyNote?: (fileId: string, stickyNoteId: string) => void;
  onSwitchToEditor: () => void;
  onAddFolder?: (folder: Omit<NoteFolder, 'id' | 'createdAt'>) => void;
  onUpdateFolder?: (folderId: string, name: string, color?: string, parentId?: string | null) => void;
  onDeleteFolder?: (folderId: string) => void;
  onTriggerNewFile?: () => void;
}

const PRESET_COLORS = [
  { bg: '#fef08a', text: '#713f12', name: 'زرد کلاسیک' },
  { bg: '#bbf7d0', text: '#14532d', name: 'سبز نعنایی' },
  { bg: '#fed7aa', text: '#7c2d12', name: 'هلویی' },
  { bg: '#bae6fd', text: '#0c4a6e', name: 'آبی آسمانی' },
  { bg: '#e9d5ff', text: '#581c87', name: 'بنفش اسطوخودوس' },
  { bg: '#fecdd3', text: '#881337', name: 'صورتی ملایم' },
  { bg: '#f3f4f6', text: '#1f2937', name: 'خاکستری مینیمال' },
];

const FOLDER_COLOR_PALETTE = [
  { name: 'آبی', value: '#2563eb', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  { name: 'زمردی', value: '#059669', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { name: 'کهربایی', value: '#d97706', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  { name: 'بنفش', value: '#7c3aed', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  { name: 'رز', value: '#e11d48', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  { name: 'فیروزه‌ای', value: '#0891b2', bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  { name: 'نارنجی', value: '#ea580c', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  { name: 'دودی', value: '#4b5563', bg: 'bg-neutral-100', text: 'text-neutral-700', dot: 'bg-neutral-500' },
];

interface CardTopAccentTheme {
  barGradient: string;
  glow: string;
  topWash: string;
  badgeBg: string;
  badgeText: string;
}

const CARD_TOP_ACCENT_MAP: Record<string, CardTopAccentTheme> = {
  '#fef08a': {
    barGradient: 'linear-gradient(90deg, #f59e0b 0%, #facc15 48%, #fde047 100%)',
    glow: 'rgba(245, 158, 11, 0.40)',
    topWash: 'rgba(254, 240, 138, 0.34)',
    badgeBg: '#fef08a',
    badgeText: '#713f12',
  },
  '#bbf7d0': {
    barGradient: 'linear-gradient(90deg, #059669 0%, #10b981 50%, #4ade80 100%)',
    glow: 'rgba(16, 185, 129, 0.34)',
    topWash: 'rgba(187, 247, 208, 0.34)',
    badgeBg: '#bbf7d0',
    badgeText: '#14532d',
  },
  '#fed7aa': {
    barGradient: 'linear-gradient(90deg, #ea580c 0%, #f97316 50%, #fb923c 100%)',
    glow: 'rgba(249, 115, 22, 0.34)',
    topWash: 'rgba(254, 215, 170, 0.36)',
    badgeBg: '#fed7aa',
    badgeText: '#7c2d12',
  },
  '#bae6fd': {
    barGradient: 'linear-gradient(90deg, #0284c7 0%, #0ea5e9 50%, #38bdf8 100%)',
    glow: 'rgba(14, 165, 233, 0.34)',
    topWash: 'rgba(186, 230, 253, 0.36)',
    badgeBg: '#bae6fd',
    badgeText: '#0c4a6e',
  },
  '#e9d5ff': {
    barGradient: 'linear-gradient(90deg, #7c3aed 0%, #9333ea 50%, #c084fc 100%)',
    glow: 'rgba(139, 92, 246, 0.34)',
    topWash: 'rgba(233, 213, 255, 0.36)',
    badgeBg: '#e9d5ff',
    badgeText: '#581c87',
  },
  '#fecdd3': {
    barGradient: 'linear-gradient(90deg, #e11d48 0%, #f43f5e 50%, #fb7185 100%)',
    glow: 'rgba(244, 63, 94, 0.34)',
    topWash: 'rgba(254, 205, 211, 0.36)',
    badgeBg: '#fecdd3',
    badgeText: '#881337',
  },
  '#f3f4f6': {
    barGradient: 'linear-gradient(90deg, #475569 0%, #64748b 50%, #94a3b8 100%)',
    glow: 'rgba(100, 116, 139, 0.28)',
    topWash: 'rgba(226, 232, 240, 0.42)',
    badgeBg: '#e2e8f0',
    badgeText: '#1e293b',
  },
  '#2563eb': {
    barGradient: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 50%, #60a5fa 100%)',
    glow: 'rgba(37, 99, 235, 0.30)',
    topWash: 'rgba(219, 234, 254, 0.45)',
    badgeBg: '#dbeafe',
    badgeText: '#1e40af',
  },
  '#059669': {
    barGradient: 'linear-gradient(90deg, #047857 0%, #059669 50%, #34d399 100%)',
    glow: 'rgba(5, 150, 105, 0.30)',
    topWash: 'rgba(209, 250, 229, 0.45)',
    badgeBg: '#d1fae5',
    badgeText: '#065f46',
  },
  '#d97706': {
    barGradient: 'linear-gradient(90deg, #b45309 0%, #d97706 50%, #fbbf24 100%)',
    glow: 'rgba(217, 119, 6, 0.34)',
    topWash: 'rgba(254, 243, 199, 0.50)',
    badgeBg: '#fef3c7',
    badgeText: '#92400e',
  },
  '#7c3aed': {
    barGradient: 'linear-gradient(90deg, #6d28d9 0%, #7c3aed 50%, #a78bfa 100%)',
    glow: 'rgba(124, 58, 237, 0.30)',
    topWash: 'rgba(237, 233, 254, 0.48)',
    badgeBg: '#ede9fe',
    badgeText: '#5b21b6',
  },
  '#e11d48': {
    barGradient: 'linear-gradient(90deg, #be123c 0%, #e11d48 50%, #fb7185 100%)',
    glow: 'rgba(225, 29, 72, 0.30)',
    topWash: 'rgba(255, 228, 230, 0.48)',
    badgeBg: '#ffe4e6',
    badgeText: '#9f1239',
  },
  '#0891b2': {
    barGradient: 'linear-gradient(90deg, #0e7490 0%, #0891b2 50%, #22d3ee 100%)',
    glow: 'rgba(8, 145, 178, 0.30)',
    topWash: 'rgba(207, 250, 254, 0.48)',
    badgeBg: '#cffafe',
    badgeText: '#155e75',
  },
  '#ea580c': {
    barGradient: 'linear-gradient(90deg, #c2410c 0%, #ea580c 50%, #fb923c 100%)',
    glow: 'rgba(234, 88, 12, 0.30)',
    topWash: 'rgba(255, 237, 213, 0.48)',
    badgeBg: '#ffedd5',
    badgeText: '#9a3412',
  },
  '#4b5563': {
    barGradient: 'linear-gradient(90deg, #374151 0%, #4b5563 50%, #9ca3af 100%)',
    glow: 'rgba(75, 85, 99, 0.25)',
    topWash: 'rgba(243, 244, 246, 0.55)',
    badgeBg: '#f3f4f6',
    badgeText: '#374151',
  },
  '#64748b': {
    barGradient: 'linear-gradient(90deg, #475569 0%, #64748b 50%, #94a3b8 100%)',
    glow: 'rgba(100, 116, 139, 0.22)',
    topWash: 'rgba(241, 245, 249, 0.50)',
    badgeBg: '#e2e8f0',
    badgeText: '#334155',
  },
};

function getCardTopAccentTheme(color?: string): CardTopAccentTheme {
  const key = (color || '#fef08a').trim().toLowerCase();
  if (CARD_TOP_ACCENT_MAP[key]) {
    return CARD_TOP_ACCENT_MAP[key];
  }
  const safeColor = color || '#fef08a';
  return {
    barGradient: `linear-gradient(90deg, ${safeColor} 0%, ${safeColor}dd 60%, ${safeColor}99 100%)`,
    glow: `${safeColor}44`,
    topWash: `${safeColor}26`,
    badgeBg: safeColor,
    badgeText: '#111827',
  };
}

/**
 * Converts HTML content to clean readable plain text while strictly preserving
 * paragraph and line breaks so preview cards and text viewers match how the user wrote them.
 */
function htmlToPreviewText(html: string): string {
  if (!html) return '';
  const withBreaks = html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n');

  const div = document.createElement('div');
  div.innerHTML = withBreaks;
  const rawText = div.textContent || div.innerText || '';

  return rawText
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line, idx, arr) => line.length > 0 || (idx > 0 && arr[idx - 1].length > 0))
    .join('\n')
    .trim();
}

/**
 * Strips HTML tags and collapses spaces for search queries
 */
function stripHtml(html: string): string {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}

/**
 * Helper to get all descendant folder IDs for a given folder ID
 */
function getFolderAndDescendantIds(folderId: string, allFolders: NoteFolder[]): string[] {
  const result: string[] = [folderId];
  const queue: string[] = [folderId];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const children = allFolders.filter((f) => f.parentId === curr);
    children.forEach((c) => {
      result.push(c.id);
      queue.push(c.id);
    });
  }
  return result;
}

function normalizeSortDateKey(dateStr?: string): number {
  if (!dateStr) return 0;
  const ascii = dateStr
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .trim();

  const slashMatch = ascii.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (slashMatch) {
    return Number(slashMatch[1]) * 10000 + Number(slashMatch[2]) * 100 + Number(slashMatch[3]);
  }

  const parsed = Date.parse(ascii);
  if (!Number.isNaN(parsed)) {
    try {
      const jalali = new Intl.DateTimeFormat('fa-IR-u-nu-latn').format(new Date(parsed));
      const jm = jalali.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
      if (jm) {
        return Number(jm[1]) * 10000 + Number(jm[2]) * 100 + Number(jm[3]);
      }
    } catch {
      // Fallback to epoch ms
    }
    return parsed;
  }

  const looseMatch = ascii.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (looseMatch) {
    return Number(looseMatch[1]) * 10000 + Number(looseMatch[2]) * 100 + Number(looseMatch[3]);
  }
  return 0;
}

function extractNoteTimestamp(id?: string): number | null {
  if (!id) return null;
  const match = id.match(/(\d{10,15})/);
  return match ? Number(match[1]) : null;
}

function compareCreatedDatesDesc(aStr?: string, bStr?: string): number {
  const aIso = aStr ? Date.parse(aStr.trim()) : Number.NaN;
  const bIso = bStr ? Date.parse(bStr.trim()) : Number.NaN;
  if (!Number.isNaN(aIso) && !Number.isNaN(bIso)) {
    return bIso - aIso;
  }
  const aKey = normalizeSortDateKey(aStr);
  const bKey = normalizeSortDateKey(bStr);
  return bKey - aKey;
}

interface ActiveViewerItem {
  cardKey: string;
  type: 'sticky' | 'note';
  id: string;
  title: string;
  content: string;
  rawHtml?: string;
  sourceLabel: string;
  pageNumber?: number;
  color?: string;
  textColor?: string;
  date?: string;
  originalEntry?: FileStickyNoteEntry;
  originalNote?: NoteItem;
  isBold?: boolean;
  imageUrl?: string;
  images?: string[];
  accentBarGradient?: string;
}

interface MorphRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

type ViewerPhase = 'idle' | 'opening' | 'open' | 'closing';

const EXPAND_SPRING = {
  type: 'spring' as const,
  stiffness: 240,
  damping: 28,
  mass: 0.92,
};

const COLLAPSE_SPRING = {
  type: 'spring' as const,
  stiffness: 265,
  damping: 30,
  mass: 0.88,
};

export const NotesOverview: React.FC<NotesOverviewProps> = ({
  notes,
  folders,
  studyFiles = [],
  onSelectNoteToEdit,
  onStartNewNote,
  onTogglePinNote,
  onDeleteNote,
  onOpenFileAtPage,
  onUpdateStickyNote,
  onDeleteStickyNote,
  onSwitchToEditor,
  onAddFolder,
  onUpdateFolder,
  onDeleteFolder,
  onTriggerNewFile,
}) => {
  // Main Tab State: 'notes' (یادداشت‌ها) | 'tasks' (تسک‌ها) | 'sticky-notes' (استیکی‌نوت‌ها)
  const [activeTab, setActiveTab] = useState<'notes' | 'tasks' | 'sticky-notes'>('notes');

  // Search input
  const [searchQuery, setSearchQuery] = useState('');

  // Sticky Notes Filter (by file)
  const [selectedFileId, setSelectedFileId] = useState<string>('all');

  // Standalone Notes Filter (by folder)
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');

  // Standalone Notes Sort Order ('newest' | 'oldest') & Modal State
  const [noteSortOrder, setNoteSortOrder] = useState<'newest' | 'oldest'>(() => {
    try {
      const saved = localStorage.getItem('study_notes_sort_order');
      return saved === 'oldest' ? 'oldest' : 'newest';
    } catch {
      return 'newest';
    }
  });
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  const handleSelectSortOrder = (order: 'newest' | 'oldest') => {
    setNoteSortOrder(order);
    try {
      localStorage.setItem('study_notes_sort_order', order);
    } catch {
      // Ignore storage failures
    }
    setIsSortMenuOpen(false);
  };

  // Sticky Notes Sort Order ('newest' | 'oldest') & Popover State
  const [stickySortOrder, setStickySortOrder] = useState<'newest' | 'oldest'>(() => {
    try {
      const saved = localStorage.getItem('study_sticky_sort_order');
      return saved === 'oldest' ? 'oldest' : 'newest';
    } catch {
      return 'newest';
    }
  });
  const [isStickySortMenuOpen, setIsStickySortMenuOpen] = useState(false);
  const stickySortMenuRef = useRef<HTMLDivElement | null>(null);

  const handleSelectStickySortOrder = (order: 'newest' | 'oldest') => {
    setStickySortOrder(order);
    try {
      localStorage.setItem('study_sticky_sort_order', order);
    } catch {
      // Ignore storage failures
    }
    setIsStickySortMenuOpen(false);
  };

  // Category Submenu Dropdown Popover Anchor (زیرمجموعه کشویی دسته‌بندی‌ها دقیقاً مانند کتابخانه)
  const [isCategorySubmenuOpen, setIsCategorySubmenuOpen] = useState(false);
  const categorySubmenuRef = useRef<HTMLDivElement | null>(null);

  // File Submenu Dropdown Popover Anchor for Sticky Notes (زیرمجموعه کشویی فیلتر فایل‌ها)
  const [isFileSubmenuOpen, setIsFileSubmenuOpen] = useState(false);
  const fileSubmenuRef = useRef<HTMLDivElement | null>(null);

  // Close category, file & sort submenus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (categorySubmenuRef.current && !categorySubmenuRef.current.contains(e.target as Node)) {
        setIsCategorySubmenuOpen(false);
      }
      if (fileSubmenuRef.current && !fileSubmenuRef.current.contains(e.target as Node)) {
        setIsFileSubmenuOpen(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortMenuOpen(false);
      }
      if (stickySortMenuRef.current && !stickySortMenuRef.current.contains(e.target as Node)) {
        setIsStickySortMenuOpen(false);
      }
    };
    if (isCategorySubmenuOpen || isFileSubmenuOpen || isSortMenuOpen || isStickySortMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }
  }, [isCategorySubmenuOpen, isFileSubmenuOpen, isSortMenuOpen, isStickySortMenuOpen]);

  // Clean Reader Window Modal & Card Expand/Collapse State
  const [viewingItem, setViewingItem] = useState<ActiveViewerItem | null>(null);
  const [viewerPhase, setViewerPhase] = useState<ViewerPhase>('idle');
  const [originRect, setOriginRect] = useState<MorphRect | null>(null);
  const [targetRect, setTargetRect] = useState<MorphRect | null>(null);
  const [targetContentHeight, setTargetContentHeight] = useState<number>(360);
  const [readerFontSize, setReaderFontSize] = useState<'normal' | 'large' | 'huge'>('large');

  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const modalMeasureRef = useRef<HTMLDivElement | null>(null);
  const modalMeasureContentRef = useRef<HTMLDivElement | null>(null);
  const viewerPhaseRef = useRef<ViewerPhase>('idle');
  viewerPhaseRef.current = viewerPhase;

  const setCardRef = useCallback((key: string, el: HTMLElement | null) => {
    if (el) {
      cardRefs.current.set(key, el);
    } else {
      cardRefs.current.delete(key);
    }
  }, []);

  const closeViewerImmediate = useCallback(() => {
    setViewingItem(null);
    setViewerPhase('idle');
    setOriginRect(null);
    setTargetRect(null);
  }, []);

  const handleCloseViewer = useCallback(() => {
    if (!viewingItem) return;
    if (viewerPhaseRef.current === 'closing') return;

    const cardEl = cardRefs.current.get(viewingItem.cardKey);
    if (cardEl) {
      const r = cardEl.getBoundingClientRect();
      setOriginRect({ left: r.left, top: r.top, width: r.width, height: r.height });
      setViewerPhase('closing');
    } else if (originRect) {
      setViewerPhase('closing');
    } else {
      closeViewerImmediate();
    }
  }, [viewingItem, originRect, closeViewerImmediate]);

  // Measure exact centered target rect before paint when opening or changing font size
  useLayoutEffect(() => {
    if (!viewingItem || viewerPhase === 'closing' || viewerPhase === 'idle') return;
    const measureEl = modalMeasureRef.current;
    if (!measureEl) return;

    const r = measureEl.getBoundingClientRect();
    const contentR = modalMeasureContentRef.current?.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      setTargetRect((prev) =>
        prev &&
        Math.abs(prev.left - r.left) < 0.5 &&
        Math.abs(prev.top - r.top) < 0.5 &&
        Math.abs(prev.width - r.width) < 0.5 &&
        Math.abs(prev.height - r.height) < 0.5
          ? prev
          : { left: r.left, top: r.top, width: r.width, height: r.height }
      );
      if (contentR && contentR.height > 0) {
        setTargetContentHeight((prev) =>
          Math.abs(prev - contentR.height) < 0.5 ? prev : contentR.height
        );
      }
    }
  }, [viewingItem, readerFontSize, viewerPhase]);

  // Keep centered target rect aligned on viewport resize while open
  useEffect(() => {
    if (!viewingItem || viewerPhase === 'closing' || viewerPhase === 'idle') return;
    const handleResize = () => {
      const measureEl = modalMeasureRef.current;
      if (!measureEl) return;
      const r = measureEl.getBoundingClientRect();
      const contentR = modalMeasureContentRef.current?.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setTargetRect((prev) =>
          prev &&
          Math.abs(prev.left - r.left) < 0.5 &&
          Math.abs(prev.top - r.top) < 0.5 &&
          Math.abs(prev.width - r.width) < 0.5 &&
          Math.abs(prev.height - r.height) < 0.5
            ? prev
            : { left: r.left, top: r.top, width: r.width, height: r.height }
        );
        if (contentR && contentR.height > 0) {
          setTargetContentHeight((prev) =>
            Math.abs(prev - contentR.height) < 0.5 ? prev : contentR.height
          );
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewingItem, viewerPhase]);

  // Safety fallback in case reduced-motion skips onAnimationComplete during closing
  useEffect(() => {
    if (viewerPhase !== 'closing') return;
    const timer = window.setTimeout(() => {
      if (viewerPhaseRef.current === 'closing') {
        closeViewerImmediate();
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [viewerPhase, closeViewerImmediate]);

  // Fullscreen Zoom Lightbox State
  const [lightboxState, setLightboxState] = useState<{
    images: string[];
    index: number;
    title?: string;
  } | null>(null);

  // Inline expanded sticky note cards (امکان مطالعه کامل یادداشت مستقیماً در کارت بدون نیاز به پاپ‌آپ)
  const [expandedStickyIds, setExpandedStickyIds] = useState<Record<string, boolean>>({});

  const toggleExpandSticky = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedStickyIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Sticky Note Quick Edit Modal
  const [editingStickyNote, setEditingStickyNote] = useState<FileStickyNoteEntry | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState('#fef08a');
  const [editTextColor, setEditTextColor] = useState('#713f12');

  // Folder Management Modal State (ایجاد و ویرایش پوشه‌ها هماهنگ با دیزاین سراسری)
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<NoteFolder | null>(null);
  const [parentFolderIdInput, setParentFolderIdInput] = useState<string | null>(null);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [folderColorInput, setFolderColorInput] = useState('#2563eb');
  const [folderToDelete, setFolderToDelete] = useState<NoteFolder | null>(null);

  // Delete Confirmations
  const [deletingStickyNote, setDeletingStickyNote] = useState<FileStickyNoteEntry | null>(null);
  const [deletingNote, setDeletingNote] = useState<NoteItem | null>(null);

  // Copy toast notification
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  const showCopyToast = (msg: string) => {
    setCopiedToast(msg);
    setTimeout(() => {
      setCopiedToast(null);
    }, 2200);
  };

  // Tasks State & Operations (تسک‌های مطالعه با محیط خلوت، تمیز و امکان ثبت آسان)
  const [tasks, setTasks] = useState<StudyTask[]>(() => getAllTasksFromStorage());
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [taskTitleInput, setTaskTitleInput] = useState('');
  const [taskDescInput, setTaskDescInput] = useState('');
  const [taskPriorityInput, setTaskPriorityInput] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskDueDateInput, setTaskDueDateInput] = useState('');
  const [animatingTaskIds, setAnimatingTaskIds] = useState<Record<string, boolean>>({});

  // Note: body already has height: 100dvh; overflow: hidden in CSS, and modals use
  // fixed inset-0 with overscroll-contain, so we avoid mutating body.style.touchAction
  // or toggling overflow-hidden on <main> (which breaks scrolling after modal close).

  // Reload tasks when data is imported/restored
  useEffect(() => {
    const handleRestored = () => {
      setTasks(getAllTasksFromStorage());
    };
    window.addEventListener('study-data-restored', handleRestored);
    return () => window.removeEventListener('study-data-restored', handleRestored);
  }, []);

  // Persist tasks whenever changed
  useEffect(() => {
    saveAllTasksToStorage(tasks);
  }, [tasks]);

  const activeTasks = useMemo(() => {
    return tasks
      .filter((t) => !t.completed)
      .sort((a, b) => {
        const priorityWeights: Record<string, number> = { high: 3, medium: 2, low: 1 };
        const weightA = priorityWeights[a.priority || 'medium'] || 2;
        const weightB = priorityWeights[b.priority || 'medium'] || 2;
        if (weightA !== weightB) return weightB - weightA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks
      .filter((t) => t.completed)
      .sort((a, b) => {
        const timeA = a.completedAt || a.createdAt;
        const timeB = b.completedAt || b.createdAt;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });
  }, [tasks]);

  const activeTasksCount = activeTasks.length;
  const completedTasksCount = completedTasks.length;

  const handleToggleTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (!task.completed) {
      // پخش صدای دیرینگ مینیمال و آرام‌بخش با وب آودیو
      playTaskCompleteSound(0.6);

      // فعال‌سازی انیمیشن اسلایدی و مشکی شدن کارت قبل از انتقال
      setAnimatingTaskIds((prev) => ({ ...prev, [taskId]: true }));
      setTimeout(() => {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  completed: true,
                  completedAt: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
                }
              : t
          )
        );
        setAnimatingTaskIds((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
        showCopyToast('تسک تکمیل شد و به ستون چپ منتقل گردید');
      }, 480);
    } else {
      // پخش صدای ملایم برای بازگردانی تسک
      playTaskUndoSound(0.35);

      // بازگردانی از ستون انجام‌شده‌ها به لیست فعال
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                completed: false,
                completedAt: undefined,
              }
            : t
        )
      );
      showCopyToast('تسک مجدداً به لیست کارهای فعال اضافه شد');
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    showCopyToast('تسک حذف شد');
  };

  const handleOpenAddTaskModal = () => {
    setEditingTask(null);
    setTaskTitleInput('');
    setTaskDescInput('');
    setTaskPriorityInput('medium');
    setTaskDueDateInput('');
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTaskModal = (task: StudyTask) => {
    setEditingTask(task);
    setTaskTitleInput(task.title);
    setTaskDescInput(task.description || '');
    setTaskPriorityInput(task.priority || 'medium');
    setTaskDueDateInput(task.dueDate || '');
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = taskTitleInput.trim();
    if (!trimmed) return;

    if (editingTask) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id
            ? {
                ...t,
                title: trimmed,
                description: taskDescInput.trim() || undefined,
                priority: taskPriorityInput,
                dueDate: taskDueDateInput.trim() || undefined,
              }
            : t
        )
      );
      showCopyToast('تسک بروزرسانی شد');
    } else {
      const newTask: StudyTask = {
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: trimmed,
        description: taskDescInput.trim() || undefined,
        completed: false,
        priority: taskPriorityInput,
        dueDate: taskDueDateInput.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      setTasks((prev) => [newTask, ...prev]);
      showCopyToast('تسک جدید اضافه شد');
    }

    setIsTaskModalOpen(false);
  };

  const handleClearCompletedTasks = () => {
    setTasks((prev) => prev.filter((t) => !t.completed));
    showCopyToast('تسک‌های انجام‌شده پاکسازی شدند');
  };

  // Organize root folders and subcategories map
  const rootFolders = useMemo(() => {
    return folders.filter((f) => !f.parentId || !folders.some((p) => p.id === f.parentId));
  }, [folders]);

  const subfoldersMap = useMemo(() => {
    const map: Record<string, NoteFolder[]> = {};
    folders.forEach((f) => {
      if (f.parentId) {
        if (!map[f.parentId]) map[f.parentId] = [];
        map[f.parentId].push(f);
      }
    });
    return map;
  }, [folders]);

  // Flatten all sticky notes from files
  const allStickyNotes: FileStickyNoteEntry[] = useMemo(() => {
    const list: FileStickyNoteEntry[] = [];
    (studyFiles || []).forEach((file) => {
      (file.stickyNotes || []).forEach((note) => {
        list.push({
          fileId: file.id,
          fileName: file.name,
          file,
          note,
        });
      });
    });
    return list.sort((a, b) => {
      if (a.fileName !== b.fileName) {
        return a.fileName.localeCompare(b.fileName, 'fa');
      }
      return (a.note.pageNumber || 1) - (b.note.pageNumber || 1);
    });
  }, [studyFiles]);

  // Unique files that have sticky notes
  const filesWithStickyNotes = useMemo(() => {
    const fileMap = new Map<string, { id: string; name: string; count: number }>();
    allStickyNotes.forEach((entry) => {
      const existing = fileMap.get(entry.fileId);
      if (existing) {
        existing.count += 1;
      } else {
        fileMap.set(entry.fileId, {
          id: entry.fileId,
          name: entry.fileName,
          count: 1,
        });
      }
    });
    return Array.from(fileMap.values());
  }, [allStickyNotes]);

  // Active selected file info for sticky notes filter button label
  const activeSelectedFile = useMemo(() => {
    if (selectedFileId === 'all') return null;
    return filesWithStickyNotes.find((f) => f.id === selectedFileId) || null;
  }, [selectedFileId, filesWithStickyNotes]);

  // Count notes per folder with hierarchy rollup
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: notes.length,
      uncategorized: notes.filter((n) => !n.folderId).length,
    };
    folders.forEach((f) => {
      const familyIds = getFolderAndDescendantIds(f.id, folders);
      counts[f.id] = notes.filter((n) => n.folderId && familyIds.includes(n.folderId)).length;
      counts[`${f.id}_direct`] = notes.filter((n) => n.folderId === f.id).length;
    });
    return counts;
  }, [notes, folders]);

  // Active selected folder info for breadcrumb display
  const activeSelectedFolder = useMemo(() => {
    if (selectedFolderId === 'all') return null;
    if (selectedFolderId === 'uncategorized') {
      return {
        id: 'uncategorized',
        name: 'عمومی (بدون پوشه)',
        color: '#737373',
        breadcrumb: 'عمومی و بدون پوشه',
        parent: null,
      };
    }
    const curr = folders.find((f) => f.id === selectedFolderId);
    if (!curr) return null;
    const parent = curr.parentId ? folders.find((f) => f.id === curr.parentId) : null;
    return {
      id: curr.id,
      folder: curr,
      parent,
      name: curr.name,
      breadcrumb: parent ? `${parent.name} › ${curr.name}` : curr.name,
      color: curr.color || '#2563eb',
    };
  }, [selectedFolderId, folders]);

  // Filtered Sticky Notes
  const filteredStickyNotes = useMemo(() => {
    const originalIndexMap = new Map<string, number>();
    let seq = 0;
    (studyFiles || []).forEach((file) => {
      (file.stickyNotes || []).forEach((sn) => {
        originalIndexMap.set(`${file.id}:${sn.id}`, seq++);
      });
    });

    return allStickyNotes
      .filter((entry) => {
        if (selectedFileId !== 'all' && entry.fileId !== selectedFileId) {
          return false;
        }
        if (searchQuery.trim()) {
          const query = searchQuery.trim().toLowerCase();
          const titleMatch = (entry.note.title || '').toLowerCase().includes(query);
          const contentMatch = (entry.note.content || '').toLowerCase().includes(query);
          const fileMatch = entry.fileName.toLowerCase().includes(query);
          if (!titleMatch && !contentMatch && !fileMatch) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const dateDiffDesc = compareCreatedDatesDesc(a.note.createdAt, b.note.createdAt);
        if (dateDiffDesc !== 0) {
          return stickySortOrder === 'newest' ? dateDiffDesc : -dateDiffDesc;
        }

        const aTs = extractNoteTimestamp(a.note.id);
        const bTs = extractNoteTimestamp(b.note.id);
        if (aTs !== null && bTs !== null && aTs !== bTs) {
          return stickySortOrder === 'newest' ? bTs - aTs : aTs - bTs;
        }

        const aIdx = originalIndexMap.get(`${a.fileId}:${a.note.id}`) ?? 0;
        const bIdx = originalIndexMap.get(`${b.fileId}:${b.note.id}`) ?? 0;
        return stickySortOrder === 'newest' ? bIdx - aIdx : aIdx - bIdx;
      });
  }, [allStickyNotes, studyFiles, selectedFileId, searchQuery, stickySortOrder]);

  // Filtered Standalone Notes
  const filteredNotes = useMemo(() => {
    const originalIndexMap = new Map<string, number>();
    notes.forEach((n, idx) => originalIndexMap.set(n.id, idx));

    return notes
      .filter((note) => {
        if (selectedFolderId !== 'all') {
          if (selectedFolderId === 'uncategorized') {
            if (note.folderId) return false;
          } else {
            const allowedFolderIds = getFolderAndDescendantIds(selectedFolderId, folders);
            if (!note.folderId || !allowedFolderIds.includes(note.folderId)) {
              return false;
            }
          }
        }
        if (searchQuery.trim()) {
          const query = searchQuery.trim().toLowerCase();
          const titleMatch = (note.title || '').toLowerCase().includes(query);
          const contentMatch = stripHtml(note.content || '').toLowerCase().includes(query);
          if (!titleMatch && !contentMatch) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        const dateDiffDesc = compareCreatedDatesDesc(a.createdAt, b.createdAt);
        if (dateDiffDesc !== 0) {
          return noteSortOrder === 'newest' ? dateDiffDesc : -dateDiffDesc;
        }

        const aTs = extractNoteTimestamp(a.id);
        const bTs = extractNoteTimestamp(b.id);
        if (aTs !== null && bTs !== null && aTs !== bTs) {
          return noteSortOrder === 'newest' ? bTs - aTs : aTs - bTs;
        }

        const aIdx = originalIndexMap.get(a.id) ?? 0;
        const bIdx = originalIndexMap.get(b.id) ?? 0;
        return noteSortOrder === 'newest' ? aIdx - bIdx : bIdx - aIdx;
      });
  }, [notes, selectedFolderId, searchQuery, folders, noteSortOrder]);

  // Handle Escape key to close any active modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxState) {
          setLightboxState(null);
          return;
        }
        if (isTaskModalOpen) setIsTaskModalOpen(false);
        if (viewingItem) handleCloseViewer();
        if (isFolderModalOpen) setIsFolderModalOpen(false);
        if (isSortMenuOpen) setIsSortMenuOpen(false);
        if (isStickySortMenuOpen) setIsStickySortMenuOpen(false);
        if (editingStickyNote) setEditingStickyNote(null);
        if (folderToDelete) setFolderToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxState, isTaskModalOpen, viewingItem, handleCloseViewer, isFolderModalOpen, isSortMenuOpen, isStickySortMenuOpen, editingStickyNote, folderToDelete]);

  // Open Clean Viewer for a Sticky Note (expands softly from the selected card)
  const handleOpenStickyViewer = (entry: FileStickyNoteEntry, cardEl?: HTMLElement | null) => {
    const cardKey = `sticky:${entry.fileId}:${entry.note.id}`;
    const el = cardEl || cardRefs.current.get(cardKey) || null;
    if (el) {
      const r = el.getBoundingClientRect();
      setOriginRect({ left: r.left, top: r.top, width: r.width, height: r.height });
      setViewerPhase('opening');
    } else {
      setOriginRect(null);
      setViewerPhase('open');
    }
    setTargetRect(null);

    const accentTheme = getCardTopAccentTheme(entry.note.color || '#fef08a');
    setViewingItem({
      cardKey,
      type: 'sticky',
      id: entry.note.id,
      title: stickyContentToPlainPreview(entry.note.title || `یادداشت صفحه ${entry.note.pageNumber}`),
      content: entry.note.content || '',
      sourceLabel: entry.fileName,
      pageNumber: entry.note.pageNumber,
      color: entry.note.color,
      textColor: '#000000',
      date: entry.note.createdAt,
      originalEntry: entry,
      isBold: entry.note.isBold,
      imageUrl: entry.note.imageUrl,
      images: entry.note.images && entry.note.images.length > 0 ? entry.note.images : (entry.note.imageUrl ? [entry.note.imageUrl] : []),
      accentBarGradient: accentTheme.barGradient,
    });
  };

  // Open Clean Viewer for a Standalone Note (expands softly from the selected card)
  const handleOpenNoteViewer = (note: NoteItem, cardEl?: HTMLElement | null) => {
    const cardKey = `note:${note.id}`;
    const el = cardEl || cardRefs.current.get(cardKey) || null;
    if (el) {
      const r = el.getBoundingClientRect();
      setOriginRect({ left: r.left, top: r.top, width: r.width, height: r.height });
      setViewerPhase('opening');
    } else {
      setOriginRect(null);
      setViewerPhase('open');
    }
    setTargetRect(null);

    const folder = folders.find((f) => f.id === note.folderId);
    const noteAccentColor = folder?.color || (note.isPinned ? '#d97706' : '#64748b');
    const noteAccentTheme = getCardTopAccentTheme(noteAccentColor);
    setViewingItem({
      cardKey,
      type: 'note',
      id: note.id,
      title: note.title || 'بدون عنوان',
      content: htmlToPreviewText(note.content || ''),
      rawHtml: note.content || '',
      sourceLabel: folder ? folder.name : 'عمومی',
      color: noteAccentColor,
      date: note.updatedAt || note.createdAt,
      originalNote: note,
      accentBarGradient: noteAccentTheme.barGradient,
    });
  };

  // Open Edit Modal for Sticky Note
  const handleOpenEditStickyNote = (entry: FileStickyNoteEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingStickyNote(entry);
    setEditTitle(entry.note.title || '');
    setEditContent(entry.note.content || '');
    setEditColor(entry.note.color || '#fef08a');
    setEditTextColor(entry.note.textColor || '#713f12');
  };

  // Save Edit Sticky Note
  const handleSaveEditStickyNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStickyNote || !onUpdateStickyNote) return;

    const cleanedTitle = editTitle.trim();
    const cleanedContent = editContent.trim();

    const updated: StickyNoteItem = {
      ...editingStickyNote.note,
      title: cleanedTitle,
      content: cleanedContent,
      color: editColor,
      textColor: editTextColor,
    };
    onUpdateStickyNote(editingStickyNote.fileId, updated);
    setEditingStickyNote(null);
    if (viewingItem && viewingItem.id === updated.id) {
      setViewingItem({
        ...viewingItem,
        title: stickyContentToPlainPreview(updated.title || `یادداشت صفحه ${updated.pageNumber}`),
        content: updated.content,
        color: updated.color,
        textColor: updated.textColor,
      });
    }
    showCopyToast('تغییرات ذخیره شد');
  };

  // Confirm delete sticky note
  const handleConfirmDeleteStickyNote = () => {
    if (!deletingStickyNote || !onDeleteStickyNote) return;
    onDeleteStickyNote(deletingStickyNote.fileId, deletingStickyNote.note.id);
    if (viewingItem?.id === deletingStickyNote.note.id) {
      closeViewerImmediate();
    }
    setDeletingStickyNote(null);
    showCopyToast('استیکی‌نوت حذف شد');
  };

  // Confirm delete standalone note
  const handleConfirmDeleteNote = () => {
    if (!deletingNote) return;
    onDeleteNote(deletingNote.id);
    if (viewingItem?.id === deletingNote.id) {
      closeViewerImmediate();
    }
    setDeletingNote(null);
    showCopyToast('یادداشت حذف شد');
  };

  // Copy to clipboard helper
  const handleCopyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showCopyToast(`${label} کپی شد`);
  };

  // Folder management handlers
  const handleOpenAddFolder = (initialParentId: string | null = null) => {
    setEditingFolder(null);
    setParentFolderIdInput(initialParentId);
    setFolderNameInput('');
    setFolderColorInput('#2563eb');
    setIsFolderModalOpen(true);
  };

  const handleOpenEditFolder = (f: NoteFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolder(f);
    setParentFolderIdInput(f.parentId || null);
    setFolderNameInput(f.name);
    setFolderColorInput(f.color || '#2563eb');
    setIsFolderModalOpen(true);
  };

  const handleSaveFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const name = folderNameInput.trim();
    if (!name) return;

    if (editingFolder) {
      if (onUpdateFolder) {
        onUpdateFolder(editingFolder.id, name, folderColorInput, parentFolderIdInput);
      }
    } else {
      if (onAddFolder) {
        onAddFolder({
          name,
          color: folderColorInput,
          parentId: parentFolderIdInput,
        });
      }
    }
    setIsFolderModalOpen(false);
  };

  const handleConfirmDeleteFolder = () => {
    if (!folderToDelete) return;
    if (onDeleteFolder) {
      onDeleteFolder(folderToDelete.id);
    }
    if (selectedFolderId === folderToDelete.id) {
      setSelectedFolderId('all');
    }
    setFolderToDelete(null);
    showCopyToast('پوشه حذف شد');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#eef0f3] overflow-hidden relative select-auto font-sans" dir="rtl">
      {/* Unified Search, Folders & File Filters Toolbar (Compact Mobile-Optimized) */}
      {activeTab !== 'tasks' && (
        <div
          className={`bg-white/95 backdrop-blur-md px-3 sm:px-6 py-2.5 shrink-0 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.09),0_2px_8px_-1px_rgba(0,0,0,0.05)] relative transition-all ${
            isCategorySubmenuOpen || isFileSubmenuOpen ? 'z-40' : 'z-20'
          }`}
        >
        <div className="max-w-6xl mx-auto space-y-2">
          {/* Upper Row: Search input + New Note Button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={
                  activeTab === 'notes'
                    ? 'جستجو در یادداشت‌ها...'
                    : 'جستجو در استیکی‌نوت‌ها...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-8 pl-7 py-1.5 bg-[#f2f3f6] hover:bg-neutral-200/70 focus:bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:shadow-[0_6px_18px_-3px_rgba(0,0,0,0.12)] rounded-xl text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-neutral-700 rounded-full hover:bg-neutral-200 cursor-pointer transition-colors"
                  title="پاک کردن جستجو"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {activeTab === 'notes' && (
              <button
                type="button"
                onClick={onStartNewNote}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs active:scale-95 transition-transform shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>یادداشت جدید</span>
              </button>
            )}
          </div>

          {/* Lower Row: Category Pills & Submenu Filter */}
          {activeTab === 'notes' ? (
            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap flex-1">
                {/* 1. All Notes (همه یادداشت‌ها) */}
                <button
                  type="button"
                  onClick={() => setSelectedFolderId('all')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ios-spring-btn shrink-0 ${
                    selectedFolderId === 'all'
                      ? 'bg-neutral-900 text-white shadow-[0_6px_16px_-2px_rgba(0,0,0,0.28)]'
                      : 'bg-[#f2f3f6] text-neutral-700 hover:bg-white hover:text-neutral-900 shadow-[0_2px_6px_rgba(0,0,0,0.06)]'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>همه یادداشت‌ها</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      selectedFolderId === 'all'
                        ? 'bg-neutral-700 text-white'
                        : 'bg-white text-neutral-600 shadow-2xs'
                    }`}
                  >
                    {notes.length}
                  </span>
                </button>

                {/* 2. Category Submenu Dropdown */}
                <div className={`relative shrink-0 ${isCategorySubmenuOpen ? 'z-50' : ''}`} ref={categorySubmenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsCategorySubmenuOpen(!isCategorySubmenuOpen)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ios-spring-btn shrink-0 ${
                      activeSelectedFolder && activeSelectedFolder.id !== 'uncategorized'
                        ? 'bg-neutral-900 text-white shadow-[0_6px_16px_-2px_rgba(0,0,0,0.28)]'
                        : selectedFolderId === 'uncategorized'
                        ? 'bg-[#e8eaef] text-neutral-900 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.10)]'
                        : isCategorySubmenuOpen
                        ? 'bg-[#e8eaef] text-neutral-900 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.10)]'
                        : 'bg-[#f2f3f6] hover:bg-white text-neutral-700 shadow-[0_2px_6px_rgba(0,0,0,0.06)]'
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5 shrink-0" />
                    {activeSelectedFolder && activeSelectedFolder.id !== 'uncategorized' ? (
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: activeSelectedFolder.color || '#2563eb' }}
                        />
                        <span>دسته: {activeSelectedFolder.name}</span>
                      </span>
                    ) : selectedFolderId === 'uncategorized' ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-neutral-400 shrink-0" />
                        <span>عمومی (بدون پوشه)</span>
                      </span>
                    ) : (
                      <span>دسته‌بندی‌ها</span>
                    )}
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 opacity-60 ${
                        isCategorySubmenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Submenu Dropdown Popover with global iOS jelly animation */}
                  {isCategorySubmenuOpen && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-0 top-full mt-2 w-64 max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl shadow-[0_24px_56px_-8px_rgba(0,0,0,0.24),0_8px_20px_-4px_rgba(0,0,0,0.10)] p-2 z-50 animate-ios-jelly origin-top sm:origin-top-right select-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#f5f6f8] rounded-xl mb-1.5">
                        <span className="text-[11px] font-bold text-neutral-500">
                          انتخاب دسته‌بندی
                        </span>
                        {onAddFolder && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsCategorySubmenuOpen(false);
                              handleOpenAddFolder(null);
                            }}
                            className="text-[11px] font-bold text-neutral-800 hover:text-black flex items-center gap-1 bg-white hover:bg-neutral-100 px-2 py-0.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>دسته جدید</span>
                          </button>
                        )}
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-1 py-1">
                        {/* Option to clear category filter */}
                        {selectedFolderId !== 'all' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFolderId('all');
                              setIsCategorySubmenuOpen(false);
                            }}
                            className="w-full text-right px-2.5 py-1.5 text-xs font-bold text-rose-600 bg-rose-50/80 hover:bg-rose-100/80 rounded-xl flex items-center justify-between shadow-[0_2px_8px_rgba(225,29,72,0.10)] transition-colors cursor-pointer mb-1"
                          >
                            <div className="flex items-center gap-1.5">
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>حذف فیلتر دسته‌بندی (نمایش همه)</span>
                            </div>
                            <X className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        )}

                        {/* All Categories Option */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFolderId('all');
                            setIsCategorySubmenuOpen(false);
                          }}
                          className={`w-full text-right px-2.5 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-neutral-100 cursor-pointer transition-colors ${
                            selectedFolderId === 'all'
                              ? 'font-bold bg-neutral-100 text-neutral-900'
                              : 'text-neutral-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <FolderOpen className="w-3.5 h-3.5 text-neutral-400" />
                            <span>همه یادداشت‌ها</span>
                          </div>
                          {selectedFolderId === 'all' && (
                            <Check className="w-3.5 h-3.5 text-neutral-800 shrink-0" />
                          )}
                        </button>

                        {/* Categories List (با ساختار درختی و زیرمجموعه‌بندی تمیز) */}
                        {rootFolders.map((f) => {
                          const isCurrent = selectedFolderId === f.id;
                          const count = folderCounts[f.id] || 0;
                          const children = subfoldersMap[f.id] || [];

                          return (
                            <React.Fragment key={f.id}>
                              <div
                                className={`group flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors ${
                                  isCurrent ? 'bg-neutral-100' : 'hover:bg-neutral-50'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedFolderId(f.id);
                                    setIsCategorySubmenuOpen(false);
                                  }}
                                  className="flex items-center gap-2 min-w-0 flex-1 text-right text-xs cursor-pointer py-0.5"
                                >
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: f.color || '#2563eb' }}
                                  />
                                  <span
                                    className={`truncate ${
                                      isCurrent ? 'font-bold text-neutral-900' : 'text-neutral-700'
                                    }`}
                                  >
                                    {f.name}
                                  </span>
                                  {children.length > 0 && (
                                    <span className="text-[10px] text-neutral-400 font-normal">
                                      ({children.length} زیردسته)
                                    </span>
                                  )}
                                </button>

                                <div className="flex items-center gap-1 shrink-0">
                                  <span
                                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                                      isCurrent
                                        ? 'bg-neutral-900 text-white'
                                        : 'bg-neutral-100 text-neutral-600'
                                    }`}
                                  >
                                    {count}
                                  </span>

                                  {/* Quick Add Subcategory */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenAddFolder(f.id);
                                      setIsCategorySubmenuOpen(false);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-neutral-800 rounded cursor-pointer transition-opacity"
                                    title="افزودن زیرمجموعه جدید به این دسته"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>

                                  {/* Edit Trigger */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      handleOpenEditFolder(f, e);
                                      setIsCategorySubmenuOpen(false);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-neutral-700 rounded cursor-pointer transition-opacity"
                                    title="ویرایش دسته‌بندی"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>

                                  {/* Delete Trigger */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFolderToDelete(f);
                                      setIsCategorySubmenuOpen(false);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-600 rounded cursor-pointer transition-opacity"
                                    title="حذف دسته‌بندی"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>

                                  {isCurrent && (
                                    <Check className="w-3.5 h-3.5 text-neutral-800 shrink-0 mr-1" />
                                  )}
                                </div>
                              </div>

                              {/* Children / Subcategories */}
                              {children.map((child) => {
                                const isChildCurrent = selectedFolderId === child.id;
                                const childCount = folderCounts[child.id] || 0;
                                return (
                                  <div
                                    key={child.id}
                                    className={`group flex items-center justify-between rounded-xl pr-6 pl-2.5 py-1 transition-colors ${
                                      isChildCurrent ? 'bg-neutral-100' : 'hover:bg-neutral-50/80'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedFolderId(child.id);
                                        setIsCategorySubmenuOpen(false);
                                      }}
                                      className="flex items-center gap-1.5 min-w-0 flex-1 text-right text-xs cursor-pointer py-0.5"
                                    >
                                      <span className="text-neutral-300 text-xs select-none">↳</span>
                                      <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: child.color || '#2563eb' }}
                                      />
                                      <span
                                        className={`truncate ${
                                          isChildCurrent
                                            ? 'font-bold text-neutral-900'
                                            : 'text-neutral-600 text-[11px]'
                                        }`}
                                      >
                                        {child.name}
                                      </span>
                                    </button>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <span
                                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                                          isChildCurrent
                                            ? 'bg-neutral-900 text-white'
                                            : 'bg-neutral-100 text-neutral-500'
                                        }`}
                                      >
                                        {childCount}
                                      </span>

                                      {/* Edit Child */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          handleOpenEditFolder(child, e);
                                          setIsCategorySubmenuOpen(false);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-neutral-700 rounded cursor-pointer transition-opacity"
                                        title="ویرایش زیرمجموعه"
                                      >
                                        <Edit2 className="w-2.5 h-2.5" />
                                      </button>

                                      {/* Delete Child */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setFolderToDelete(child);
                                          setIsCategorySubmenuOpen(false);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-600 rounded cursor-pointer transition-opacity"
                                        title="حذف زیرمجموعه"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>

                                      {isChildCurrent && (
                                        <Check className="w-3 h-3 text-neutral-800 shrink-0 mr-1" />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}

                        {/* Uncategorized Option */}
                        <div
                          className={`group flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors mt-1.5 ${
                            selectedFolderId === 'uncategorized'
                              ? 'bg-[#e8eaef]'
                              : 'bg-[#f7f8fa]/80 hover:bg-[#eef0f3]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFolderId('uncategorized');
                              setIsCategorySubmenuOpen(false);
                            }}
                            className="flex items-center gap-2 min-w-0 flex-1 text-right text-xs cursor-pointer py-0.5"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 shrink-0" />
                            <span
                              className={`truncate ${
                                selectedFolderId === 'uncategorized'
                                  ? 'font-bold text-neutral-900'
                                  : 'text-neutral-700'
                              }`}
                            >
                              عمومی (بدون پوشه)
                            </span>
                          </button>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold bg-neutral-100 text-neutral-600">
                              {folderCounts.uncategorized || 0}
                            </span>
                            {selectedFolderId === 'uncategorized' && (
                              <Check className="w-3.5 h-3.5 text-neutral-800 shrink-0 mr-1" />
                            )}
                          </div>
                        </div>

                        {folders.length === 0 && (
                          <div className="p-3 text-center text-xs text-neutral-400">
                            هنوز دسته‌ای ایجاد نکرده‌اید. با زدن «دسته جدید» می‌توانید پوشه بسازید.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sort Order Icon & Filter Reset Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                {(selectedFolderId !== 'all' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFolderId('all');
                      setSearchQuery('');
                    }}
                    className="px-2 py-1 text-[11px] font-semibold text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    title="پاک کردن فیلترها"
                  >
                    <X className="w-3 h-3" />
                    <span>پاکسازی فیلتر</span>
                  </button>
                )}

                <div className={`relative shrink-0 ${isSortMenuOpen ? 'z-50' : ''}`} ref={sortMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsSortMenuOpen((prev) => !prev)}
                    aria-label="ترتیب نمایش یادداشت‌ها"
                    aria-expanded={isSortMenuOpen}
                    title={noteSortOrder === 'newest' ? 'ترتیب نمایش: جدیدترین' : 'ترتیب نمایش: قدیمی‌ترین'}
                    className={`p-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ios-spring-btn shrink-0 ${
                      noteSortOrder === 'oldest' || isSortMenuOpen
                        ? 'bg-neutral-900 text-white shadow-[0_6px_16px_-2px_rgba(0,0,0,0.28)]'
                        : 'bg-[#f2f3f6] hover:bg-white text-neutral-700 shadow-[0_2px_6px_rgba(0,0,0,0.06)]'
                    }`}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Anchored Popover extending from & collapsing back into the sort button */}
                  <div
                    className={`absolute left-0 top-full mt-2 w-52 max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl shadow-[0_24px_56px_-8px_rgba(0,0,0,0.24),0_8px_20px_-4px_rgba(0,0,0,0.10)] p-2 z-50 select-none origin-top-left transition-all duration-200 ${
                      isSortMenuOpen
                        ? 'opacity-100 visible scale-100 translate-y-0 pointer-events-auto ease-[cubic-bezier(0.34,1.56,0.64,1)]'
                        : 'opacity-0 invisible scale-[0.16] -translate-y-2 pointer-events-none ease-[cubic-bezier(0.4,0,0.2,1)]'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-2.5 py-1.5 mb-1.5 bg-[#f5f6f8] rounded-xl flex items-center justify-between">
                      <span className="text-[11px] font-bold text-neutral-500">ترتیب نمایش</span>
                    </div>

                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => handleSelectSortOrder('newest')}
                        className={`w-full px-2.5 py-2 rounded-xl text-right transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                          noteSortOrder === 'newest'
                            ? 'bg-neutral-900 text-white font-bold'
                            : 'hover:bg-neutral-100 text-neutral-700 font-medium'
                        }`}
                      >
                        <span className="text-xs">جدیدترین</span>
                        {noteSortOrder === 'newest' && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectSortOrder('oldest')}
                        className={`w-full px-2.5 py-2 rounded-xl text-right transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                          noteSortOrder === 'oldest'
                            ? 'bg-neutral-900 text-white font-bold'
                            : 'hover:bg-neutral-100 text-neutral-700 font-medium'
                        }`}
                      >
                        <span className="text-xs">قدیمی‌ترین</span>
                        {noteSortOrder === 'oldest' && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Sticky Notes File Filter Row */
            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap flex-1">
                {/* 1. All Files (همه فایل‌ها) */}
                <button
                  type="button"
                  onClick={() => setSelectedFileId('all')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ios-spring-btn shrink-0 ${
                    selectedFileId === 'all'
                      ? 'bg-neutral-900 text-white shadow-[0_6px_16px_-2px_rgba(0,0,0,0.28)]'
                      : 'bg-[#f2f3f6] text-neutral-700 hover:bg-white hover:text-neutral-900 shadow-[0_2px_6px_rgba(0,0,0,0.06)]'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>همه فایل‌ها</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      selectedFileId === 'all'
                        ? 'bg-neutral-700 text-white'
                        : 'bg-white text-neutral-600 shadow-2xs'
                    }`}
                  >
                    {allStickyNotes.length}
                  </span>
                </button>

                {/* 2. File Submenu Dropdown */}
                <div className={`relative shrink-0 ${isFileSubmenuOpen ? 'z-50' : ''}`} ref={fileSubmenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsFileSubmenuOpen(!isFileSubmenuOpen)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ios-spring-btn shrink-0 ${
                      activeSelectedFile
                        ? 'bg-neutral-900 text-white shadow-[0_6px_16px_-2px_rgba(0,0,0,0.28)]'
                        : isFileSubmenuOpen
                        ? 'bg-[#e8eaef] text-neutral-900 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.10)]'
                        : 'bg-[#f2f3f6] hover:bg-white text-neutral-700 shadow-[0_2px_6px_rgba(0,0,0,0.06)]'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    {activeSelectedFile ? (
                      <span className="flex items-center gap-1.5 max-w-[180px] sm:max-w-[220px]">
                        <span className="truncate">فایل: {activeSelectedFile.name}</span>
                      </span>
                    ) : (
                      <span>فایل‌ها و منابع</span>
                    )}
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 opacity-60 ${
                        isFileSubmenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Submenu Dropdown Popover with global iOS jelly animation */}
                  {isFileSubmenuOpen && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-0 top-full mt-2 w-64 max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl shadow-[0_24px_56px_-8px_rgba(0,0,0,0.24),0_8px_20px_-4px_rgba(0,0,0,0.10)] p-2 z-50 animate-ios-jelly origin-top sm:origin-top-right select-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#f5f6f8] rounded-xl mb-1.5">
                        <span className="text-[11px] font-bold text-neutral-500">
                          انتخاب منبع و فایل
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {filesWithStickyNotes.length} منبع
                        </span>
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-1 py-1">
                        {/* Option to clear file filter */}
                        {selectedFileId !== 'all' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFileId('all');
                              setIsFileSubmenuOpen(false);
                            }}
                            className="w-full text-right px-2.5 py-1.5 text-xs font-bold text-rose-600 bg-rose-50/80 hover:bg-rose-100/80 rounded-xl flex items-center justify-between shadow-[0_2px_8px_rgba(225,29,72,0.10)] transition-colors cursor-pointer mb-1"
                          >
                            <div className="flex items-center gap-1.5">
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>حذف فیلتر (نمایش همه فایل‌ها)</span>
                            </div>
                            <X className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        )}

                        {/* All Files Option */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFileId('all');
                            setIsFileSubmenuOpen(false);
                          }}
                          className={`w-full text-right px-2.5 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-neutral-100 cursor-pointer transition-colors ${
                            selectedFileId === 'all'
                              ? 'font-bold bg-neutral-100 text-neutral-900'
                              : 'text-neutral-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
                            <span>همه فایل‌ها و استیکی‌نوت‌ها</span>
                          </div>
                          {selectedFileId === 'all' && (
                            <Check className="w-3.5 h-3.5 text-neutral-800 shrink-0" />
                          )}
                        </button>

                        {/* Files List */}
                        {filesWithStickyNotes.map((f) => {
                          const isCurrent = selectedFileId === f.id;
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => {
                                setSelectedFileId(f.id);
                                setIsFileSubmenuOpen(false);
                              }}
                              className={`w-full text-right px-2.5 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-neutral-100 cursor-pointer transition-colors group ${
                                isCurrent
                                  ? 'font-bold bg-neutral-100 text-neutral-900'
                                  : 'text-neutral-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <FileText className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-700 shrink-0" />
                                <span className="truncate">{f.name}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 mr-1.5">
                                <span
                                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                                    isCurrent
                                      ? 'bg-neutral-900 text-white'
                                      : 'bg-neutral-100 text-neutral-600'
                                  }`}
                                >
                                  {f.count}
                                </span>
                                {isCurrent && (
                                  <Check className="w-3.5 h-3.5 text-neutral-800 shrink-0 mr-1" />
                                )}
                              </div>
                            </button>
                          );
                        })}

                        {filesWithStickyNotes.length === 0 && (
                          <div className="p-3 text-center text-xs text-neutral-400">
                            هنوز استیکی‌نوتی در هیچ فایلی ثبت نشده است.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Sort Order Icon & Filter Reset Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                {(selectedFileId !== 'all' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFileId('all');
                      setSearchQuery('');
                    }}
                    className="px-2 py-1 text-[11px] font-semibold text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    title="پاک کردن فیلترها"
                  >
                    <X className="w-3 h-3" />
                    <span>پاکسازی فیلتر</span>
                  </button>
                )}

                <div className={`relative shrink-0 ${isStickySortMenuOpen ? 'z-50' : ''}`} ref={stickySortMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsStickySortMenuOpen((prev) => !prev)}
                    aria-label="ترتیب نمایش استیکی‌نوت‌ها"
                    aria-expanded={isStickySortMenuOpen}
                    title={stickySortOrder === 'newest' ? 'ترتیب نمایش: جدیدترین' : 'ترتیب نمایش: قدیمی‌ترین'}
                    className={`p-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ios-spring-btn shrink-0 ${
                      stickySortOrder === 'oldest' || isStickySortMenuOpen
                        ? 'bg-neutral-900 text-white shadow-[0_6px_16px_-2px_rgba(0,0,0,0.28)]'
                        : 'bg-[#f2f3f6] hover:bg-white text-neutral-700 shadow-[0_2px_6px_rgba(0,0,0,0.06)]'
                    }`}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Anchored Popover extending from & collapsing back into the sticky sort button */}
                  <div
                    className={`absolute left-0 top-full mt-2 w-52 max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl shadow-[0_24px_56px_-8px_rgba(0,0,0,0.24),0_8px_20px_-4px_rgba(0,0,0,0.10)] p-2 z-50 select-none origin-top-left transition-all duration-200 ${
                      isStickySortMenuOpen
                        ? 'opacity-100 visible scale-100 translate-y-0 pointer-events-auto ease-[cubic-bezier(0.34,1.56,0.64,1)]'
                        : 'opacity-0 invisible scale-[0.16] -translate-y-2 pointer-events-none ease-[cubic-bezier(0.4,0,0.2,1)]'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-2.5 py-1.5 mb-1.5 bg-[#f5f6f8] rounded-xl flex items-center justify-between">
                      <span className="text-[11px] font-bold text-neutral-500">ترتیب نمایش</span>
                    </div>

                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => handleSelectStickySortOrder('newest')}
                        className={`w-full px-2.5 py-2 rounded-xl text-right transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                          stickySortOrder === 'newest'
                            ? 'bg-neutral-900 text-white font-bold'
                            : 'hover:bg-neutral-100 text-neutral-700 font-medium'
                        }`}
                      >
                        <span className="text-xs">جدیدترین</span>
                        {stickySortOrder === 'newest' && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectStickySortOrder('oldest')}
                        className={`w-full px-2.5 py-2 rounded-xl text-right transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                          stickySortOrder === 'oldest'
                            ? 'bg-neutral-900 text-white font-bold'
                            : 'hover:bg-neutral-100 text-neutral-700 font-medium'
                        }`}
                      >
                        <span className="text-xs">قدیمی‌ترین</span>
                        {stickySortOrder === 'oldest' && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* 3. Main List: اسکرول همیشه فعال و روان قبل و بعد از باز و بسته شدن کارت‌ها */}
      <main
        className={`flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y custom-column-scroll px-2.5 sm:px-6 py-3 relative z-0 ${
          activeTab === 'tasks' ? 'bg-[#eceef2]' : ''
        }`}
        style={{
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 12px) + 72px)',
        }}
      >
        <div className="w-full max-w-6xl mx-auto">
          {activeTab === 'tasks' ? (
            /* =========================================================
               TAB: ظاهر تمیز و خلوت تسک‌ها با دکمه افزودن تسک و ستون‌های متقارن با اسکرول بار داخلی
               ========================================================= */
            <div className="w-full flex flex-col space-y-4">
              {/* Header: Title + THE ONE AND ONLY "افزودن تسک" Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3.5 pb-1 shrink-0">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2.5">
                    <span>مدیریت و فهرست تسک‌ها</span>
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    تسک‌های فعال در ستون راست و تسک‌های انجام‌شده در صفحه سمت چپ به صورت لیست نمایش داده می‌شوند
                  </p>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  {/* Add Task Button */}
                  <button
                    type="button"
                    onClick={handleOpenAddTaskModal}
                    className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs sm:text-sm font-bold rounded-xl cursor-pointer ios-spring-btn shadow-md hover:shadow-lg shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>افزودن تسک</span>
                  </button>
                </div>
              </div>

              {/* Symmetrical Dual Columns: Right = Active Tasks | Left = Completed Tasks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-stretch flex-1 min-h-0 h-full pb-1">
                {/* 1. ستون راست (مستطیل عمودی متقارن: کارهای در حال انجام) */}
                <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_16px_40px_-6px_rgba(0,0,0,0.11),0_4px_14px_-2px_rgba(0,0,0,0.06)] flex flex-col h-full min-h-0 overflow-hidden">
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                      <h3 className="text-xs sm:text-sm font-bold text-neutral-900">
                        کارهای در حال انجام
                      </h3>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#f2f3f6] text-neutral-700 font-bold shadow-2xs">
                        {activeTasksCount}
                      </span>
                    </div>
                  </div>

                  {/* Scrollable Active Tasks List with recessed track for strong card contrast */}
                  <div className="flex-1 overflow-y-auto space-y-3 p-2.5 sm:p-3 bg-[#f2f4f7] rounded-2xl min-h-0 custom-column-scroll">
                    {activeTasks.length === 0 ? (
                      <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center space-y-2.5 p-6 text-neutral-400">
                        <div className="w-12 h-12 rounded-2xl bg-white text-neutral-400 flex items-center justify-center shadow-[0_6px_16px_rgba(0,0,0,0.08)]">
                          <CheckSquare className="w-6 h-6 stroke-[1.5]" />
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-neutral-800">
                          {tasks.length === 0 ? 'هیچ تسکی ثبت نشده است' : 'تمامی تسک‌های فعال تکمیل شده‌اند!'}
                        </h4>
                        <p className="text-[11px] text-neutral-400 max-w-xs leading-relaxed">
                          {tasks.length === 0
                            ? 'برای شروع برنامه‌ریزی، روی دکمه «افزودن تسک» در بالای صفحه کلیک کنید.'
                            : 'همه وظایف فعلی انجام شده‌اند. می‌توانید تسک‌های جدید اضافه کنید.'}
                        </p>
                      </div>
                    ) : (
                      activeTasks.map((task) => {
                        const isAnimating = Boolean(animatingTaskIds[task.id]);
                        const priority = task.priority || 'medium';

                        return (
                          <div
                            key={task.id}
                            onClick={() => handleToggleTask(task.id)}
                            className={`relative overflow-hidden group rounded-2xl transition-[transform,colors,box-shadow] duration-200 ease-out active:scale-[0.985] p-2.5 sm:p-3 cursor-pointer select-none ${
                              isAnimating
                                ? 'bg-neutral-900 text-white shadow-[0_14px_32px_-4px_rgba(0,0,0,0.34)] scale-[0.99]'
                                : 'bg-white shadow-[0_6px_18px_-3px_rgba(0,0,0,0.10),0_2px_6px_-1px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_26px_-5px_rgba(0,0,0,0.13)]'
                            }`}
                          >
                            {/* Sliding Black Overlay Animation */}
                            <div
                              className={`absolute inset-0 bg-neutral-900 transition-transform duration-500 ease-out pointer-events-none z-0 ${
                                isAnimating ? 'translate-x-0' : 'translate-x-full'
                              }`}
                            />

                            <div className="relative z-10 flex items-start sm:items-center justify-between gap-2.5">
                              {/* Big Tick Button & Content */}
                              <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                                {/* Big Tick Button with iOS spring physics */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleTask(task.id);
                                  }}
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 cursor-pointer ios-spring-btn ${
                                    isAnimating
                                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-105'
                                      : 'bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white shadow-xs hover:shadow-md'
                                  }`}
                                  title="تیک زدن و تکمیل تسک"
                                >
                                  <Check
                                    className={`w-4 h-4 stroke-[3] transition-all duration-300 ${
                                      isAnimating
                                        ? 'text-white scale-110'
                                        : 'text-emerald-600 group-hover:scale-105'
                                    }`}
                                  />
                                </button>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={`text-[13px] sm:text-sm font-bold transition-colors duration-300 ${
                                        isAnimating ? 'text-white line-through opacity-90' : 'text-neutral-900'
                                      }`}
                                    >
                                      {task.title}
                                    </span>

                                    {/* Priority badge */}
                                    {!isAnimating && priority === 'high' && (
                                      <span className="px-2 py-0.5 text-[9.5px] font-bold rounded-lg bg-rose-100 text-rose-700 shadow-2xs">
                                        فوری
                                      </span>
                                    )}
                                    {!isAnimating && priority === 'medium' && (
                                      <span className="px-2 py-0.5 text-[9.5px] font-bold rounded-lg bg-amber-100 text-amber-800 shadow-2xs">
                                        مهم
                                      </span>
                                    )}
                                    {!isAnimating && priority === 'low' && (
                                      <span className="px-2 py-0.5 text-[9.5px] font-bold rounded-lg bg-neutral-200/80 text-neutral-700 shadow-2xs">
                                        عادی
                                      </span>
                                    )}

                                    {/* Due date badge */}
                                    {task.dueDate && (
                                      <span
                                        className={`flex items-center gap-1 text-[9.5px] font-mono px-1.5 py-0.5 rounded-lg transition-colors duration-300 ${
                                          isAnimating ? 'text-neutral-400 bg-neutral-800' : 'text-neutral-600 bg-neutral-100'
                                        }`}
                                      >
                                        <Clock className="w-2.5 h-2.5" />
                                        <span>{task.dueDate}</span>
                                      </span>
                                    )}
                                  </div>

                                  {task.description && (
                                    <p
                                      className={`text-[10.5px] sm:text-[11px] mt-0.5 leading-relaxed transition-colors duration-300 ${
                                        isAnimating ? 'text-neutral-400 line-through' : 'text-neutral-500'
                                      }`}
                                    >
                                      {task.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              {!isAnimating && (
                                <div
                                  className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditTaskModal(task)}
                                    className="p-1.5 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg cursor-pointer transition-colors ios-spring-btn"
                                    title="ویرایش"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors ios-spring-btn"
                                    title="حذف"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 2. ستون چپ (مستطیل عمودی متقارن: تسک‌های انجام‌شده) */}
                <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_16px_40px_-6px_rgba(0,0,0,0.11),0_4px_14px_-2px_rgba(0,0,0,0.06)] flex flex-col h-full min-h-0 overflow-hidden">
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-neutral-900">
                        تسک‌های انجام‌شده
                      </h3>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#f2f3f6] text-neutral-700 font-bold shadow-2xs">
                        {completedTasksCount}
                      </span>
                    </div>

                    {completedTasksCount > 0 && (
                      <button
                        type="button"
                        onClick={handleClearCompletedTasks}
                        className="text-[11px] font-medium text-neutral-400 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer ios-spring-btn"
                      >
                        پاک‌سازی همه
                      </button>
                    )}
                  </div>

                  {/* Scrollable Completed Tasks List with its OWN scrollbar inside this rectangle */}
                  <div className="flex-1 overflow-y-auto space-y-3 p-2.5 sm:p-3 bg-[#f2f4f7] rounded-2xl min-h-0 custom-column-scroll">
                    {completedTasks.length === 0 ? (
                      <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center space-y-2.5 p-6 text-neutral-400">
                        <div className="w-12 h-12 rounded-2xl bg-white text-neutral-400 flex items-center justify-center shadow-[0_6px_16px_rgba(0,0,0,0.08)]">
                          <CheckCircle2 className="w-6 h-6 stroke-[1.5]" />
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-neutral-800">
                          هنوز تسکی تکمیل نشده است
                        </h4>
                        <p className="text-[11px] text-neutral-400 max-w-xs leading-relaxed">
                          با زدن دکمه تیک روی هر تسک فعال، کارت آن مشکی شده و به این ستون منتقل می‌شود.
                        </p>
                      </div>
                    ) : (
                      completedTasks.map((task) => {
                        const priority = task.priority || 'medium';

                        return (
                          <div
                            key={task.id}
                            className="group relative bg-neutral-900 text-white rounded-2xl shadow-[0_8px_22px_-3px_rgba(0,0,0,0.30),0_3px_8px_rgba(0,0,0,0.18)] p-2.5 sm:p-3 flex items-start sm:items-center justify-between gap-2.5 select-none"
                          >
                            {/* Completed Check Icon matching active tick button */}
                            <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                              {/* Tick Button */}
                              <button
                                type="button"
                                onClick={() => handleToggleTask(task.id)}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 cursor-pointer shadow-md shadow-emerald-500/30 hover:bg-emerald-600 ios-spring-btn"
                                title="کلیک برای بازگردانی به لیست کارهای در حال انجام"
                              >
                                <Check className="w-4 h-4 stroke-[3]" />
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[13px] sm:text-sm font-bold text-neutral-200 line-through opacity-90">
                                    {task.title}
                                  </span>

                                  {/* Priority badge (subtle dark style) */}
                                  {priority === 'high' && (
                                    <span className="px-2 py-0.5 text-[9.5px] font-bold rounded-lg bg-rose-950/80 text-rose-300 shadow-2xs">
                                      فوری
                                    </span>
                                  )}
                                  {priority === 'medium' && (
                                    <span className="px-2 py-0.5 text-[9.5px] font-bold rounded-lg bg-amber-950/80 text-amber-300 shadow-2xs">
                                      مهم
                                    </span>
                                  )}
                                  {priority === 'low' && (
                                    <span className="px-2 py-0.5 text-[9.5px] font-bold rounded-lg bg-neutral-800 text-neutral-300 shadow-2xs">
                                      عادی
                                    </span>
                                  )}

                                  {/* Due date badge */}
                                  {task.dueDate && (
                                    <span className="flex items-center gap-1 text-[9.5px] font-mono px-1.5 py-0.5 rounded-lg bg-neutral-800 text-neutral-400">
                                      <Clock className="w-2.5 h-2.5" />
                                      <span>{task.dueDate}</span>
                                    </span>
                                  )}

                                  {/* Completed timestamp badge */}
                                  {task.completedAt && (
                                    <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-950/70 px-1.5 py-0.5 rounded-md shadow-2xs">
                                      <span>انجام شد در {task.completedAt}</span>
                                    </span>
                                  )}
                                </div>

                                {task.description && (
                                  <p className="text-[10.5px] sm:text-[11px] mt-0.5 leading-relaxed text-neutral-400 line-through">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Actions: Undo & Delete */}
                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={() => handleToggleTask(task.id)}
                                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors ios-spring-btn"
                                title="بازگردانی به لیست کارهای فعال"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors ios-spring-btn"
                                title="حذف تسک"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'sticky-notes' ? (
            /* =========================================================
               TAB: لیست استیکی‌نوت‌ها با انیمیشن فنری کارت‌ها
               ========================================================= */
            <div>
              {filteredStickyNotes.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 shadow-[0_14px_36px_-6px_rgba(0,0,0,0.10),0_4px_12px_-2px_rgba(0,0,0,0.05)] text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shadow-xs">
                    <StickyNote className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-800">
                    {searchQuery || selectedFileId !== 'all'
                      ? 'هیچ استیکی‌نوتی با این فیلتر یافت نشد'
                      : 'هنوز هیچ استیکی‌نوتی در فایل‌ها ثبت نشده است'}
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
                    هنگام مطالعه کتاب‌ها و جزوه‌ها، از ابزار یادداشت چسبان روی صفحات استفاده کنید یا فایل دلخواه خود را اضافه فرمایید.
                  </p>
                  {onTriggerNewFile && (
                    <button
                      type="button"
                      onClick={onTriggerNewFile}
                      className="mt-2 px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl shadow-xs cursor-pointer ios-spring-btn flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>افزودن فایل دلخواه</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                  {filteredStickyNotes.map((entry) => {
                    const rawContent = stickyContentToPlainPreview(entry.note.content || '');
                    const displayTitle = stickyContentToPlainPreview(
                      entry.note.title || `یادداشت صفحه ${entry.note.pageNumber}`
                    );
                    const noteBg = entry.note.color || '#fef08a';
                    const accentTheme = getCardTopAccentTheme(noteBg);
                    const hasImages = Boolean((entry.note.images && entry.note.images.length > 0) || entry.note.imageUrl);

                    const cardKey = `sticky:${entry.fileId}:${entry.note.id}`;
                    const isLifted = Boolean(viewingItem && viewingItem.cardKey === cardKey && targetRect && originRect);

                    return (
                      <article
                        key={`${entry.fileId}-${entry.note.id}`}
                        ref={(el) => setCardRef(cardKey, el)}
                        onClick={(e) => handleOpenStickyViewer(entry, e.currentTarget)}
                        className={`rounded-2xl bg-white shadow-[0_6px_18px_-3px_rgba(0,0,0,0.09),0_2px_6px_-1px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_26px_-5px_rgba(0,0,0,0.13),0_4px_10px_-2px_rgba(0,0,0,0.06)] transition-shadow duration-200 flex flex-col ${
                          hasImages ? 'h-[142px] sm:h-[150px]' : 'h-[112px] sm:h-[118px]'
                        } cursor-pointer overflow-hidden relative select-none ${
                          isLifted ? 'opacity-0 pointer-events-none' : ''
                        }`}
                        title="برای باز کردن و مطالعه کامل کلیک کنید"
                      >
                        <div
                          className="h-[8px] sm:h-[9px] w-full shrink-0 relative"
                          style={{
                            background: accentTheme.barGradient,
                          }}
                        >
                          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-white/40 pointer-events-none" />
                        </div>
                        <div className="px-2.5 pt-1 pb-1 flex-1 min-h-0 flex flex-col overflow-hidden">
                          {/* Top Row: File Name + Page Badge */}
                          <div className="flex items-center justify-between gap-1.5 mb-0.5 shrink-0">
                            <div className="flex items-center gap-1 min-w-0">
                              <BookOpen className="w-2 h-2 text-neutral-400 shrink-0" />
                              <span
                                className="text-[8px] font-normal text-neutral-400 truncate max-w-[130px]"
                                title={entry.fileName}
                              >
                                {entry.fileName}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span
                                className="px-1.5 py-0.2 rounded-md text-[8.5px] font-bold font-mono"
                                style={{
                                  backgroundColor: accentTheme.badgeBg,
                                  color: accentTheme.badgeText,
                                  boxShadow: `0 2px 6px -1px ${accentTheme.glow}`,
                                }}
                              >
                                ص {entry.note.pageNumber}
                              </span>
                            </div>
                          </div>

                          {/* Right-aligned, compact Content Container for Sticky Notes */}
                          <div className="flex-1 min-h-0 overflow-hidden flex flex-col justify-start px-0.5 w-full text-right" dir="rtl">
                            {/* Title */}
                            <h3 className="text-[13px] sm:text-[13.5px] leading-[18px] font-bold text-neutral-950 truncate mb-0.5 tracking-tight shrink-0 text-right w-full" dir="rtl">
                              {displayTitle}
                            </h3>

                            {/* Attached Images Preview if present (compact fixed height) */}
                            {hasImages && (
                              <div
                                className="mb-0.5 shrink-0 w-full flex justify-start"
                                dir="rtl"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const allImgs =
                                    entry.note.images && entry.note.images.length > 0
                                      ? entry.note.images
                                      : [entry.note.imageUrl!];
                                  setLightboxState({
                                    images: allImgs,
                                    index: 0,
                                    title: displayTitle,
                                  });
                                }}
                                title="برای نمایش تمام‌صفحه با قابلیت زوم کلیک کنید"
                              >
                                {(!entry.note.images || entry.note.images.length <= 1) ? (
                                  <div className="rounded-md overflow-hidden h-8 w-14 bg-[#f5f6f8] shadow-[0_2px_6px_rgba(0,0,0,0.10)] flex items-center justify-center relative">
                                    <img
                                      src={entry.note.images?.[0] || entry.note.imageUrl}
                                      alt="پیوست استیکی‌نوت"
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 gap-1 w-full max-w-[116px]">
                                    {entry.note.images.slice(0, 2).map((img, idx) => (
                                      <div key={idx} className="relative rounded-md overflow-hidden h-8 bg-[#f5f6f8] shadow-[0_2px_6px_rgba(0,0,0,0.10)]">
                                        <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                                        {idx === 1 && entry.note.images!.length > 2 && (
                                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[9px] font-bold font-mono">
                                            +{entry.note.images!.length - 2}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Content with clean compact text */}
                            <div
                              className="text-[9.5px] text-neutral-700 font-normal leading-[13px] select-text font-sans overflow-hidden text-right w-full line-clamp-2"
                              dir="rtl"
                            >
                              {rawContent || (
                                <span className="text-neutral-400 italic font-normal text-[9px]">بدون متن...</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Bottom Row Actions - Contrasting off-white footer strip */}
                        <div className="px-2.5 py-1 bg-[#f5f6f8] flex items-center justify-between gap-1.5 shrink-0 mt-auto">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[9px] text-neutral-400 font-mono truncate">
                              {entry.note.createdAt || 'ثبت شده'}
                            </span>

                            {/* Direct Jump to PDF page button */}
                            {onOpenFileAtPage && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenFileAtPage(entry.file, entry.note.pageNumber);
                                }}
                                className="px-1.5 py-0.5 text-[8.5px] font-semibold text-neutral-600 hover:text-neutral-900 bg-white hover:bg-neutral-50 rounded-md cursor-pointer flex items-center gap-1 shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
                                title="رفتن به این صفحه در کتاب"
                              >
                                <ExternalLink className="w-2.5 h-2.5 text-neutral-500" />
                                <span className="hidden sm:inline">مشاهده در فایل</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0">
                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyText(entry.note.content, 'متن یادداشت');
                              }}
                              className="p-0.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-md cursor-pointer"
                              title="کپی متن"
                            >
                              <Copy className="w-3 h-3" />
                            </button>

                            {/* Edit button */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditStickyNote(entry, e)}
                              className="p-0.5 text-neutral-500 hover:text-sky-600 hover:bg-sky-50 rounded-md cursor-pointer"
                              title="ویرایش سریع"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingStickyNote(entry);
                              }}
                              className="p-0.5 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* =========================================================
               TAB: لیست یادداشت‌های اختصاصی با انیمیشن فنری کارت‌ها
               ========================================================= */
            <div>
              {filteredNotes.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 shadow-[0_14px_36px_-6px_rgba(0,0,0,0.10),0_4px_12px_-2px_rgba(0,0,0,0.05)] text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-xs">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-800">
                    {searchQuery || selectedFolderId !== 'all'
                      ? 'هیچ یادداشتی با این فیلتر یافت نشد'
                      : 'هنوز یادداشتی ثبت نشده است'}
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
                    می‌توانید برای یادداشت‌برداری و خلاصه‌نویسی نکات درسی، یک یادداشت جدید ایجاد کرده یا فایلی را بارگذاری کنید.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={onStartNewNote}
                      className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl shadow-xs cursor-pointer ios-spring-btn flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>ایجاد یادداشت جدید</span>
                    </button>
                    {onTriggerNewFile && (
                      <button
                        type="button"
                        onClick={onTriggerNewFile}
                        className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-[#f2f3f6] hover:bg-neutral-200 rounded-xl cursor-pointer ios-spring-btn flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>افزودن فایل دلخواه</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                  {filteredNotes.map((note) => {
                    const noteFolder = folders.find((f) => f.id === note.folderId);
                    const preview = htmlToPreviewText(note.content || '');
                    const noteAccentColor = noteFolder?.color || (note.isPinned ? '#d97706' : '#64748b');
                    const noteAccentTheme = getCardTopAccentTheme(noteAccentColor);

                    const cardKey = `note:${note.id}`;
                    const isLifted = Boolean(viewingItem && viewingItem.cardKey === cardKey && targetRect && originRect);

                    return (
                      <article
                        key={note.id}
                        ref={(el) => setCardRef(cardKey, el)}
                        onClick={(e) => handleOpenNoteViewer(note, e.currentTarget)}
                        className={`rounded-2xl bg-white transition-shadow duration-200 flex flex-col h-[114px] sm:h-[120px] cursor-pointer overflow-hidden relative select-none ${
                          note.isPinned
                            ? 'shadow-[0_8px_22px_-3px_rgba(217,119,6,0.18),0_2px_8px_-1px_rgba(0,0,0,0.06)] hover:shadow-[0_14px_28px_-6px_rgba(217,119,6,0.22),0_4px_10px_-2px_rgba(0,0,0,0.07)]'
                            : 'shadow-[0_6px_18px_-3px_rgba(0,0,0,0.09),0_2px_6px_-1px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_26px_-5px_rgba(0,0,0,0.13),0_4px_10px_-2px_rgba(0,0,0,0.06)]'
                        } ${isLifted ? 'opacity-0 pointer-events-none' : ''}`}
                        title="برای مشاهده متن کامل کلیک کنید"
                      >
                        <div
                          className="h-[7px] sm:h-[8px] w-full shrink-0 relative"
                          style={{
                            background: noteAccentTheme.barGradient,
                          }}
                        >
                          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-white/40 pointer-events-none" />
                        </div>
                        <div className="px-2.5 pt-1 pb-1 flex-1 min-h-0 flex flex-col overflow-hidden">
                          {/* Top Row: File icon + Quiet Folder Label + Date & Pin */}
                          <div className="flex items-center justify-between gap-1.5 mb-0.5 shrink-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-4 h-4 rounded-md bg-[#f2f3f6] text-neutral-700 flex items-center justify-center shrink-0 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                                <FileText className="w-2.5 h-2.5" />
                              </div>

                              {noteFolder ? (
                                <div className="flex items-center gap-1 min-w-0 text-[9px] text-neutral-700 font-semibold">
                                  <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: noteFolder.color || '#2563eb' }}
                                  />
                                  <span className="truncate max-w-[110px]">{noteFolder.name}</span>
                                </div>
                              ) : (
                                <span className="text-[9px] text-neutral-500 font-medium">عمومی</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[9px] text-neutral-400 font-mono tabular-nums">
                                {note.createdAt}
                              </span>
                              {note.isPinned && (
                                <span className="p-0.5 text-amber-500" title="سنجاق‌شده">
                                  <Pin className="w-2.5 h-2.5 fill-amber-500" />
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Title */}
                          <h3 className="text-[13px] sm:text-[13.5px] leading-[18px] font-bold text-neutral-950 truncate mb-0.5 shrink-0 text-right" dir="rtl">
                            {note.title || 'بدون عنوان'}
                          </h3>

                          {/* Snippet Preview with compact font */}
                          <p className="text-[9.5px] text-neutral-500 line-clamp-2 leading-[13px] overflow-hidden whitespace-pre-line font-sans select-text text-right" dir="rtl">
                            {preview || 'بدون متن'}
                          </p>
                        </div>

                        {/* Bottom Row Actions - Contrasting off-white strip */}
                        <div className="mt-auto px-2.5 py-1 bg-[#f5f6f8] flex items-center justify-between shrink-0">
                          <span className="text-[9px] text-neutral-400 font-mono">
                            {note.updatedAt ? `ویرایش ${note.updatedAt}` : note.createdAt}
                          </span>

                          <div className="flex items-center gap-0.5">
                            {/* Pin button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onTogglePinNote(note.id, note.isPinned);
                              }}
                              className={`p-0.5 rounded-md cursor-pointer ios-spring-tool ${
                                note.isPinned
                                  ? 'text-amber-500 hover:text-amber-600'
                                  : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100'
                              }`}
                              title={note.isPinned ? 'برداشتن سنجاق' : 'سنجاق کردن'}
                            >
                              <Pin className={`w-3 h-3 ${note.isPinned ? 'fill-amber-500' : ''}`} />
                            </button>

                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyText(htmlToPreviewText(note.content), 'متن یادداشت');
                              }}
                              className="p-0.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md cursor-pointer ios-spring-tool"
                              title="کپی متن"
                            >
                              <Copy className="w-3 h-3" />
                            </button>

                            {/* Edit button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectNoteToEdit(note.id);
                              }}
                              className="p-0.5 text-neutral-400 hover:text-sky-600 hover:bg-sky-50 rounded-md cursor-pointer ios-spring-tool"
                              title="ویرایش در ویرایشگر پیشرفته"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingNote(note);
                              }}
                              className="p-0.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer ios-spring-tool"
                              title="حذف"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ========================================================
          POPUP MODALS & DIALOGS
          ======================================================== */}

      {/* Clean Reader Modal with Soft Spring Expand/Collapse from Card Origin */}
      {viewingItem && (
        <MotionConfig reducedMotion="user">
          {/* Hidden layout measurer (computes exact centered target rect before paint) */}
          <div
            aria-hidden="true"
            className="fixed inset-0 z-[-1] flex items-center justify-center p-3 sm:p-5 pointer-events-none invisible"
          >
            <div
              ref={modalMeasureRef}
              className="bg-white rounded-3xl max-w-lg w-full flex flex-col max-h-[88vh] overflow-hidden"
            >
              {viewingItem.accentBarGradient && (
                <div
                  className={`${
                    viewingItem.type === 'sticky' ? 'h-[8px] sm:h-[9px]' : 'h-[7px] sm:h-[8px]'
                  } w-full shrink-0`}
                />
              )}
              <div ref={modalMeasureContentRef} className="flex flex-col flex-1 min-h-0">
                <div className="px-3.5 sm:px-4 py-1.5 sm:py-2 shrink-0 flex items-center justify-between gap-2">
                  <span className="text-[11px]">spacer</span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
                </div>
                <div className="flex-1 min-h-0 px-4 sm:px-5 py-3 space-y-3 overflow-hidden">
                  <h2 className="text-base sm:text-lg font-black leading-snug tracking-tight">
                    {viewingItem.title}
                  </h2>
                  {viewingItem.type === 'sticky' ? (
                    <div className="px-4 py-3.5 sm:px-5 sm:py-4 rounded-2xl">
                      <RichStickyContent
                        content={viewingItem.content}
                        fontSize={readerFontSize}
                        isBold={viewingItem.isBold}
                      />
                      {((viewingItem.images && viewingItem.images.length > 0) || viewingItem.imageUrl) && (
                        <div className="mt-4 p-3 rounded-xl">
                          <div className="text-xs mb-2">images</div>
                          <div className="pb-1.5">
                            <div className="w-16 h-16 sm:w-20 sm:h-20" />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : viewingItem.rawHtml && /<[a-z][\s\S]*>/i.test(viewingItem.rawHtml) ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: viewingItem.rawHtml }}
                      className={`leading-relaxed prose max-w-none prose-p:my-2.5 prose-p:leading-[2.0] prose-headings:my-3 prose-ul:my-2 prose-li:my-1 ${
                        readerFontSize === 'normal'
                          ? 'text-[14px] sm:text-[15px] prose-p:text-[14px] sm:prose-p:text-[15px]'
                          : readerFontSize === 'large'
                          ? 'text-[16px] sm:text-[17px] prose-p:text-[16px] sm:prose-p:text-[17px]'
                          : 'text-[18px] sm:text-[20px] prose-p:text-[18px] sm:prose-p:text-[20px]'
                      }`}
                    />
                  ) : (
                    <div
                      className={`leading-relaxed whitespace-pre-wrap ${
                        readerFontSize === 'normal'
                          ? 'text-[14px] sm:text-[15px] leading-[2.0]'
                          : readerFontSize === 'large'
                          ? 'text-[16px] sm:text-[17px] leading-[2.2]'
                          : 'text-[18px] sm:text-[20px] leading-[2.4]'
                      }`}
                    >
                      {viewingItem.content || 'بدون متن'}
                    </div>
                  )}
                </div>
                <div className="px-3.5 sm:px-4 py-1.5 sm:py-2 shrink-0 flex items-center justify-between gap-2">
                  <span className="text-[10.5px]">footer</span>
                  <div className="py-1 text-[11px]">btn</div>
                </div>
              </div>
            </div>
          </div>

          {/* Dimmed Backdrop */}
          <motion.div
            key={`backdrop-${viewingItem.cardKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: viewerPhase === 'closing' ? 0 : 1 }}
            transition={{ duration: viewerPhase === 'closing' ? 0.22 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            className={`fixed inset-0 z-50 bg-black/45 overscroll-contain ${
              viewerPhase === 'closing' ? 'pointer-events-none' : ''
            }`}
            onClick={handleCloseViewer}
          />

          {/* Morphing Card-to-Reader Window */}
          {targetRect && (
            <motion.div
              key={`morph-${viewingItem.cardKey}`}
              initial={
                originRect
                  ? {
                      left: originRect.left,
                      top: originRect.top,
                      width: originRect.width,
                      height: originRect.height,
                      borderRadius: 16,
                    }
                  : {
                      left: targetRect.left,
                      top: targetRect.top,
                      width: targetRect.width,
                      height: targetRect.height,
                      borderRadius: 24,
                      opacity: 0,
                      scale: 0.94,
                    }
              }
              animate={
                viewerPhase === 'closing' && originRect
                  ? {
                      left: originRect.left,
                      top: originRect.top,
                      width: originRect.width,
                      height: originRect.height,
                      borderRadius: 16,
                    }
                  : {
                      left: targetRect.left,
                      top: targetRect.top,
                      width: targetRect.width,
                      height: targetRect.height,
                      borderRadius: 24,
                      opacity: 1,
                      scale: 1,
                    }
              }
              transition={viewerPhase === 'closing' ? COLLAPSE_SPRING : EXPAND_SPRING}
              onAnimationComplete={() => {
                if (viewerPhaseRef.current === 'opening') {
                  setViewerPhase('open');
                } else if (viewerPhaseRef.current === 'closing') {
                  closeViewerImmediate();
                }
              }}
              style={{
                position: 'fixed',
                willChange:
                  viewerPhase === 'opening' || viewerPhase === 'closing'
                    ? 'left, top, width, height, border-radius'
                    : 'auto',
              }}
              className={`z-50 bg-white flex flex-col overflow-hidden overscroll-contain touch-auto select-auto ${
                viewerPhase === 'closing'
                  ? 'pointer-events-none shadow-[0_6px_18px_-3px_rgba(0,0,0,0.09),0_2px_6px_-1px_rgba(0,0,0,0.05)]'
                  : 'pointer-events-auto shadow-[0_24px_56px_-12px_rgba(0,0,0,0.30)]'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Continuous Top Accent Ribbon preserved identically from card to reader and back */}
              {viewingItem.accentBarGradient && (
                <div
                  className={`${
                    viewingItem.type === 'sticky' ? 'h-[8px] sm:h-[9px]' : 'h-[7px] sm:h-[8px]'
                  } w-full shrink-0 relative`}
                  style={{ background: viewingItem.accentBarGradient }}
                >
                  <div className="absolute inset-x-0 top-0 h-[1.5px] bg-white/40 pointer-events-none" />
                </div>
              )}

              {/* Content Stage housing both the Card Identity Face and the Expanded Reader Face */}
              <div className="relative flex-1 min-h-0 w-full overflow-hidden">
                {/* Face 1: Card Identity Mirror (visible at origin & smoothly re-emerges during collapse) */}
                {originRect && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: viewerPhase === 'closing' ? 1 : 0 }}
                    transition={
                      viewerPhase === 'closing'
                        ? { duration: 0.18, delay: 0.04, ease: 'easeOut' }
                        : { duration: 0.14, ease: 'easeOut' }
                    }
                    className="absolute inset-0 flex flex-col overflow-hidden pointer-events-none select-none bg-white"
                  >
                    {viewingItem.type === 'sticky' && viewingItem.originalEntry ? (
                      (() => {
                        const entry = viewingItem.originalEntry;
                        const accentTheme = getCardTopAccentTheme(entry.note.color || '#fef08a');
                        const rawPreview = stickyContentToPlainPreview(entry.note.content || '');
                        const imgs = viewingItem.images || [];
                        const cardHasImgs = imgs.length > 0;
                        return (
                          <>
                            <div className="px-2.5 pt-1 pb-1 flex-1 min-h-0 flex flex-col overflow-hidden">
                              <div className="flex items-center justify-between gap-1.5 mb-0.5 shrink-0">
                                <div className="flex items-center gap-1 min-w-0">
                                  <BookOpen className="w-2 h-2 text-neutral-400 shrink-0" />
                                  <span className="text-[8px] font-normal text-neutral-400 truncate max-w-[130px]">
                                    {entry.fileName}
                                  </span>
                                </div>
                                <span
                                  className="px-1.5 py-0.2 rounded-md text-[8.5px] font-bold font-mono shrink-0"
                                  style={{
                                    backgroundColor: accentTheme.badgeBg,
                                    color: accentTheme.badgeText,
                                    boxShadow: `0 2px 6px -1px ${accentTheme.glow}`,
                                  }}
                                >
                                  ص {entry.note.pageNumber}
                                </span>
                              </div>
                              <div className="flex-1 min-h-0 overflow-hidden flex flex-col justify-start px-0.5 w-full text-right" dir="rtl">
                                <h3 className="text-[13px] sm:text-[13.5px] leading-[18px] font-bold text-neutral-950 truncate mb-0.5 tracking-tight shrink-0 text-right w-full">
                                  {viewingItem.title}
                                </h3>
                                {cardHasImgs && (
                                  <div className="mb-0.5 shrink-0 w-full flex justify-start" dir="rtl">
                                    {imgs.length <= 1 ? (
                                      <div className="rounded-md overflow-hidden h-8 w-14 bg-[#f5f6f8] shadow-[0_2px_6px_rgba(0,0,0,0.10)]">
                                        <img src={imgs[0]} alt="" className="w-full h-full object-cover" />
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-2 gap-1 w-full max-w-[116px]">
                                        {imgs.slice(0, 2).map((img, idx) => (
                                          <div key={idx} className="relative rounded-md overflow-hidden h-8 bg-[#f5f6f8] shadow-[0_2px_6px_rgba(0,0,0,0.10)]">
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="text-[9.5px] text-neutral-700 font-normal leading-[13px] overflow-hidden text-right w-full line-clamp-2">
                                  {rawPreview || <span className="text-neutral-400 italic text-[9px]">بدون متن...</span>}
                                </div>
                              </div>
                            </div>
                            <div className="px-2.5 py-1 bg-[#f5f6f8] flex items-center justify-between gap-1.5 shrink-0 mt-auto">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[9px] text-neutral-400 font-mono truncate">
                                  {entry.note.createdAt || 'ثبت شده'}
                                </span>
                                {onOpenFileAtPage && (
                                  <span className="px-1.5 py-0.5 text-[8.5px] font-semibold text-neutral-600 bg-white rounded-md flex items-center gap-1 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
                                    <ExternalLink className="w-2.5 h-2.5 text-neutral-500" />
                                    <span className="hidden sm:inline">مشاهده در فایل</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0 text-neutral-500">
                                <span className="p-0.5"><Copy className="w-3 h-3" /></span>
                                <span className="p-0.5"><Edit2 className="w-3 h-3" /></span>
                                <span className="p-0.5"><Trash2 className="w-3 h-3" /></span>
                              </div>
                            </div>
                          </>
                        );
                      })()
                    ) : (
                      (() => {
                        const origNote = viewingItem.originalNote;
                        const noteFolder = origNote ? folders.find((f) => f.id === origNote.folderId) : null;
                        return (
                          <>
                            <div className="px-2.5 pt-1 pb-1 flex-1 min-h-0 flex flex-col overflow-hidden">
                              <div className="flex items-center justify-between gap-1.5 mb-0.5 shrink-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <div className="w-4 h-4 rounded-md bg-[#f2f3f6] text-neutral-700 flex items-center justify-center shrink-0">
                                    <FileText className="w-2.5 h-2.5" />
                                  </div>
                                  {noteFolder ? (
                                    <div className="flex items-center gap-1 min-w-0 text-[9px] text-neutral-700 font-semibold">
                                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: noteFolder.color || '#2563eb' }} />
                                      <span className="truncate max-w-[110px]">{noteFolder.name}</span>
                                    </div>
                                  ) : (
                                    <span className="text-[9px] text-neutral-500 font-medium">{viewingItem.sourceLabel}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[9px] text-neutral-400 font-mono tabular-nums">
                                    {origNote?.createdAt || viewingItem.date}
                                  </span>
                                  {origNote?.isPinned && (
                                    <span className="p-0.5 text-amber-500">
                                      <Pin className="w-2.5 h-2.5 fill-amber-500" />
                                    </span>
                                  )}
                                </div>
                              </div>
                              <h3 className="text-[13px] sm:text-[13.5px] leading-[18px] font-bold text-neutral-950 truncate mb-0.5 shrink-0 text-right" dir="rtl">
                                {viewingItem.title}
                              </h3>
                              <p className="text-[9.5px] text-neutral-500 line-clamp-2 leading-[13px] overflow-hidden whitespace-pre-line text-right" dir="rtl">
                                {viewingItem.content || 'بدون متن'}
                              </p>
                            </div>
                            <div className="mt-auto px-2.5 py-1 bg-[#f5f6f8] flex items-center justify-between shrink-0">
                              <span className="text-[9px] text-neutral-400 font-mono">
                                {origNote?.updatedAt ? `ویرایش ${origNote.updatedAt}` : origNote?.createdAt || viewingItem.date}
                              </span>
                              <div className="flex items-center gap-0.5 text-neutral-400">
                                <span className="p-0.5"><Pin className="w-3 h-3" /></span>
                                <span className="p-0.5"><Copy className="w-3 h-3" /></span>
                                <span className="p-0.5"><Edit2 className="w-3 h-3" /></span>
                                <span className="p-0.5"><Trash2 className="w-3 h-3" /></span>
                              </div>
                            </div>
                          </>
                        );
                      })()
                    )}
                  </motion.div>
                )}

                {/* Face 2: Expanded Clean Reader Content (locked to target width to avoid text reflow during spring) */}
                <motion.div
                  initial={{ opacity: originRect ? 0 : 1 }}
                  animate={{ opacity: viewerPhase === 'closing' ? 0 : 1 }}
                  transition={
                    viewerPhase === 'closing'
                      ? { duration: 0.13, ease: 'easeOut' }
                      : { duration: 0.2, delay: originRect ? 0.06 : 0, ease: 'easeOut' }
                  }
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    x: '-50%',
                    width: targetRect.width,
                    height: targetContentHeight,
                  }}
                  className={`flex flex-col min-h-0 ${
                    viewerPhase === 'closing' ? 'pointer-events-none' : ''
                  }`}
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-3.5 sm:px-4 py-1.5 sm:py-2 bg-[#f5f6f8] shrink-0 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: viewingItem.color || '#2563eb' }}
                      />
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[10px] sm:text-[11px] font-medium text-neutral-500 truncate">
                          {viewingItem.sourceLabel}
                        </span>
                        {viewingItem.pageNumber && (
                          <span
                            className="px-1.5 py-0.5 rounded-md text-[10px] font-black font-mono shrink-0 shadow-[0_2px_6px_rgba(0,0,0,0.10)] text-black"
                            style={{
                              backgroundColor: viewingItem.color || '#fef08a',
                              color: '#000000',
                            }}
                          >
                            صفحه {viewingItem.pageNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Font Size Adjusters & Close */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-[11px] font-bold text-neutral-600">
                        <button
                          type="button"
                          onClick={() => setReaderFontSize('normal')}
                          className={`px-1.5 py-0.5 rounded-md transition-colors cursor-pointer text-[11px] ${
                            readerFontSize === 'normal'
                              ? 'bg-[#f2f3f6] text-neutral-900 shadow-2xs font-extrabold'
                              : 'hover:text-neutral-900'
                          }`}
                          title="اندازه فونت استاندارد"
                        >
                          A
                        </button>
                        <button
                          type="button"
                          onClick={() => setReaderFontSize('large')}
                          className={`px-1.5 py-0.5 rounded-md transition-colors cursor-pointer text-[11.5px] ${
                            readerFontSize === 'large'
                              ? 'bg-[#f2f3f6] text-neutral-900 shadow-2xs font-extrabold'
                              : 'hover:text-neutral-900'
                          }`}
                          title="اندازه فونت بزرگ (پیشنهادی)"
                        >
                          A+
                        </button>
                        <button
                          type="button"
                          onClick={() => setReaderFontSize('huge')}
                          className={`px-1.5 py-0.5 rounded-md transition-colors cursor-pointer text-xs ${
                            readerFontSize === 'huge'
                              ? 'bg-[#f2f3f6] text-neutral-900 shadow-2xs font-extrabold'
                              : 'hover:text-neutral-900'
                          }`}
                          title="اندازه فونت بسیار بزرگ"
                        >
                          A++
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleCloseViewer}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-90 text-white flex items-center justify-center cursor-pointer shadow-md shadow-rose-500/25 transition-transform shrink-0"
                        title="خروج و بستن پنجره (Esc)"
                        aria-label="خروج و بستن پنجره"
                      >
                        <X className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>

                  {/* Modal Title & Content with Isolated Scroll */}
                  <div
                    className="overflow-y-auto flex-1 space-y-3 px-4 sm:px-5 py-3 overscroll-contain custom-column-scroll"
                    dir="rtl"
                    style={{
                      overscrollBehavior: 'contain',
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    <h2 className="text-base sm:text-lg font-black text-neutral-950 leading-snug tracking-tight text-right w-full">
                      {viewingItem.title}
                    </h2>

                    {viewingItem.type === 'sticky' ? (
                      /* Styled Sticky Note Card Box with authentic paper look & full AI formatting (tables, headings, bold, lists) */
                      <div
                        className="px-4 py-3.5 sm:px-5 sm:py-4 rounded-2xl select-text shadow-[0_6px_18px_-4px_rgba(0,0,0,0.10)] flex flex-col items-stretch text-right w-full mx-auto"
                        style={{
                          backgroundColor: viewingItem.color || '#fef08a',
                          color: '#000000',
                        }}
                        dir="rtl"
                      >
                        <RichStickyContent
                          content={viewingItem.content}
                          fontSize={readerFontSize}
                          isBold={viewingItem.isBold}
                        />

                        {((viewingItem.images && viewingItem.images.length > 0) || viewingItem.imageUrl) && (
                          <div className="mt-4 p-3 rounded-xl bg-black/[0.04] w-full">
                            <div className="text-xs font-bold mb-2 opacity-80 flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>تصاویر ضمیمه ({viewingItem.images?.length || 1}):</span>
                                <span className="text-[10px] font-normal opacity-70">
                                  (برای نمایش تمام‌صفحه با قابلیت زوم کلیک کنید)
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 custom-column-scroll">
                              {(viewingItem.images && viewingItem.images.length > 0
                                ? viewingItem.images
                                : [viewingItem.imageUrl!]
                              ).map((img, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    const allImgs =
                                      viewingItem.images && viewingItem.images.length > 0
                                        ? viewingItem.images
                                        : [viewingItem.imageUrl!];
                                    setLightboxState({
                                      images: allImgs,
                                      index: idx,
                                      title: viewingItem.title,
                                    });
                                  }}
                                  className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-white/80 group shadow-[0_4px_12px_rgba(0,0,0,0.14)] shrink-0 cursor-pointer hover:scale-105 transition-all select-none"
                                  title="کلیک برای نمایش تمام‌صفحه و زوم"
                                >
                                  <img
                                    src={img}
                                    alt={`تصویر ${idx + 1}`}
                                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105 pointer-events-none"
                                    loading="lazy"
                                  />
                                  <div className="absolute top-1 right-1 px-1.5 py-0.2 rounded-md bg-black/70 text-white text-[9px] font-mono font-bold backdrop-blur-xs">
                                    {idx + 1}
                                  </div>
                                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <ZoomIn className="w-4 h-4 drop-shadow-xs" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Regular Note Clean Reader with rich formatting or preserved paragraphs */
                      viewingItem.rawHtml && /<[a-z][\s\S]*>/i.test(viewingItem.rawHtml) ? (
                        <div
                          dangerouslySetInnerHTML={{ __html: viewingItem.rawHtml }}
                          dir="rtl"
                          className={`text-neutral-950 leading-relaxed font-sans select-text prose max-w-none text-right prose-p:my-2.5 prose-p:leading-[2.0] prose-headings:my-3 prose-headings:text-right prose-ul:my-2 prose-li:my-1 prose-img:rounded-xl prose-img:shadow-sm ${
                            readerFontSize === 'normal'
                              ? 'text-[14px] sm:text-[15px] prose-p:text-[14px] sm:prose-p:text-[15px]'
                              : readerFontSize === 'large'
                              ? 'text-[16px] sm:text-[17px] prose-p:text-[16px] sm:prose-p:text-[17px]'
                              : 'text-[18px] sm:text-[20px] prose-p:text-[18px] sm:prose-p:text-[20px]'
                          }`}
                        />
                      ) : (
                        <div
                          dir="rtl"
                          className={`text-neutral-950 leading-relaxed whitespace-pre-wrap font-sans select-text text-right w-full ${
                            readerFontSize === 'normal'
                              ? 'text-[14px] sm:text-[15px] leading-[2.0]'
                              : readerFontSize === 'large'
                              ? 'text-[16px] sm:text-[17px] leading-[2.2]'
                              : 'text-[18px] sm:text-[20px] leading-[2.4]'
                          }`}
                        >
                          {viewingItem.content || (
                            <span className="text-neutral-400 italic">بدون متن</span>
                          )}
                        </div>
                      )
                    )}
                  </div>

                  {/* Modal Footer Actions */}
                  <div className="px-3.5 sm:px-4 py-1.5 sm:py-2 bg-[#f5f6f8] flex items-center justify-between shrink-0 gap-2">
                    <span className="text-[10.5px] text-neutral-400 font-mono truncate">
                      {viewingItem.date || ''}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Direct Jump to PDF page button if reading a sticky note */}
                      {viewingItem.type === 'sticky' && viewingItem.originalEntry && onOpenFileAtPage && (
                        <button
                          type="button"
                          onClick={() => {
                            const entry = viewingItem.originalEntry!;
                            closeViewerImmediate();
                            onOpenFileAtPage(entry.file, entry.note.pageNumber);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-neutral-800 bg-white hover:bg-neutral-50 rounded-lg cursor-pointer flex items-center gap-1 shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
                          title="رفتن به این صفحه در کتاب"
                        >
                          <BookOpen className="w-3 h-3 text-neutral-600" />
                          <span>مشاهده در کتاب</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopyText(htmlToPreviewText(viewingItem.rawHtml || viewingItem.content), 'متن')}
                        className="px-2.5 py-1 text-[11px] font-semibold text-neutral-700 bg-white/90 hover:bg-white rounded-lg cursor-pointer flex items-center gap-1 shadow-[0_2px_6px_rgba(0,0,0,0.05)]"
                      >
                        <Copy className="w-3 h-3" />
                        <span>کپی</span>
                      </button>

                      {viewingItem.type === 'sticky' && viewingItem.originalEntry && (
                        <button
                          type="button"
                          onClick={() => {
                            const entry = viewingItem.originalEntry!;
                            closeViewerImmediate();
                            setEditingStickyNote(entry);
                            setEditTitle(entry.note.title || '');
                            setEditContent(entry.note.content || '');
                            setEditColor(entry.note.color || '#fef08a');
                            setEditTextColor(entry.note.textColor || '#713f12');
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg cursor-pointer flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>ویرایش</span>
                        </button>
                      )}

                      {viewingItem.type === 'note' && viewingItem.originalNote && (
                        <button
                          type="button"
                          onClick={() => {
                            const noteId = viewingItem.originalNote!.id;
                            closeViewerImmediate();
                            onSelectNoteToEdit(noteId);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-neutral-900 bg-white/90 hover:bg-white rounded-lg cursor-pointer flex items-center gap-1 shadow-[0_2px_6px_rgba(0,0,0,0.05)]"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>ویرایش</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleCloseViewer}
                        className="px-3 py-1 text-[11px] font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg cursor-pointer shadow-xs"
                      >
                        بستن
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </MotionConfig>
      )}

      {/* Folder Creation / Edit Modal (هماهنگ با سبک دیزاین سراسری) */}
      {isFolderModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          onClick={() => setIsFolderModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-[0_24px_56px_-12px_rgba(0,0,0,0.30)] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900">
                  {editingFolder ? 'ویرایش پوشه' : 'ایجاد پوشه جدید'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFolderModalOpen(false)}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-90 text-white flex items-center justify-center cursor-pointer shadow-lg shadow-rose-500/30 shrink-0 transition-transform ios-spring-btn"
                title="خروج و بستن پنجره (Esc)"
                aria-label="خروج و بستن پنجره"
              >
                <X className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.5]" />
              </button>
            </div>

            <form onSubmit={handleSaveFolder} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                  نام دسته‌بندی:
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="مثلاً: نکات کنکور، فیزیک پایه، خلاصه‌ها..."
                  value={folderNameInput}
                  onChange={(e) => setFolderNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f2f3f6] focus:bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:shadow-[0_6px_18px_-3px_rgba(0,0,0,0.12)] rounded-xl text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                  دسته‌بندی والد (اختیاری - برای زیرمجموعه‌سازی):
                </label>
                <select
                  value={parentFolderIdInput || ''}
                  onChange={(e) => setParentFolderIdInput(e.target.value ? e.target.value : null)}
                  className="w-full px-3.5 py-2.5 bg-[#f2f3f6] focus:bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:shadow-[0_6px_18px_-3px_rgba(0,0,0,0.12)] rounded-xl text-xs sm:text-sm text-neutral-900 focus:outline-none cursor-pointer transition-all"
                >
                  <option value="">بدون والد (دسته‌بندی اصلی)</option>
                  {folders
                    .filter((f) => !f.parentId && (!editingFolder || f.id !== editingFolder.id))
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-neutral-400 mt-1">
                  با انتخاب والد، این دسته‌بندی در زیرمجموعه قرار می‌گیرد تا نوار اصلی همیشه خلوت و مرتب بماند.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-2">
                  رنگ برچسب:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {FOLDER_COLOR_PALETTE.map((pal) => {
                    const isSelected = folderColorInput === pal.value;
                    return (
                      <button
                        key={pal.value}
                        type="button"
                        onClick={() => setFolderColorInput(pal.value)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ios-spring-tool transition-all ${
                          pal.bg
                        } ${pal.text} ${
                          isSelected
                            ? 'scale-105 shadow-[0_0_0_2px_#171717,0_6px_14px_rgba(0,0,0,0.18)]'
                            : 'shadow-[0_2px_6px_rgba(0,0,0,0.06)] hover:opacity-90'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${pal.dot}`} />
                        <span className="text-[11px] truncate">{pal.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl cursor-pointer ios-spring-btn"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl cursor-pointer shadow-xs ios-spring-btn"
                >
                  {editingFolder ? 'ذخیره تغییرات' : 'ایجاد پوشه'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Folder Confirmation Dialog */}
      {folderToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          onClick={() => setFolderToDelete(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-[0_24px_56px_-12px_rgba(0,0,0,0.30)] space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                حذف پوشه «{folderToDelete.name}»
              </h3>
              <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                با حذف این پوشه، یادداشت‌های داخل آن حذف نخواهند شد و به وضعیت «عمومی و بدون پوشه» منتقل می‌شوند.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setFolderToDelete(null)}
                className="flex-1 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl cursor-pointer ios-spring-btn"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmDeleteFolder}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md cursor-pointer ios-spring-btn"
              >
                حذف پوشه
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Note Quick Edit Modal */}
      {editingStickyNote && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          onClick={() => setEditingStickyNote(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-[0_24px_56px_-12px_rgba(0,0,0,0.30)] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-sm font-bold text-neutral-900">
                ویرایش سریع استیکی‌نوت
              </h3>
              <button
                type="button"
                onClick={() => setEditingStickyNote(null)}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-90 text-white flex items-center justify-center cursor-pointer shadow-lg shadow-rose-500/30 shrink-0 transition-transform ios-spring-btn"
                title="خروج و بستن پنجره (Esc)"
                aria-label="خروج و بستن پنجره"
              >
                <X className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.5]" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStickyNote} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  عنوان:
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onPaste={(e) => {
                    const pasted = clipboardToStickyMarkdown(e.clipboardData);
                    if (pasted) {
                      e.preventDefault();
                      const cleaned = stickyContentToPlainPreview(pasted).replace(/\n/g, ' ').trim();
                      const target = e.currentTarget;
                      let inserted = false;
                      try {
                        inserted = document.execCommand('insertText', false, cleaned);
                      } catch {}
                      if (inserted) {
                        setEditTitle(target.value);
                      } else {
                        const start = target.selectionStart ?? target.value.length;
                        const end = target.selectionEnd ?? target.value.length;
                        const val = target.value;
                        const updated = val.slice(0, start) + cleaned + val.slice(end);
                        setEditTitle(updated);
                        const newPos = start + cleaned.length;
                        requestAnimationFrame(() => {
                          if (target) target.setSelectionRange(newPos, newPos);
                        });
                      }
                    }
                  }}
                  placeholder="عنوان یا کلیدواژه یادداشت..."
                  className="w-full px-3.5 py-2.5 text-xs bg-[#f2f3f6] focus:bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:shadow-[0_6px_18px_-3px_rgba(0,0,0,0.12)] rounded-xl focus:outline-none text-right font-medium transition-all"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  متن برگه چسبان:
                </label>
                <textarea
                  rows={5}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onPaste={(e) => {
                    const formatted = clipboardToStickyMarkdown(e.clipboardData);
                    if (formatted) {
                      e.preventDefault();
                      const target = e.currentTarget;
                      let inserted = false;
                      try {
                        inserted = document.execCommand('insertText', false, formatted);
                      } catch {}
                      if (inserted) {
                        setEditContent(target.value);
                      } else {
                        const start = target.selectionStart ?? target.value.length;
                        const end = target.selectionEnd ?? target.value.length;
                        const val = target.value;
                        const updated = val.slice(0, start) + formatted + val.slice(end);
                        setEditContent(updated);
                        const newPos = start + formatted.length;
                        requestAnimationFrame(() => {
                          if (target) target.setSelectionRange(newPos, newPos);
                        });
                      }
                    }
                  }}
                  placeholder="متن یادداشت..."
                  className="w-full px-3.5 py-2.5 text-xs bg-[#f2f3f6] focus:bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:shadow-[0_6px_18px_-3px_rgba(0,0,0,0.12)] rounded-xl focus:outline-none leading-relaxed font-sans placeholder:text-neutral-400 resize-none text-right font-medium transition-all"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                  رنگ برگه:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.bg}
                      type="button"
                      onClick={() => {
                        setEditColor(c.bg);
                        setEditTextColor(c.text);
                      }}
                      style={{ backgroundColor: c.bg }}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ios-spring-tool ${
                        editColor === c.bg
                          ? 'scale-110 shadow-[0_0_0_2px_#fff,0_0_0_4px_#171717,0_6px_14px_rgba(0,0,0,0.2)]'
                          : 'shadow-[0_2px_8px_rgba(0,0,0,0.14)] hover:scale-105'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStickyNote(null)}
                  className="flex-1 py-2 text-xs font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl cursor-pointer ios-spring-btn"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl cursor-pointer shadow-xs ios-spring-btn"
                >
                  ذخیره تغییرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Sticky Note Dialog */}
      {deletingStickyNote && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          onClick={() => setDeletingStickyNote(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-[0_24px_56px_-12px_rgba(0,0,0,0.30)] space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                حذف استیکی‌نوت
              </h3>
              <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                آیا از حذف این یادداشت چسبان اطمینان دارید؟
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingStickyNote(null)}
                className="flex-1 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl cursor-pointer ios-spring-btn"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmDeleteStickyNote}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md cursor-pointer ios-spring-btn"
              >
                بله، حذف شود
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Standalone Note Dialog */}
      {deletingNote && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          onClick={() => setDeletingNote(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-[0_24px_56px_-12px_rgba(0,0,0,0.30)] space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                حذف یادداشت
              </h3>
              <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                آیا از حذف یادداشت «{deletingNote.title || 'بدون عنوان'}» اطمینان دارید؟ این عملیات قابل بازگشت نیست.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingNote(null)}
                className="flex-1 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl cursor-pointer ios-spring-btn"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmDeleteNote}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md cursor-pointer ios-spring-btn"
              >
                بله، حذف شود
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Add/Edit Modal */}
      {isTaskModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          onClick={() => setIsTaskModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-[0_24px_56px_-12px_rgba(0,0,0,0.30)] space-y-4"
          >
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#f2f3f6] text-neutral-800 flex items-center justify-center shadow-2xs">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900">
                  {editingTask ? 'ویرایش تسک' : 'افزودن تسک جدید'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-90 text-white flex items-center justify-center cursor-pointer shadow-lg shadow-rose-500/30 shrink-0 transition-transform ios-spring-btn"
                title="خروج و بستن پنجره (Esc)"
                aria-label="خروج و بستن پنجره"
              >
                <X className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.5]" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  عنوان تسک <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={taskTitleInput}
                  onChange={(e) => setTaskTitleInput(e.target.value)}
                  placeholder="مثال: مطالعه فصل ۳ یا حل تمرین‌ها"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f2f3f6] focus:bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:shadow-[0_6px_18px_-3px_rgba(0,0,0,0.12)] focus:outline-none text-xs sm:text-sm text-neutral-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  توضیحات تکمیلی (اختیاری)
                </label>
                <textarea
                  rows={3}
                  value={taskDescInput}
                  onChange={(e) => setTaskDescInput(e.target.value)}
                  placeholder="نکات مهم، منابع یا توضیحات تسک..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#f2f3f6] focus:bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:shadow-[0_6px_18px_-3px_rgba(0,0,0,0.12)] focus:outline-none text-xs text-neutral-900 resize-none transition-all"
                />
              </div>

              {/* Priority Selector */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">اولویت</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'low', label: 'عادی', color: 'bg-[#f2f3f6] text-neutral-700 hover:bg-neutral-200/70', active: 'bg-neutral-900 text-white shadow-sm' },
                    { id: 'medium', label: 'مهم', color: 'bg-amber-100/70 text-amber-800 hover:bg-amber-100', active: 'bg-amber-600 text-white shadow-sm' },
                    { id: 'high', label: 'فوری', color: 'bg-rose-100/70 text-rose-800 hover:bg-rose-100', active: 'bg-rose-600 text-white shadow-sm' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setTaskPriorityInput(p.id as 'low' | 'medium' | 'high')}
                      className={`py-2 text-xs font-bold rounded-xl cursor-pointer transition-all shadow-2xs ios-spring-btn ${
                        taskPriorityInput === p.id ? p.active : p.color
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date / Tag */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">مهلت یا زمان‌بندی (اختیاری)</label>
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  {['امروز', 'فردا', 'این هفته'].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setTaskDueDateInput(chip)}
                      className={`px-2.5 py-1 text-[11px] rounded-lg cursor-pointer transition-all ios-spring-btn ${
                        taskDueDateInput === chip
                          ? 'bg-neutral-900 text-white font-bold shadow-xs'
                          : 'bg-[#f2f3f6] hover:bg-neutral-200/80 text-neutral-600'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={taskDueDateInput}
                  onChange={(e) => setTaskDueDateInput(e.target.value)}
                  placeholder="مثال: امروز، فردا یا تاریخ دلخواه..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#f2f3f6] focus:bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:shadow-[0_6px_18px_-3px_rgba(0,0,0,0.12)] focus:outline-none text-xs text-neutral-900 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl cursor-pointer ios-spring-btn"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl cursor-pointer shadow-sm hover:shadow ios-spring-btn"
                >
                  {editingTask ? 'ذخیره تغییرات' : 'افزودن تسک'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Bottom Navigation Capsule with the 3 main options (یادداشت‌ها / تسک‌ها / استیکی‌نوت‌ها) */}
      <nav
        aria-label="بخش‌های اصلی برنامه"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-md p-2 rounded-full shadow-[0_14px_38px_-4px_rgba(0,0,0,0.22),0_4px_14px_-2px_rgba(0,0,0,0.10)] grid grid-cols-3 gap-1.5 select-none w-[calc(100%-1rem)] max-w-[430px]"
      >
        {/* 1. یادداشت‌ها */}
        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={`w-full py-2.5 px-2 rounded-full text-[13px] sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ios-spring-btn whitespace-nowrap ${
            activeTab === 'notes'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/80'
          }`}
        >
          <span className="whitespace-nowrap">یادداشت‌ها</span>
          <span className="text-[11px] font-mono tabular-nums opacity-80">
            ({notes.length})
          </span>
        </button>

        {/* 2. تسک‌ها */}
        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`w-full py-2.5 px-2 rounded-full text-[13px] sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ios-spring-btn whitespace-nowrap ${
            activeTab === 'tasks'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/80'
          }`}
        >
          <span className="whitespace-nowrap">تسک‌ها</span>
          <span className="text-[11px] font-mono tabular-nums opacity-80">
            ({activeTasksCount})
          </span>
        </button>

        {/* 3. استیکی‌نوت‌ها */}
        <button
          type="button"
          onClick={() => setActiveTab('sticky-notes')}
          className={`w-full py-2.5 px-2 rounded-full text-[13px] sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ios-spring-btn whitespace-nowrap ${
            activeTab === 'sticky-notes'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/80'
          }`}
        >
          <span className="whitespace-nowrap">استیکی‌ها</span>
          <span className="text-[11px] font-mono tabular-nums opacity-80">
            ({allStickyNotes.length})
          </span>
        </button>
      </nav>

      {/* 4. Copied Toast Notification (Positioned above floating capsule) */}
      {copiedToast && (
        <div
          className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold whitespace-nowrap"
        >
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* 5. Fullscreen Interactive Lightbox Modal with Zoom & Pan */}
      {lightboxState && (
        <ImageZoomLightbox
          images={lightboxState.images}
          initialIndex={lightboxState.index}
          isOpen={Boolean(lightboxState)}
          onClose={() => setLightboxState(null)}
          title={lightboxState.title}
        />
      )}
    </div>
  );
};
