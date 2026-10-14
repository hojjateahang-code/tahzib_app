import React, { useState, useMemo } from 'react';
import { useAuth } from '../../store';
import { db } from '../../db';
import { triggerSync } from '../../sync';
import { User as UserIcon, Save, KeyRound, Eye, EyeOff } from 'lucide-react';
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { parseSafeBirthDate } from '../../utils/date';

export function StudentProfile() {
  const { currentUser, setCurrentUser } = useAuth();
  const [showPassVisible, setShowPassVisible] = useState(false);
  
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    nationalId: currentUser?.nationalId || '',
    fatherName: currentUser?.fatherName || '',
    birthDate: currentUser?.birthDate || '',
    phone: currentUser?.phone || '',
    emergencyPhone: currentUser?.emergencyPhone || '',
    address: currentUser?.address || '',
    eitaaId: currentUser?.eitaaId || '',
    profileImage: currentUser?.profileImage || ''
  });
  
  const [success, setSuccess] = useState(false);

  // local change password logic inside profile
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const safeBirthDate = useMemo(() => {
    return parseSafeBirthDate(formData.birthDate);
  }, [formData.birthDate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profileImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    await db.users.update(currentUser.id, formData);
    setCurrentUser({ ...currentUser, ...formData });
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    triggerSync();
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newPassword) return;
    if (newPassword !== confirmPassword) {
      alert('رمز عبور و تکرار آن مطابقت ندارند.');
      return;
    }
    if (newPassword.length < 6) {
      alert('رمز عبور باید حداقل ۶ کاراکتر باشد.');
      return;
    }
    await db.users.update(currentUser.id, { password: newPassword });
    setCurrentUser({ ...currentUser, password: newPassword });
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    alert('رمز عبور با موفقیت تغییر کرد.');
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
        <UserIcon className="w-5 h-5 text-emerald-600" />
        پروفایل من
      </h3>
      
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex flex-col items-center gap-4 shrink-0">
          <div className="w-32 h-32 rounded-3xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden">
            {formData.profileImage ? (
              <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            )}
          </div>
          <label className="cursor-pointer bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors">
            انتخاب تصویر
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </label>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">نام و نام خانوادگی</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">کد ملی</label>
              <input type="text" name="nationalId" value={formData.nationalId} onChange={handleChange} dir="ltr" className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">نام پدر</label>
              <input type="text" name="fatherName" value={formData.fatherName} onChange={handleChange} className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">تاریخ تولد</label>
              <DatePicker 
                calendar={persian} 
                locale={persian_fa} 
                value={safeBirthDate}
                onChange={(dateObject) => {
                  if (dateObject && typeof (dateObject as any).toDate === 'function') {
                    try {
                      const d = (dateObject as any).toDate();
                      if (!isNaN(d.getTime())) {
                        setFormData(prev => ({ ...prev, birthDate: d.toISOString().split('T')[0] }));
                      }
                    } catch {
                      setFormData(prev => ({ ...prev, birthDate: '' }));
                    }
                  } else {
                    setFormData(prev => ({ ...prev, birthDate: '' }));
                  }
                }}
                inputClass="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-right font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800"
                containerStyle={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">شماره تماس (خود شخص)</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} dir="ltr" className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">تلفن ضروری (منزل/پدر)</label>
              <input type="tel" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange} dir="ltr" className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">آیدی ایتا</label>
              <input type="text" name="eitaaId" value={formData.eitaaId} onChange={handleChange} dir="ltr" placeholder="@username" className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">آدرس منزل</label>
              <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none" required></textarea>
            </div>
          </div>
          
          <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="submit" className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <Save className="w-5 h-5" /> ذخیره تغییرات
            </button>
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-3 px-6 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700">
              <KeyRound className="w-5 h-5" /> تغییر رمز
            </button>
          </div>
          {success && <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold text-center bg-emerald-50 dark:bg-emerald-950/50 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800">پروفایل با موفقیت بروزرسانی شد.</p>}
        </form>
      </div>

      {showPassword && (
        <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-8">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-600" />
            تغییر رمز عبور
          </h4>
          <form onSubmit={handlePasswordChange} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="relative">
              <input 
                type={showPassVisible ? "text" : "password"} 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                placeholder="رمز جدید..." 
                dir="ltr" 
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl p-3 pl-10 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassVisible(!showPassVisible)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPassVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <input 
                type={showPassVisible ? "text" : "password"} 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                placeholder="تکرار رمز جدید..." 
                dir="ltr" 
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl p-3 pl-10 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassVisible(!showPassVisible)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPassVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button type="submit" className="bg-slate-800 dark:bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-700 dark:hover:bg-indigo-700 transition-colors cursor-pointer">ثبت رمز جدید</button>
          </form>
        </div>
      )}
    </div>
  );
}
