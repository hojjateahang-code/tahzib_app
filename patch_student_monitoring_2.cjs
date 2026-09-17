const fs = require('fs');
let code = fs.readFileSync('src/components/StudentMonitoringList.tsx', 'utf8');

code = code.replace(
  /const \[selectedStudentId, setSelectedStudentId\] = useState<string \| null>\(null\);/,
  `const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referringStudentId, setReferringStudentId] = useState<string | null>(null);
  const [referralReason, setReferralReason] = useState('');`
);

code = code.replace(
  /const handleRequestConsult = async \(studentId: string\) => \{[\s\S]*?triggerSync\(\);\n    \} else \{\n      alert\('درخواست ارجاع به مشاوره ثبت شد و به مشاور اطلاع داده می‌شود\.'\);\n      triggerSync\(\);\n    \}\n  \};/,
  `const handleRequestConsult = async (studentId: string) => {
    const student = students?.find(s => s.id === studentId);
    if (!student) return;
    
    let currentTags = student.counselorTags || [];
    if (!currentTags.includes('CONSULT_NEEDED')) {
      setReferringStudentId(studentId);
      setShowReferralModal(true);
    } else {
      alert('این طلبه پیش از این به مشاوره ارجاع داده شده است.');
    }
  };

  const submitReferral = async () => {
    if (!referringStudentId || !referralReason.trim()) return;
    const student = students?.find(s => s.id === referringStudentId);
    if (!student) return;
    
    let currentTags = student.counselorTags || [];
    currentTags = [...currentTags, 'CONSULT_NEEDED'];
    await db.users.update(referringStudentId, { counselorTags: currentTags });
    
    // Add report for counselor
    await db.reports.add({
      id: crypto.randomUUID(),
      authorId: JSON.parse(localStorage.getItem('currentUser') || '{}').id || 'system',
      studentId: referringStudentId,
      type: 'COUNSELING_SESSION',
      date: new Date().toISOString(),
      content: \`ارجاع به مشاور. علت ارجاع: \${referralReason}\`,
      isConfidential: true,
      synced: false
    });
    
    setShowReferralModal(false);
    setReferralReason('');
    setReferringStudentId(null);
    alert('درخواست ارجاع به مشاوره با موفقیت ثبت شد.');
    triggerSync();
  };`
);

const modalCode = `        )}
      </div>

      {showReferralModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-200">
            <h3 className="font-bold text-lg text-slate-800 mb-4">ارجاع به مشاوره</h3>
            <p className="text-sm text-slate-600 mb-4">لطفا دلیل ارجاع طلبه به مشاوره را به صورت کامل توضیح دهید. این دلیل برای مشاور ارسال خواهد شد.</p>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm outline-none focus:border-amber-500 min-h-[150px] resize-none mb-6"
              placeholder="دلیل ارجاع..."
              value={referralReason}
              onChange={e => setReferralReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={submitReferral}
                disabled={!referralReason.trim()}
                className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                ثبت و ارجاع
              </button>
              <button
                onClick={() => {
                  setShowReferralModal(false);
                  setReferralReason('');
                  setReferringStudentId(null);
                }}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;

code = code.replace(/        \)\}\n      <\/div>\n    <\/div>\n  \);\n\}/, modalCode);
fs.writeFileSync('src/components/StudentMonitoringList.tsx', code);
