import React from 'react'
import { Check, Upload, ScanLine, Layers, Search } from 'lucide-react'

const STEPS = [
  { id: 'upload', label: '上传文件', icon: Upload },
  { id: 'parse', label: 'OCR 解析', icon: ScanLine },
  { id: 'chunk', label: '生成 Chunks', icon: Layers },
  { id: 'search', label: '条款检索', icon: Search },
]

function resolveCurrentStep(phase, hasSearched) {
  if (phase === 'upload') return 0
  if (phase === 'parsing') return 1
  return hasSearched ? 4 : 3
}

export default function StepIndicator({ phase, hasSearched }) {
  const currentStep = resolveCurrentStep(phase, hasSearched)

  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((step, idx) => {
        const Icon = step.icon
        const isCompleted = idx < currentStep
        const isCurrent = idx === currentStep

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? 'bg-blue-700 text-white shadow-sm'
                    : isCurrent
                    ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500 ring-offset-1'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isCompleted ? <Check size={14} strokeWidth={2.5} /> : <Icon size={14} />}
              </div>
              <span
                className={`mt-1 text-[10px] font-medium whitespace-nowrap ${
                  isCurrent ? 'text-blue-700' : isCompleted ? 'text-blue-600' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`w-10 h-0.5 mb-4 mx-0.5 transition-all duration-500 ${
                  idx < currentStep ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
