import React, { useState } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Sparkles, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  Search, 
  Info, 
  ShieldCheck, 
  ListChecks, 
  Hash, 
  FileText, 
  Sliders, 
  ToggleLeft, 
  ToggleRight,
  Eye,
  Check,
  X
} from 'lucide-react';
import { triggerSync, getSynchronizedTime } from '../../sync';
import type { TahzibProgram } from '../../types';

export function TahzibProgramsManagement() {
  const rawPrograms = useLiveQuery(() => db.tahzibPrograms.toArray()) || [];
  const activePrograms = rawPrograms.filter(p => !p.isDeleted);

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form & Modal States
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingProgram, setEditingProgram] = useState<TahzibProgram | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('عبادی');
  const [formInputType, setFormInputType] = useState<'BOOLEAN' | 'MULTICHOICE' | 'NUMERIC' | 'TEXT'>('BOOLEAN');
  const [formOptions, setFormOptions] = useState<string>('کامل, ناقص, انجام نشد');
  const [formUnit, setFormUnit] = useState<string>('صفحه');
  const [formTargetBases, setFormTargetBases] = useState<number[]>([]); // empty = ALL
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  const categories = ['عبادی', 'اخلاقی', 'آموزشی', 'عمومی'];

  const openCreateModal = () => {
    setEditingProgram(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategory('عبادی');
    setFormInputType('BOOLEAN');
    setFormOptions('عالی, خوب, متوسط, انجام نشد');
    setFormUnit('صفحه');
    setFormTargetBases([]);
    setFormIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (prog: TahzibProgram) => {
    setEditingProgram(prog);
    setFormTitle(prog.title || '');
    setFormDescription(prog.description || '');
    setFormCategory(prog.category || 'عبادی');
    setFormInputType(prog.inputType || 'BOOLEAN');
    setFormOptions(prog.options && prog.options.length > 0 ? prog.options.join(', ') : 'عالی, خوب, متوسط, انجام نشد');
    setFormUnit(prog.unit || 'صفحه');
    setFormTargetBases(prog.targetBases || []);
    setFormIsActive(prog.isActive !== false);
    setShowModal(true);
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('لطفاً عنوان برنامه تهذیبی را وارد نمایید.');
      return;
    }

    const now = getSynchronizedTime();
    const parsedOptions = formInputType === 'MULTICHOICE'
      ? formOptions.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    if (editingProgram) {
      await db.tahzibPrograms.update(editingProgram.id, {
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        category: formCategory,
        inputType: formInputType,
        options: parsedOptions,
        unit: formInputType === 'NUMERIC' ? (formUnit.trim() || 'عدد') : undefined,
        targetBases: formTargetBases,
        isActive: formIsActive,
        updatedAt: now
      });
    } else {
      const newProgram: TahzibProgram = {
        id: 'prog_' + crypto.randomUUID(),
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        category: formCategory,
        inputType: formInputType,
        options: parsedOptions,
        unit: formInputType === 'NUMERIC' ? (formUnit.trim() || 'عدد') : undefined,
        targetBases: formTargetBases,
        isActive: formIsActive,
        createdAt: new Date(now).toISOString(),
        updatedAt: now
      };
      await db.tahzibPrograms.add(newProgram);
    }

    setShowModal(false);
    triggerSync();
  };

  const handleToggleActive = async (prog: TahzibProgram) => {
    const now = getSynchronizedTime();
    await db.tahzibPrograms.update(prog.id, {
      isActive: !prog.isActive,
      updatedAt: now
    });
    triggerSync();
  };

  const handleDeleteProgram = async (prog: TahzibProgram) => {
    if (confirm(`آیا از حذف برنامه تهذیبی «${prog.title}» اطمینان دارید؟\n\nتأکید: با حذف این عنوان، تمام ارزیابی‌ها و تاریخچه‌های ثبت‌شده قبلی طلاب در سیستم کاملاً دست‌نخورده و محفوظ باقی خواهند ماند.`)) {
      const now = getSynchronizedTime();
      await db.tahzibPrograms.update(prog.id, {
        isDeleted: true,
        updatedAt: now
      });
      triggerSync();
    }
  };

  const toggleTargetBase = (baseNum: number) => {
    setFormTargetBases(prev => 
      prev.includes(baseNum) ? prev.filter(b => b !== baseNum) : [...prev, baseNum]
    );
  };

  const filteredPrograms = activePrograms.filter(prog => {
    if (selectedCategory !== 'ALL' && prog.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchTitle = prog.title?.toLowerCase().includes(q);
      const matchDesc = prog.description?.toLowerCase().includes(q);
      const matchCat = prog.category?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchCat;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>مدیریت و تعریف امورات و برنامه‌های تهذیبی</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              تنظیم برنامه‌های روزانه تهذیبی جهت نمایش در فرم خودارزیابی طلاب و گروه‌بندی پایه‌ها
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>تعریف برنامه تهذیبی جدید</span>
          </button>
        </div>

        {/* Security & History Retention Guaranty Banner */}
        <div className="p-3.5 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl flex items-center gap-3 text-xs text-emerald-900 dark:text-emerald-200">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="font-medium leading-relaxed">
            <strong>تضمین حفظ سوابق:</strong> هرگونه تغییر، غیرفعال‌سازی یا حذف نرم‌افزاری برنامه‌های تهذیبی هیچ آسیبی به سوابق و تاریخچه ارزیابی‌های ثبت‌شده قبلی طلاب نمی‌زند و اطلاعات گذشته کاملاً در سامانه محفوظ است.
          </p>
        </div>

        {/* Toolbar: Categories & Search */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 pt-2">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              همه عناوین ({activePrograms.length})
            </button>
            {categories.map(cat => {
              const count = activePrograms.filter(p => p.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="جستجو در عنوان یا توضیحات..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Programs List Grid */}
      {filteredPrograms.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center">
          <ListChecks className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-300 text-base mb-1">هیچ برنامه تهذیبی یافت نشد</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            می‌توانید با دکمه زیر برنامه جدیدی (عبادی، اخلاقی، آموزشی...) برای فرم خودارزیابی طلاب تعریف کنید.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            تعریف برنامه جدید
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPrograms.map(prog => (
            <div
              key={prog.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border shadow-xs transition-all flex flex-col justify-between ${
                prog.isActive 
                  ? 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800' 
                  : 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50/50 dark:bg-slate-900/50'
              }`}
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {prog.category || 'عمومی'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {prog.inputType === 'BOOLEAN' && 'تیک و ضربدر (انجام/عدم انجام)'}
                      {prog.inputType === 'MULTICHOICE' && 'گزینه‌های انتخابی'}
                      {prog.inputType === 'NUMERIC' && `عددی (${prog.unit || 'واحد'})`}
                      {prog.inputType === 'TEXT' && 'توضیحات متنی'}
                    </span>
                  </div>

                  {/* Active / Inactive Badge */}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 ${
                    prog.isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                  }`}>
                    {prog.isActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    <span>{prog.isActive ? 'فعال در فرم طلاب' : 'غیرفعال'}</span>
                  </span>
                </div>

                <h3 className="font-black text-sm text-slate-800 dark:text-slate-100 mb-1">
                  {prog.title}
                </h3>

                {prog.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                    {prog.description}
                  </p>
                )}

                {/* Details Breakdown */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 text-xs space-y-1.5 my-3">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>مخاطبین:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {!prog.targetBases || prog.targetBases.length === 0
                        ? 'تمام طلاب (همه پایه‌ها)'
                        : `پایه‌های ${prog.targetBases.join('، ')}`}
                    </span>
                  </div>

                  {prog.inputType === 'MULTICHOICE' && prog.options && (
                    <div className="flex flex-col gap-1 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-500">گزینه‌های انتخاب طلاب:</span>
                      <div className="flex flex-wrap gap-1">
                        {prog.options.map(opt => (
                          <span key={opt} className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                            {opt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleToggleActive(prog)}
                  className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                  title="تغییر وضعیت فعال/غیرفعال"
                >
                  {prog.isActive ? (
                    <>
                      <ToggleRight className="w-5 h-5 text-emerald-600" />
                      <span>غیرفعال کردن</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5 text-slate-400" />
                      <span>فعال کردن</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(prog)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition-colors cursor-pointer"
                    title="ویرایش برنامه"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProgram(prog)}
                    className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
                    title="حذف برنامه (با حفظ سوابق)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Program Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 dir-rtl">
          <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-black text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>{editingProgram ? 'ویرایش برنامه تهذیبی' : 'تعریف برنامه تهذیبی جدید'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-xl cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveProgram} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان برنامه تهذیبی:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: تلاوت نور، زیارت عاشورا، ورزش صبحگاهی، مطالعه کتاب اخلاق..."
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  توضیحات و راهنمای طلبه (اختیاری):
                </label>
                <textarea
                  rows={2}
                  placeholder="توضیح مختصری درباره نحوه انجام یا اهمیت این برنامه..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Category & Input Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    دسته‌بندی:
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نوع ثبت وضعیت توسط طلبه:
                  </label>
                  <select
                    value={formInputType}
                    onChange={e => setFormInputType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                  >
                    <option value="BOOLEAN">تیک و ضربدر (انجام شد / انجام نشد)</option>
                    <option value="MULTICHOICE">چندگزینه‌ای (لیست گزینه‌های انتخابی)</option>
                    <option value="NUMERIC">مقدار عددی (مثلاً تعداد صفحات/دقیقه)</option>
                    <option value="TEXT">گزارش و یادداشت متنی</option>
                  </select>
                </div>
              </div>

              {/* Dynamic inputs based on inputType */}
              {formInputType === 'MULTICHOICE' && (
                <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-1">
                  <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    گزینه‌های قابل انتخاب توسط طلبه (با کاما جدا کنید):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثلاً: کامل, ناقص, انجام نشد  یا  عالی, خوب, متوسط, انجام نشد"
                    value={formOptions}
                    onChange={e => setFormOptions(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {formInputType === 'NUMERIC' && (
                <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-1">
                  <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    واحد اندازه‌گیری:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثلاً: صفحه، دقیقه، بار، ساعت، مرتبه..."
                    value={formUnit}
                    onChange={e => setFormUnit(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* Target Bases Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  پایه‌های تحصیلی مخاطب:
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFormTargetBases([])}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      formTargetBases.length === 0
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    تمام طلاب (پایه‌های ۱ تا ۶)
                  </button>
                  {[1, 2, 3, 4, 5, 6].map(b => {
                    const isSelected = formTargetBases.includes(b);
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => toggleTargetBase(b)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        پایه {b}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Is Active Toggle */}
              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="formIsActive"
                  checked={formIsActive}
                  onChange={e => setFormIsActive(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="formIsActive" className="text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer">
                  فعال باشد (بلافاصله در فرم خودارزیابی طلاب نمایش داده شود)
                </label>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  {editingProgram ? 'ذخیره تغییرات' : 'ایجاد و انتشار برنامه'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
