import { useState } from 'react'
import { useApp } from '../store/AppContext'
import PDFViewer      from '../components/PDFViewer'
import MarkdownViewer from '../components/MarkdownViewer'
import ClauseReview   from '../components/ClauseReview'
import NormReview     from '../components/NormReview'
import PartyReview    from '../components/PartyReview'
import { exportReportAsWord } from '../utils/export'

const CLAUSE_CATS = ['责任条款', '违约条款', '知识产权', '保密条款', '争议解决']
const NORM_CATS   = ['错漏', '一致性', '格式', '修订']

const IconSpinner = () => (
  <svg className="w-3.5 h-3.5 spinner" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
)
const IconDownload = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
)
const IconBack = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
  </svg>
)

export default function ResultsPage() {
  const { state, dispatch } = useApp()
  const {
    ocrPages, ocrMarkdown, file,
    clauseLlmJson, clauseRawJson, normLlmJson, normRawJson,
    clauseLoading, normLoading, clauseError, normError,
  } = state

  const [activeResultTab, setActiveResultTab] = useState('clause')
  const [activeDocTab, setActiveDocTab] = useState('source')
  const [exporting, setExporting] = useState(false)

  const clauseData = clauseLlmJson?.clause_review ?? {}
  const normData   = normLlmJson?.norm_review     ?? {}
  const clauseCount = CLAUSE_CATS.reduce((s, k) => s + (clauseData[k]?.length || 0), 0)
  const normCount   = NORM_CATS.reduce(  (s, k) => s + (normData[k]?.length   || 0), 0)
  const highRiskCount = [
    ...CLAUSE_CATS.flatMap(k => (clauseData[k] || []).filter(i => i.issue_type === '风险')),
    ...NORM_CATS.flatMap(  k => (normData[k]   || []).filter(i => i.severity   === '高')),
  ].length

  async function handleExport() {
    setExporting(true)
    try {
      await exportReportAsWord({
        fileName: file?.name?.replace(/\.pdf$/i, '') || '合同',
        parties:    clauseLlmJson?.parties,
        clauseData: clauseData,
        normData:   normData,
      })
    } finally {
      setExporting(false)
    }
  }

  const reviewTabs = [
    { key: 'clause', label: '条款审阅', loading: clauseLoading, count: clauseCount, badgeColor: '#dc2626', badgeBg: '#fee2e2' },
    { key: 'norm',   label: '规范审阅', loading: normLoading,   count: normCount,   badgeColor: '#b45309', badgeBg: '#fef3c7' },
    { key: 'party',  label: '主体审阅', loading: clauseLoading, count: 0 },
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-100">

      {/* ── Split Panel ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT — Document viewer (40%) */}
        <div className="flex-none flex flex-col border-r border-slate-200 overflow-hidden bg-white" style={{ width: '40%' }}>
          <div className="flex-none border-b border-slate-200 px-4 pt-3 pb-0 flex items-center gap-0 bg-white">
            {[
              { key: 'source',   label: '源文件' },
              { key: 'markdown', label: '解析结果' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveDocTab(t.key)}
                className={`tab-btn ${activeDocTab === t.key ? 'active' : ''}`}
              >
                {t.label}
              </button>
            ))}
            {file && (
              <span className="ml-auto flex items-center gap-1 text-slate-400 text-xs pb-2 max-w-[180px] truncate">
                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span className="truncate">{file.name}</span>
              </span>
            )}
          </div>

          <div className={`flex-1 overflow-hidden ${activeDocTab !== 'source' ? 'hidden' : 'flex flex-col'}`}>
            <PDFViewer pages={ocrPages} target={null} />
          </div>
          <div className={`flex-1 overflow-auto ${activeDocTab !== 'markdown' ? 'hidden' : ''}`}>
            <MarkdownViewer markdown={ocrMarkdown} />
          </div>
        </div>

        {/* RIGHT — Review panel (60%) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">

          {/* Review tabs + action buttons */}
          <div className="flex-none border-b border-slate-200 px-5 pt-3 pb-0 flex items-center gap-0 bg-white">
            {reviewTabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveResultTab(t.key)}
                className={`tab-btn flex items-center gap-1.5 ${activeResultTab === t.key ? 'active' : ''}`}
              >
                {t.label}
                {t.loading
                  ? <IconSpinner />
                  : t.count > 0 && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: t.badgeBg, color: t.badgeColor }}
                    >
                      {t.count}
                    </span>
                  )
                }
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2 pb-2">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
              >
                {exporting ? <IconSpinner /> : <IconDownload />}
                导出报告
              </button>
              <button
                onClick={() => dispatch({ type: 'RESET' })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                <IconBack />
                重新上传
              </button>
            </div>
          </div>

          {/* Review content */}
          <div className="flex-1 overflow-auto p-5">
            {activeResultTab === 'clause' && (
              <div className="fade-in-up">
                <ClauseReview
                  clauseLlmJson={clauseLlmJson}
                  clauseRawJson={clauseRawJson}
                  onLocate={() => {}}
                  loading={clauseLoading}
                  error={clauseError}
                />
              </div>
            )}
            {activeResultTab === 'norm' && (
              <div className="fade-in-up">
                <NormReview
                  normLlmJson={normLlmJson}
                  normRawJson={normRawJson}
                  onLocate={() => {}}
                  loading={normLoading}
                  error={normError}
                />
              </div>
            )}
            {activeResultTab === 'party' && (
              <div className="fade-in-up">
                <PartyReview
                  clauseLlmJson={clauseLlmJson}
                  clauseCount={clauseCount}
                  normCount={normCount}
                  highRiskCount={highRiskCount}
                  loading={clauseLoading}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
