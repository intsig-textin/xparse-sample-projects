import React from 'react'

const SUBJECT_COLOR = {
  数学: 'bg-blue-50 text-blue-600',
  语文: 'bg-red-50 text-red-600',
  英语: 'bg-green-50 text-green-600',
  物理: 'bg-purple-50 text-purple-600',
  化学: 'bg-orange-50 text-orange-600',
  生物: 'bg-emerald-50 text-emerald-600',
  历史: 'bg-amber-50 text-amber-600',
  地理: 'bg-teal-50 text-teal-600',
  政治: 'bg-rose-50 text-rose-600',
  综合: 'bg-indigo-50 text-indigo-600',
}

export default function PaperMetaCard({ paperMeta }) {
  if (!paperMeta) return null

  const subjectColor = SUBJECT_COLOR[paperMeta.subject] ?? 'bg-slate-100 text-slate-600'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        试卷
      </span>

      {paperMeta.subject && paperMeta.subject !== '未知' && (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${subjectColor}`}>
          {paperMeta.subject}
        </span>
      )}

      {paperMeta.grade_level && paperMeta.grade_level !== '未知' && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
          {paperMeta.grade_level}
        </span>
      )}

      {paperMeta.exam_type && paperMeta.exam_type !== '未知' && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 font-medium">
          {paperMeta.exam_type}
        </span>
      )}

      {paperMeta.has_images && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">
          含图片
        </span>
      )}
    </div>
  )
}
