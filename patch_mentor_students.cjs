const fs = require('fs');
let code = fs.readFileSync('src/components/mentor/MentorStudents.tsx', 'utf8');

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
fs.writeFileSync('src/components/mentor/MentorStudents.tsx', code);
