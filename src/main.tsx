// Polyfill for crypto.randomUUID in non-secure HTTP / older browser / WebView contexts
if (typeof globalThis !== 'undefined') {
  if (!(globalThis as any).crypto) {
    (globalThis as any).crypto = {};
  }
  if (typeof (globalThis as any).crypto.randomUUID !== 'function') {
    (globalThis as any).crypto.randomUUID = function safeRandomUUID(): string {
      try {
        if ((globalThis as any).crypto && typeof (globalThis as any).crypto.getRandomValues === 'function') {
          const bytes = new Uint8Array(16);
          (globalThis as any).crypto.getRandomValues(bytes);
          bytes[6] = (bytes[6] & 0x0f) | 0x40;
          bytes[8] = (bytes[8] & 0x3f) | 0x80;
          const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
          return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        }
      } catch (e) {
        // Fallback below
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
  }
}

import React, { Component, StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './store.tsx';
import { seedDatabase } from './db.ts';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  handleReset = async () => {
    try {
      localStorage.clear();
      const databases = await window.indexedDB.databases();
      for (const db of databases) {
        if (db.name) window.indexedDB.deleteDatabase(db.name);
      }
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center font-sans" dir="rtl">
          <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-200 max-w-md w-full">
            <h2 className="text-xl font-bold text-rose-600 mb-4">خطا در بارگذاری برنامه</h2>
            <p className="text-slate-600 mb-6 text-sm leading-relaxed">
              مشکلی در بارگذاری پایگاه داده یا ساختار برنامه پیش آمده است. برای رفع مشکل، لطفاً برنامه را بازنشانی کنید. (ممکن است لازم باشد دوباره وارد شوید)
            </p>
            <button
              onClick={this.handleReset}
              className="bg-rose-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-rose-700 transition-colors w-full"
            >
              بازنشانی و شروع مجدد
            </button>
            <p className="text-xs text-slate-400 mt-4 font-mono break-all text-left dir-ltr">
              {this.state.error?.toString()}
            </p>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

function Root() {
  useEffect(() => {
    seedDatabase().catch(console.error);
    
    // یکپارچگی با مینی‌اپلیکیشن ایتا / تلگرام
    const eitaaOrTg = (window as any).Eitaa?.WebApp || (window as any).Telegram?.WebApp;
    if (eitaaOrTg) {
      try {
        eitaaOrTg.ready(); // اعلام آمادگی به پیام‌رسان
        eitaaOrTg.expand(); // باز کردن برنامه در حالت تمام‌صفحه
        eitaaOrTg.enableClosingConfirmation(); // فعال‌سازی پیام اخطار هنگام بستن تصادفی برنامه
      } catch (e) {
        console.error('Error initializing Mini App:', e);
      }
    }
    
    // ثبت Service Worker برای PWA و Push Notifications
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
          console.log('SW registration failed: ', err);
        });
      });
    }
  }, []);

  return (
    <StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);

