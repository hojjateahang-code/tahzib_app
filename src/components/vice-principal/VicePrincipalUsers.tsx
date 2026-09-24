import React, { useState } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Users, 
  UserPlus, 
  Check, 
  X, 
  Edit, 
  Save, 
  Trash2, 
  FileSpreadsheet, 
  Search,
  UserCheck,
  ShieldAlert,
  Phone,
  Eye
} from 'lucide-react';
import { triggerSync, getSynchronizedTime } from '../../sync';
import type { User, Role } from '../../types';
import { UserImportExportModal } from '../common/UserImportExportModal';
import { ROLE_PERSIAN_TITLES } from '../../utils/excelUtils';
import { StudentDetailModal } from '../common/StudentDetailModal';
import { logger } from '../../lib/logger';

export function VicePrincipalUsers() {
  const rawUsers = useLiveQuery(() => db.users.toArray()) || [];
  const allUsers = rawUsers.filter(u => !u.isDeleted);
  
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | Role | 'MANAGEMENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewStudentId, setViewStudentId] = useState<string | null>(null);


  // Form states for single user creation
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newNationalId, setNewNationalId] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEitaaId, setNewEitaaId] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('STUDENT');
  const [newUserBase, setNewUserBase] = useState(1);

  // Edit states
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName.trim() || !newLastName.trim() || !newNationalId.trim()) {
      alert('لطفاً نام، نام خانوادگی و کد ملی را وارد نمایید.');
      return;
    }

    const fullName = `${newFirstName.trim()} ${newLastName.trim()}`.trim();
    const username = newNationalId.trim();
    const password = newPhone.trim() || username;

    let eitaaIdFormatted = newEitaaId.trim();
    if (eitaaIdFormatted && !eitaaIdFormatted.startsWith('@') && !eitaaIdFormatted.startsWith('user_')) {
      eitaaIdFormatted = `@${eitaaIdFormatted}`;
    }

    await db.users.add({
      id: crypto.randomUUID(),
      firstName: newFirstName.trim(),
      lastName: newLastName.trim(),
      name: fullName,
      role: newUserRole,
      base: (newUserRole === 'STUDENT' || newUserRole === 'MENTOR') ? newUserBase : undefined,
      username,
      password,
      nationalId: username,
      phone: newPhone.trim(),
      eitaaId: eitaaIdFormatted || undefined,
      isApproved: true
    });

    setNewFirstName('');
    setNewLastName('');
    setNewNationalId('');
    setNewPhone('');
    setNewEitaaId('');
    triggerSync();
  };

  const handleApproveStudent = async (id: string) => {
    await db.users.update(id, { isApproved: true });
    triggerSync();
  };

  const startEditing = (user: User) => {
    setEditingUserId(user.id);
    let fName = user.firstName || '';
    let lName = user.lastName || '';
    if (!fName && !lName && user.name) {
      const parts = user.name.trim().split(' ');
      fName = parts[0] || '';
      lName = parts.slice(1).join(' ') || '';
    }

    setEditForm({
      ...user,
      firstName: fName,
      lastName: lName
    });
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditForm({});
  };

  const saveEditing = async () => {
    if (!editingUserId) return;
    const fName = editForm.firstName || '';
    const lName = editForm.lastName || '';
    const fullName = `${fName} ${lName}`.trim() || editForm.name || 'کاربر';
    const now = getSynchronizedTime();

    await db.users.update(editingUserId, {
      firstName: fName,
      lastName: lName,
      name: fullName,
      username: editForm.username,
      password: editForm.password,
      nationalId: editForm.nationalId || editForm.username,
      phone: editForm.phone,
      eitaaId: editForm.eitaaId,
      role: editForm.role,
      base: (editForm.role === 'STUDENT' || editForm.role === 'MENTOR') ? editForm.base : undefined,
      updatedAt: now
    });

    logger.info('USER_MGMT', `اطلاعات کاربر ${fullName} (${editForm.username}) ویرایش شد.`, { userId: editingUserId, name: fullName, role: editForm.role });
    setEditingUserId(null);
    triggerSync();
  };

  const deleteUser = async (id: string) => {
    if (confirm('آیا از حذف این کاربر اطمینان دارید؟ تمام داده‌های مرتبط با او حذف خواهد شد.')) {
      const user = await db.users.get(id);
      const now = getSynchronizedTime();

      // Soft delete tombstone: mark as deleted with updated timestamp so merge keeps it deleted
      await db.users.update(id, {
        isDeleted: true,
        updatedAt: now
      });

      logger.warn('USER_MGMT', `کاربر ${user?.name || id} (${user?.username || ''}) حذف شد و برچسب ابطال ثبت گردید.`, {
        userId: id,
        name: user?.name,
        role: user?.role,
        tombstoneTimestamp: now
      });

      triggerSync();
    }
  };

  // Filter logic
  const filteredUsers = allUsers.filter(u => {
    if (selectedRoleFilter !== 'ALL') {
      if (selectedRoleFilter === 'MANAGEMENT') {
        if (u.role !== 'VICE_PRINCIPAL' && u.role !== 'DIRECTOR' && u.role !== 'TECH_ADMIN') {
          return false;
        }
      } else if (u.role !== selectedRoleFilter) {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchName = u.name?.toLowerCase().includes(q) || 
                        u.firstName?.toLowerCase().includes(q) || 
                        u.lastName?.toLowerCase().includes(q);
      const matchNationalId = u.nationalId?.includes(q) || u.username?.includes(q);
      const matchPhone = u.phone?.includes(q);
      const matchEitaa = u.eitaaId?.toLowerCase().includes(q);

      return matchName || matchNationalId || matchPhone || matchEitaa;
    }

    return true;
  });

  const pendingStudents = allUsers.filter(u => u.role === 'STUDENT' && !u.isApproved);

  const studentCount = allUsers.filter(u => u.role === 'STUDENT').length;
  const mentorCount = allUsers.filter(u => u.role === 'MENTOR').length;
  const counselorCount = allUsers.filter(u => u.role === 'COUNSELOR').length;
  const staffCount = allUsers.filter(u => u.role === 'VICE_PRINCIPAL' || u.role === 'DIRECTOR' || u.role === 'TECH_ADMIN').length;
  const techAdminCount = allUsers.filter(u => u.role === 'TECH_ADMIN').length;

  return (
    <div className="space-y-6">
      
      {/* نوار ابزار فوقانی و خلاصه‌ی آمار */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>مدیریت و ثبت اطلاعات طلاب، اساتید و کادر مدرسه</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              تعریف فیلدهای مجزای نام و نام خانوادگی، نقش‌ها و ورود دسته‌جمعی از فایل اکسل
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsExcelModalOpen(true)}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ثبت و ورود گروهی اکسل (ایمپورت / خروجی)</span>
          </button>
        </div>

        {/* کارت‌های آماری */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <button
            type="button"
            onClick={() => setSelectedRoleFilter('ALL')}
            className={`p-3.5 rounded-2xl border text-right transition cursor-pointer ${
              selectedRoleFilter === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <p className="text-[11px] font-medium opacity-80">کل افراد</p>
            <p className="text-lg font-black font-mono mt-0.5">{allUsers.length}</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRoleFilter('STUDENT')}
            className={`p-3.5 rounded-2xl border text-right transition cursor-pointer ${
              selectedRoleFilter === 'STUDENT'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <p className="text-[11px] font-medium opacity-80">طلاب</p>
            <p className="text-lg font-black font-mono mt-0.5">{studentCount}</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRoleFilter('MENTOR')}
            className={`p-3.5 rounded-2xl border text-right transition cursor-pointer ${
              selectedRoleFilter === 'MENTOR'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
            }`}
          >
            <p className="text-[11px] font-medium opacity-80">اساتید راهنما</p>
            <p className="text-lg font-black font-mono mt-0.5">{mentorCount}</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRoleFilter('COUNSELOR')}
            className={`p-3.5 rounded-2xl border text-right transition cursor-pointer ${
              selectedRoleFilter === 'COUNSELOR'
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-purple-50/60 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
            }`}
          >
            <p className="text-[11px] font-medium opacity-80">مشاورین</p>
            <p className="text-lg font-black font-mono mt-0.5">{counselorCount}</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRoleFilter('MANAGEMENT')}
            className={`p-3.5 rounded-2xl border text-right transition cursor-pointer col-span-2 sm:col-span-1 ${
              selectedRoleFilter === 'MANAGEMENT' || selectedRoleFilter === 'VICE_PRINCIPAL' || selectedRoleFilter === 'DIRECTOR'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-amber-50/60 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            }`}
          >
            <p className="text-[11px] font-medium opacity-80">مدیریت و معاونین</p>
            <p className="text-lg font-black font-mono mt-0.5">{staffCount}</p>
          </button>
        </div>
      </div>

      {/* بخش اصلی: فرم ثبت فردی + لیست کامل کاربران */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* فرم ثبت کاربر جدید دستی */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <span>ثبت فردی کاربر جدید</span>
          </h4>

          <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
            
            {/* دو فیلد مجزای نام و نام خانوادگی */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">نام *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلا: علی"
                  className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={newFirstName}
                  onChange={e => setNewFirstName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">نام خانوادگی *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلا: محمدی"
                  className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={newLastName}
                  onChange={e => setNewLastName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">نقش کاربری *</label>
              <select
                className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                value={newUserRole}
                onChange={e => setNewUserRole(e.target.value as Role)}
              >
                <option value="STUDENT">طلبه (دانش‌پژوه)</option>
                <option value="MENTOR">استاد راهنما (مسئول پایه)</option>
                <option value="COUNSELOR">استاد مشاور</option>
                <option value="VICE_PRINCIPAL">معاون تهذیب</option>
                <option value="DIRECTOR">مدیر مدرسه</option>
                <option value="TECH_ADMIN">مسئول فنی (مدیر سیستم)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">کد ملی (نام کاربری) *</label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  placeholder="1234567890"
                  className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={newNationalId}
                  onChange={e => setNewNationalId(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">شماره تماس (رمز عبور)</label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="09123456789"
                  className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                />
              </div>
            </div>

            {(newUserRole === 'STUDENT' || newUserRole === 'MENTOR') && (
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">پایه تحصیلی</label>
                <select
                  className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={newUserBase}
                  onChange={e => setNewUserBase(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6].map(b => (
                    <option key={b} value={b}>پایه {b}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">آیدی ایتا (اختیاری)</label>
              <input
                type="text"
                dir="ltr"
                placeholder="@username"
                className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                value={newEitaaId}
                onChange={e => setNewEitaaId(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>ثبت کاربر در سیستم</span>
            </button>
          </form>

          {/* لیست در انتظار تایید */}
          {pendingStudents.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <h5 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>ثبت‌نام‌های آنلاین در انتظار تایید ({pendingStudents.length})</span>
              </h5>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {pendingStudents.map(student => (
                  <div key={student.id} className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{student.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">کد ملی: {student.nationalId || student.username} | پایه {student.base || 1}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApproveStudent(student.id)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] transition cursor-pointer"
                    >
                      تایید عضویت
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* لیست و جدول کامل کاربران */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>لیست کاربران ثبت‌شده</span>
              <span className="text-xs text-slate-500 font-normal font-mono">({filteredUsers.length} مورد)</span>
            </h4>

            {/* فیلتر نقش و باکس جستجو */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <select
                value={selectedRoleFilter}
                onChange={e => setSelectedRoleFilter(e.target.value as any)}
                className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
              >
                <option value="ALL">همه نقش‌ها ({allUsers.length})</option>
                <option value="STUDENT">طلاب ({studentCount})</option>
                <option value="MENTOR">اساتید راهنما ({mentorCount})</option>
                <option value="COUNSELOR">مشاورین ({counselorCount})</option>
                <option value="MANAGEMENT">مدیریت و معاونین ({staffCount})</option>
                <option value="DIRECTOR">فقط مدیر مدرسه</option>
                <option value="VICE_PRINCIPAL">فقط معاون تهذیب</option>
                <option value="TECH_ADMIN">مسئول فنی ({techAdminCount})</option>
              </select>

              <div className="relative w-full sm:w-52">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="جستجوی نام، کد ملی..."
                  className="pr-9 pl-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs w-full focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* لیست کاربران */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-xs text-slate-500">
                هیچ کاربری با این مشخصات یا نقش یافت نشد.
              </div>
            ) : (
              filteredUsers.map(user => {
                const isEditing = editingUserId === user.id;

                let fName = user.firstName || '';
                let lName = user.lastName || '';
                if (!fName && !lName && user.name) {
                  const parts = user.name.trim().split(' ');
                  fName = parts[0] || '';
                  lName = parts.slice(1).join(' ') || '';
                }

                return (
                  <div key={user.id} className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl transition-all">
                    {isEditing ? (
                      /* فرم ویرایش آنلاین */
                      <div className="space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-0.5">نام</label>
                            <input
                              type="text"
                              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900"
                              value={editForm.firstName || ''}
                              onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-0.5">نام خانوادگی</label>
                            <input
                              type="text"
                              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900"
                              value={editForm.lastName || ''}
                              onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-0.5">کد ملی</label>
                            <input
                              type="text"
                              dir="ltr"
                              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-mono bg-white dark:bg-slate-900"
                              value={editForm.nationalId || editForm.username || ''}
                              onChange={e => setEditForm({ ...editForm, nationalId: e.target.value, username: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-0.5">شماره تماس</label>
                            <input
                              type="text"
                              dir="ltr"
                              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-mono bg-white dark:bg-slate-900"
                              value={editForm.phone || ''}
                              onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-0.5">آیدی ایتا</label>
                            <input
                              type="text"
                              dir="ltr"
                              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-mono bg-white dark:bg-slate-900"
                              value={editForm.eitaaId || ''}
                              onChange={e => setEditForm({ ...editForm, eitaaId: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-0.5">نقش</label>
                            <select
                              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900 font-bold"
                              value={editForm.role || 'STUDENT'}
                              onChange={e => setEditForm({ ...editForm, role: e.target.value as Role })}
                            >
                              <option value="STUDENT">طلبه</option>
                              <option value="MENTOR">استاد راهنما</option>
                              <option value="COUNSELOR">مشاور</option>
                              <option value="VICE_PRINCIPAL">معاون تهذیب</option>
                              <option value="DIRECTOR">مدیر مدرسه</option>
                              <option value="TECH_ADMIN">مسئول فنی</option>
                            </select>
                          </div>

                          {(editForm.role === 'STUDENT' || editForm.role === 'MENTOR') && (
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5">پایه</label>
                              <select
                                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900"
                                value={editForm.base || 1}
                                onChange={e => setEditForm({ ...editForm, base: Number(e.target.value) })}
                              >
                                {[1, 2, 3, 4, 5, 6].map(b => (
                                  <option key={b} value={b}>پایه {b}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={saveEditing}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>ذخیره تغییرات</span>
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="px-3 py-1.5 bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>انصراف</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* نمایش عادی کارت کاربر با تفکیک فیلدها */
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {user.role === 'STUDENT' ? (
                              <button
                                type="button"
                                onClick={() => setViewStudentId(user.id)}
                                className="font-black text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                                title="مشاهده کارنامه و وضعیت کامل طلبه"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{fName} {lName}</span>
                              </button>
                            ) : (
                              <span className="font-black text-sm text-slate-800 dark:text-slate-100">
                                {fName} {lName}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                              {ROLE_PERSIAN_TITLES[user.role] || user.role}
                              {(user.role === 'STUDENT' || user.role === 'MENTOR') && user.base ? ` (پایه ${user.base})` : ''}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                            <span>کد ملی: <strong className="text-slate-700 dark:text-slate-200">{user.nationalId || user.username || '—'}</strong></span>
                            <span>
                              همراه:{' '}
                              {user.phone ? (
                                <a
                                  href={`tel:${user.phone.replace(/[^0-9+]/g, '')}`}
                                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                                  title="تماس تلفنی"
                                >
                                  <Phone className="w-3 h-3 text-emerald-600" />
                                  <span>{user.phone}</span>
                                </a>
                              ) : (
                                <strong className="text-slate-700 dark:text-slate-200">—</strong>
                              )}
                            </span>
                            {user.eitaaId && (
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold dir-ltr">
                                ایتا: {user.eitaaId}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => startEditing(user)}
                            className="p-2 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-600 dark:text-slate-300 hover:text-emerald-600 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
                            title="ویرایش کاربر"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteUser(user.id)}
                            className="p-2 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-600 dark:text-slate-300 hover:text-rose-600 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
                            title="حذف کاربر"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

      {/* مدال ورود و خروجی اکسل */}
      <UserImportExportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        existingUsers={allUsers}
      />

      {/* مدال نمایش کامل وضعیت و کارنامه طلبه */}
      <StudentDetailModal
        studentId={viewStudentId}
        onClose={() => setViewStudentId(null)}
      />

    </div>
  );
}

