import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useAuth } from '../../store';
import { Report } from '../../types';
import { 
  FileText, Plus, Search, Trash2, Edit2, Lock, Eye, Printer, 
  Tag, Calendar, User, Save, X, Bold, Italic, Palette, AlertCircle, Share2, Globe, ShieldCheck
} from 'lucide-react';

interface SupervisorStudentNotesProps {
  studentId: string;
  studentName?: string;
}

export function SupervisorStudentNotes({ studentId, studentName }: SupervisorStudentNotesProps) {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [isAdding, setIsAdding] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Dynamic Custom Categories
  const DEFAULT_CATS = ['هدایتی', 'مشاوره‌ای', 'علمی', 'انضباطی', 'تشویقی', 'سایر'];
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('supervisor_note_categories');
      return saved ? JSON.parse(saved) : DEFAULT_CATS;
    } catch {
      return DEFAULT_CATS;
    }
  });

  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  const saveCategoriesToStorage = (newCatList: string[]) => {
    setCategories(newCatList);
    localStorage.setItem('supervisor_note_categories', JSON.stringify(newCatList));
  };

  const handleAddNewCategory = () => {
    if (!newCatInput.trim()) return;
    const cleanCat = newCatInput.trim();
    if (!categories.includes(cleanCat)) {
      const updated = [...categories, cleanCat];
      saveCategoriesToStorage(updated);
      setCategory(cleanCat);
    }
    setNewCatInput('');
    setIsAddingNewCategory(false);
  };

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('هدایتی');
  const [noteColor, setNoteColor] = useState<'slate' | 'blue' | 'emerald' | 'amber' | 'rose'>('blue');
  const [isConfidential, setIsConfidential] = useState(false);
  const [isPublicReport, setIsPublicReport] = useState(false);

  // Query supervisor notes for this student with privacy filtering
  const notes = useLiveQuery(
    async () => {
      if (!studentId) return [];
      const allReports = await db.reports.where('studentId').equals(studentId).toArray();
      // Filter supervisor notes with strict author privacy vs public report access
      return allReports.filter(r => {
        const isSupNote = 
          r.title?.includes('یادداشت اختصاصی') || 
          r.title?.includes('یادداشت مسئول') ||
          r.content?.includes('[SUPERVISOR_NOTE]') ||
          r.title?.startsWith('یادداشت:');

        if (!isSupNote) return false;

        // Privacy rule: Only author can view private notes unless marked as PUBLIC_REPORT
        const isMine = r.mentorId === currentUser?.id;
        const isPublic = r.content?.includes('[PUBLIC_REPORT]') || r.type === 'REPORT';

        return isMine || isPublic;
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    [studentId, currentUser?.id]
  );

  const resetForm = () => {
    setTitle('');
    setContent('');
    setCategory('هدایتی');
    setNoteColor('blue');
    setIsConfidential(false);
    setIsPublicReport(false);
    setIsAdding(false);
    setEditingNoteId(null);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !currentUser) return;

    let formattedContent = `[SUPERVISOR_NOTE][COLOR:${noteColor}][CAT:${category}] ${content.trim()}`;
    if (isPublicReport) {
      formattedContent += ' [PUBLIC_REPORT]';
    }

    try {
      if (editingNoteId) {
        await db.reports.update(editingNoteId, {
          title: `یادداشت: ${title.trim()}`,
          content: formattedContent,
          isConfidential,
          createdAt: new Date().toISOString()
        });
      } else {
        const newReport: Report = {
          id: `sup_note_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          authorId: currentUser.id,
          studentId,
          mentorId: currentUser.id,
          date: new Date().toISOString().split('T')[0],
          title: `یادداشت: ${title.trim()}`,
          content: formattedContent,
          type: isPublicReport ? 'REPORT' : 'EVALUATION',
          isConfidential,
          synced: false,
          createdAt: new Date().toISOString()
        };
        await db.reports.add(newReport);
      }
      resetForm();
    } catch (err) {
      console.error('Error saving supervisor note:', err);
    }
  };

  const handleTogglePublicReport = async (note: Report) => {
    let newContent = note.content || '';
    const currentlyPublic = newContent.includes('[PUBLIC_REPORT]');
    if (currentlyPublic) {
      newContent = newContent.replace(/\[PUBLIC_REPORT\]/g, '').trim();
    } else {
      newContent = `${newContent} [PUBLIC_REPORT]`;
    }
    await db.reports.update(note.id, { 
      content: newContent,
      type: currentlyPublic ? 'EVALUATION' : 'REPORT'
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('آیا از حذف این یادداشت اختصاصی اطمینان دارید؟')) {
      await db.reports.delete(id);
    }
  };

  const handleEditClick = (note: Report) => {
    setEditingNoteId(note.id);
    const rawTitle = note.title.replace(/^یادداشت:\s*/, '');
    setTitle(rawTitle);

    let rawContent = note.content || '';
    let color: any = 'blue';
    let cat: any = 'هدایتی';

    const colorMatch = rawContent.match(/\[COLOR:(slate|blue|emerald|amber|rose)\]/);
    if (colorMatch) color = colorMatch[1];

    const catMatch = rawContent.match(/\[CAT:([^\]]+)\]/);
    if (catMatch) cat = catMatch[1];

    const isPublic = rawContent.includes('[PUBLIC_REPORT]');

    rawContent = rawContent.replace(/\[SUPERVISOR_NOTE\]/g, '')
                           .replace(/\[COLOR:[^\]]+\]/g, '')
                           .replace(/\[CAT:[^\]]+\]/g, '')
                           .replace(/\[PUBLIC_REPORT\]/g, '')
                           .trim();

    setContent(rawContent);
    setNoteColor(color);
    setCategory(cat);
    setIsConfidential(!!note.isConfidential);
    setIsPublicReport(isPublic);
    setIsAdding(true);
  };

  const filteredNotes = notes?.filter(n => {
    let cat = 'هدایتی';
    const catMatch = n.content.match(/\[CAT:([^\]]+)\]/);
    if (catMatch) cat = catMatch[1];

    if (selectedCategoryFilter !== 'ALL' && cat !== selectedCategoryFilter) {
      return false;
    }

    const term = searchTerm.toLowerCase();
    return n.title.toLowerCase().includes(term) || n.content.toLowerCase().includes(term);
  });

  const handlePrintNotes = () => {
    window.print();
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 mt-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base">
              دفترچه یادداشت‌های اختصاصی مسئولین و اساتید
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              مخصوص ثبت نظرات، توصیه‌ها و پرونده تربیتی {studentName ? `«${studentName}»` : 'طلبه'} توسط استاد راهنما، مشاوره و مدیریت
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {notes && notes.length > 0 && (
            <button
              onClick={handlePrintNotes}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ یادداشت‌ها</span>
            </button>
          )}

          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن یادداشت جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* Add / Edit Form */}
      {isAdding && (
        <form onSubmit={handleSaveNote} className="bg-indigo-50/50 dark:bg-slate-800/80 p-4 rounded-2xl border border-indigo-100 dark:border-slate-700 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-indigo-100 dark:border-slate-700 pb-3">
            <h4 className="font-bold text-indigo-900 dark:text-indigo-300 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>{editingNoteId ? 'ویرایش یادداشت اختصاصی' : 'ثبت یادداشت جدید برای طلبه'}</span>
            </h4>
            <button
              type="button"
              onClick={resetForm}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                عنوان یادداشت *
              </label>
              <input
                type="text"
                required
                placeholder="مثلاً: وضعیت پیشرفت در سحرخیزی..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  دسته‌بندی موضوعی
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  {isAddingNewCategory ? 'انصراف' : '+ افزودن دسته جدید'}
                </button>
              </div>

              {isAddingNewCategory ? (
                <div className="flex gap-1.5 items-center">
                  <input
                    type="text"
                    placeholder="نام دسته‌بندی جدید..."
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 border border-indigo-400 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddNewCategory}
                    className="bg-indigo-600 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shrink-0"
                  >
                    افزودن
                  </button>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100 font-medium"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                برچسب رنگی کارت
              </label>
              <div className="flex items-center gap-2 pt-1">
                {[
                  { id: 'blue', bg: 'bg-blue-500' },
                  { id: 'emerald', bg: 'bg-emerald-500' },
                  { id: 'amber', bg: 'bg-amber-500' },
                  { id: 'rose', bg: 'bg-rose-500' },
                  { id: 'slate', bg: 'bg-slate-500' }
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setNoteColor(c.id as any)}
                    className={`w-6 h-6 rounded-full ${c.bg} transition-transform ${noteColor === c.id ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110' : 'opacity-70 hover:opacity-100'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                متن کامل یادداشت و ملاحظات *
              </label>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <button
                  type="button"
                  onClick={() => setContent(prev => prev + ' **مهم** ')}
                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 font-bold"
                  title="افزودن تأکید"
                >
                  <Bold className="w-3 h-3" />
                </button>
              </div>
            </div>
            <textarea
              required
              rows={4}
              placeholder="مشاهدات، نقاط قوت، زمینه‌های نیازمند رشد، یا جلسات برگزار شده با طلبه را بنویسید..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100 leading-relaxed"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  یادداشت محرمانه
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublicReport}
                  onChange={(e) => setIsPublicReport(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  اشتراک‌گذاری و ارسال به‌عنوان گزارش عمومی (قابل مشاهده برای سایر مسئولین)
                </span>
              </label>
            </div>

            <div className="flex items-center gap-2 self-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>{editingNoteId ? 'ثبت تغییرات' : 'ذخیره یادداشت'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Category Filters Bar & Search */}
      {notes && notes.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {['ALL', ...categories].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                  selectedCategoryFilter === cat
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat === 'ALL' ? 'همه دسته‌بندی‌ها' : cat}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="جستجو در عنوان یا متن یادداشت‌های ثبت‌شده..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
      )}

      {/* Notes List */}
      {!filteredNotes || filteredNotes.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {searchTerm ? 'هیچ یادداشتی با این مشخصات یافت نشد.' : 'هنوز هیچ یادداشتی با این فیلتر ثبت نشده است.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto pr-1">
          {filteredNotes.map((note) => {
            let color = 'blue';
            let cat = 'هدایتی';
            let cleanContent = note.content || '';

            const isPublic = cleanContent.includes('[PUBLIC_REPORT]') || note.type === 'REPORT';
            const isMine = note.mentorId === currentUser?.id;

            const colorMatch = cleanContent.match(/\[COLOR:(slate|blue|emerald|amber|rose)\]/);
            if (colorMatch) color = colorMatch[1];

            const catMatch = cleanContent.match(/\[CAT:([^\]]+)\]/);
            if (catMatch) cat = catMatch[1];

            cleanContent = cleanContent.replace(/\[SUPERVISOR_NOTE\]/g, '')
                                       .replace(/\[COLOR:[^\]]+\]/g, '')
                                       .replace(/\[CAT:[^\]]+\]/g, '')
                                       .replace(/\[PUBLIC_REPORT\]/g, '')
                                       .trim();

            const borderColors: Record<string, string> = {
              blue: 'border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/20 border-slate-200 dark:border-slate-800',
              emerald: 'border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 border-slate-200 dark:border-slate-800',
              amber: 'border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/20 border-slate-200 dark:border-slate-800',
              rose: 'border-l-rose-500 bg-rose-50/30 dark:bg-rose-950/20 border-slate-200 dark:border-slate-800',
              slate: 'border-l-slate-500 bg-slate-50/30 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
            };

            const tagColors: Record<string, string> = {
              blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
              emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
              amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
              rose: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
              slate: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
            };

            const dateFa = new Date(note.createdAt).toLocaleDateString('fa-IR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

            return (
              <div
                key={note.id}
                className={`p-4 rounded-2xl border border-l-4 transition-all flex flex-col gap-2.5 ${borderColors[color] || borderColors.blue}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Display Category Badge */}
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 ${tagColors[color] || tagColors.blue}`}>
                      <Tag className="w-3 h-3" />
                      <span>{cat}</span>
                    </span>

                    <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                      {note.title.replace(/^یادداشت:\s*/, '')}
                    </h4>

                    {note.isConfidential && (
                      <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                        <Lock className="w-3 h-3" />
                        <span>محرمانه</span>
                      </span>
                    )}

                    {isPublic ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                        <Globe className="w-3 h-3" />
                        <span>گزارش عمومی</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <ShieldCheck className="w-3 h-3" />
                        <span>یادداشت شخصی نویسنده</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 text-slate-400 text-xs">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{dateFa}</span>
                    </div>

                    {isMine && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTogglePublicReport(note)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                            isPublic 
                              ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300' 
                              : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200'
                          }`}
                          title={isPublic ? 'بازگردانی به یادداشت شخصی' : 'ارسال و تبدیل به گزارش عمومی'}
                        >
                          <Share2 className="w-3 h-3" />
                          <span>{isPublic ? 'شخصی‌سازی' : 'تبدیل به گزارش عمومی'}</span>
                        </button>

                        <button
                          onClick={() => handleEditClick(note)}
                          className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                          title="ویرایش"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-medium">
                  {cleanContent}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
