import React from 'react'

const STEPS = ['上传文件', 'OCR 解析', '题目抽取', '查看结果']

function resolveStepIndex(phase, extractionPhase) {
  if (phase === 'upload') return 0
  if (phase === 'parsing') return 1
  if (extractionPhase === 'extracting') return 2
  if (extractionPhase === 'done' || extractionPhase === 'error') return 3
  return 2
}

export default function StepIndicator({ phase, extractionPhase }) {
  const currentStep = resolveStepIndex(phase, extractionPhase)

  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((label, idx) => {
        const done = idx < currentStep
        const active = idx === currentStep
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                  done
                    ? 'bg-blue-700 text-white'
                    : active
                    ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500'
                    : 'bg-slate-100 text-slate-400',
                ].join(' ')}
              >
                {done ? (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap ${
                  done ? 'text-blue-700' : active ? 'text-blue-600' : 'text-slate-400'
                }`}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`w-10 h-0.5 mb-4 mx-1 flex-shrink-0 ${
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
