const fs = require('fs');
let code = fs.readFileSync('src/components/student/StudentProgressChart.tsx', 'utf8');

const customTooltipCode = `
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-lg text-xs" dir="rtl">
        <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{label}</p>
        <div className="space-y-1">
          {payload.map((p: any) => {
             let valueText = p.value === 100 ? 'انجام شد/کامل' : (p.value > 0 ? p.value + '%' : 'انجام نشد/ترک');
             // For raw values we passed in data
             if (data['raw_' + p.dataKey]) {
                const raw = data['raw_' + p.dataKey];
                if (raw === 'JAMAAT') valueText = 'جماعت';
                else if (raw === 'FURADA') valueText = 'فرادی';
                else if (raw === 'QAZA') valueText = 'قضا';
                else if (raw === 'TARK') valueText = 'ترک';
                else if (raw === 'NONE') valueText = '-';
                else if (raw === 'FULL') valueText = 'کامل';
                else if (raw === 'PARTIAL') valueText = 'ناقص';
             }
             return (
               <div key={p.dataKey} className="flex justify-between gap-4">
                 <span style={{ color: p.color }} className="font-bold">{p.name}:</span>
                 <span className="text-slate-600 font-medium">{valueText}</span>
               </div>
             )
          })}
        </div>
      </div>
    );
  }
  return null;
};
`;

code = code.replace(
  /export function StudentProgressChart/,
  customTooltipCode + '\nexport function StudentProgressChart'
);

code = code.replace(
  /entry\[p\] = 100;/,
  `entry[p] = 100;\n          }\n          entry['raw_' + p] = assessment[p];`
);

code = code.replace(
  /entry\[t\] = 100;/,
  `entry[t] = 100;\n          }\n          entry['raw_' + t] = assessment[t];`
);

code = code.replace(
  /<Tooltip\s+contentStyle=[\s\S]*?\/>/,
  `<Tooltip content={<CustomTooltip />} />`
);

fs.writeFileSync('src/components/student/StudentProgressChart.tsx', code);
