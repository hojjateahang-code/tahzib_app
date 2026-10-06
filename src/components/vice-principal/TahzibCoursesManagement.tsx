import React, { useState } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  GraduationCap, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Users, 
  Search, 
  ExternalLink, 
  AlertCircle, 
  X, 
  ToggleLeft, 
  ToggleRight,
  Award,
  Calendar,
  FileText,
  Eye,
  Download
} from 'lucide-react';
import { triggerSync } from '../../sync';
import type { TahzibCourse, StudentCourseEnrollment, User } from '../../types';

export function TahzibCoursesManagement() {
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<TahzibCourse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingParticipantsCourse, setViewingParticipantsCourse] = useState<TahzibCourse | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<'IN_PERSON' | 'VIRTUAL' | 'HYBRID'>('HYBRID');
  const [formInstructor, setFormInstructor] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLocationOrLink, setFormLocationOrLink] = useState('');
  const [formTargetBases, setFormTargetBases] = useState<number[]>([]); // empty = ALL
  const [formScore, setFormScore] = useState<number>(50);
  const [formDurationDays, setFormDurationDays] = useState<number>(10);
  const [formRequiresDoc, setFormRequiresDoc] = useState<boolean>(true);
  const [formDocInstructions, setFormDocInstructions] = useState('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  // Queries
  const courses = useLiveQuery(() => db.tahzibCourses.toArray()) || [];
  const activeCourses = courses.filter(c => !c.isDeleted);
  const enrollments = useLiveQuery(() => db.studentCourseEnrollments.toArray()) || [];
  const students = useLiveQuery(() => db.users.where('role').equals('STUDENT').toArray()) || [];

  const filteredCourses = activeCourses.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.title.toLowerCase().includes(q) || (c.instructor && c.instructor.toLowerCase().includes(q));
  });

  const openCreateModal = () => {
    setEditingCourse(null);
    setFormTitle('');
    setFormType('HYBRID');
    setFormInstructor('');
    setFormDescription('');
    setFormLocationOrLink('');
    setFormTargetBases([]);
    setFormScore(50);
    setFormDurationDays(10);
    setFormRequiresDoc(true);
    setFormDocInstructions('ارائه تصویر گواهی یا یادداشت خلاصه مباحث الزامی است.');
    setFormIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (c: TahzibCourse) => {
    setEditingCourse(c);
    setFormTitle(c.title);
    setFormType(c.type || 'HYBRID');
    setFormInstructor(c.instructor || '');
    setFormDescription(c.description || '');
    setFormLocationOrLink(c.locationOrLink || '');
    setFormTargetBases(c.targetBases || []);
    setFormScore(c.score || 50);
    setFormDurationDays(c.durationDays || 10);
    setFormRequiresDoc(c.requiresDocument ?? true);
    setFormDocInstructions(c.documentInstructions || '');
    setFormIsActive(c.isActive);
    setShowModal(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const now = new Date();
    const startDate = now.toISOString().split('T')[0];
    const end = new Date(now.getTime() + formDurationDays * 24 * 60 * 60 * 1000);
    const endDate = end.toISOString().split('T')[0];

    if (editingCourse) {
      await db.tahzibCourses.update(editingCourse.id, {
        title: formTitle.trim(),
        type: formType,
        instructor: formInstructor.trim() || undefined,
        description: formDescription.trim() || undefined,
        locationOrLink: formLocationOrLink.trim() || undefined,
        targetBases: formTargetBases,
        score: Number(formScore) || 50,
        durationDays: Number(formDurationDays) || 10,
        endDate,
        requiresDocument: formRequiresDoc,
        documentInstructions: formDocInstructions.trim() || undefined,
        isActive: formIsActive,
        updatedAt: Date.now()
      });
    } else {
      const newCourse: TahzibCourse = {
        id: 'course_' + crypto.randomUUID(),
        title: formTitle.trim(),
        type: formType,
        instructor: formInstructor.trim() || undefined,
        description: formDescription.trim() || undefined,
        locationOrLink: formLocationOrLink.trim() || undefined,
        targetBases: formTargetBases,
        score: Number(formScore) || 50,
        durationDays: Number(formDurationDays) || 10,
        startDate,
        endDate,
        requiresDocument: formRequiresDoc,
        documentInstructions: formDocInstructions.trim() || undefined,
        isActive: formIsActive,
        createdAt: now.toISOString(),
        updatedAt: Date.now()
      };
      await db.tahzibCourses.add(newCourse);
    }

    triggerSync();
    setShowModal(false);
  };

  const handleToggleActive = async (course: TahzibCourse) => {
    await db.tahzibCourses.update(course.id, {
      isActive: !course.isActive,
      updatedAt: Date.now()
    });
    triggerSync();
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('آیا از حذف این کارگاه/دوره اطمینان دارید؟ سوابق شرکت طلاب همچنان محفوظ خواهد ماند.')) return;
    await db.tahzibCourses.update(courseId, {
      isDeleted: true,
      updatedAt: Date.now()
    });
    triggerSync();
  };

  // Base selection helper
  const toggleBase = (baseNum: number) => {
    if (formTargetBases.includes(baseNum)) {
      setFormTargetBases(formTargetBases.filter(b => b !== baseNum));
    } else {
      setFormTargetBases([...formTargetBases, baseNum]);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Header and Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <GraduationCap className="w-5 h-5" />
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
              مدیریت و اطلاع‌رسانی کارگاه‌ها و دوره‌های تهذیبی
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            تعریف دوره‌های حضوری و مجازی با مهلت معین، اطلاع‌رسانی بنری به طلاب، و ثبت امتیاز پس از خوداظهاری و ارائه سند.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black rounded-2xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>اطلاع‌رسانی دوره جدید</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="جستجو در عناوین، اساتید یا سرفصل‌های کارگاه‌ها..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-2.5 pr-10 pl-4 text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 shadow-2xs"
          />
        </div>
      </div>

      {/* Courses List */}
      {filteredCourses.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <GraduationCap className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">هیچ دوره یا کارگاهی ثبت نشده است.</p>
          <p className="text-xs text-slate-400">جهت اطلاع‌رسانی اولین کارگاه به طلاب، دکمه «اطلاع‌رسانی دوره جدید» را بزنید.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCourses.map(course => {
            const courseEnrollments = enrollments.filter(e => e.courseId === course.id && !e.isDeleted);
            const inProgressCount = courseEnrollments.filter(e => e.status === 'IN_PROGRESS').length;
            const completedCount = courseEnrollments.filter(e => e.status === 'COMPLETED').length;

            return (
              <div 
                key={course.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-2xs space-y-4 flex flex-col justify-between transition-all ${
                  course.isActive 
                    ? 'border-indigo-100 dark:border-slate-800 hover:border-indigo-300' 
                    : 'border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                        course.type === 'VIRTUAL' 
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300' 
                          : course.type === 'IN_PERSON'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300'
                      }`}>
                        {course.type === 'VIRTUAL' ? 'مجازی' : course.type === 'IN_PERSON' ? 'حضوری' : 'ترکیبی'}
                      </span>
                      <span className="text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full">
                        +{course.score} امتیاز
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        مهلت: {course.durationDays} روز
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(course)}
                      className={`text-xs font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 cursor-pointer transition-colors ${
                        course.isActive 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300' 
                          : 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {course.isActive ? 'فعال در سامانه' : 'غیرفعال / آرشیو'}
                    </button>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">{course.title}</h4>
                    {course.instructor && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                        مدرس: {course.instructor}
                      </p>
                    )}
                  </div>

                  {course.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                    <span>
                      مخاطبان: <strong>{course.targetBases && course.targetBases.length > 0 ? `پایه‌های ${course.targetBases.join('، ')}` : 'عموم طلاب'}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      سند پایان دوره: <strong>{course.requiresDocument ? 'الزامی' : 'اختیاری'}</strong>
                    </span>
                  </div>
                </div>

                {/* Bottom Stats & Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingParticipantsCourse(course)}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-900/60"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>شرکت‌کنندگان: {completedCount} پایان‌یافته / {inProgressCount} در حال اجرا</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(course)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                      title="ویرایش دوره"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCourse(course.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                      title="حذف دوره"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Course Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveCourse}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <span>{editingCourse ? 'ویرایش دوره / کارگاه تهذیبی' : 'اطلاع‌رسانی و تعریف دوره جدید'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  عنوان کارگاه / دوره <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="مثلاً: کارگاه فن خطابه و تربیت حوزوی، دوره اصول محاسبه نفس..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    نحوه برگزاری
                  </label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                  >
                    <option value="HYBRID">ترکیبی (حضوری و مجازی)</option>
                    <option value="IN_PERSON">حضوری در مدرسه</option>
                    <option value="VIRTUAL">مجازی و برخط</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    مدرس / سخنران
                  </label>
                  <input
                    type="text"
                    value={formInstructor}
                    onChange={e => setFormInstructor(e.target.value)}
                    placeholder="مثلاً: حجت‌الاسلام والمسلمین رفیعی"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    امتیاز اتمام دوره (Score)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={500}
                    value={formScore}
                    onChange={e => setFormScore(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    مهلت اتمام (روز)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={formDurationDays}
                    onChange={e => setFormDurationDays(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  مخاطبان هدف (پایه‌ها)
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[1, 2, 3, 4, 5, 6].map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => toggleBase(b)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border ${
                        formTargetBases.includes(b)
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      پایه {b}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormTargetBases([])}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border ${
                      formTargetBases.length === 0
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    عموم طلاب (تمام پایه‌ها)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  مکان یا آدرس مجازی
                </label>
                <input
                  type="text"
                  value={formLocationOrLink}
                  onChange={e => setFormLocationOrLink(e.target.value)}
                  placeholder="مثلاً: سالن اجتماعات مدرسه یا لینک کانال ایتا"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  سرفصل‌ها و توضیحات
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="توضیح اهداف، سرفصل‌های کارگاه و شرایط قبولی دوره..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={formRequiresDoc}
                    onChange={e => setFormRequiresDoc(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>بارگذاری سند یا گواهی پایان دوره الزامی است</span>
                </label>
                {formRequiresDoc && (
                  <input
                    type="text"
                    value={formDocInstructions}
                    onChange={e => setFormDocInstructions(e.target.value)}
                    placeholder="راهنمای مدرک (مثلاً: عکس مدرک یا خلاصه ۲ صفحه‌ای مباحث بارگذاری شود)"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
              >
                {editingCourse ? 'ذخیره تغییرات' : 'انتشار و اطلاع‌رسانی دوره'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Participants Modal */}
      {viewingParticipantsCourse && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">گزارش شرکت‌کنندگان دوره</span>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{viewingParticipantsCourse.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingParticipantsCourse(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {(() => {
                const courseEnrollments = enrollments.filter(e => e.courseId === viewingParticipantsCourse.id && !e.isDeleted);
                if (courseEnrollments.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                      هنوز هیچ طلبه‌ای در این دوره شرکت نکرده است.
                    </div>
                  );
                }

                return courseEnrollments.map(enr => {
                  const student = students.find(s => s.id === enr.studentId);
                  const isDone = enr.status === 'COMPLETED';

                  return (
                    <div 
                      key={enr.id}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-100">
                            {student?.name || 'طلبه'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            (پایه {student?.base || 1} • کد ملی: {student?.nationalId || '-'})
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                          isDone 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300' 
                            : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {isDone ? `اتمام یافته (+${enr.scoreAwarded} امتیاز)` : 'در حال گذراندن'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                        {enr.startedAt && <span>شروع: {new Date(enr.startedAt).toLocaleDateString('fa-IR')}</span>}
                        {enr.completedAt && <span>اتمام: {new Date(enr.completedAt).toLocaleDateString('fa-IR')}</span>}
                      </div>

                      {enr.notes && (
                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                          <strong className="block text-slate-700 dark:text-slate-200 mb-0.5">یادداشت / خلاصه مباحث:</strong>
                          <p>{enr.notes}</p>
                        </div>
                      )}

                      {enr.completionDocumentUrl && (
                        <div className="pt-1 flex items-center gap-2">
                          <a
                            href={enr.completionDocumentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-200 dark:border-indigo-900"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>مشاهده سند یا مدرک ارسالی ({enr.documentName || 'فایل ضمیمه'})</span>
                          </a>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingParticipantsCourse(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
