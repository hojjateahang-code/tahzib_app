import React, { useState, useMemo } from 'react';
import { useAuth } from '../../store';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  GraduationCap, 
  Calendar, 
  Clock, 
  Award, 
  CheckCircle2, 
  BookOpen, 
  ExternalLink, 
  MapPin, 
  UserCheck, 
  Upload, 
  FileText, 
  AlertCircle, 
  X, 
  Sparkles,
  ChevronLeft,
  Filter
} from 'lucide-react';
import { triggerSync, uploadFileToMinIO } from '../../sync';
import type { TahzibCourse, StudentCourseEnrollment } from '../../types';

export function StudentCoursesView() {
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED' | 'AVAILABLE'>('ALL');
  const [selectedCourseForDetails, setSelectedCourseForDetails] = useState<TahzibCourse | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState<TahzibCourse | null>(null);

  // Form states for completion
  const [completionNotes, setCompletionNotes] = useState('');
  const [uploadedDocUrl, setUploadedDocUrl] = useState('');
  const [uploadedDocName, setUploadedDocName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all active courses from Dexie
  const courses = useLiveQuery(
    () => db.tahzibCourses.toArray().then(list => 
      list.filter(c => Boolean(c.isActive) && !c.isDeleted)
    ),
    []
  ) || [];

  // Fetch student enrollments
  const enrollments = useLiveQuery(
    async () => {
      if (!currentUser?.id) return [];
      return await db.studentCourseEnrollments
        .where('studentId')
        .equals(currentUser.id)
        .toArray();
    },
    [currentUser?.id]
  ) || [];

  // Filter relevant courses based on student's base
  const studentBase = currentUser?.base || 1;
  const myRelevantCourses = useMemo(() => {
    return courses.filter(c => {
      if (!c.targetBases || c.targetBases.length === 0) return true; // all bases
      return c.targetBases.includes(studentBase);
    });
  }, [courses, studentBase]);

  // Combine course data with enrollment info
  const courseItemsWithStatus = useMemo(() => {
    return myRelevantCourses.map(course => {
      const enr = enrollments.find(e => e.courseId === course.id && !e.isDeleted);
      const isCompleted = enr?.status === 'COMPLETED';
      const isInProgress = enr?.status === 'IN_PROGRESS';
      
      // Calculate remaining days
      let daysRemaining = course.durationDays || 10;
      if (course.endDate) {
        const end = new Date(course.endDate);
        const now = new Date();
        const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24));
        daysRemaining = Math.max(0, diff);
      }

      return {
        course,
        enrollment: enr || null,
        status: isCompleted ? 'COMPLETED' : isInProgress ? 'IN_PROGRESS' : 'NOT_STARTED',
        daysRemaining
      };
    });
  }, [myRelevantCourses, enrollments]);

  // Apply UI filter
  const filteredCourses = useMemo(() => {
    if (filter === 'ALL') return courseItemsWithStatus;
    if (filter === 'IN_PROGRESS') return courseItemsWithStatus.filter(c => c.status === 'IN_PROGRESS');
    if (filter === 'COMPLETED') return courseItemsWithStatus.filter(c => c.status === 'COMPLETED');
    if (filter === 'AVAILABLE') return courseItemsWithStatus.filter(c => c.status === 'NOT_STARTED');
    return courseItemsWithStatus;
  }, [courseItemsWithStatus, filter]);

  // Step 1: Start course
  const handleStartCourse = async (course: TahzibCourse) => {
    if (!currentUser) return;
    try {
      const now = new Date().toISOString();
      const existing = enrollments.find(e => e.courseId === course.id);
      
      if (existing) {
        await db.studentCourseEnrollments.update(existing.id, {
          status: 'IN_PROGRESS',
          startedAt: now,
          updatedAt: Date.now(),
          synced: false
        });
      } else {
        const newEnrollment: StudentCourseEnrollment = {
          id: 'enr_' + crypto.randomUUID(),
          courseId: course.id,
          studentId: currentUser.id,
          status: 'IN_PROGRESS',
          startedAt: now,
          scoreAwarded: 0,
          synced: false
        };
        await db.studentCourseEnrollments.add(newEnrollment);
      }
      triggerSync();
    } catch (err) {
      console.error('Error starting course:', err);
    }
  };

  // Step 2: Upload document
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setCompletionError(null);
    try {
      const res = await uploadFileToMinIO(file);
      if (res && res.url) {
        setUploadedDocUrl(res.url);
        setUploadedDocName(file.name);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setUploadedDocUrl(reader.result as string);
          setUploadedDocName(file.name);
          setIsUploading(false);
        };
        reader.onerror = () => {
          setIsUploading(false);
          setCompletionError('خطا در خواندن فایل سند');
        };
        reader.readAsDataURL(file);
        return;
      }
    } catch (err: any) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedDocUrl(reader.result as string);
        setUploadedDocName(file.name);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
      return;
    }
    setIsUploading(false);
  };

  // Step 2: Submit completion
  const handleCompleteCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !showCompletionModal) return;

    if (showCompletionModal.requiresDocument && !uploadedDocUrl && !completionNotes.trim()) {
      setCompletionError('بارگذاری سند پایان دوره یا ثبت توضیحات و خلاصه مباحث الزامی است.');
      return;
    }

    setIsSubmitting(true);
    setCompletionError(null);
    try {
      const now = new Date().toISOString();
      const existing = enrollments.find(e => e.courseId === showCompletionModal.id);
      const awardedPoints = showCompletionModal.score || 50;

      if (existing) {
        await db.studentCourseEnrollments.update(existing.id, {
          status: 'COMPLETED',
          completedAt: now,
          completionDocumentUrl: uploadedDocUrl || undefined,
          documentName: uploadedDocName || undefined,
          notes: completionNotes || undefined,
          scoreAwarded: awardedPoints,
          updatedAt: Date.now(),
          synced: false
        });
      } else {
        const newEnrollment: StudentCourseEnrollment = {
          id: 'enr_' + crypto.randomUUID(),
          courseId: showCompletionModal.id,
          studentId: currentUser.id,
          status: 'COMPLETED',
          startedAt: now,
          completedAt: now,
          completionDocumentUrl: uploadedDocUrl || undefined,
          documentName: uploadedDocName || undefined,
          notes: completionNotes || undefined,
          scoreAwarded: awardedPoints,
          synced: false
        };
        await db.studentCourseEnrollments.add(newEnrollment);
      }

      triggerSync();
      setShowCompletionModal(null);
      setCompletionNotes('');
      setUploadedDocUrl('');
      setUploadedDocName('');
    } catch (err) {
      console.error('Error completing course:', err);
      setCompletionError('خطا در ثبت نهایی اتمام دوره.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white shadow-md border border-indigo-700/50">
        <div className="absolute top-0 left-0 w-72 h-72 bg-teal-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-400/20 rounded-2xl border border-amber-400/30 text-amber-300 shadow-inner">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black">دوره‌ها و کارگاه‌های تهذیبی</h2>
              <p className="text-xs sm:text-sm text-indigo-200 mt-1">
                اطلاع‌رسانی کارگاه‌های اخلاقی و مهارتی، ثبت‌نام، پیگیری روزانه و دریافت امتیاز تهذیبی
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-indigo-950/60 p-2 rounded-2xl border border-indigo-600/40 text-xs">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>پایه تحصیلی شما: <strong className="text-amber-300 font-bold">پایه {studentBase}</strong></span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            همه دوره‌ها ({courseItemsWithStatus.length})
          </button>
          <button
            onClick={() => setFilter('AVAILABLE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'AVAILABLE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            قابل ثبت‌نام ({courseItemsWithStatus.filter(c => c.status === 'NOT_STARTED').length})
          </button>
          <button
            onClick={() => setFilter('IN_PROGRESS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'IN_PROGRESS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            در حال گذراندن ({courseItemsWithStatus.filter(c => c.status === 'IN_PROGRESS').length})
          </button>
          <button
            onClick={() => setFilter('COMPLETED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            تکمیل شده ({courseItemsWithStatus.filter(c => c.status === 'COMPLETED').length})
          </button>
        </div>
      </div>

      {/* Courses List */}
      {filteredCourses.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
            در حال حاضر دوره‌ای در این بخش یافت نشد.
          </h3>
          <p className="text-xs text-slate-500">
            کارگاه‌ها و دوره‌های جدید به محض تعریف توسط معاونت تهذیب در این بخش و بنر بالای صفحه نمایش داده خواهند شد.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCourses.map(({ course, enrollment, status, daysRemaining }) => {
            const isCompleted = status === 'COMPLETED';
            const isInProgress = status === 'IN_PROGRESS';

            return (
              <div 
                key={course.id}
                className={`relative bg-white dark:bg-slate-900 rounded-3xl border transition-all duration-200 overflow-hidden shadow-2xs flex flex-col justify-between ${
                  isCompleted 
                    ? 'border-emerald-300 dark:border-emerald-900/60'
                    : isInProgress
                    ? 'border-amber-300 dark:border-amber-900/60 ring-1 ring-amber-400/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800'
                }`}
              >
                {/* Header status bar */}
                <div className="p-5 pb-3">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        course.type === 'ONLINE'
                          ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                          : 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-800'
                      }`}>
                        {course.type === 'ONLINE' ? 'مجازی / آنلاین' : 'حضوری'}
                      </span>
                      {course.targetBases && course.targetBases.length > 0 ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          مختص پایه‌های: {course.targetBases.join('، ')}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          عموم طلاب
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-amber-800/50">
                      <Award className="w-3.5 h-3.5" />
                      <span>{course.score || 50} امتیاز</span>
                    </div>
                  </div>

                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1.5">
                    {course.title}
                  </h3>

                  {course.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                      {course.description}
                    </p>
                  )}

                  {/* Course Details Info */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 mb-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                    {course.instructor && (
                      <div className="flex items-center gap-1.5 truncate">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">مدرس: {course.instructor}</span>
                      </div>
                    )}
                    {course.location && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">{course.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>مهلت دوره: {course.durationDays || 10} روز</span>
                    </div>
                    {daysRemaining !== undefined && !isCompleted && (
                      <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>مانده: {daysRemaining} روز</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="p-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-2">
                  {isCompleted ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 py-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>دوره تکمیل شده ({enrollment?.scoreAwarded || course.score || 50} امتیاز ثبت شد)</span>
                    </div>
                  ) : isInProgress ? (
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        در حال گذراندن
                      </span>
                      <button
                        onClick={() => setShowCompletionModal(course)}
                        className="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ثبت اتمام دوره و دریافت امتیاز</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartCourse(course)}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>شروع و ثبت‌نام در دوره</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                    ثبت خوداظهاری اتمام دوره تهذیبی
                  </h3>
                  <p className="text-xs text-slate-500">{showCompletionModal.title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCompletionModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {completionError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-2xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{completionError}</span>
              </div>
            )}

            <form onSubmit={handleCompleteCourse} className="space-y-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                <span>امتیاز این دوره پس از ثبت:</span>
                <span className="font-black text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-xl shadow-2xs border border-indigo-200 dark:border-indigo-800">
                  {showCompletionModal.score || 50} امتیاز تهذیبی
                </span>
              </div>

              {/* Upload Certificate / Document */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>سند یا مدرک پایان دوره (اختیاری/در صورت وجود):</span>
                  {showCompletionModal.requiresDocument && (
                    <span className="text-rose-500 font-normal text-[10px]">* الزامی برای این دوره</span>
                  )}
                </label>
                
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <input
                    type="file"
                    id="completion-doc-file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  {uploadedDocName ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                      <FileText className="w-4 h-4" />
                      <span>{uploadedDocName}</span>
                      <button
                        type="button"
                        onClick={() => { setUploadedDocName(''); setUploadedDocUrl(''); }}
                        className="text-rose-500 hover:underline mr-2 text-[10px]"
                      >
                        حذف
                      </button>
                    </div>
                  ) : (
                    <label 
                      htmlFor="completion-doc-file"
                      className="cursor-pointer flex flex-col items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600"
                    >
                      <Upload className="w-6 h-6 text-slate-400" />
                      <span className="font-medium">انتخاب تصویر گواهی یا فایل مدرک دوره</span>
                      <span className="text-[10px] text-slate-400">فرمت‌های مجاز: JPG, PNG, PDF</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Notes / Learnings */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  توضیحات و نکات آموخته شده از کارگاه:
                </label>
                <textarea
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="خلاصه‌ای از مباحث دوره یا توضیحات خود را بنویسید..."
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompletionModal(null)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'در حال ثبت...' : 'تایید نهایی و دریافت امتیاز'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
