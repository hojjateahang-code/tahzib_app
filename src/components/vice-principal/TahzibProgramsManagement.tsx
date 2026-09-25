import React, { useState } from 'react';
import { db, DEFAULT_TAHZIB_CATEGORIES } from '../../db';
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
  ShieldCheck, 
  ListChecks, 
  ToggleLeft, 
  ToggleRight,
  Check,
  X,
  FolderPlus,
  Settings2,
  Tag,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronsUp,
  ChevronsDown,
  SlidersHorizontal,
  Zap
} from 'lucide-react';
import { triggerSync, getSynchronizedTime } from '../../sync';
import type { TahzibProgram, TahzibCategory } from '../../types';

export function TahzibProgramsManagement() {
  // Live Query for Programs & Categories
  const rawPrograms = useLiveQuery(() => db.tahzibPrograms.toArray()) || [];
  const activePrograms = rawPrograms.filter(p => !p.isDeleted);

  const rawCategories = useLiveQuery(() => db.tahzibCategories.toArray()) || [];
  const activeCategories = rawCategories.filter(c => !c.isDeleted);

  // Category names list derived from DB, with fallback to default categories
  const categoryNames = activeCategories.length > 0
    ? activeCategories.map(c => c.name)
    : DEFAULT_TAHZIB_CATEGORIES.map(c => c.name);

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Program Form & Modal States
  const [showProgramModal, setShowProgramModal] = useState<boolean>(false);
  const [editingProgram, setEditingProgram] = useState<TahzibProgram | null>(null);

  // Reorder Panel / Modal States
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);
  const [showQuickOrderPanel, setShowQuickOrderPanel] = useState<boolean>(true);

  // Program Form Fields
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('عبادی');
  const [isCustomCategoryInput, setIsCustomCategoryInput] = useState<boolean>(false);
  const [customCategoryName, setCustomCategoryName] = useState<string>('');
  const [formInputType, setFormInputType] = useState<'BOOLEAN' | 'MULTICHOICE' | 'NUMERIC' | 'TEXT'>('BOOLEAN');
  const [formOptions, setFormOptions] = useState<string>('کامل, ناقص, انجام نشد');
  const [formUnit, setFormUnit] = useState<string>('صفحه');
  const [formTargetBases, setFormTargetBases] = useState<number[]>([]); // empty = ALL
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  // Category Management Modal State
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState<TahzibCategory | null>(null);
  const [editCatName, setEditCatName] = useState<string>('');

  // Handlers for Program Modal
  const openCreateProgramModal = () => {
    setEditingProgram(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategory(categoryNames[0] || 'عبادی');
    setIsCustomCategoryInput(false);
    setCustomCategoryName('');
    setFormInputType('BOOLEAN');
    setFormOptions('عالی, خوب, متوسط, انجام نشد');
    setFormUnit('صفحه');
    setFormTargetBases([]);
    setFormOrder(activePrograms.length + 1);
    setFormIsActive(true);
    setShowProgramModal(true);
  };

  const openEditProgramModal = (prog: TahzibProgram) => {
    setEditingProgram(prog);
    setFormTitle(prog.title || '');
    setFormDescription(prog.description || '');
    setFormCategory(prog.category || 'عبادی');
    setIsCustomCategoryInput(false);
    setCustomCategoryName('');
    setFormInputType(prog.inputType || 'BOOLEAN');
    setFormOptions(prog.options && prog.options.length > 0 ? prog.options.join(', ') : 'عالی, خوب, متوسط, انجام نشد');
    setFormUnit(prog.unit || 'صفحه');
    setFormTargetBases(prog.targetBases || []);
    setFormOrder(prog.order || 1);
    setFormIsActive(prog.isActive !== false);
    setShowProgramModal(true);
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('لطفاً عنوان برنامه تهذیبی را وارد نمایید.');
      return;
    }

    const now = getSynchronizedTime();

    // Determine final category name
    let finalCategory = formCategory;
    if (isCustomCategoryInput || formCategory === '__NEW__') {
      const trimmedCustomCat = customCategoryName.trim();
      if (!trimmedCustomCat) {
        alert('لطفاً نام دسته‌بندی جدید را وارد نمایید.');
        return;
      }
      finalCategory = trimmedCustomCat;

      // Automatically add this new category to db.tahzibCategories if it doesn't exist
      const existingCat = activeCategories.find(c => c.name.trim() === trimmedCustomCat);
      if (!existingCat) {
        const newCat: TahzibCategory = {
          id: 'cat_' + crypto.randomUUID(),
          name: trimmedCustomCat,
          order: activeCategories.length + 1,
          createdAt: new Date(now).toISOString(),
          updatedAt: now
        };
        await db.tahzibCategories.add(newCat);
      }
    }

    const parsedOptions = formInputType === 'MULTICHOICE'
      ? formOptions.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const validatedOrder = Number(formOrder) > 0 ? Number(formOrder) : 1;

    if (editingProgram) {
      await db.tahzibPrograms.update(editingProgram.id, {
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        category: finalCategory,
        inputType: formInputType,
        options: parsedOptions,
        unit: formInputType === 'NUMERIC' ? (formUnit.trim() || 'عدد') : undefined,
        targetBases: formTargetBases,
        order: validatedOrder,
        isActive: formIsActive,
        updatedAt: now
      });
    } else {
      const newProgram: TahzibProgram = {
        id: 'prog_' + crypto.randomUUID(),
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        category: finalCategory,
        inputType: formInputType,
        options: parsedOptions,
        unit: formInputType === 'NUMERIC' ? (formUnit.trim() || 'عدد') : undefined,
        targetBases: formTargetBases,
        order: validatedOrder,
        isActive: formIsActive,
        createdAt: new Date(now).toISOString(),
        updatedAt: now
      };
      await db.tahzibPrograms.add(newProgram);
    }

    setShowProgramModal(false);
    triggerSync();
  };

  // Reorder programs move up / down helper
  const handleMoveProgram = async (prog: TahzibProgram, direction: 'UP' | 'DOWN') => {
    const sorted = [...activePrograms].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    const idx = sorted.findIndex(p => p.id === prog.id);
    if (idx === -1) return;
    if (direction === 'UP' && idx === 0) return;
    if (direction === 'DOWN' && idx === sorted.length - 1) return;

    const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;

    const now = getSynchronizedTime();

    // Assign clean sequential numbers to all items
    for (let i = 0; i < sorted.length; i++) {
      let newSeq = i + 1;
      if (i === idx) newSeq = targetIdx + 1;
      else if (i === targetIdx) newSeq = idx + 1;

      if (sorted[i].order !== newSeq) {
        await db.tahzibPrograms.update(sorted[i].id, {
          order: newSeq,
          updatedAt: now
        });
      }
    }

    triggerSync();
  };

  // Move program to top position (#1)
  const handleMoveToTop = async (prog: TahzibProgram) => {
    const sorted = [...activePrograms].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    const filtered = sorted.filter(p => p.id !== prog.id);
    const newSorted = [prog, ...filtered];

    const now = getSynchronizedTime();
    for (let i = 0; i < newSorted.length; i++) {
      if (newSorted[i].order !== i + 1) {
        await db.tahzibPrograms.update(newSorted[i].id, {
          order: i + 1,
          updatedAt: now
        });
      }
    }
    triggerSync();
  };

  // Move program to bottom position
  const handleMoveToBottom = async (prog: TahzibProgram) => {
    const sorted = [...activePrograms].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    const filtered = sorted.filter(p => p.id !== prog.id);
    const newSorted = [...filtered, prog];

    const now = getSynchronizedTime();
    for (let i = 0; i < newSorted.length; i++) {
      if (newSorted[i].order !== i + 1) {
        await db.tahzibPrograms.update(newSorted[i].id, {
          order: i + 1,
          updatedAt: now
        });
      }
    }
    triggerSync();
  };

  // Set direct order number and re-index clean 1..N
  const handleSetDirectOrder = async (prog: TahzibProgram, targetPos: number) => {
    if (isNaN(targetPos) || targetPos < 1) return;
    const sorted = [...activePrograms].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    const filtered = sorted.filter(p => p.id !== prog.id);
    
    const clampedPos = Math.min(Math.max(1, targetPos), sorted.length);
    filtered.splice(clampedPos - 1, 0, prog);

    const now = getSynchronizedTime();
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i].order !== i + 1) {
        await db.tahzibPrograms.update(filtered[i].id, {
          order: i + 1,
          updatedAt: now
        });
      }
    }
    triggerSync();
  };

  // Quick preset helper (e.g., put "مباحثه" or "کلاس" as #1)
  const handleSetTopByKeyword = async (keyword: string) => {
    const target = activePrograms.find(p => p.title.includes(keyword));
    if (target) {
      await handleMoveToTop(target);
    } else {
      alert(`برنامه‌ای با عنوان «${keyword}» یافت نشد.`);
    }
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

  // Handlers for Category Management
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    const existing = activeCategories.find(c => c.name.trim() === trimmed);
    if (existing) {
      alert('این دسته‌بندی قبلاً اضافه شده است.');
      return;
    }

    const now = getSynchronizedTime();
    const newCat: TahzibCategory = {
      id: 'cat_' + crypto.randomUUID(),
      name: trimmed,
      order: activeCategories.length + 1,
      createdAt: new Date(now).toISOString(),
      updatedAt: now
    };

    await db.tahzibCategories.add(newCat);
    setNewCatName('');
    triggerSync();
  };

  const handleSaveEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const trimmed = editCatName.trim();
    if (!trimmed) return;

    const now = getSynchronizedTime();

    // Update programs that were using old category name if needed
    const oldName = editingCategory.name;
    await db.tahzibCategories.update(editingCategory.id, {
      name: trimmed,
      updatedAt: now
    });

    // Update matching programs to new category name
    const matchingProgs = rawPrograms.filter(p => p.category === oldName);
    for (const p of matchingProgs) {
      await db.tahzibPrograms.update(p.id, { category: trimmed, updatedAt: now });
    }

    setEditingCategory(null);
    setEditCatName('');
    triggerSync();
  };

  const handleDeleteCategory = async (cat: TahzibCategory) => {
    const progsInCat = activePrograms.filter(p => p.category === cat.name);
    if (progsInCat.length > 0) {
      if (!confirm(`در حال حاضر ${progsInCat.length} برنامه در دسته‌بندی «${cat.name}» وجود دارد. آیا از حذف این دسته‌بندی اطمینان دارید؟`)) {
        return;
      }
    } else {
      if (!confirm(`آیا از حذف دسته‌بندی «${cat.name}» اطمینان دارید؟`)) return;
    }

    const now = getSynchronizedTime();
    await db.tahzibCategories.update(cat.id, {
      isDeleted: true,
      updatedAt: now
    });
    triggerSync();
  };

  // Sorted list of all active programs
  const allSortedPrograms = [...activePrograms].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  // Filtered programs for view
  const filteredPrograms = allSortedPrograms
    .filter(prog => {
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
    <div className="space-y-6 animate-in fade-in duration-200 dir-rtl">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>مدیریت و تعریف امورات و برنامه‌های تهذیبی</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              تنظیم دقیق ترتیب نمایش امور تهذیبی (با دکمه‌های بالا/پایین)، افزودن دسته‌بندی‌ها و تعریف فرم طلاب
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowQuickOrderPanel(!showQuickOrderPanel)}
              className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 border border-indigo-200 dark:border-indigo-800"
            >
              <SlidersHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{showQuickOrderPanel ? 'بستن پنل ترتیبات' : 'پنل تنظیمات ترتیب'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowOrderModal(true)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 border border-slate-200/80 dark:border-slate-700"
            >
              <ArrowUpDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>مدال ترتیب جابجایی</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCategoryModal(true)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 border border-slate-200/80 dark:border-slate-700"
            >
              <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>دسته‌بندی‌ها ({categoryNames.length})</span>
            </button>

            <button
              type="button"
              onClick={openCreateProgramModal}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>تعریف برنامه جدید</span>
            </button>
          </div>
        </div>

        {/* Security & History Retention Guaranty Banner */}
        <div className="p-3.5 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl flex items-center gap-3 text-xs text-emerald-900 dark:text-emerald-200">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="font-medium leading-relaxed">
            <strong>تضمین حفظ سوابق:</strong> با ویرایش، جابجایی یا تغییر ترتیب برنامه‌ها، کلیه ارزیابی‌ها و گزارش‌های گذشته طلاب کاملاً دست‌نخورده و محفوظ باقی می‌مانند.
          </p>
        </div>
      </div>

      {/* Dedicated Order Settings & Quick Actions Panel */}
      {showQuickOrderPanel && (
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-700/50 space-y-5 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/80 pb-4">
            <div>
              <h3 className="text-base font-black flex items-center gap-2 text-indigo-100">
                <SlidersHorizontal className="w-5 h-5 text-indigo-300" />
                <span>تنظیمات ترتیب و اولویت نمایش امورات تهذیبی (دکمه‌های بالا / پایین)</span>
              </h3>
              <p className="text-xs text-indigo-300/80 mt-1">
                ترتیب زیر دقیقاً نحوه قرارگیری گزینه‌ها در فرم خودارزیابی روزانه طلاب را مشخص می‌کند. برای تغییر، از دکمه‌های بالا ⬆️، پایین ⬇️ یا وارد کردن شماره ترتیب استفاده کنید.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-indigo-200">میانبر اولویت اول (۱#):</span>
              <button
                type="button"
                onClick={() => handleSetTopByKeyword('مباحثه')}
                className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-500 text-white font-extrabold text-[11px] rounded-xl border border-indigo-400/40 shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                title="قرار دادن حضور در مباحثه در اولویت اول لیست"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>اولین: حضور در مباحثه</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetTopByKeyword('کلاس')}
                className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-500 text-white font-extrabold text-[11px] rounded-xl border border-indigo-400/40 shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                title="قرار دادن حضور در کلاس در اولویت اول لیست"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>اولین: حضور در کلاس</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetTopByKeyword('سحر')}
                className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-500 text-white font-extrabold text-[11px] rounded-xl border border-indigo-400/40 shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                title="قرار دادن سحرخیزی در اولویت اول لیست"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>اولین: سحرخیزی</span>
              </button>
            </div>
          </div>

          {/* Interactive Quick Reorder Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
            {allSortedPrograms.map((prog, index) => {
              const isFirst = index === 0;
              const isLast = index === allSortedPrograms.length - 1;

              return (
                <div
                  key={prog.id}
                  className="bg-indigo-950/80 backdrop-blur-md p-3.5 rounded-2xl border border-indigo-800/80 flex items-center justify-between gap-3 shadow-md hover:border-indigo-500 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-inner">
                      #{index + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-xs text-indigo-50 truncate">
                        {prog.title}
                      </h4>
                      <span className="text-[10px] text-indigo-300 font-bold bg-indigo-900/60 px-2 py-0.5 rounded-md inline-block mt-0.5">
                        {prog.category || 'عمومی'}
                      </span>
                    </div>
                  </div>

                  {/* Reorder Buttons & Direct Input */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Direct position number input */}
                    <div className="flex items-center gap-1 bg-indigo-900/90 border border-indigo-700 rounded-xl px-2 py-1">
                      <span className="text-[10px] text-indigo-300 font-bold">ترتیب:</span>
                      <input
                        type="number"
                        min={1}
                        max={allSortedPrograms.length}
                        value={prog.order || index + 1}
                        onChange={e => handleSetDirectOrder(prog, Number(e.target.value))}
                        className="w-10 bg-indigo-950 border border-indigo-600 rounded text-center text-xs font-black text-white p-0.5 outline-none focus:ring-1 focus:ring-indigo-400"
                        title="تغییر مستقیم شماره اولویت"
                      />
                    </div>

                    {/* Up / Down Buttons */}
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveProgram(prog, 'UP')}
                      className={`px-2 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
                        isFirst
                          ? 'opacity-30 border-indigo-800 text-indigo-400 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 cursor-pointer shadow-xs'
                      }`}
                      title="انتقال به بالا (۱ پله بالاتر)"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">بالا</span>
                    </button>

                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveProgram(prog, 'DOWN')}
                      className={`px-2 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
                        isLast
                          ? 'opacity-30 border-indigo-800 text-indigo-400 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 cursor-pointer shadow-xs'
                      }`}
                      title="انتقال به پایین (۱ پله پایین‌تر)"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">پایین</span>
                    </button>

                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveToTop(prog)}
                      className={`p-1.5 rounded-xl border text-xs font-bold transition-all ${
                        isFirst
                          ? 'opacity-30 border-indigo-800 text-indigo-400 cursor-not-allowed'
                          : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 cursor-pointer shadow-xs'
                      }`}
                      title="انتقال مستقیم به اولویت اول (بالاترین اولویت #۱)"
                    >
                      <ChevronsUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-3">
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
            همه امورات ({activePrograms.length})
          </button>

          {categoryNames.map(cat => {
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

      {/* Programs List Grid */}
      {filteredPrograms.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center">
          <ListChecks className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-300 text-base mb-1">هیچ برنامه تهذیبی یافت نشد</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            می‌توانید با دکمه زیر برنامه جدیدی (عبادی، اخلاقی، عبادی سیاسی، آموزشی...) برای فرم خودارزیابی طلاب تعریف کنید.
          </p>
          <button
            type="button"
            onClick={openCreateProgramModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            تعریف برنامه جدید
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPrograms.map(prog => {
            const currentIdx = allSortedPrograms.findIndex(p => p.id === prog.id);
            const isFirst = currentIdx === 0;
            const isLast = currentIdx === allSortedPrograms.length - 1;

            return (
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
                      <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-indigo-600 text-white shadow-xs flex items-center gap-1">
                        <span>اولویت</span>
                        <span>#{prog.order || currentIdx + 1}</span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {prog.category || 'عمومی'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {prog.inputType === 'BOOLEAN' && 'تیک/ضربدر'}
                        {prog.inputType === 'MULTICHOICE' && 'چندگزینه‌ای'}
                        {prog.inputType === 'NUMERIC' && `عددی (${prog.unit || 'واحد'})`}
                        {prog.inputType === 'TEXT' && 'متنی'}
                      </span>
                    </div>

                    {/* Active / Inactive Badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 ${
                      prog.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                    }`}>
                      {prog.isActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span>{prog.isActive ? 'فعال' : 'غیرفعال'}</span>
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

                {/* Card Footer: Action Buttons & Reordering Toolbar */}
                <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    {/* Reordering toolbar with explicit text buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1 border border-indigo-200 dark:border-indigo-800/80 rounded-xl p-1 bg-indigo-50/50 dark:bg-indigo-950/40">
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => handleMoveProgram(prog, 'UP')}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                            isFirst 
                              ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' 
                              : 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-700 cursor-pointer shadow-2xs'
                          }`}
                          title="انتقال به بالا (۱ اولویت بالاتر)"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                          <span>بالا</span>
                        </button>

                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => handleMoveProgram(prog, 'DOWN')}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                            isLast 
                              ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' 
                              : 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-700 cursor-pointer shadow-2xs'
                          }`}
                          title="انتقال به پایین (۱ اولویت پایین‌تر)"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                          <span>پایین</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => handleMoveToTop(prog)}
                        className={`px-2 py-1 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-1 ${
                          isFirst
                            ? 'text-slate-300 border-slate-200 dark:text-slate-700 dark:border-slate-800 cursor-not-allowed'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800 hover:bg-amber-100 cursor-pointer shadow-2xs'
                        }`}
                        title="انتقال به ابتدا (اولویت ۱)"
                      >
                        <ChevronsUp className="w-3.5 h-3.5" />
                        <span>اولین (۱#)</span>
                      </button>

                      {/* Direct order input */}
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-slate-500">ترتیب:</span>
                        <input
                          type="number"
                          min={1}
                          max={allSortedPrograms.length}
                          value={prog.order || currentIdx + 1}
                          onChange={e => handleSetDirectOrder(prog, Number(e.target.value))}
                          className="w-9 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-center text-xs font-bold outline-none p-0.5 text-slate-800 dark:text-slate-100"
                          title="تغییر عدد اولویت"
                        />
                      </div>
                    </div>

                    {/* Edit & Delete Controls */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(prog)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                        title={prog.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                      >
                        {prog.isActive ? (
                          <ToggleRight className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-slate-400" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditProgramModal(prog)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                        title="ویرایش برنامه"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteProgram(prog)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                        title="حذف برنامه (با حفظ سوابق)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Program Create/Edit Modal */}
      {showProgramModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 dir-rtl">
          <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-black text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>{editingProgram ? 'ویرایش برنامه تهذیبی' : 'تعریف برنامه تهذیبی جدید'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowProgramModal(false)}
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
                  placeholder="مثلاً: تلاوت نور، شرکت در نماز جمعه، حضور در مباحثه علمی، ورزش صبحگاهی..."
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
                    دسته‌بندی برنامه:
                  </label>
                  <select
                    value={isCustomCategoryInput ? '__NEW__' : formCategory}
                    onChange={e => {
                      if (e.target.value === '__NEW__') {
                        setIsCustomCategoryInput(true);
                      } else {
                        setIsCustomCategoryInput(false);
                        setFormCategory(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                  >
                    {categoryNames.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__NEW__">+ افزودن دسته‌بندی جدید (مثلاً: عبادی سیاسی)</option>
                  </select>

                  {isCustomCategoryInput && (
                    <div className="mt-2 animate-in fade-in duration-150">
                      <input
                        type="text"
                        required
                        placeholder="نام دسته‌بندی جدید را بنویسید (مثلاً: عبادی سیاسی)..."
                        value={customCategoryName}
                        onChange={e => setCustomCategoryName(e.target.value)}
                        className="w-full bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-300 dark:border-indigo-700 rounded-xl p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-900 dark:text-indigo-100"
                      />
                    </div>
                  )}
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
                    placeholder="مثلاً: کامل, ناقص, انجام نشد  یا  شرکت کردم, نرفتم"
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
                    placeholder="مثلاً: صفحه، دقیقه، بار، ساعت، جلسه..."
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

              {/* Order Sequence Input */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  ترتیب اولویت نمایش در فرم طلاب (عدد ۱ یعنی اول از همه بالا قرار می‌گیرد):
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={formOrder}
                  onChange={e => setFormOrder(Number(e.target.value) || 1)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                />
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
                  onClick={() => setShowProgramModal(false)}
                  className="px-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 dir-rtl">
          <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-base flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>مدیریت دسته‌بندی‌های امورات تهذیبی</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-xl cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Add New Category Form */}
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                placeholder="عنوان دسته‌بندی جدید (مثلاً: عبادی سیاسی)..."
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن</span>
              </button>
            </form>

            {/* Existing Categories List */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                دسته‌بندی‌های فعال در سامانه:
              </h4>

              {activeCategories.length === 0 ? (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-500 text-center">
                  دسته‌بندی‌های پیش‌فرض سامانه: {DEFAULT_TAHZIB_CATEGORIES.map(c => c.name).join('، ')}
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {activeCategories.map(cat => {
                    const progCount = activePrograms.filter(p => p.category === cat.name).length;
                    const isEditing = editingCategory?.id === cat.id;

                    return (
                      <div
                        key={cat.id}
                        className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-2"
                      >
                        {isEditing ? (
                          <form onSubmit={handleSaveEditCategory} className="flex items-center gap-2 w-full">
                            <input
                              type="text"
                              value={editCatName}
                              onChange={e => setEditCatName(e.target.value)}
                              className="flex-1 bg-white dark:bg-slate-900 border border-indigo-400 rounded-lg p-1.5 text-xs font-bold outline-none"
                            />
                            <button
                              type="submit"
                              className="p-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCategory(null)}
                              className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </form>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100">
                                {cat.name}
                              </span>
                              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                                {progCount} برنامه
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategory(cat);
                                  setEditCatName(cat.name);
                                }}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg cursor-pointer"
                                title="ویرایش عنوان دسته‌بندی"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer"
                                title="حذف دسته‌بندی"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-left">
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="px-5 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl text-xs font-bold cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Program Reorder Sequence Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 dir-rtl">
          <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-base flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>تنظیم ترتیب و اولویت جابجایی برنامه‌ها</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-xl cursor-pointer"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              برنامه‌ها دقیقاً به همین ترتیبی که تعیین می‌کنید در فرم خودارزیابی روزانه طلاب (از بالا به پایین) قرار می‌گیرند.
            </p>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {allSortedPrograms.map((prog, index, arr) => (
                <div
                  key={prog.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      #{index + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                        {prog.title}
                      </h4>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                        {prog.category || 'عمومی'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Direct number editor */}
                    <input
                      type="number"
                      min={1}
                      max={arr.length}
                      value={prog.order || index + 1}
                      onChange={e => handleSetDirectOrder(prog, Number(e.target.value))}
                      className="w-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1 text-center font-bold text-xs text-slate-800 dark:text-slate-100"
                      title="تغییر مستقیم شماره اولویت"
                    />

                    {/* Up/Down buttons with labels */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveProgram(prog, 'UP')}
                        className={`px-2 py-1 rounded-lg border text-xs font-bold transition-colors flex items-center gap-1 ${
                          index === 0
                            ? 'text-slate-300 border-slate-200 dark:text-slate-700 dark:border-slate-800 cursor-not-allowed'
                            : 'bg-white dark:bg-slate-800 text-indigo-600 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 cursor-pointer'
                        }`}
                        title="انتقال به بالا"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                        <span>بالا</span>
                      </button>
                      <button
                        type="button"
                        disabled={index === arr.length - 1}
                        onClick={() => handleMoveProgram(prog, 'DOWN')}
                        className={`px-2 py-1 rounded-lg border text-xs font-bold transition-colors flex items-center gap-1 ${
                          index === arr.length - 1
                            ? 'text-slate-300 border-slate-200 dark:text-slate-700 dark:border-slate-800 cursor-not-allowed'
                            : 'bg-white dark:bg-slate-800 text-indigo-600 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 cursor-pointer'
                        }`}
                        title="انتقال به پایین"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                        <span>پایین</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-left">
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer hover:bg-indigo-700"
              >
                تأیید و بستن
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
