import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useAuth } from '../../store';
import { PrivateNote, MessageAttachment } from '../../types';
import { 
  Lock, Edit3, Trash2, Search, Folder, FolderPlus, Paperclip, 
  ImageIcon, Film, Music, File, Download, X, ArrowUpDown, Plus, 
  FolderOpen, Tag, Maximize2, Minimize2, Eye, AlertTriangle, Check, ShieldCheck, Cloud,
  Bold, Italic, Underline, Highlighter, Heading, List, BookOpen, Copy, ZoomIn, Type
} from 'lucide-react';
import { FilePreviewModal } from '../common/FilePreviewModal';
import { uploadFileToMinIO, triggerSync } from '../../sync';
import { encryptText, decryptText } from '../../lib/crypto';

const DEFAULT_FOLDERS = ['عمومی', 'برنامه‌ریزی', 'مطالعات', 'دلنوشته'];

export function renderFormattedContent(rawText: string) {
  if (!rawText) return null;

  // Convert markdown/html tags for clean display
  let html = rawText
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(/__(.*?)__/g, '<u>$1</u>')
    .replace(/==(.*?)==/g, '<mark class="bg-amber-200 dark:bg-amber-900/80 px-1 rounded text-slate-900 dark:text-amber-100">$1</mark>')
    .replace(/\n/g, '<br/>');

  return (
    <div 
      className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 leading-relaxed font-medium [&>mark]:bg-amber-200 [&>mark]:dark:bg-amber-900/80 [&>mark]:px-1 [&>mark]:rounded [&>mark]:text-slate-900 [&>mark]:dark:text-amber-100"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'نکات خصوصی، برنامه‌ریزی یا مطالعات خود را در این کادر بنویسید...',
  minHeight = '180px',
  darkTheme = false
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
  darkTheme?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const execCmd = (command: string, arg: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const preventSelectLoss = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className={`flex flex-col rounded-2xl border overflow-hidden shadow-inner transition-all ${
      darkTheme 
        ? 'bg-slate-950/80 border-slate-800 text-slate-100' 
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'
    }`}>
      {/* Formatting toolbar */}
      <div className={`flex items-center gap-1 flex-wrap p-2 border-b text-xs select-none ${
        darkTheme 
          ? 'bg-black/40 border-slate-800 text-slate-200' 
          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
      }`}>
        <button
          type="button"
          onMouseDown={preventSelectLoss}
          onClick={() => execCmd('bold')}
          className="p-1.5 hover:bg-black/20 dark:hover:bg-white/10 rounded-lg transition-colors font-bold"
          title="پررنگ (Bold)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={preventSelectLoss}
          onClick={() => execCmd('italic')}
          className="p-1.5 hover:bg-black/20 dark:hover:bg-white/10 rounded-lg transition-colors italic"
          title="مورب (Italic)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={preventSelectLoss}
          onClick={() => execCmd('underline')}
          className="p-1.5 hover:bg-black/20 dark:hover:bg-white/10 rounded-lg transition-colors underline"
          title="زیرخط (Underline)"
        >
          <Underline className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-current/20 mx-1" />

        <button
          type="button"
          onMouseDown={preventSelectLoss}
          onClick={() => execCmd('hiliteColor', '#fef08a')}
          className="p-1.5 hover:bg-amber-500/20 rounded-lg transition-colors text-amber-600 dark:text-amber-300 font-bold flex items-center gap-1"
          title="هایلایت زرد"
        >
          <Highlighter className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventSelectLoss}
          onClick={() => execCmd('foreColor', '#ef4444')}
          className="px-2 py-1 hover:bg-rose-500/20 rounded-lg transition-colors text-rose-500 font-bold text-xs"
          title="رنگ قرمز"
        >
          قرمز
        </button>
        <button
          type="button"
          onMouseDown={preventSelectLoss}
          onClick={() => execCmd('foreColor', '#10b981')}
          className="px-2 py-1 hover:bg-emerald-500/20 rounded-lg transition-colors text-emerald-500 font-bold text-xs"
          title="رنگ سبز"
        >
          سبز
        </button>
        <button
          type="button"
          onMouseDown={preventSelectLoss}
          onClick={() => execCmd('foreColor', '#3b82f6')}
          className="px-2 py-1 hover:bg-blue-500/20 rounded-lg transition-colors text-blue-500 font-bold text-xs"
          title="رنگ آبی"
        >
          آبی
        </button>

        <div className="h-4 w-px bg-current/20 mx-1" />

        <button
          type="button"
          onMouseDown={preventSelectLoss}
          onClick={() => execCmd('insertUnorderedList')}
          className="p-1.5 hover:bg-black/20 dark:hover:bg-white/10 rounded-lg transition-colors"
          title="لیست گلوله‌ای"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventSelectLoss}
          onClick={() => execCmd('formatBlock', '<h3>')}
          className="p-1.5 hover:bg-black/20 dark:hover:bg-white/10 rounded-lg transition-colors font-bold"
          title="عنوان بزرگ (H3)"
        >
          <Heading className="w-4 h-4" />
        </button>

        <button
          type="button"
          onMouseDown={preventSelectLoss}
          onClick={() => execCmd('removeFormat')}
          className="px-2 py-1 hover:bg-black/20 rounded-lg transition-colors text-[11px] opacity-70"
          title="پاک کردن فرمت‌بندی"
        >
          پاک‌سازی
        </button>
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => {
          if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
          }
        }}
        data-placeholder={placeholder}
        className="p-4 text-sm sm:text-base outline-none leading-relaxed font-medium overflow-y-auto min-h-[160px] empty:before:content-[attr(data-placeholder)] empty:before:opacity-50 empty:before:pointer-events-none"
        style={{ minHeight }}
      />
    </div>
  );
}

