import { useState, useEffect, useCallback } from 'react';
import { Settings, FileText } from 'lucide-react';
import { NoteItem, StudyFile, StickyNoteItem } from './types';
import { NotesView } from './components/NotesView';
import { SettingsView } from './components/SettingsView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import {
  getAllNotesFromStorage,
  saveAllNotesToStorage,
  getAllStudyFiles,
  saveFileEditsToStorage,
} from './utils/fileStorage';

const STORAGE_KEYS = {
  NOTES: 'study_workspace_notes',
};

export default function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [targetNoteIdToOpen, setTargetNoteIdToOpen] = useState<string | null>(null);
  const [studyFiles, setStudyFiles] = useState<StudyFile[]>([]);

  // Load notes from localStorage as initial state, then hydrate from IndexedDB
  const [notes, setNotes] = useState<NoteItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTES);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: '1',
        title: 'خوش آمدید به نسخه موبایل و PWA',
        content: 'این برنامه به صورت ۱۰۰٪ آفلاین روی آیفون، آیپد و کامپیوتر اجرا می‌شود. می‌توانید یادداشت‌های درسی، خلاصه نکات و فرمول‌های خود را در پوشه‌های مجزا ثبت و جستجو کنید.',
        createdAt: new Intl.DateTimeFormat('fa-IR').format(new Date()),
        updatedAt: new Intl.DateTimeFormat('fa-IR').format(new Date()),
        isPinned: true,
      },
    ];
  });

  // Hydrate notes and study files (including sticky notes) from IndexedDB on startup
  useEffect(() => {
    let isCancelled = false;
    const loadWorkspaceData = async () => {
      try {
        const [idbNotes, idbFiles] = await Promise.all([
          getAllNotesFromStorage(),
          getAllStudyFiles(),
        ]);
        if (isCancelled) return;

        if (idbNotes && idbNotes.length > 0) {
          setNotes(idbNotes);
          try {
            localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(idbNotes));
          } catch {}
        } else {
          const savedLocal = localStorage.getItem(STORAGE_KEYS.NOTES);
          if (savedLocal) {
            const parsed = JSON.parse(savedLocal);
            if (Array.isArray(parsed) && parsed.length > 0) {
              await saveAllNotesToStorage(parsed);
              if (!isCancelled) setNotes(parsed);
            }
          }
        }

        if (Array.isArray(idbFiles)) {
          setStudyFiles(idbFiles);
        }
      } catch (err) {
        console.warn('Failed to load workspace data from IndexedDB:', err);
      }
    };

    loadWorkspaceData();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Save notes to both IndexedDB and localStorage whenever notes change
  const persistNotes = useCallback(async (updatedNotes: NoteItem[]) => {
    setNotes(updatedNotes);
    try {
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(updatedNotes));
    } catch {}
    try {
      await saveAllNotesToStorage(updatedNotes);
    } catch (err) {
      console.warn('Failed to persist notes to IndexedDB:', err);
    }
  }, []);

  const handleAddNote = useCallback(
    (noteData: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Intl.DateTimeFormat('fa-IR').format(new Date());
      const newNote: NoteItem = {
        ...noteData,
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      };

      const updated = [newNote, ...notes];
      persistNotes(updated);
      setTargetNoteIdToOpen(newNote.id);
    },
    [notes, persistNotes]
  );

  const handleUpdateNote = useCallback(
    (id: string, title: string, content: string, extra?: Partial<NoteItem>) => {
      const now = new Intl.DateTimeFormat('fa-IR').format(new Date());
      const updated = notes.map((n) =>
        n.id === id ? { ...n, title, content, updatedAt: now, ...(extra || {}) } : n
      );
      persistNotes(updated);
    },
    [notes, persistNotes]
  );

  const handleDeleteNote = useCallback(
    (id: string) => {
      const updated = notes.filter((n) => n.id !== id);
      persistNotes(updated);
      if (targetNoteIdToOpen === id) {
        setTargetNoteIdToOpen(null);
      }
    },
    [notes, persistNotes, targetNoteIdToOpen]
  );

  const handleUpdateStickyNote = useCallback(
    (fileId: string, updatedSticky: StickyNoteItem) => {
      setStudyFiles((prev) =>
        prev.map((file) => {
          if (file.id !== fileId) return file;
          const existing = file.stickyNotes || [];
          const exists = existing.some((s) => s.id === updatedSticky.id);
          const nextStickyNotes = exists
            ? existing.map((s) => (s.id === updatedSticky.id ? updatedSticky : s))
            : [...existing, updatedSticky];
          const nextFile: StudyFile = {
            ...file,
            stickyNotes: nextStickyNotes,
            lastModified: new Date().toISOString(),
          };
          saveFileEditsToStorage(fileId, {
            fileId,
            pageStrokes: file.pageStrokes || {},
            stickyNotes: nextStickyNotes,
            currentPage: file.currentPage || 1,
            pageCount: file.pageCount,
            scale: file.scale,
            updatedAt: nextFile.lastModified!,
          }).catch((err) => console.warn('Failed to persist sticky note edit:', err));
          return nextFile;
        })
      );
    },
    []
  );

  const handleDeleteStickyNote = useCallback(
    (fileId: string, stickyNoteId: string) => {
      setStudyFiles((prev) =>
        prev.map((file) => {
          if (file.id !== fileId) return file;
          const nextStickyNotes = (file.stickyNotes || []).filter((s) => s.id !== stickyNoteId);
          const nextFile: StudyFile = {
            ...file,
            stickyNotes: nextStickyNotes,
            lastModified: new Date().toISOString(),
          };
          saveFileEditsToStorage(fileId, {
            fileId,
            pageStrokes: file.pageStrokes || {},
            stickyNotes: nextStickyNotes,
            currentPage: file.currentPage || 1,
            pageCount: file.pageCount,
            scale: file.scale,
            updatedAt: nextFile.lastModified!,
          }).catch((err) => console.warn('Failed to persist sticky note delete:', err));
          return nextFile;
        })
      );
    },
    []
  );

  const handleRefreshAllData = useCallback(async () => {
    try {
      const [idbNotes, idbFiles] = await Promise.all([
        getAllNotesFromStorage(),
        getAllStudyFiles(),
      ]);
      const nextNotes = Array.isArray(idbNotes) ? idbNotes : [];
      setNotes(nextNotes);
      try {
        localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(nextNotes));
      } catch {}

      setStudyFiles(Array.isArray(idbFiles) ? idbFiles : []);
      window.dispatchEvent(new CustomEvent('study-data-restored'));
    } catch (e) {
      console.warn('Refresh error:', e);
    }
  }, []);

  return (
    <div
      dir="rtl"
      className="flex flex-col bg-[#eef0f3] text-neutral-900 h-[100dvh] w-full select-none overflow-hidden relative"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 10px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 10px)',
        paddingRight: 'max(env(safe-area-inset-right, 0px), 8px)',
        paddingLeft: 'max(env(safe-area-inset-left, 0px), 8px)',
      }}
    >
      {/* Offline Status Connectivity Banner */}
      <OfflineIndicator />

      {/* Sleek Minimalist Top Header with Settings Icon */}
      <header className="px-3 sm:px-4 py-2 bg-white flex items-center justify-between shrink-0 shadow-[0_6px_20px_-4px_rgba(0,0,0,0.09),0_2px_6px_-1px_rgba(0,0,0,0.04)] rounded-2xl mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center shadow-sm">
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <h1 className="text-xs sm:text-sm font-bold text-neutral-900">دفترچه یادداشت</h1>
          <span className="text-[10px] sm:text-[11px] font-mono font-bold bg-[#f3f4f6] text-neutral-600 px-2 py-0.5 rounded-full">
            {notes.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* In-App PWA Install Button / iOS Safari Guide */}
          <PWAInstallButton />

          {/* Settings Icon Button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="w-8 h-8 rounded-xl bg-[#f3f4f6] hover:bg-neutral-200/80 active:scale-90 text-neutral-700 flex items-center justify-center transition-all cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            title="تنظیمات، اکسپورت و ایمپورت نوت‌ها"
            aria-label="تنظیمات و پشتیبان‌گیری"
          >
            <Settings className="w-4 h-4 text-neutral-700" />
          </button>
        </div>
      </header>

      {/* Main Full-Screen Notes Workspace */}
      <main className="flex-1 min-h-0 h-full overflow-hidden relative flex flex-col bg-[#f5f6f8] rounded-2xl shadow-[0_10px_32px_-6px_rgba(0,0,0,0.10),0_3px_10px_-2px_rgba(0,0,0,0.04)]">
        <NotesView
          notes={notes}
          onAddNote={handleAddNote}
          onUpdateNote={handleUpdateNote}
          onDeleteNote={handleDeleteNote}
          studyFiles={studyFiles}
          onUpdateStickyNote={handleUpdateStickyNote}
          onDeleteStickyNote={handleDeleteStickyNote}
          initialNoteId={targetNoteIdToOpen}
        />
      </main>

      {/* Settings & Data Transfer Modal (Opens cleanly upon tapping Settings Icon) */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-2 sm:p-4"
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSettingsOpen(false);
          }}
        >
          <div className="w-full max-w-lg bg-[#f5f6f8] rounded-2xl sm:rounded-3xl shadow-[0_24px_56px_-12px_rgba(0,0,0,0.30)] overflow-hidden max-h-[90vh] flex flex-col">
            <SettingsView
              notesCount={notes.length}
              notes={notes}
              studyFiles={studyFiles}
              onClose={() => setIsSettingsOpen(false)}
              onDataRestored={handleRefreshAllData}
            />
          </div>
        </div>
      )}
    </div>
  );
}
