const fs = require('fs');
let code = fs.readFileSync('src/components/Login.tsx', 'utf8');

code = code.replace(
  /const handleLogin = async \(e: React\.FormEvent\) => \{/,
  `const loginAsDemo = async (u: string) => {
    setUsername(u);
    setPassword('123');
    try {
      const user = await db.users.where({ username: u }).first();
      if (user && user.password === '123') {
        setCurrentUser(user);
      } else {
        setError('کاربر یافت نشد.');
      }
    } catch (err) {
      setError('خطا در ارتباط با پایگاه داده.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {`
);

code = code.replace(
  /<div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-xs text-amber-800 mb-4 space-y-2 leading-relaxed">[\s\S]*?<\/div>/,
  `<div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-xs text-amber-800 mb-4 space-y-3 leading-relaxed">
                <p><strong>ورود سریع دمو (با یک کلیک):</strong></p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => loginAsDemo('modir')} className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl font-bold transition-colors border border-amber-200">مدیر مدرسه</button>
                  <button type="button" onClick={() => loginAsDemo('moaven')} className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl font-bold transition-colors border border-amber-200">معاون تهذیب</button>
                  <button type="button" onClick={() => loginAsDemo('mentor')} className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl font-bold transition-colors border border-amber-200">استاد راهنما</button>
                  <button type="button" onClick={() => loginAsDemo('moshaver')} className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl font-bold transition-colors border border-amber-200">مشاور</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button type="button" onClick={() => loginAsDemo('student1')} className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl font-bold transition-colors border border-emerald-200">طلبه ۱ (پایه ۱)</button>
                  <button type="button" onClick={() => loginAsDemo('student2')} className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl font-bold transition-colors border border-emerald-200">طلبه ۲ (پایه ۲)</button>
                  <button type="button" onClick={() => loginAsDemo('student3')} className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl font-bold transition-colors border border-emerald-200">طلبه ۳ (پایه ۳)</button>
                </div>
              </div>`
);

fs.writeFileSync('src/components/Login.tsx', code);
