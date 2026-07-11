const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardView.tsx', 'utf-8');

// We will add the Uncleared Advance card logic and replace the 4th card in each role.
// 1. Make all cards interactive.
// 2. Replace 4th card for Manager.
// 3. Replace 4th card for Finance.
// 4. Replace 4th card for Executive.

// A standard hover class for cards
const hoverClasses = ' cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-blue-500 transition-all group';

// Add onClick to all cards: onClick={() => setActiveTab('inbox')} (or just generic)
// We will simply replace `rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm`
// with `rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-blue-500 transition-all group" onClick={() => setActiveTab('inbox')} `
// But wait, the string is sometimes `shadow-sm relative...` 
// Let's use a regex to inject the classes and onClick.

code = code.replace(/className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm(.*?)"/g, 
  'className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm$1 cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-blue-500 transition-all group" onClick={() => setActiveTab(\'inbox\')}'
);

const unclearedCardCode = `            {/* Uncleared Advances */}
            {(() => {
              const unclearedAdvances = requests.filter(req => 
                req.expense_type === 'advance' && 
                req.status === 'cleared' && 
                !requests.some(c => (c.expense_type === 'clearing' || c.type === 'Clearing') && c.advance_id === req.id && c.status !== 'rejected') &&
                (role === 'Manager' ? req.department === currentUser?.department : true)
              );
              return (
                <div 
                  className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-rose-500 transition-all group"
                  onClick={() => setActiveTab('inbox')}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">เงินทดรองค้างเคลียร์</span>
                    <span className="p-2 bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 rounded-xl group-hover:scale-110 transition-transform"><AlertTriangle size={16} /></span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{unclearedAdvances.length} รายการ</h3>
                  <span className="text-[10px] text-rose-500 font-extrabold block mt-1">
                    พนักงาน {new Set(unclearedAdvances.map(r => r.employeeName)).size} คน ที่ยังไม่เคลียร์
                  </span>
                </div>
              );
            })()}`;

// Replace Manager's 4th card (Urgent Warning Bills)
code = code.replace(/\{\/\* Urgent Warning Bills \*\/\}.*?\}\)\(\)\}/s, unclearedCardCode);

// Replace Finance's 4th card (Corporate Spent total)
// Let's find it: `{/* Corporate Spent total */}`
code = code.replace(/\{\/\* Corporate Spent total \*\/\}.*?\}\)\(\)\}/s, unclearedCardCode);

// Replace Executive's 4th card (Pending Overall)
// Wait, what is the 4th card for Executive?
code = code.replace(/\{\/\* Pending Overall \*\/\}.*?\}\)\(\)\}/s, unclearedCardCode);

// Write back
fs.writeFileSync('src/components/DashboardView.tsx', code);
