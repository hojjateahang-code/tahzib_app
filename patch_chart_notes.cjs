const fs = require('fs');
let code = fs.readFileSync('src/components/student/StudentProgressChart.tsx', 'utf8');

code = code.replace(
  /entry\.tasksPct = tTotal > 0 \? Math\.round\(\(tCompleted \/ tTotal\) \* 100\) : 0;/,
  `entry.tasksPct = tTotal > 0 ? Math.round((tCompleted / tTotal) * 100) : 0;\n        entry.notes = assessment.notes || assessment.dailyReport || '';`
);

code = code.replace(
  /<\/div>\n      <\/div>\n    \);\n  \}\n  return null;\n\};\n/,
  `        </div>
        {data.notes && (
          <div className="mt-3 pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-700 block mb-1">توضیحات طلبه:</span>
            <span className="text-slate-600 leading-relaxed whitespace-pre-wrap block">{data.notes}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};
`
);

fs.writeFileSync('src/components/student/StudentProgressChart.tsx', code);
