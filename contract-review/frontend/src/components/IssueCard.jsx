const ISSUE_TYPE_STYLES = {
  '风险': { bg: '#fee2e2', color: '#dc2626' },
  '缺失': { bg: '#fef3c7', color: '#b45309' },
  '冲突': { bg: '#fce7f3', color: '#be185d' },
  '建议': { bg: '#d1fae5', color: '#059669' },
}
const SEVERITY_STYLES = {
  '高': { bg: '#fee2e2', color: '#dc2626' },
  '中': { bg: '#fef3c7', color: '#b45309' },
  '低': { bg: '#d1fae5', color: '#059669' },
}

const IconPin = () => (
  <svg className="flex-none w-4 h-4 text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
)
const IconBulb = () => (
  <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
  </svg>
)

export default function IssueCard({ item, badgeLabel, badgeStyle, hasPin, onClick }) {
  const style = badgeStyle ?? (
    ISSUE_TYPE_STYLES[item.issue_type] ??
    SEVERITY_STYLES[item.severity] ??
    { bg: '#f1f5f9', color: '#64748b' }
  )
  const label = badgeLabel ?? item.issue_type ?? item.severity ?? '—'

  return (
    <div
      className="issue-card px-4 py-3 border-b border-slate-100 last:border-0"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
      aria-label={`查看问题：${item.description}`}
    >
      <div className="flex items-start gap-3">
        {/* Badge */}
        <span
          className="flex-none mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: style.bg, color: style.color }}
        >
          {label}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-700 leading-relaxed mb-2">{item.description}</p>

          {item.value && (
            <div className="text-xs text-slate-500 bg-amber-50 border-l-2 border-amber-300 px-2 py-1.5 rounded-r italic mb-2 line-clamp-2">
              "{item.value}"
            </div>
          )}

          {item.suggestion && (
            <div className="flex items-start gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
              <IconBulb />
              <span>{item.suggestion}</span>
            </div>
          )}
        </div>

        {/* Pin icon */}
        {hasPin && <IconPin />}
      </div>
    </div>
  )
}
