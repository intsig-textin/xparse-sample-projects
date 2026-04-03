const IconBuilding = () => (
  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
  </svg>
)
const IconPeople = () => (
  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
)

export default function PartyReview({ clauseLlmJson, clauseCount, normCount, highRiskCount, loading }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-4 text-slate-400">
        <svg className="w-8 h-8 spinner text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
        <p className="text-sm text-slate-500">AI 正在识别合同主体信息…</p>
      </div>
    )
  }
  const parties = clauseLlmJson?.parties
  const partyA  = parties?.party_a
  const partyB  = parties?.party_b

  return (
    <div>
      {/* Info banner */}
      <div className="mb-5 flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        主体信息从合同条款中自动提取，仅供参考
      </div>

      {/* Party cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Party A */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div
            className="px-4 py-3 flex items-center gap-2.5"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
          >
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center"><IconBuilding /></div>
            <span className="text-white font-semibold text-sm">甲方</span>
          </div>
          <div className="px-4 py-4">
            {partyA ? (
              <>
                <p className="text-base font-bold text-slate-800 mb-0.5 break-words">{partyA.name || '未识别'}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-slate-400">{partyA.role || '甲方'}</p>
                  {partyA.name && (
                    <a
                      href={`https://www.qixin.com/search?key=${encodeURIComponent(partyA.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 hover:underline"
                    >
                      启信宝查询
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </a>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">未能识别甲方信息</p>
            )}
          </div>
        </div>

        {/* Party B */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div
            className="px-4 py-3 flex items-center gap-2.5"
            style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
          >
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center"><IconPeople /></div>
            <span className="text-white font-semibold text-sm">乙方</span>
          </div>
          <div className="px-4 py-4">
            {partyB ? (
              <>
                <p className="text-base font-bold text-slate-800 mb-0.5 break-words">{partyB.name || '未识别'}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-slate-400">{partyB.role || '乙方'}</p>
                  {partyB.name && (
                    <a
                      href={`https://www.qixin.com/search?key=${encodeURIComponent(partyB.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 hover:underline"
                    >
                      启信宝查询
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </a>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">未能识别乙方信息</p>
            )}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">审查汇总</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
          <p className="text-2xl font-bold font-heading" style={{ color: '#1d4ed8' }}>{clauseCount}</p>
          <p className="text-xs text-slate-500 mt-1">条款问题</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
          <p className="text-2xl font-bold font-heading" style={{ color: '#b45309' }}>{normCount}</p>
          <p className="text-xs text-slate-500 mt-1">规范问题</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center border border-red-100">
          <p className="text-2xl font-bold font-heading text-red-600">{highRiskCount}</p>
          <p className="text-xs text-slate-500 mt-1">高风险项</p>
        </div>
      </div>
    </div>
  )
}
