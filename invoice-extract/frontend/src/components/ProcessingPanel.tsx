import React from 'react';
import type { ProcessingStep } from '../types/invoice';

interface ProcessingPanelProps {
  step: ProcessingStep;
  message: string;
  progress: number;
  error?: string;
  onReset: () => void;
}

interface StepConfig {
  id: ProcessingStep;
  label: string;
  description: string;
}

const STEPS: StepConfig[] = [
  { id: 'uploading', label: '上传文件', description: '发送文件到 OCR 服务' },
  { id: 'ocr', label: 'OCR 解析', description: '识别文档文字与结构' },
  { id: 'classify', label: '文档分类', description: '判断发票类型与明细规模' },
  { id: 'extract', label: '信息抽取', description: '分阶段结构化抽取发票字段' },
  { id: 'validate', label: '校验处理', description: '数据归一化与规则校验' },
];

function getStepStatus(
  stepId: ProcessingStep,
  currentStep: ProcessingStep
): 'pending' | 'active' | 'completed' | 'error' {
  const order = STEPS.map((s) => s.id);
  const currentIdx = order.indexOf(currentStep);
  const stepIdx = order.indexOf(stepId);

  if (currentStep === 'error') {
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'error';
    return 'pending';
  }

  if (currentStep === 'done') return 'completed';

  if (stepIdx < currentIdx) return 'completed';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

const CheckIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SpinIcon: React.FC = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export const ProcessingPanel: React.FC<ProcessingPanelProps> = ({
  step,
  message,
  progress,
  error,
  onReset,
}) => {
  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Main card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          {step !== 'error' ? (
            <>
              <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-1">智能发票解析中</h2>
              <p className="text-sm text-slate-500">{message}</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-red-700 mb-1">处理失败</h2>
              <p className="text-sm text-red-500">{error || message}</p>
            </>
          )}
        </div>

        {/* Progress bar */}
        {step !== 'error' && (
          <div className="mb-8">
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>进度</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Steps list */}
        <div className="space-y-3">
          {STEPS.map((s, idx) => {
            const status = getStepStatus(s.id, step);
            return (
              <div key={s.id} className="flex items-center gap-4">
                {/* Step indicator */}
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium
                    transition-all duration-300
                    ${status === 'completed'
                      ? 'bg-green-100 text-green-600'
                      : status === 'active'
                      ? 'bg-indigo-100 text-indigo-600'
                      : status === 'error'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-slate-100 text-slate-400'
                    }
                  `}
                >
                  {status === 'completed' ? (
                    <CheckIcon />
                  ) : status === 'active' ? (
                    <SpinIcon />
                  ) : status === 'error' ? (
                    <XIcon />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Step info */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      status === 'completed'
                        ? 'text-green-600'
                        : status === 'active'
                        ? 'text-indigo-700'
                        : status === 'error'
                        ? 'text-red-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {s.label}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{s.description}</p>
                </div>

                {/* Status badge */}
                {status === 'active' && (
                  <span className="text-xs font-medium text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                    处理中
                  </span>
                )}
                {status === 'completed' && (
                  <span className="text-xs font-medium text-green-500 bg-green-50 px-2 py-0.5 rounded-full">
                    完成
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Error actions */}
        {step === 'error' && (
          <div className="mt-8">
            <button
              onClick={onReset}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-colors"
            >
              重新上传
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
