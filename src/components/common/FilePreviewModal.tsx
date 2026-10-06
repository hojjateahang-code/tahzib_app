import React, { useState } from 'react';
import { MessageAttachment } from '../../types';
import { 
  X, Download, ExternalLink, FileText, ImageIcon, Film, Music, 
  File, Eye, ZoomIn, ZoomOut, Volume2, Play, Check 
} from 'lucide-react';

interface FilePreviewModalProps {
  attachment: MessageAttachment | null;
  onClose: () => void;
}

export function FilePreviewModal({ attachment, onClose }: FilePreviewModalProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  if (!attachment) return null;

  // Detect mime or extension
  const isImage = attachment.type === 'IMAGE' || attachment.url?.startsWith('data:image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(attachment.name);
  const isVideo = attachment.type === 'VIDEO' || attachment.url?.startsWith('data:video/') || /\.(mp4|webm|mov|mkv)$/i.test(attachment.name);
  const isAudio = attachment.type === 'AUDIO' || attachment.url?.startsWith('data:audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(attachment.name);
  const isPdf = attachment.url?.startsWith('data:application/pdf') || /\.pdf$/i.test(attachment.name);

  // Helper to open file in new tab (handling data URLs cleanly via Blob)
  const handleOpenExternal = () => {
    try {
      if (attachment.url.startsWith('data:')) {
        const arr = attachment.url.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } else {
        window.open(attachment.url, '_blank');
      }
    } catch (err) {
      console.error('Error opening file:', err);
      // Fallback direct open
      window.open(attachment.url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto dir-rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:px-6 bg-slate-900 text-white flex items-center justify-between gap-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
              {isImage && <ImageIcon className="w-5 h-5" />}
              {isVideo && <Film className="w-5 h-5" />}
              {isAudio && <Music className="w-5 h-5" />}
              {!isImage && !isVideo && !isAudio && <FileText className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-white truncate dir-ltr text-right">
                {attachment.name}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium dir-ltr text-right">
                {attachment.size || 'فایل عمومی'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenExternal}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border border-slate-700"
              title="باز کردن در پنجره مجزا / برنامه سیستم"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">باز کردن کامل</span>
            </button>
            <a
              href={attachment.url}
              download={attachment.name}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>دانلود</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-all mr-2"
              title="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-auto flex items-center justify-center bg-slate-950/5 dark:bg-slate-950/50 min-h-[300px]">
          {/* IMAGE VIEWER */}
          {isImage && (
            <div className="flex flex-col items-center justify-center w-full h-full space-y-3">
              <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 p-1.5 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
                  className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-bold"
                  title="بزرگ‌نمایی"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 px-2">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                  className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-bold"
                  title="کوچک‌نمایی"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="text-[11px] font-bold text-emerald-600 px-2 py-1 hover:underline"
                >
                  اندازه اصلی
                </button>
              </div>

              <div className="overflow-auto max-w-full max-h-[60vh] flex items-center justify-center p-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 shadow-inner">
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                  className="transition-transform duration-200 max-h-[55vh] object-contain rounded-lg"
                />
              </div>
            </div>
          )}

          {/* VIDEO PLAYER */}
          {isVideo && (
            <div className="w-full max-w-3xl flex flex-col items-center">
              <video
                controls
                autoPlay
                src={attachment.url}
                className="w-full max-h-[65vh] rounded-2xl shadow-xl border border-slate-800 bg-black"
              />
            </div>
          )}

          {/* AUDIO PLAYER */}
          {isAudio && (
            <div className="w-full max-w-lg bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <Music className="w-10 h-10 animate-pulse" />
              </div>

              <div className="space-y-1 w-full">
                <h4 className="font-bold text-slate-800 dark:text-white text-base truncate dir-ltr">
                  {attachment.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">پخش‌کننده صوتی آنلاین</p>
              </div>

              <audio
                controls
                autoPlay
                src={attachment.url}
                className="w-full mt-2"
              />
            </div>
          )}

          {/* PDF EMBED OR DOCUMENT CARD */}
          {!isImage && !isVideo && !isAudio && (
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              {isPdf ? (
                <div className="w-full h-[60vh] flex flex-col rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md">
                  <iframe
                    src={attachment.url}
                    title={attachment.name}
                    className="w-full flex-1 bg-white"
                  />
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-md w-full text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shadow-inner">
                    <FileText className="w-10 h-10" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 dark:text-white text-base truncate dir-ltr">
                      {attachment.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      حجم: {attachment.size || 'نامشخص'}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    برای مشاهده کامل این سند، می‌توانید آن را دانلود کرده یا از طریق دکمه زیر در برنامه‌های اختصاصی دستگاه خود باز کنید.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      onClick={handleOpenExternal}
                      className="flex-1 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      باز کردن در برنامه
                    </button>
                    <a
                      href={attachment.url}
                      download={attachment.name}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      دانلود فایل
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs flex justify-between items-center border-t border-slate-200 dark:border-slate-800 shrink-0 font-medium">
          <span>پشتیبانی از فرمت‌های چندرسانه‌ای و اسناد</span>
          <button
            onClick={onClose}
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 font-bold"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
}
