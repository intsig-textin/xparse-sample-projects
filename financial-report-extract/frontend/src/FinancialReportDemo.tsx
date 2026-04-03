import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, CheckCircle, TrendingUp, RefreshCcw, PieChart, Download, Search, Info, ChevronLeft, ChevronRight, FileCode, ArrowUpRight, ArrowDownRight, Minus, RotateCcw } from 'lucide-react';

/**
 * 导出函数：将表格数据转换为 CSV
 */
const exportToExcel = (tableData: any[], fileName: string) => {
  const headers = ["项目", "本期金额", "上期金额", "同比增长"];
  const rows = tableData.map(r => {
    const change = calculateChange(r.current, r.previous);
    return `"${r.item}","${r.current}","${r.previous}","${change.val}%"`;
  });
  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n"); 
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${fileName}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * 计算同比增长率逻辑
 */
const calculateChange = (currStr: string, prevStr: string) => {
  const curr = parseFloat(currStr.replace(/,/g, ''));
  const prev = parseFloat(prevStr.replace(/,/g, ''));
  if (isNaN(curr) || isNaN(prev) || prev === 0) return { val: '0.0', type: 'none' };
  const percent = ((curr - prev) / Math.abs(prev)) * 100;
  return {
    val: percent.toFixed(1),
    type: percent > 0 ? 'up' : percent < 0 ? 'down' : 'none'
  };
};

// --- API 配置 ---
const PARSE_API = '/api/parse-document';

interface TableRow {
  item: string;
  current: string;
  previous: string;
  type: string;
}

interface StructuredTable {
  title: string;
  page_id: number[]; 
  data: TableRow[];
}

const transformData = (rawTables: any[]): StructuredTable[] => {
  return rawTables.map(t => ({
    title: t.title || "未知表格",
    page_id: t.page_id || t.page_idx || [],
    data: (t.rows || []).map((r: any) => ({
      item: r[0] || '-',
      current: r[1] || '0',
      previous: r[2] || '0',
      type: r[0]?.includes('合计') || r[0]?.includes('总计') || r[0]?.includes('利润') ? 'total' : 'standard'
    }))
  }));
};

const DataTable = ({ tables, themeColor = 'blue', icon: Icon }: { tables: StructuredTable[], themeColor: string, icon: any }) => {
  const [activeIdx, setActiveIdx] = useState(0);

  const colors: any = {
    blue: "bg-blue-600 border-blue-200 text-blue-600",
    indigo: "bg-indigo-600 border-indigo-200 text-indigo-600",
    emerald: "bg-emerald-600 border-emerald-200 text-emerald-600"
  };

  if (!tables.length) return (
    <div className="flex flex-col items-center justify-center h-[400px] bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400">
      <FileText className="w-12 h-12 mb-2 opacity-20" />
      <p>未在该文档中识别到此类报表数据，或者已超出试用次数限制，请明天再来试试</p>
    </div>
  );
  
  const currentTable = tables[activeIdx];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-[600px]">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${(colors[themeColor] || colors['blue']).split(' ')[0]} text-white`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{currentTable.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-medium tracking-wide">
                表格 {activeIdx + 1} / {tables.length}
              </span>
              {currentTable.page_id.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 font-medium">
                  <Search className="w-3 h-3" /> 数据溯源：原文第 {currentTable.page_id.map(p => p + 1).join(', ')} 页
                </span>
              )}
            </div>
          </div>
        </div>
        <button 
          onClick={() => exportToExcel(currentTable.data, currentTable.title)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 rounded-lg text-xs font-semibold transition-all shadow-sm"
        >
          <Download className="w-3.5 h-3.5" /> 导出数据
        </button>
      </div>

      {tables.length > 1 && (
        <div className="flex items-center border-b border-slate-100 bg-white px-4 py-2 gap-2 overflow-x-auto no-scrollbar">
          {tables.map((t, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`flex-shrink-0 px-3 py-1 text-xs rounded-full transition-all border ${
                activeIdx === i ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
            >
              数据表 {i + 1}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="sticky top-0 bg-white z-10 shadow-sm">
            <tr className="text-slate-400 text-[10px] uppercase tracking-[0.1em]">
              <th className="px-6 py-4 font-bold">会计科目</th>
              <th className="px-6 py-4 text-right font-bold">本期金额</th>
              <th className="px-6 py-4 text-right font-bold">上期金额</th>
              <th className="px-6 py-4 text-right font-bold">同比增长</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {currentTable.data.map((row, i) => {
              const trend = calculateChange(row.current, row.previous);
              return (
                <tr key={i} className={`hover:bg-slate-50/80 transition-colors ${row.type === 'total' ? 'bg-slate-50 font-bold' : ''}`}>
                  <td className="px-6 py-3.5 text-slate-700 border-r border-slate-50">{row.item}</td>
                  <td className="px-6 py-3.5 text-right font-mono text-slate-800">{row.current}</td>
                  <td className="px-6 py-3.5 text-right font-mono text-slate-400">{row.previous}</td>
                  <td className={`px-6 py-3.5 text-right font-mono text-xs`}>
                    <div className={`flex items-center justify-end gap-1 ${
                        trend.type === 'up' ? 'text-rose-600' : trend.type === 'down' ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                        {trend.type === 'up' && <ArrowUpRight className="w-3 h-3" />}
                        {trend.type === 'down' && <ArrowDownRight className="w-3 h-3" />}
                        {trend.type === 'none' && <Minus className="w-3 h-3" />}
                        <span>{trend.val}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function App() {
  const [status, setStatus] = useState('idle'); 
  const [data, setData] = useState<any>(null);
  const [markdown, setMarkdown] = useState('');
  const [activeCategory, setActiveCategory] = useState('income');
  const [viewMode, setViewMode] = useState<'structured' | 'full'>('structured');

  const handleReset = () => {
    setStatus('idle');
    setData(null);
    setMarkdown('');
    setActiveCategory('income');
    setViewMode('structured');
  };

  const handleProcess = async (file: File) => {
    setStatus('parsing');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const resp = await fetch(PARSE_API, { method: 'POST', body: formData });
      const res = await resp.json();
      if (res.status === 'success') {
        setData({
          income: transformData(res.tables.incomeStatement || []),
          balance: transformData(res.tables.balanceSheet || []),
          cash: transformData(res.tables.cashFlow || [])
        });
        setMarkdown(res.markdown || '');
        setStatus('complete');
      } else {
        throw new Error(res.message);
      }
    } catch (e: any) {
      console.error(e);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <nav className="h-16 bg-white border-b border-slate-200 flex items-center px-8 sticky top-0 z-50 justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">Finance Extract <span className="text-blue-600">TextIn</span></span>
        </div>
        
        {status === 'complete' && (
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                  onClick={() => setViewMode('structured')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'structured' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >结构化视图</button>
              <button 
                  onClick={() => setViewMode('full')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'full' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >对照预览</button>
            </div>
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 重新解析
            </button>
          </div>
        )}
      </nav>

      <main className="max-w-[1600px] mx-auto py-8 px-6">
        {status === 'idle' && (
          <div className="max-w-2xl mx-auto text-center space-y-10 py-12">
            <div>
              <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">智能财报分析与数据提取</h2>
              <p className="text-lg text-slate-500">上传年度报告或财务报表，系统将自动识别结构化数据并进行多维同比分析。</p>
            </div>
            
            <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-200 hover:border-blue-400 transition-all group flex flex-col items-center justify-center cursor-pointer shadow-sm hover:shadow-2xl">
              <input type="file" id="up" className="hidden" onChange={e => e.target.files?.[0] && handleProcess(e.target.files[0])} />
              <label htmlFor="up" className="cursor-pointer flex flex-col items-center">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <Upload className="w-10 h-10" />
                </div>
                <span className="text-xl font-bold text-slate-800">点击上传 PDF 或 报表图片</span>
                <p className="text-sm text-slate-400 mt-4">支持上市公司财报、审计报告及各种财务报表识别</p>
              </label>
            </div>
          </div>
        )}

        {status === 'parsing' && (
          <div className="flex flex-col items-center justify-center py-40 space-y-6">
            <div className="relative">
                <div className="w-20 h-20 border-4 border-slate-200 rounded-full"></div>
                <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-800 text-xl">深度财务解析中...</p>
              <p className="text-sm text-slate-400 mt-1">正在提取科目并关联上下文数据，请稍候</p>
            </div>
          </div>
        )}

        {status === 'complete' && data && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex gap-3 p-1 bg-white border border-slate-200 rounded-2xl w-fit shadow-sm">
              {[
                { id: 'income', label: '利润表分析', icon: TrendingUp },
                { id: 'balance', label: '资产负债分析', icon: PieChart },
                { id: 'cash', label: '现金流量分析', icon: RefreshCcw }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeCategory === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className={`grid gap-6 ${viewMode === 'full' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              <div className="flex flex-col h-full">
                {activeCategory === 'income' && <DataTable tables={data.income} themeColor="blue" icon={TrendingUp} />}
                {activeCategory === 'balance' && <DataTable tables={data.balance} themeColor="indigo" icon={PieChart} />}
                {activeCategory === 'cash' && <DataTable tables={data.cash} themeColor="emerald" icon={RefreshCcw} />}
              </div>

              {viewMode === 'full' && (
                <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden flex flex-col h-full min-h-[600px]">
                   <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-5 h-5 text-blue-400" />
                        <span className="font-bold text-white text-sm">解析原文对照 (Markdown)</span>
                      </div>
                   </div>
                   <div className="flex-1 overflow-auto p-8 custom-scrollbar bg-[#0d1117]">
                      <pre className="text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap selection:bg-blue-500/30">
                        {markdown || "未解析到有效的原文文本内容"}
                      </pre>
                   </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Info className="w-5 h-5" /></div>
                <div className="text-sm text-slate-500 leading-relaxed">
                    <span className="font-bold text-slate-800">提示：</span> 
                    “同比增长”列基于科目金额的变动自动计算。通过切换右上角的“对照预览”，可快速定位报表在原文中的具体页码及上下文说明。
                </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="max-w-md mx-auto text-center py-20">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <RotateCcw className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">解析过程中断</h3>
            <p className="text-slate-500 mt-2 mb-8 italic">无法完成财务数据解析，请检查文件格式是否正确。</p>
            <button onClick={handleReset} className="px-10 py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg">重新上传</button>
          </div>
        )}
      </main>
    </div>
  );
}