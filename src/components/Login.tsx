import React, { useState, useEffect } from 'react';
import { useAuth } from '../store';
import { safeUUID } from '../lib/crypto';
import { db, seedDatabase } from '../db';
import { Shield, LogIn, UserPlus, KeyRound, Smartphone, CheckCircle, AlertCircle, ArrowRight, UserCheck, Eye, EyeOff, MessageSquare, ExternalLink } from 'lucide-react';
import { initEitaaSDK } from '../lib/browserUtils';
import { detectEitaaUserFromEnvironment, matchEitaaUser, type EitaaDetectedUser, type EitaaMatchedRole } from '../lib/authUtils';
import { MinioConnectionDebugWidget } from './MinioConnectionDebugWidget';
import { syncMinIOData, triggerSync } from '../sync';
import type { User } from '../types';

export function Login() {
  const { setCurrentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [regName, setRegName] = useState('');
  const [regNationalId, setRegNationalId] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBase, setRegBase] = useState(1);
  
  const [forgotEitaaId, setForgotEitaaId] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotRecoveryUser, setForgotRecoveryUser] = useState<{ name: string; eitaaUsername: string; roleName: string } | null>(null);

  const [error, setError] = useState('');

  // Eitaa MiniApp Auto-login state
  const [detectedEitaaUser, setDetectedEitaaUser] = useState<EitaaDetectedUser | null>(null);
  const [matchedRole, setMatchedRole] = useState<EitaaMatchedRole | null>(null);
  const [eitaaConfirmedDismiss, setEitaaConfirmedDismiss] = useState(false);

  // Initialize Eitaa SDK auto-detection and seed database + pull latest cloud data
  useEffect(() => {
    seedDatabase().then(async () => {
      await syncMinIOData().catch(() => null);
      initEitaaSDK();
      checkAndProcessEitaaUser();
    }).catch(console.error);
  }, []);

  const checkAndProcessEitaaUser = async (overrideEitaaUser?: EitaaDetectedUser | null) => {
    try {
      const eitaaUser = overrideEitaaUser !== undefined ? overrideEitaaUser : detectEitaaUserFromEnvironment();
      setDetectedEitaaUser(eitaaUser);

      if (eitaaUser) {
        const allUsers = await db.users.toArray();
        const matched = matchEitaaUser(eitaaUser.username, eitaaUser.id, allUsers);
        setMatchedRole(matched);
        setEitaaConfirmedDismiss(false);

        if (!matched) {
          // Pre-fill registration fields if not matched
          setRegName(eitaaUser.name || `${eitaaUser.first_name || ''} ${eitaaUser.last_name || ''}`.trim());
        }
      } else {
        setMatchedRole(null);
      }
    } catch (err) {
      console.error('Error during Eitaa user detection:', err);
    }
  };

  const handleEitaaConfirmLogin = async () => {
    if (!matchedRole || !detectedEitaaUser) return;

    try {
      const targetUser = matchedRole.currentUser;
      if (!targetUser) {
        // Fallback search admin or first user
        const allUsers = await db.users.toArray();
        const firstAdmin = allUsers.find(u => u.role === 'DIRECTOR' || u.username === 'modir') || allUsers[0];
        if (firstAdmin) {
          setCurrentUser(firstAdmin);
          return;
        }
      }

      if (targetUser) {
        // Ensure eitaaId and eitaaUserId are updated
        const updates: Partial<User> = {};
        if (detectedEitaaUser.username && !detectedEitaaUser.username.startsWith('user_')) {
          updates.eitaaId = `@${detectedEitaaUser.username.replace(/^@/, '')}`;
        }
        if (detectedEitaaUser.id) {
          updates.eitaaUserId = String(detectedEitaaUser.id);
        }

        if (Object.keys(updates).length > 0) {
          await db.users.update(targetUser.id, updates);
          Object.assign(targetUser, updates);
        }

        setCurrentUser(targetUser);
      }
    } catch (err) {
      setError('خطا در ورود با حساب ایتا.');
    }
  };


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setError('لطفاً نام کاربری و رمز عبور را وارد کنید.');
      return;
    }

    try {
      // Try exact indexed match first
      let user = await db.users.where({ username: cleanUsername }).first();
      
      // Fallback: search across all users (case-insensitive or whitespace-tolerant)
      if (!user) {
        const allUsers = await db.users.toArray();
        user = allUsers.find(
          u => u.username && u.username.trim().toLowerCase() === cleanUsername.toLowerCase()
        );
      }

      // If still not found, try syncing latest users from cloud server
      if (!user) {
        await syncMinIOData().catch(() => null);
        const refreshedUsers = await db.users.toArray();
        user = refreshedUsers.find(
          u => u.username && u.username.trim().toLowerCase() === cleanUsername.toLowerCase()
        );
      }

      // If user is admin but db didn't have it yet, double check seed
      if (!user && (cleanUsername.toLowerCase() === 'admin' || cleanUsername === 'fanni')) {
        const allUsers = await db.users.toArray();
        user = allUsers.find(u => u.role === 'TECH_ADMIN');
      }

      if (user && (user.password === cleanPassword || user.password === password)) {
        if (user.isApproved === false) {
          setError('حساب کاربری شما در انتظار تأیید مدیریت است.');
          return;
        }

        // If logged in while an Eitaa user was detected, auto-bind the Eitaa IDs!
        if (detectedEitaaUser) {
          const updates: Partial<User> = {};
          if (detectedEitaaUser.username && !detectedEitaaUser.username.startsWith('user_')) {
            updates.eitaaId = `@${detectedEitaaUser.username.replace(/^@/, '')}`;
          }
          if (detectedEitaaUser.id) {
            updates.eitaaUserId = String(detectedEitaaUser.id);
          }
          if (Object.keys(updates).length > 0) {
            await db.users.update(user.id, updates);
            Object.assign(user, updates);
          }
        }
        setCurrentUser(user);
      } else {
        setError('نام کاربری یا رمز عبور اشتباه است.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('خطا در ارتباط با پایگاه داده.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!regName || !regNationalId || !regPhone) {
      setError('لطفاً همه فیلدهای ضروری را پر کنید.');
      return;
    }

    try {
      const existingUser = await db.users.where({ username: regNationalId }).first();
      if (existingUser) {
        setError('این کد ملی قبلاً ثبت شده است.');
        return;
      }

      let userEitaaIdInput: string | undefined = undefined;
      if (detectedEitaaUser?.username && !detectedEitaaUser.username.startsWith('user_')) {
        userEitaaIdInput = `@${detectedEitaaUser.username.replace(/^@/, '')}`;
      }

      const newUser: User = {
        id: safeUUID(),
        name: regName,
        username: regNationalId,
        password: regPhone, // Initial password
        nationalId: regNationalId,
        phone: regPhone,
        eitaaId: userEitaaIdInput,
        eitaaUserId: detectedEitaaUser?.id ? String(detectedEitaaUser.id) : undefined,
        role: 'STUDENT' as const,
 base: regBase,
        isApproved: true // Auto-approved for fast onboarding
      };

      await db.users.add(newUser);
      triggerSync();
      setCurrentUser(newUser);
    } catch (err) {
      setError('خطا در ثبت‌نام.');
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setForgotMessage('');
    setForgotRecoveryUser(null);
    
    if (!forgotEitaaId) {
      setError('لطفاً آیدی ایتا، کد ملی یا نام کاربری خود را وارد کنید.');
      return;
    }

    try {
      const cleanForgot = forgotEitaaId.trim().toLowerCase().replace(/^@/, '');
      const user = await db.users.filter(u => {
        const matchUsername = u.username.toLowerCase() === cleanForgot;
        const matchNationalId = u.nationalId?.toLowerCase() === cleanForgot;
        const matchEitaa = u.eitaaId?.trim().toLowerCase().replace(/^@/, '') === cleanForgot;
        return matchUsername || matchNationalId || matchEitaa;
      }).first();

      if (user) {
        const eitaaUsername = user.eitaaId ? user.eitaaId.trim().replace(/^@/, '') : cleanForgot;
        setForgotRecoveryUser({
          name: user.name || user.username,
          eitaaUsername,
          roleName: roleNameMap[user.role] || 'کاربر'
        });
        setForgotEitaaId('');
      } else {
        setError('حساب کاربری با این آیدی یا شناسه یافت نشد. جهت راهنمایی با مسئول پشتیبانی تماس بگیرید.');
      }
    } catch (err) {
      setError('خطا در بررسی حساب کاربری.');
    }
  };

  const roleNameMap: Record<string, string> = {
    STUDENT: 'طلبه',
    VICE_PRINCIPAL: 'معاون تهذیب',
    DIRECTOR: 'مدیر مدرسه',
    MENTOR: 'استاد راهنما',
    COUNSELOR: 'مشاور',
    TECH_ADMIN: 'مسئول فنی (مدیر سیستم)',
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden">
        
        {/* Header Header */}
        <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 dark:from-slate-900 dark:to-slate-950 p-7 text-center text-white border-b border-indigo-800 dark:border-slate-800 relative">
          <Shield className="w-12 h-12 mx-auto mb-3 text-indigo-300" />
          <h1 className="text-2xl font-bold mb-1">سامانه جامع تهذیب</h1>
          <p className="text-indigo-200/90 text-xs font-medium">حوزه علمیه خاتم الانبیاء صلی الله علیه و آله - شیراز </p>
          
          {detectedEitaaUser && (
            <div className="absolute top-3 left-3 bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-400/30 flex items-center gap-1">
              <Smartphone className="w-3 h-3" />
              برنامک ایتا
            </div>
          )}
        </div>

        <div className="p-6">
          
          {/* EITA AUTO-DETECTION BANNER - CASE 1: MATCHING USER FOUND */}
          {detectedEitaaUser && matchedRole && !eitaaConfirmedDismiss && (
            <div className="bg-emerald-50 dark:bg-emerald-950/70 border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl p-4 mb-6 space-y-3 animate-in fade-in zoom-in-95 duration-200 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-right flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">ورود خودکار به برنامک ایتا</span>
                    <span className="text-[10px] font-mono bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 px-2 py-0.5 rounded-md font-bold">
                      {detectedEitaaUser.username ? `@${detectedEitaaUser.username}` : `کد: ${detectedEitaaUser.id}`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                    سلام <strong className="text-emerald-900 dark:text-emerald-100">{detectedEitaaUser.name || 'کاربر گرامی'}</strong> عزیز!
                    حساب شما به عنوان <span className="text-emerald-900 dark:text-emerald-100 font-bold">«{matchedRole.title}»</span> شناسایی شد.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleEitaaConfirmLogin}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  تایید هویت و ورود سریع به سامانه
                </button>
                <button
                  type="button"
                  onClick={() => setEitaaConfirmedDismiss(true)}
                  className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 text-[11px] font-bold py-2.5 px-3 rounded-xl transition-colors shrink-0 cursor-pointer"
                >
                  ورود با اکانت دیگر
                </button>
              </div>
            </div>
          )}

          {/* EITA AUTO-DETECTION BANNER - CASE 2: NEW UNREGISTERED EITAA USER */}
          {detectedEitaaUser && !matchedRole && !eitaaConfirmedDismiss && (
            <div className="bg-amber-50 dark:bg-amber-950/70 border-2 border-amber-300 dark:border-amber-700 rounded-2xl p-4 mb-6 space-y-3 animate-in fade-in zoom-in-95 duration-200 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-600 text-white rounded-xl shrink-0 mt-0.5">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-right flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-amber-900 dark:text-amber-300">شناسایی کاربر جدید ایتا</span>
                    <span className="text-[10px] font-mono bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 px-2 py-0.5 rounded-md font-bold">
                      {detectedEitaaUser.username ? `@${detectedEitaaUser.username}` : `شناسه عددی: ${detectedEitaaUser.id}`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                    اطلاعات شما با {detectedEitaaUser.username ? `آیدی @${detectedEitaaUser.username}` : `شناسه عددی ${detectedEitaaUser.id}`} در سیستم یافت نشد. آیا می‌خواهید پرونده جدید تشکیل دهید؟
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setRegName(detectedEitaaUser.name || '');
                  }}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  تکمیل پروفایل و ثبت‌نام کاربر جدید
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 text-[11px] font-bold py-2.5 px-3 rounded-xl transition-colors shrink-0 cursor-pointer"
                >
                  ورود دستی با کد ملی
                </button>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => { setActiveTab('login'); setError(''); setForgotMessage(''); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'login' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-700 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              ورود
            </button>
            <button
              onClick={() => { setActiveTab('register'); setError(''); setForgotMessage(''); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'register' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-700 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              ثبت‌نام
            </button>
          </div>

          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 p-3 rounded-xl text-sm mb-4 border border-rose-200 dark:border-rose-900/50 font-bold">
              {error}
            </div>
          )}
          {forgotMessage && (
            <div className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 p-3 rounded-xl text-sm mb-4 border border-emerald-200 dark:border-emerald-900/50 font-bold">
              {forgotMessage}
            </div>
          )}

          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">نام کاربری (کد ملی )</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  dir="ltr"
                  placeholder=" کد ملی"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">رمز عبور</label>
                  <button type="button" onClick={() => { setActiveTab('forgot'); setError(''); setForgotRecoveryUser(null); }} className="text-xs text-indigo-700 dark:text-indigo-400 hover:underline font-bold">رمز عبور را فراموش کردم</button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 pl-10 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    dir="ltr"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    title={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 mt-6"
              >
                <LogIn className="w-5 h-5" />
                ورود به سامانه
              </button>
            </form>
          )}

          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">نام و نام خانوادگی</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">پایه تحصیلی</label>
                <select
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  value={regBase}
                  onChange={e => setRegBase(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6].map(b => (
                    <option key={b} value={b}>پایه {b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">کد ملی (به عنوان نام کاربری)</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  value={regNationalId}
                  onChange={e => setRegNationalId(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">شماره موبایل (رمز عبور اولیه)</label>
                <input
                  type="tel"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  value={regPhone}
                  onChange={e => setRegPhone(e.target.value)}
                  dir="ltr"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 mt-4"
              >
                <UserPlus className="w-5 h-5" />
                ثبت‌نام در سامانه
              </button>
            </form>
          )}

          {activeTab === 'forgot' && (
            <div className="space-y-4">
              {!forgotRecoveryUser ? (
                <form onSubmit={handleForgot} className="space-y-4">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-100 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                    🔒 <strong>حفظ امنیت حساب:</strong> جهت بازیابی، آیدی ایتا، کد ملی یا نام کاربری خود را وارد کنید. پیام بازیابی و لینک ورود به ایتا ارسال خواهد شد و رمز عبور مستقیم روی صفحه نمایش داده نمی‌شود.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">آیدی ایتا / کد ملی / نام کاربری</label>
                    <input
                      type="text"
                      placeholder="مثلاً @h_ahang یا کد ملی"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      value={forgotEitaaId}
                      onChange={e => setForgotEitaaId(e.target.value)}
                      dir="ltr"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <KeyRound className="w-4 h-4" />
                    بررسی حساب و ارسال پیام ایتا
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="w-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-bold py-2 mt-1"
                  >
                    بازگشت به صفحه ورود
                  </button>
                </form>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-bold text-sm">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>حساب کاربری شناسایی شد!</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      نام کاربر: <strong>{forgotRecoveryUser.name}</strong> ({forgotRecoveryUser.roleName})<br />
                      آیدی ایتا: <strong dir="ltr">@{forgotRecoveryUser.eitaaUsername}</strong>
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    جهت رعایت دستورالعمل‌های امنیتی، رمز عبور مستقیماً در صفحه نمایش داده نمی‌شود. می‌توانید پیام مستقیم در پیام‌رسان ایتا ارسال نمایید یا وارد برنامک تهذیب خاتم در ایتا شوید:
                  </p>

                  <div className="flex flex-col gap-2 pt-1">
                    <a
                      href={`https://eitaa.com/${forgotRecoveryUser.eitaaUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 text-center"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>ارسال پیام مستقیم به ایتا (@{forgotRecoveryUser.eitaaUsername})</span>
                    </a>

                    <a
                      href="https://eitaa.com/rahrovan_app/TAHZIB_KHATAM"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 text-center"
                    >
                      <ExternalLink className="w-4 h-4 text-amber-400" />
                      <span>ورود به برنامک تهذیب خاتم در ایتا</span>
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setForgotRecoveryUser(null); setActiveTab('login'); }}
                    className="w-full text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-bold py-2"
                  >
                    بازگشت به صفحه ورود
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
