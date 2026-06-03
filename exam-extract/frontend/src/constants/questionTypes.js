// 题型常量单一来源 — UI、导出共享。新增题型只需改这里。

export const QUESTION_TYPES = [
  { key: '单选题', label: '单选题', colorClass: 'bg-blue-100 text-blue-700' },
  { key: '多选题', label: '多选题', colorClass: 'bg-indigo-100 text-indigo-700' },
  { key: '判断题', label: '判断题', colorClass: 'bg-teal-100 text-teal-700' },
  { key: '填空题', label: '填空题', colorClass: 'bg-green-100 text-green-700' },
  { key: '默写题', label: '默写题', colorClass: 'bg-lime-100 text-lime-700' },
  { key: '解答题', label: '解答题', colorClass: 'bg-orange-100 text-orange-700' },
  { key: '计算题', label: '计算题', colorClass: 'bg-amber-100 text-amber-700' },
  { key: '证明题', label: '证明题', colorClass: 'bg-purple-100 text-purple-700' },
  { key: '阅读理解', label: '阅读理解', colorClass: 'bg-rose-100 text-rose-700' },
  { key: '完形填空', label: '完形填空', colorClass: 'bg-pink-100 text-pink-700' },
  { key: '听力题', label: '听力题', colorClass: 'bg-cyan-100 text-cyan-700' },
  { key: '翻译题', label: '翻译题', colorClass: 'bg-fuchsia-100 text-fuchsia-700' },
  { key: '简答题', label: '简答题', colorClass: 'bg-yellow-100 text-yellow-700' },
  { key: '作文题', label: '作文题', colorClass: 'bg-red-100 text-red-700' },
  { key: '综合题', label: '综合题', colorClass: 'bg-slate-100 text-slate-700' },
  { key: '其他', label: '其他', colorClass: 'bg-slate-100 text-slate-600' },
]

const TYPE_BY_KEY = new Map(QUESTION_TYPES.map((t) => [t.key, t]))

export function getQuestionTypeColor(type) {
  return TYPE_BY_KEY.get(type)?.colorClass ?? 'bg-slate-100 text-slate-600'
}
