const fs = require('fs');
let code = fs.readFileSync('src/components/student/StudentProgressChart.tsx', 'utf8');

code = code.replace(
  /entry\.notes = assessment\.notes || assessment\.dailyReport || '';/,
  `entry.notes = assessment.notes || {};`
);

code = code.replace(
  /\{data\.notes && \([\s\S]*?\}\)/,
  `{data.notes && Object.keys(data.notes).length > 0 && (
          <div className="mt-3 pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-700 block mb-1">توضیحات طلبه:</span>
            <div className="space-y-1">
               {Object.entries(data.notes).map(([k, v]: any) => {
                 if (!v) return null;
                 const metricName = METRICS.find(m => m.id === k)?.label || k;
                 return (
                   <div key={k} className="text-xs">
                     <span className="text-slate-500 ml-1">{metricName}:</span>
                     <span className="text-slate-700 font-medium">{v}</span>
                   </div>
                 );
               })}
            </div>
          </div>
        )}`
);

fs.writeFileSync('src/components/student/StudentProgressChart.tsx', code);
