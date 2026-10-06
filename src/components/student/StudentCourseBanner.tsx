import React, { useState, useMemo } from 'react';
import { useAuth } from '../../store';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Sparkles, 
  Calendar, 
  Clock, 
  Award, 
  CheckCircle2, 
  X, 
  Upload, 
  FileText, 
  AlertCircle, 
  ChevronLeft, 
  ExternalLink,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import { triggerSync, uploadFileToMinIO } from '../../sync';
import type { TahzibCourse, StudentCourseEnrollment } from '../../types';

export function StudentCourseBanner() {
  const { currentUser } = useAuth();
  const [selectedCourseForDetails, setSelectedCourseForDetails] = useState<TahzibCourse | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState<TahzibCourse | null>(null);
  const [isDismissedTemporarily, setIsDismissedTemporarily] = useState(false);
  
  // Completion form states
  const [completionNotes, setCompletionNotes] = useState('');
  const [uploadedDocUrl, setUploadedDocUrl] = useState('');
  const [uploadedDocName, setUploadedDocName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries
  const activeCourses = useLiveQuery(
    () => db.tahzibCourses.toArray().then(list => 
      list.filter(c => Boolean(c.isActive) && !c.isDeleted)
    ),
    []
  ) || [];

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

  // Filter courses relevant to current student's base
  const myRelevantCourses = useMemo(() => {
    if (!currentUser || activeCourses.length === 0) return [];
    const myBase = currentUser.base || 1;
    return activeCourses.filter(c => {
      if (!c.targetBases || c.targetBases.length === 0) return true; // all bases
      return c.targetBases.includes(myBase);
    });
  }, [activeCourses, currentUser]);

  // Find active course that requires attention:
  // Priority 1: In progress (reminder of days left)
  // Priority 2: Not started yet (announcement)
  // If completed, do NOT show banner for it.
  const activePromptCourse = useMemo(() => {
    if (myRelevantCourses.length === 0 || isDismissedTemporarily) return null;

    for (const course of myRelevantCourses) {
      const enr = enrollments.find(e => e.courseId === course.id && !e.isDeleted);
      
      // If completed, we do NOT show banner!
      if (enr && enr.status === 'COMPLETED') {
        continue;
      }

      // If in progress or not started, prompt user
      return {
        course,
        enrollment: enr || null,
        isEnrolled: enr?.status === 'IN_PROGRESS'
      };
    }

    return null;
  }, [myRelevantCourses, enrollments, isDismissedTemporarily]);

  if (!activePromptCourse) return null;

  const { course, enrollment, isEnrolled } = activePromptCourse;

  // Calculate days remaining
  const calculateDaysRemaining = () => {
    if (!course.endDate) return course.durationDays || 10;
    const end = new Date(course.endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return Math.max(0, diff);
  };

  const daysRemaining = calculateDaysRemaining();
  const totalDays = course.durationDays || 10;
  const daysElapsed = Math.max(0, totalDays - daysRemaining);
  const progressPercent = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));

  // Handle Step 1: Start / Enroll in Course
  const handleStartCourse = async (targetCourse: TahzibCourse) => {
    if (!currentUser) return;
    try {
      const now = new Date().toISOString();
      const existing = enrollments.find(e => e.courseId === targetCourse.id);
      
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
          courseId: targetCourse.id,
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

  // Handle file upload for certificate
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
        // Fallback to base64 data url for reliability
        const reader = new FileReader();
        reader.onload = () => {
          setUploadedDocUrl(reader.result as string);
          setUploadedDocName(file.name);
          setIsUploading(false);
        };
        reader.onerror = () => {
          setIsUploading(false);
          setCompletionError('خطا در خواندن فایل مدرک');
        };
        reader.readAsDataURL(file);
        return;
      }
    } catch (err: any) {
      console.warn('MinIO upload error, falling back to local file reader:', err);
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

  // Handle Step 2: Finalize Completion & Claim Points
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
    <>
      {/* Smart Top Banner */}
      <div className="w-full mb-4 animate-in fade-in duration-300">
        {!isEnrolled ? (
          /* Case A: Not Enrolled Yet - Announcement Banner */
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-teal-950 p-4 sm:p-5 text-white shadow-lg border border-indigo-700/60">
            <div className="absolute top-0 left-0 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="p-2.5 bg-amber-400/20 text-amber-300 rounded-2xl border border-amber-400/30 shrink-0 shadow-inner">
                  <GraduationCap className="w-6 h-6 text-amber-400" />
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black bg-indigo-500/30 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-400/30 uppercase">
                      اطلاعیه دوره تهذیبی جدید
                    </span>
                    <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/30">
                      {course.type === 'VIRTUAL' ? 'دوره مجازی' : course.type === 'IN_PERSON' ? 'کارگاه حضوری' : 'ترکیبی (حضوری و مجازی)'}
                    </span>
                    <span className="text-[10px] font-black bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                      +{course.score} امتیاز
                    </span>
                  </div>

                  <h4 className="text-sm sm:text-base font-black text-white">
                    {course.title}
                  </h4>

                  <p className="text-xs text-slate-300 line-clamp-1 font-medium">
                    {course.instructor ? `مدرس: ${course.instructor}` : ''} {course.description ? `• ${course.description}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={() => setSelectedCourseForDetails(course)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/10"
                >
                  مشاهده جزئیات
                </button>
                <button
                  type="button"
                  onClick={() => handleStartCourse(course)}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>شرکت در دوره (شروع گام ۱)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDismissedTemporarily(true)}
                  title="بستن موقت (در ورود بعدی یادآوری می‌شود)"
                  className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Case B: Enrolled & In Progress - Daily Countdown Reminder */
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 p-4 sm:p-5 text-white shadow-lg border border-amber-500/40">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="p-2.5 bg-amber-500/20 text-amber-300 rounded-2xl border border-amber-500/30 shrink-0">
                  <Clock className="w-6 h-6 text-amber-400 animate-pulse" />
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                      دوره در حال اجرا • گام دوم: ثبت اتمام
                    </span>
                    <span className="text-[11px] font-black text-amber-300 bg-black/40 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      ⏳ {daysRemaining > 0 ? `${daysRemaining} روز از مهلت باقی‌مانده است` : 'مهلت به پایان رسیده است'}
                    </span>
                  </div>

                  <h4 className="text-sm sm:text-base font-black text-white">
                    {course.title}
                  </h4>

                  <div className="flex items-center gap-2 pt-1">
                    <div className="w-36 sm:w-48 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                      <div 
                        className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-300 font-bold">
                      {daysElapsed} از {totalDays} روز سپری شده
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={() => setShowCompletionModal(course)}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Award className="w-4 h-4 text-slate-950" />
                  <span>ثبت اتمام دوره و دریافت {course.score} امتیاز</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedCourseForDetails && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">اطلاعات کارگاه / دوره</span>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{selectedCourseForDetails.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCourseForDetails(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              {selectedCourseForDetails.instructor && (
                <div className="flex justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span className="font-bold">مدرس / ارائه دهنده:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{selectedCourseForDetails.instructor}</span>
                </div>
              )}
              <div className="flex justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <span className="font-bold">نحوه برگزاری:</span>
                <span className="font-medium">
                  {selectedCourseForDetails.type === 'VIRTUAL' ? 'مجازی' : selectedCourseForDetails.type === 'IN_PERSON' ? 'حضوری' : 'ترکیبی'}
                </span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <span className="font-bold">امتیاز اتمام دوره:</span>
                <span className="font-black text-amber-600 dark:text-amber-400">+{selectedCourseForDetails.score} امتیاز</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <span className="font-bold">مهلت دوره:</span>
                <span>{selectedCourseForDetails.durationDays} روز (تا {selectedCourseForDetails.endDate})</span>
              </div>
              {selectedCourseForDetails.locationOrLink && (
                <div className="p-2.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
                  <span className="font-bold block text-indigo-900 dark:text-indigo-200 mb-1">مکان یا آدرس مجازی:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px] break-all">{selectedCourseForDetails.locationOrLink}</span>
                </div>
              )}
              {selectedCourseForDetails.description && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl leading-relaxed">
                  <span className="font-bold block text-slate-800 dark:text-slate-200 mb-1">توضیحات و سرفصل‌ها:</span>
                  <p>{selectedCourseForDetails.description}</p>
                </div>
              )}
              {selectedCourseForDetails.requiresDocument && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200">
                  <span className="font-bold block mb-1">ثبت سند پایان دوره: الزامی</span>
                  <p className="text-[11px]">{selectedCourseForDetails.documentInstructions || 'ارائه تصویر گواهی یا خلاصه دوره در پایان کارگاه الزامی است.'}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCourseForDetails(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                بستن
              </button>
              <button
                type="button"
                onClick={() => {
                  handleStartCourse(selectedCourseForDetails);
                  setSelectedCourseForDetails(null);
                }}
                className="px-5 py-2 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all cursor-pointer"
              >
                شرکت و ثبت‌نام در دوره
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal (Step 2) */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <form 
            onSubmit={handleCompleteCourse}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">گام دوم: خوداظهاری اتمام دوره</span>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{showCompletionModal.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCompletionModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {completionError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{completionError}</span>
              </div>
            )}

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs">
              <span className="font-bold block mb-1">تبریک بابت پیگیری و گذراندن دوره!</span>
              <span>با ثبت اتمام این دوره، <strong>+{showCompletionModal.score} امتیاز</strong> بلافاصله در رتبه‌بندی معنوی شما لحاظ می‌گردد.</span>
            </div>

            {/* Document Upload */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                بارگذاری سند یا تصویر گواهی پایان دوره {showCompletionModal.requiresDocument ? '(الزامی)' : '(اختیاری)'}
              </label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer border border-slate-300 dark:border-slate-700 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>{isUploading ? 'در حال بارگذاری...' : 'انتخاب تصویر / فایل سند'}</span>
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
                {uploadedDocName && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{uploadedDocName}</span>
                  </span>
                )}
              </div>
              {showCompletionModal.documentInstructions && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {showCompletionModal.documentInstructions}
                </p>
              )}
            </div>

            {/* Summary / Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                توضیحات، خلاصه مباحث یا یادداشت شما:
              </label>
              <textarea
                value={completionNotes}
                onChange={e => setCompletionNotes(e.target.value)}
                placeholder="خلاصه آموخته‌ها، نکات کلیدی یا توضیحات نحوه شرکت در دوره را اینجا بنویسید..."
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCompletionModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="px-6 py-2.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'در حال ثبت...' : `ثبت نهایی و دریافت +${showCompletionModal.score} امتیاز`}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
