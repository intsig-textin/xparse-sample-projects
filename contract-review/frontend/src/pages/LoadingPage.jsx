import { useApp } from '../store/AppContext'

export default function LoadingPage() {
  const { state, dispatch } = useApp()
  const { stepStatus, loadingError } = state
  const isActive = stepStatus[0] === 'active'
  const isDone   = stepStatus[0] === 'done'

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 45%, #dbeafe 100%)' }}
    >
      <div className="w-full max-w-md text-center fade-in-up">

        {/* Icon */}
        <div
          className="w-20 h-20 mx-auto mb-8 rounded-2xl flex items-center justify-center shadow-xl"
          style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
        >
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold mb-2 font-heading" style={{ color: '#0f172a' }}>正在解析合同文档</h2>
        <p className="text-sm mb-10" style={{ color: '#1d4ed8' }}>
          {isDone ? '解析完成，正在跳转…' : '使用 TextIn 识别文档结构、文字与坐标信息…'}
        </p>

        {/* Spinner / check */}
        <div className="flex justify-center mb-10">
          {!isDone ? (
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 spinner text-blue-200 opacity-60" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" />
              </svg>
              <svg className="w-16 h-16 spinner absolute inset-0" viewBox="0 0 64 64" fill="none">
                <path d="M32 4 a28 28 0 0 1 28 28" stroke="#2563eb" strokeWidth="6" strokeLinecap="round" />
              </svg>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.1)', border: '2px solid #2563eb' }}>
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div
            className="h-full rounded-full progress-bar-animate"
            style={{
              width: isActive ? '60%' : isDone ? '100%' : '0%',
              background: 'linear-gradient(90deg, #1d4ed8, #3b82f6)',
              transition: 'width 0.6s ease',
            }}
          />
        </div>
        <p className="text-xs" style={{ color: '#2563eb' }}>
          {isDone ? '100%' : isActive ? '解析中…' : '准备中…'}
        </p>

        {/* Error */}
        {loadingError && (
          <div className="mt-8 px-5 py-4 rounded-xl text-left text-sm" style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)' }}>
            <p className="font-semibold text-red-300 mb-1">文档解析失败</p>
            <p className="text-red-200">{loadingError}</p>
            <button
              onClick={() => { dispatch({ type: 'SET_VIEW', payload: 'upload' }); dispatch({ type: 'SET_LOADING_ERROR', payload: '' }) }}
              className="mt-2 text-xs underline text-red-300 hover:text-red-100 cursor-pointer"
            >
              返回重新上传
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
