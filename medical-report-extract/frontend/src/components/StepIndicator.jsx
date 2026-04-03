import React from 'react'
import { Check, Upload, ScanLine, Brain, LayoutDashboard } from 'lucide-react'

const STEPS = [
  { id: 'upload', label: '上传文件', icon: Upload },
  { id: 'parsing', label: 'OCR 解析', icon: ScanLine },
  { id: 'extracting', label: 'AI 抽取', icon: Brain },
  { id: 'result', label: '查看结果', icon: LayoutDashboard },
]

const PHASE_STEP_INDEX = {
  upload: 0,
  parsing: 1,
  extracting: 2,
  result: 3,
  error: -1,
}

export default function StepIndicator({ phase }) {
  const currentIndex = PHASE_STEP_INDEX[phase] ?? 0

  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((step, idx) => {
        const Icon = step.icon
        const isCompleted = idx < currentIndex
        const isCurrent = idx === currentIndex
        const isPending = idx > currentIndex

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div className={`
                w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300
                ${isCompleted ? 'bg-blue-700 text-white shadow-sm' :
                  isCurrent ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500 ring-offset-1' :
                  'bg-slate-100 text-slate-400'}
              `}>
                {isCompleted
                  ? <Check size={16} strokeWidth={2.5} />
                  : <Icon size={16} />
                }
              </div>
              <span className={`
                mt-1.5 text-xs font-medium whitespace-nowrap
                ${isCurrent ? 'text-blue-700' : isCompleted ? 'text-blue-600' : 'text-slate-400'}
              `}>
                {step.label}
              </span>
            </div>

            {idx < STEPS.length - 1 && (
              <div className={`
                w-16 h-0.5 mb-5 mx-1 transition-all duration-500
                ${idx < currentIndex ? 'bg-blue-600' : 'bg-slate-200'}
              `} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