function NoteReaderModal({
  note,
  onClose,
  userId,
  onEdit
}: {
  note: PrivateNote;
  onClose: () => void;
  userId?: string;
  onEdit: (note: PrivateNote) => void;
}) {
  const [fontSize, setFontSize] = useState<number>(18);
  const [theme, setTheme] = useState<'LIGHT' | 'DARK' | 'SEPIA'>('LIGHT');
  const [decryptedText, setDecryptedText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Inline editing state inside modal
  const [isEditingInline, setIsEditingInline] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>(note.title || '');
  const [editFolder, setEditFolder] = useState<string>(note.folder || 'عمومی');
  const [editContent, setEditContent] = useState<string>('');
  const [isSavingInline, setIsSavingInline] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    if (note.content && note.content.startsWith('ENC:') && userId) {
      decryptText(note.content, userId).then(dec => {
        if (active) {
          setDecryptedText(dec);
          setEditContent(dec);
        }
      });
    } else {
      setDecryptedText(note.content || '');
      setEditContent(note.content || '');
    }
    return () => { active = false; };
  }, [note.content, userId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(decryptedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveInline = async () => {
    if (!userId || !editContent.trim()) return;
    setIsSavingInline(true);
    try {
      const encrypted = await encryptText(editContent.trim(), userId);
      await db.privateNotes.update(note.id, {
        title: editTitle.trim() || 'بدون عنوان',
        folder: editFolder,
        content: encrypted
      });

      triggerSync();

      note.title = editTitle.trim() || 'بدون عنوان';
      note.folder = editFolder;
      note.content = encrypted;
      setDecryptedText(editContent.trim());
      setIsEditingInline(false);
    } catch (err) {
      console.error('Error saving note inline:', err);
    } finally {
      setIsSavingInline(false);
    }
  };

  const themeClasses = {
    LIGHT: 'bg-white text-slate-900 border-slate-200',
    DARK: 'bg-slate-950 text-slate-100 border-slate-800',
    SEPIA: 'bg-[#fbf0d9] text-[#433422] border-[#e8d5b5]'
  }[theme];

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto dir-rtl">
      <div className={`w-full max-w-4xl shadow-2xl rounded-3xl border p-5 sm:p-8 flex flex-col h-full max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 ${themeClasses}`}>
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-current/15 mb-4 shrink-0">
          <div className="w-full sm:w-auto">
            {isEditingInline ? (
              <div className="flex items-center gap-2 w-full">
                <Edit3 className="w-5 h-5 text-emerald-600 shrink-0" />
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="عنوان یادداشت..."
                  className="w-full bg-black/5 dark:bg-white/10 border border-current/20 rounded-xl px-3 py-1.5 text-sm sm:text-base font-bold outline-none"
                />
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-emerald-600 shrink-0" />
                  <h2 className="text-base sm:text-xl font-black">{note.title || 'بدون عنوان'}</h2>
                </div>
                <p className="text-xs opacity-75 mt-1 font-medium">
                  📁 پوشه: {note.folder || 'عمومی'} | تاریخ: {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(note.date))}
                </p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            {!isEditingInline && (
              <>
                <div className="flex items-center bg-black/5 dark:bg-white/10 rounded-xl p-1 border border-current/10">
                  <button
                    type="button"
                    onClick={() => setFontSize(prev => Math.max(14, prev - 2))}
                    className="p-1 hover:bg-black/10 rounded font-bold text-xs"
                    title="کاهش اندازه قلم"
                  >
                    A-
                  </button>
                  <span className="text-xs px-2 font-mono font-bold">{fontSize}px</span>
                  <button
                    type="button"
                    onClick={() => setFontSize(prev => Math.min(32, prev + 2))}
                    className="p-1 hover:bg-black/10 rounded font-bold text-xs"
                    title="افزایش اندازه قلم"
                  >
                    A+
                  </button>
                </div>

                <div className="flex items-center bg-black/5 dark:bg-white/10 rounded-xl p-1 border border-current/10">
                  <button
                    type="button"
                    onClick={() => setTheme('LIGHT')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${theme === 'LIGHT' ? 'bg-white text-slate-900 shadow-xs' : 'opacity-70'}`}
                  >
                    روشن
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('SEPIA')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${theme === 'SEPIA' ? 'bg-[#f4e2c1] text-[#433422] shadow-xs' : 'opacity-70'}`}
                  >
                    کاغذی
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('DARK')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${theme === 'DARK' ? 'bg-slate-900 text-white shadow-xs' : 'opacity-70'}`}
                  >
                    تاریک
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-2 bg-black/5 hover:bg-black/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-current/10"
                  title="کپی متن"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copied ? 'کپی شد!' : 'کپی'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditingInline(true)}
                  className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                  title="ویرایش مستقیم همین‌جا"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>ویرایش</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all"
              title="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Note Body or Inline Edit Mode */}
        {isEditingInline ? (
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto p-1">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold shrink-0">پوشه یادداشت:</label>
              <select
                value={editFolder}
                onChange={e => setEditFolder(e.target.value)}
                className="bg-black/5 dark:bg-white/10 border border-current/20 rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
              >
                {DEFAULT_FOLDERS.map(f => (
                  <option key={f} value={f} className="text-slate-900 bg-white">{f}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 flex flex-col min-h-[220px]">
              <label className="text-xs font-bold mb-1 block">متن و ویرایش بصری یادداشت:</label>
              <RichTextEditor
                value={editContent}
                onChange={setEditContent}
                placeholder="متن یادداشت..."
                minHeight="220px"
              />
            </div>

            <div className="flex justify-end items-center gap-2 pt-2 border-t border-current/15">
              <button
                type="button"
                onClick={() => setIsEditingInline(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-black/10 hover:bg-black/20 transition-all"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSaveInline}
                disabled={isSavingInline}
                className="px-6 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center gap-1.5 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>{isSavingInline ? 'در حال ذخیره...' : 'ذخیره تغییرات'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 leading-loose font-medium my-2" style={{ fontSize: `${fontSize}px` }}>
            {renderFormattedContent(decryptedText)}
          </div>
        )}

        {/* Attachments */}
        {!isEditingInline && note.attachments && note.attachments.length > 0 && (
          <div className="pt-4 border-t border-current/15 mt-2 shrink-0">
            <span className="text-xs font-bold opacity-80 block mb-2">فایل‌های پیوست یادداشت:</span>
            <div className="flex flex-wrap gap-2">
              {note.attachments.map(att => (
                <a
                  key={att.id}
                  href={att.url}
                  download={att.name}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-black/5 hover:bg-black/10 border border-current/15 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <File className="w-3.5 h-3.5" />
                  <span>{att.name}</span>
                  <Download className="w-3 h-3 opacity-60" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteContentDisplay({ content, userId }: { content: string; userId?: string }) {
  const [displayed, setDisplayed] = useState<string>(content);

  useEffect(() => {
    let active = true;
    if (content && content.startsWith('ENC:') && userId) {
      decryptText(content, userId).then(dec => {
        if (active) setDisplayed(dec);
      });
    } else {
      setDisplayed(content);
    }
    return () => { active = false; };
  }, [content, userId]);

  return (
    <div className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed line-clamp-1">
      {renderFormattedContent(displayed)}
    </div>
  );
}

export function StudentNotes() {
  const { currentUser } = useAuth();
  
  // Note Form States
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('عمومی');
  const [customFolderInput, setCustomFolderInput] = useState<string>('');
  const [isAddingCustomFolder, setIsAddingCustomFolder] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Focus Mode & Preview & Delete Dialog States
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<MessageAttachment | null>(null);
  const [folderConfirmNotice, setFolderConfirmNotice] = useState<string | null>(null);
  const [readerNote, setReaderNote] = useState<PrivateNote | null>(null);

  const sidebarTextareaRef = useRef<HTMLTextAreaElement>(null);
  const focusTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Confirm and select new custom folder
  const handleConfirmNewFolder = () => {
    const trimmed = customFolderInput.trim();
    if (!trimmed) return;
    setSelectedFolder(trimmed);
    setIsAddingCustomFolder(false);
    setFolderConfirmNotice(`پوشه «${trimmed}» ایجاد و انتخاب شد.`);
    setTimeout(() => setFolderConfirmNotice(null), 3000);
  };

  // Search & Filter & Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolderFilter, setActiveFolderFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'TITLE_ASC' | 'TITLE_DESC' | 'FOLDER'>('NEWEST');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const focusFileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Fetch private notes from IndexedDB
  const rawNotes = useLiveQuery(
    () => currentUser ? db.privateNotes.where('studentId').equals(currentUser.id).toArray() : [],
    [currentUser?.id]
  );

  // Extract all unique folders (default + user created from existing notes)
  const allFolders = useMemo(() => {
    const folderSet = new Set<string>(DEFAULT_FOLDERS);
    rawNotes?.forEach(n => {
      if (n.folder && n.folder.trim()) {
        folderSet.add(n.folder.trim());
      }
    });
    return Array.from(folderSet);
  }, [rawNotes]);

  // Handle file uploads for attachments
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files) as File[];

    for (const file of fileList) {
      let fileUrl = '';
      
      // Try uploading to MinIO first
      const minioRes = await uploadFileToMinIO(file);
      if (minioRes.success && minioRes.url) {
        fileUrl = minioRes.url;
      } else {
        // Fallback to local Data URL
        const reader = new FileReader();
        fileUrl = await new Promise<string>((resolve) => {
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.readAsDataURL(file);
        });
      }

      let attachmentType: MessageAttachment['type'] = 'FILE';
      if (file.type.startsWith('image/')) attachmentType = 'IMAGE';
      else if (file.type.startsWith('video/')) attachmentType = 'VIDEO';
      else if (file.type.startsWith('audio/')) attachmentType = 'AUDIO';

      const newAttachment: MessageAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        url: fileUrl,
        type: attachmentType,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
      };

      setAttachments(prev => [...prev, newAttachment]);
    }

    if (e.target) e.target.value = '';
  };

  // Remove Attachment
  const handleRemoveAttachment = (attId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attId));
  };

  // Create or Update Note (with AES Encryption & Cloud Sync)
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser || !content.trim()) return;

    const folderToSave = isAddingCustomFolder && customFolderInput.trim() 
      ? customFolderInput.trim() 
      : selectedFolder;

    // Encrypt content for security
    const encryptedContent = await encryptText(content.trim(), currentUser.id);

    if (editingId) {
      await db.privateNotes.update(editingId, {
        title: title.trim() || 'بدون عنوان',
        content: encryptedContent,
        folder: folderToSave,
        attachments: attachments.length > 0 ? attachments : undefined
      });
      setEditingId(null);
    } else {
      const newNote: PrivateNote = {
        id: crypto.randomUUID(),
        studentId: currentUser.id,
        date: new Date().toISOString(),
        title: title.trim() || 'بدون عنوان',
        content: encryptedContent,
        folder: folderToSave,
        attachments: attachments.length > 0 ? attachments : undefined
      };
      await db.privateNotes.add(newNote);
    }

    // Trigger Cloud Sync for encrypted private notes
    triggerSync();

    // Reset Form
    setTitle('');
    setContent('');
    setAttachments([]);
    setIsAddingCustomFolder(false);
    setCustomFolderInput('');
    setIsFocusMode(false);
  };

  // Edit Note Trigger with Smooth Scroll (Decrypts content first if encrypted)
  const handleEdit = async (note: PrivateNote) => {
    setEditingId(note.id);
    setTitle(note.title || '');
    
    let plainContent = note.content;
    if (note.content && note.content.startsWith('ENC:') && currentUser) {
      plainContent = await decryptText(note.content, currentUser.id);
    }
    setContent(plainContent);

    setSelectedFolder(note.folder || 'عمومی');
    setAttachments(note.attachments || []);
    setIsAddingCustomFolder(false);

    // Smoothly scroll to the form section
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // Confirm Delete Note Action (No window.confirm to avoid iframe blocking)
  const handleConfirmDelete = async () => {
    if (!deletingNoteId) return;
    await db.privateNotes.delete(deletingNoteId);
    if (editingId === deletingNoteId) {
      handleCancelEdit();
    }
    setDeletingNoteId(null);
  };

  // Cancel Edit Mode
  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setAttachments([]);
    setIsAddingCustomFolder(false);
  };

  // Filter and Sort Notes
  const processedNotes = useMemo(() => {
    if (!rawNotes) return [];

    let list = [...rawNotes];

    // 1. Folder Filtering
    if (activeFolderFilter !== 'ALL') {
      list = list.filter(n => (n.folder || 'عمومی') === activeFolderFilter);
    }

    // 2. Search Query Filtering (Title & Content)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(n => 
        (n.title && n.title.toLowerCase().includes(query)) ||
        n.content.toLowerCase().includes(query) ||
        (n.folder && n.folder.toLowerCase().includes(query))
      );
    }

    // 3. Sorting
    list.sort((a, b) => {
      if (sortBy === 'NEWEST') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === 'OLDEST') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === 'TITLE_ASC') {
        return (a.title || '').localeCompare(b.title || '', 'fa');
      }
      if (sortBy === 'TITLE_DESC') {
        return (b.title || '').localeCompare(a.title || '', 'fa');
      }
      if (sortBy === 'FOLDER') {
        return (a.folder || '').localeCompare(b.folder || '', 'fa');
      }
      return 0;
    });

    return list;
  }, [rawNotes, activeFolderFilter, searchQuery, sortBy]);

  // Format Jalali Date/Time
  const formatJalaliTime = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto relative">
      {/* Universal File Preview Modal */}
      <FilePreviewModal 
        attachment={previewAttachment} 
        onClose={() => setPreviewAttachment(null)} 
      />

      {/* Delete Confirmation Modal */}
      {deletingNoteId && (
        <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dir-rtl text-right animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">حذف یادداشت محرمانه</h3>
            </div>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              آیا از حذف این یادداشت اطمینان دارید؟ این عملیات قابل بازگشت نیست.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md"
              >
                بله، حذف شود
              </button>
              <button
                onClick={() => setDeletingNoteId(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition-all"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* READER MODAL */}
      {readerNote && (
        <NoteReaderModal
          note={readerNote}
          onClose={() => setReaderNote(null)}
          userId={currentUser?.id}
          onEdit={(n) => {
            handleEdit(n);
            setReaderNote(null);
          }}
        />
      )}

      {/* ENLARGED TEXTBOX FOCUS MODE */}
      {isFocusMode && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto dir-rtl">
          <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl shadow-2xl p-4 sm:p-6 flex flex-col h-full max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Focus Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 rounded-2xl">
                  <Maximize2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base sm:text-lg">
                    بزرگ‌نمایی و ویرایش متمرکز متن یادداشت
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">کادر عریض و اختصاصی برای تایپ راحت، فرمت‌بندی متن و تمرکز</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFocusMode(false)}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
                >
                  <Minimize2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>بستن پنجره</span>
                </button>
              </div>
            </div>

            {/* Main Enlarged Content Area */}
            <div className="flex-1 flex flex-col min-h-[300px] mb-4">
              <div className="flex justify-between items-center mb-1 px-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  متن اصلی یادداشت:
                </label>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>کلمات: {content.trim() ? content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length.toLocaleString('fa-IR') : '۰'}</span>
                  <span>|</span>
                  <span>کاراکتر: {content.replace(/<[^>]*>/g, '').length.toLocaleString('fa-IR')}</span>
                </div>
              </div>

              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="نکات خصوصی، برنامه‌ریزی روزانه، مطالعات، یا دلنوشته خود را در این کادر بزرگ بنویسید..."
                minHeight="280px"
              />
            </div>

            {/* Focus Footer Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                تغییرات به صورت همزمان در پیش‌نویس ذخیره می‌شود.
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsFocusMode(false)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>تایید و بازگشت به فرم</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Note Creation/Edit Form Sidebar */}
      <div ref={formRef} className="w-full lg:w-1/3 bg-indigo-950 rounded-3xl text-white shadow-xl p-5 border border-indigo-900/80 relative overflow-hidden flex flex-col justify-between shrink-0">
        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-indigo-200 flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4 text-indigo-400" />
              {editingId ? 'ویرایش یادداشت' : 'ثبت یادداشت جدید'}
            </h3>

            {/* Focus Mode Trigger Button */}
            <button
              type="button"
              onClick={() => setIsFocusMode(true)}
              className="text-[10px] bg-indigo-900/80 hover:bg-indigo-800 text-indigo-100 px-2.5 py-1 rounded-full border border-indigo-700/60 font-semibold flex items-center gap-1 transition-all shadow-xs"
              title="باز کردن کادر بزرگ برای یادداشت‌نویسی متمرکز"
            >
              <Maximize2 className="w-3 h-3 text-indigo-300" />
              <span>حالت تمرکز</span>
            </button>
          </div>

          <form onSubmit={handleSave} className="flex-1 flex flex-col gap-3">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-emerald-200 mb-1">عنوان یادداشت:</label>
              <input
                type="text"
                placeholder="عنوان یادداشت..."
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-400 text-white placeholder-white/40 outline-none font-medium"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            {/* Folder / Category Selection */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-emerald-200">دسته / پوشه یادداشت:</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCustomFolder(!isAddingCustomFolder);
                    setFolderConfirmNotice(null);
                  }}
                  className="text-[10px] text-emerald-300 hover:underline flex items-center gap-1"
                >
                  <FolderPlus className="w-3 h-3" />
                  {isAddingCustomFolder ? 'انتخاب پوشه موجود' : 'پوشه جدید'}
                </button>
              </div>

              {isAddingCustomFolder ? (
                <div className="flex gap-1.5 items-center">
                  <input
                    type="text"
                    placeholder="نام پوشه جدید را بنویسید..."
                    value={customFolderInput}
                    onChange={e => setCustomFolderInput(e.target.value)}
                    className="flex-1 bg-white/10 border border-emerald-400/60 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleConfirmNewFolder}
                    disabled={!customFolderInput.trim()}
                    className="bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    ثبت پوشه
                  </button>
                </div>
              ) : (
                <select
                  value={selectedFolder}
                  onChange={e => {
                    setSelectedFolder(e.target.value);
                    setFolderConfirmNotice(null);
                  }}
                  className="w-full bg-slate-900/80 border border-white/20 rounded-xl px-3 py-2 text-xs text-emerald-100 font-bold outline-none cursor-pointer"
                >
                  {allFolders.map(f => (
                    <option key={f} value={f} className="bg-slate-900 text-white">
                      📁 {f}
                    </option>
                  ))}
                  {!allFolders.includes(selectedFolder) && (
                    <option value={selectedFolder} className="bg-slate-900 text-white">
                      📁 {selectedFolder}
                    </option>
                  )}
                </select>
              )}

              {folderConfirmNotice && (
                <p className="text-[11px] text-emerald-300 font-bold mt-1.5 flex items-center gap-1 animate-in fade-in duration-200">
                  <Check className="w-3 h-3 text-emerald-300" />
                  {folderConfirmNotice}
                </p>
              )}
            </div>

            {/* Content Body */}
            <div className="flex-1 flex flex-col min-h-[140px]">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-emerald-200">متن یادداشت:</label>
                <button
                  type="button"
                  onClick={() => setIsFocusMode(true)}
                  className="text-[10px] text-emerald-300 hover:text-white flex items-center gap-1"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  حالت تمرکز
                </button>
              </div>

              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="نکات خصوصی، برنامه‌ریزی روزانه، مطالعات، یا دلنوشته..."
                minHeight="140px"
                darkTheme={true}
              />
            </div>

            {/* File Attachments Section */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-emerald-200 flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5" />
                  پیوست فایل:
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white/15 hover:bg-white/25 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  افزودن فایل
                </button>
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Attachment Preview Badges */}
              {attachments.length > 0 && (
                <div className="space-y-1 max-h-28 overflow-y-auto bg-black/20 p-2 rounded-xl border border-white/10">
                  {attachments.map(att => (
                    <div key={att.id} className="bg-white/10 p-1.5 rounded-lg flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={() => setPreviewAttachment(att)}
                        className="flex items-center gap-1.5 truncate text-right hover:text-emerald-300 transition-colors"
                      >
                        {att.type === 'IMAGE' && <ImageIcon className="w-3.5 h-3.5 text-blue-300 shrink-0" />}
                        {att.type === 'VIDEO' && <Film className="w-3.5 h-3.5 text-purple-300 shrink-0" />}
                        {att.type === 'AUDIO' && <Music className="w-3.5 h-3.5 text-emerald-300 shrink-0" />}
                        {att.type === 'FILE' && <File className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                        <span className="truncate max-w-[130px] font-medium text-emerald-100">{att.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="text-rose-300 hover:text-rose-100 font-bold px-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button 
                type="submit"
                className="flex-1 bg-emerald-500 text-white rounded-xl py-2.5 text-xs font-bold hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                <Edit3 className="w-4 h-4" />
                {editingId ? 'بروزرسانی یادداشت' : 'ثبت و ذخیره یادداشت'}
              </button>
              {editingId && (
                <button 
                  type="button"
                  onClick={handleCancelEdit}
                  className="bg-white/15 text-white rounded-xl py-2.5 px-3 text-xs font-bold hover:bg-white/25 transition-colors"
                >
                  انصراف
                </button>
              )}
            </div>
          </form>
        </div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Note List & Filters/Search Area */}
      <div className="flex-1 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-[550px]">
        {/* Top Control Bar: Search & Sort */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          {/* Automatic Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="جستجو در عنوان یا متن یادداشت‌ها..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pr-9 pl-3 py-2 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <ArrowUpDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl px-3 py-2 outline-none cursor-pointer focus:border-emerald-500"
            >
              <option value="NEWEST">مرتب‌سازی: جدیدترین</option>
              <option value="OLDEST">مرتب‌سازی: قدیمی‌ترین</option>
              <option value="TITLE_ASC">عنوان (الف تا ی)</option>
              <option value="TITLE_DESC">عنوان (ی تا الف)</option>
              <option value="FOLDER">بر اساس پوشه</option>
            </select>
          </div>
        </div>

        {/* Folders Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-none">
          <button
            onClick={() => setActiveFolderFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border ${
              activeFolderFilter === 'ALL'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>همه پوشه‌ها</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              activeFolderFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}>
              {rawNotes?.length || 0}
            </span>
          </button>

          {allFolders.map(folderName => {
            const count = rawNotes?.filter(n => (n.folder || 'عمومی') === folderName).length || 0;
            const isSelected = activeFolderFilter === folderName;

            return (
              <button
                key={folderName}
                onClick={() => setActiveFolderFilter(folderName)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>{folderName}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Notes Cards List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[480px]">
          {processedNotes.length === 0 ? (
            <div className="text-center text-slate-400 py-16 text-sm flex flex-col items-center justify-center">
              <FolderOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="font-bold text-slate-600 dark:text-slate-300">هیچ یادداشتی در این بخش یافت نشد.</p>
              {searchQuery && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">نتیجه‌ای با عبارت «{searchQuery}» پیدا نشد.</p>
              )}
            </div>
          ) : (
            processedNotes.map(note => (
              <div 
                key={note.id} 
                className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl group hover:border-emerald-500 dark:hover:border-emerald-400 transition-all shadow-2xs"
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{note.title || 'بدون عنوان'}</h4>
                    <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-bold border border-emerald-100 dark:border-emerald-800 flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {note.folder || 'عمومی'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                    <button 
                      onClick={() => setReaderNote(note)} 
                      className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold"
                      title="بزرگ‌نمایی و مطالعه"
                    >
                      <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="hidden sm:inline">مطالعه</span>
                    </button>
                    <button 
                      onClick={() => handleEdit(note)} 
                      className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors"
                      title="ویرایش و اسکرول به فرم"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setDeletingNoteId(note.id)} 
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <NoteContentDisplay content={note.content} userId={currentUser?.id} />

                {/* Attachments rendering */}
                {note.attachments && note.attachments.length > 0 && (
                  <div className="mb-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">فایل‌های پیوست (کلیک جهت مشاهده / پخش):</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {note.attachments.map(att => (
                        <div key={att.id} className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                          <button
                            onClick={() => setPreviewAttachment(att)}
                            className="flex items-center gap-2 min-w-0 text-right hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                          >
                            {att.type === 'IMAGE' && <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                            {att.type === 'VIDEO' && <Film className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />}
                            {att.type === 'AUDIO' && <Music className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                            {att.type === 'FILE' && <File className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />}
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{att.name}</span>
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => setPreviewAttachment(att)}
                              className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded"
                              title="مشاهده / پخش"
                            >
                              <Eye className="w-3 h-3" />
                              مشاهده
                            </button>
                            <a
                              href={att.url}
                              download={att.name}
                              className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-slate-200/70 dark:bg-slate-700 px-1.5 py-0.5 rounded"
                              title="دانلود مستقیم"
                            >
                              <Download className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium text-left" dir="rtl">
                  {formatJalaliTime(note.date)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
