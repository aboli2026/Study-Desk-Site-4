import React, { useState, useRef } from 'react';
import {
  HardDrive,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { NoteItem, StudyFile, FileEdits, StickyNoteItem } from '../types';
import {
  saveAllNotesToStorage,
  getAllNotesFromStorage,
  getAllStudyFiles,
  saveStudyFileToStorage,
  saveFileEditsToStorage,
  getFileEditsFromStorage,
  getAllTasksFromStorage,
  saveAllTasksToStorage,
  clearStudyFilesAndEditsStorage,
} from '../utils/fileStorage';

interface SettingsViewProps {
  notesCount?: number;
  notes?: NoteItem[];
  studyFiles?: StudyFile[];
  onClose?: () => void;
  onDataRestored?: () => Promise<void> | void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  notes = [],
  studyFiles = [],
  onClose,
  onDataRestored,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Export Notes, Sticky Notes, Tasks & Folders to JSON / StudyBackup format
  const handleExportNotes = async () => {
    try {
      setIsExporting(true);

      let allNotes = notes;
      if (!allNotes || allNotes.length === 0) {
        allNotes = await getAllNotesFromStorage();
      }

      let allFiles = studyFiles;
      if (!allFiles || allFiles.length === 0) {
        allFiles = await getAllStudyFiles();
      }

      let totalStickyNotes = 0;
      const exportFiles = await Promise.all(
        (allFiles || []).map(async (file) => {
          let storedEdits: FileEdits | null = null;
          try {
            storedEdits = await getFileEditsFromStorage(file.id);
          } catch {}

          const stickyNotes = storedEdits?.stickyNotes || file.stickyNotes || [];
          const pageStrokes = storedEdits?.pageStrokes || file.pageStrokes || {};
          totalStickyNotes += stickyNotes.length;

          return {
            id: file.id,
            name: file.name,
            size: file.size || 0,
            uploadDate: file.uploadDate || new Date().toISOString(),
            lastModified: file.lastModified || storedEdits?.updatedAt || new Date().toISOString(),
            currentPage: storedEdits?.currentPage || file.currentPage || 1,
            pageCount: storedEdits?.pageCount || file.pageCount,
            scale: storedEdits?.scale || file.scale || 1.2,
            category: file.category,
            tags: file.tags,
            isFavorite: file.isFavorite,
            edits: {
              fileId: file.id,
              stickyNotes,
              pageStrokes,
              currentPage: storedEdits?.currentPage || file.currentPage || 1,
              pageCount: storedEdits?.pageCount || file.pageCount,
              scale: storedEdits?.scale || file.scale || 1.2,
              updatedAt: storedEdits?.updatedAt || new Date().toISOString(),
            },
          };
        })
      );

      const tasks = getAllTasksFromStorage();
      let folders: any[] = [];
      try {
        const rawFolders = localStorage.getItem('study_workspace_folders');
        if (rawFolders) folders = JSON.parse(rawFolders);
      } catch {}

      let categories: any[] = [];
      try {
        const rawCats = localStorage.getItem('study_file_categories');
        if (rawCats) categories = JSON.parse(rawCats);
      } catch {}

      const backupPayload = {
        signature: 'STUDY_DESK_WORKSPACE_BACKUP_V1',
        app: 'StudyNotesPWA',
        version: '1.1',
        exportedAt: new Date().toISOString(),
        stats: {
          filesCount: exportFiles.length,
          stickyNotesCount: totalStickyNotes,
          notesCount: allNotes.length,
        },
        notesCount: allNotes.length,
        files: exportFiles,
        notes: allNotes,
        tasks,
        folders,
        categories,
      };

      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.href = url;
      downloadAnchor.download = `notes-backup-${dateStr}.json`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);

      setStatusMessage({
        text: `فایل پشتیبان شامل ${allNotes.length} یادداشت و ${totalStickyNotes} استیکی‌نوت با موفقیت دانلود شد.`,
        type: 'success',
      });
      setTimeout(() => setStatusMessage(null), 4500);
    } catch (err) {
      console.warn('Export error:', err);
      setStatusMessage({ text: 'خطا در خروجی گرفتن از داده‌ها.', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Import Notes, Sticky Notes (.studybackup & .json), Tasks & Folders
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const text = await file.text();
      const parsed = JSON.parse(text);

      let importedNotes: NoteItem[] = [];
      if (Array.isArray(parsed)) {
        importedNotes = parsed;
      } else if (parsed && Array.isArray(parsed.notes)) {
        importedNotes = parsed.notes;
      }

      // Extract files & sticky notes (supports .studybackup, lightweight backup, and custom JSON structures)
      const rawFiles: any[] = Array.isArray(parsed?.files)
        ? parsed.files
        : Array.isArray(parsed?.studyFiles)
        ? parsed.studyFiles
        : [];

      let importedStickyCount = 0;
      let importedFilesCount = 0;

      if (rawFiles.length > 0) {
        for (let i = 0; i < rawFiles.length; i++) {
          const item = rawFiles[i];
          if (!item) continue;

          const fileId = String(item.id || `imported_file_${Date.now()}_${i}`);
          const fileName = String(item.name || `فایل ${i + 1}`);
          const stickyNotes: StickyNoteItem[] = Array.isArray(item.edits?.stickyNotes)
            ? item.edits.stickyNotes
            : Array.isArray(item.stickyNotes)
            ? item.stickyNotes
            : [];
          const pageStrokes = item.edits?.pageStrokes || item.pageStrokes || {};
          const currentPage = item.edits?.currentPage || item.currentPage || 1;
          const pageCount = item.edits?.pageCount || item.pageCount;
          const scale = item.edits?.scale || item.scale || 1.2;
          const updatedAt = item.edits?.updatedAt || item.lastModified || new Date().toISOString();

          // Keep storage ultra-light on mobile (sticky notes & metadata without heavy raw PDF bytes)
          const reconstructedFile: StudyFile = {
            id: fileId,
            name: fileName,
            size: item.size || 0,
            data: new ArrayBuffer(0),
            originalData: new ArrayBuffer(0),
            uploadDate: item.uploadDate || new Date().toISOString(),
            lastModified: updatedAt,
            currentPage,
            pageCount,
            scale,
            category: item.category,
            tags: item.tags,
            isFavorite: item.isFavorite,
            stickyNotes,
            pageStrokes,
          };

          await saveStudyFileToStorage(reconstructedFile);
          await saveFileEditsToStorage(fileId, {
            fileId,
            stickyNotes,
            pageStrokes,
            currentPage,
            pageCount,
            scale,
            updatedAt,
          });

          importedStickyCount += stickyNotes.length;
          importedFilesCount += 1;

          // Yield periodically so UI stays responsive on mobile if there are many files
          if (i % 5 === 4) {
            await new Promise((r) => setTimeout(r, 0));
          }
        }
      }

      // Support top-level standalone stickyNotes array if provided outside `files`
      if (Array.isArray(parsed?.stickyNotes) && parsed.stickyNotes.length > 0) {
        const grouped = new Map<string, { name: string; notes: StickyNoteItem[] }>();
        parsed.stickyNotes.forEach((sn: any) => {
          const fId = String(sn.fileId || 'imported_standalone_sticky');
          const fName = String(sn.fileName || 'استیکی‌نوت‌های بازیابی‌شده');
          const entry = grouped.get(fId) || { name: fName, notes: [] };
          entry.notes.push(sn);
          grouped.set(fId, entry);
        });

        for (const [fId, group] of grouped.entries()) {
          const existingEdits = await getFileEditsFromStorage(fId);
          const existingIds = new Set((existingEdits?.stickyNotes || []).map((n) => n.id));
          const mergedSticky = [...(existingEdits?.stickyNotes || [])];
          for (const sn of group.notes) {
            if (!existingIds.has(sn.id)) {
              mergedSticky.push(sn);
              existingIds.add(sn.id);
            }
          }
          const updatedAt = new Date().toISOString();
          await saveStudyFileToStorage({
            id: fId,
            name: group.name,
            size: 0,
            data: new ArrayBuffer(0),
            originalData: new ArrayBuffer(0),
            uploadDate: updatedAt,
            lastModified: updatedAt,
            stickyNotes: mergedSticky,
            pageStrokes: existingEdits?.pageStrokes || {},
          });
          await saveFileEditsToStorage(fId, {
            fileId: fId,
            stickyNotes: mergedSticky,
            pageStrokes: existingEdits?.pageStrokes || {},
            currentPage: 1,
            updatedAt,
          });
          importedStickyCount += group.notes.length;
          importedFilesCount += 1;
        }
      }

      // Save Notes
      if (importedNotes.length > 0) {
        await saveAllNotesToStorage(importedNotes);
        try {
          localStorage.setItem('study_workspace_notes', JSON.stringify(importedNotes));
        } catch {}
      }

      // Restore Tasks if present
      let importedTasksCount = 0;
      if (Array.isArray(parsed?.tasks) && parsed.tasks.length > 0) {
        saveAllTasksToStorage(parsed.tasks);
        importedTasksCount = parsed.tasks.length;
      }

      // Restore Folders if present
      if (Array.isArray(parsed?.folders)) {
        try {
          localStorage.setItem('study_workspace_folders', JSON.stringify(parsed.folders));
        } catch {}
      }

      // Restore Categories if present
      if (Array.isArray(parsed?.categories)) {
        try {
          localStorage.setItem('study_file_categories', JSON.stringify(parsed.categories));
        } catch {}
      }

      if (
        importedNotes.length > 0 ||
        importedStickyCount > 0 ||
        importedFilesCount > 0 ||
        importedTasksCount > 0
      ) {
        if (onDataRestored) {
          await onDataRestored();
        }
        window.dispatchEvent(new CustomEvent('study-data-restored'));

        const parts: string[] = [];
        if (importedNotes.length > 0) parts.push(`${importedNotes.length} یادداشت`);
        if (importedStickyCount > 0) parts.push(`${importedStickyCount} استیکی‌نوت`);
        if (importedTasksCount > 0) parts.push(`${importedTasksCount} تسک`);

        setStatusMessage({
          text: `${parts.join(' و ') || 'فایل پشتیبان'} با موفقیت بازیابی شد.`,
          type: 'success',
        });
        setTimeout(() => setStatusMessage(null), 5000);
      } else {
        setStatusMessage({
          text: 'هیچ یادداشت یا استیکی‌نوتی در این فایل یافت نشد.',
          type: 'error',
        });
      }
    } catch (err) {
      console.warn('Import error:', err);
      setStatusMessage({
        text: 'قالب فایل انتخابی معتبر نیست (باید فایل JSON یا studybackup باشد).',
        type: 'error',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 3. Clear all notes & sticky notes
  const handleClearAllNotes = async () => {
    if (
      window.confirm(
        'آیا مطمئن هستید که می‌خواهید تمام یادداشت‌ها و استیکی‌نوت‌ها را پاک کنید؟ این عملیات غیرقابل بازگشت است.'
      )
    ) {
      try {
        await saveAllNotesToStorage([]);
        await clearStudyFilesAndEditsStorage();
        try {
          localStorage.removeItem('study_workspace_notes');
        } catch {}
        if (onDataRestored) {
          await onDataRestored();
        }
        window.dispatchEvent(new CustomEvent('study-data-restored'));
        setStatusMessage({ text: 'تمامی یادداشت‌ها و استیکی‌نوت‌ها با موفقیت پاک شدند.', type: 'success' });
        setTimeout(() => setStatusMessage(null), 3500);
      } catch (err) {
        console.warn('Clear error:', err);
        setStatusMessage({ text: 'خطا در پاکسازی داده‌ها.', type: 'error' });
      }
    }
  };

  return (
    <div className="w-full h-full bg-[#f5f6f8] flex flex-col select-none overflow-hidden" dir="rtl">
      {/* Hidden File Input for Import (.json and .studybackup) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".json,.studybackup,application/json,text/plain"
        className="hidden"
      />

      {/* Header */}
      <div className="px-3.5 sm:px-5 py-3 flex items-center justify-between bg-white shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)] shrink-0 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center shadow-sm shrink-0">
            <HardDrive className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-neutral-900">مدیریت و انتقال نوت‌ها</h2>
            <p className="text-[10px] text-neutral-400">
              اکسپورت و ایمپورت یادداشت‌ها و استیکی‌نوت‌ها
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#f2f3f6] hover:bg-neutral-200/80 text-neutral-600 flex items-center justify-center transition cursor-pointer shadow-[0_2px_6px_rgba(0,0,0,0.05)]"
            title="بستن پنجره"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto max-w-xl mx-auto w-full space-y-3">
        {/* Status Toast Message */}
        {statusMessage && (
          <div
            className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-[0_6px_18px_-3px_rgba(0,0,0,0.09)] animate-fade-in ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-rose-50 text-rose-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* 1. Export Card (Compact) */}
        <div className="bg-white rounded-2xl p-3 sm:p-3.5 shadow-[0_6px_20px_-4px_rgba(0,0,0,0.09),0_2px_6px_-1px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(37,99,235,0.12)]">
                <Download className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-neutral-900">خروجی یادداشت‌ها (Export)</h3>
                <p className="text-[10px] text-neutral-400 truncate">
                  دانلود فایل پشتیبان یادداشت‌ها و استیکی‌نوت‌ها
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportNotes}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_4px_12px_rgba(37,99,235,0.3)] active:scale-95 cursor-pointer shrink-0 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'در حال خروجی...' : 'دانلود JSON'}</span>
            </button>
          </div>
        </div>

        {/* 2. Import Card (Compact) */}
        <div className="bg-white rounded-2xl p-3 sm:p-3.5 shadow-[0_6px_20px_-4px_rgba(0,0,0,0.09),0_2px_6px_-1px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(5,150,105,0.12)]">
                <Upload className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-neutral-900">بازیابی یادداشت‌ها (Import)</h3>
                <p className="text-[10px] text-neutral-400 truncate">
                  انتخاب فایل JSON یا studybackup پشتیبان
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.22)] active:scale-95 cursor-pointer shrink-0 transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isImporting ? 'در حال بازیابی...' : 'انتخاب فایل'}</span>
            </button>
          </div>
        </div>

        {/* 3. Clear Notes Danger Zone */}
        <div className="bg-white rounded-2xl p-3 sm:p-3.5 shadow-[0_6px_20px_-4px_rgba(0,0,0,0.08),0_2px_6px_-1px_rgba(0,0,0,0.04)] flex items-center justify-between">
          <div>
            <h4 className="text-[11px] font-bold text-rose-600">پاکسازی کامل نوت‌ها</h4>
            <p className="text-[10px] text-neutral-400">
              حذف تمامی یادداشت‌ها و استیکی‌نوت‌ها از حافظه مرورگر
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearAllNotes}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-semibold transition cursor-pointer shadow-[0_2px_8px_rgba(225,29,72,0.12)]"
          >
            <Trash2 className="w-3 h-3" />
            <span>پاکسازی</span>
          </button>
        </div>
      </div>
    </div>
  );
};
