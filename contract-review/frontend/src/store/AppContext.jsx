import { createContext, useContext, useReducer } from 'react'

const initialState = {
  view: 'upload',           // 'upload' | 'loading' | 'results'
  file: null,
  // loading (OCR phase)
  stepStatus: ['waiting'],
  loadingError: '',
  // ocr
  ocrMarkdown: '',
  ocrPages: [],
  // llm results
  clauseLlmJson: null,
  clauseRawJson: null,
  normLlmJson:   null,
  normRawJson:   null,
  // llm loading states (parallel phase, shown in results page)
  clauseLoading: false,
  normLoading:   false,
  clauseError:   '',
  normError:     '',
  // pdf locate
  pdfTarget: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_VIEW':          return { ...state, view: action.payload }
    case 'SET_FILE':          return { ...state, file: action.payload }
    case 'SET_STEP_STATUS':   return { ...state, stepStatus: action.payload }
    case 'SET_LOADING_ERROR': return { ...state, loadingError: action.payload }
    case 'SET_OCR_RESULT':    return { ...state, ocrMarkdown: action.payload.markdown, ocrPages: action.payload.pages }
    case 'SET_CLAUSE_RESULT': return { ...state, clauseLlmJson: action.payload.llm, clauseRawJson: action.payload.raw, clauseLoading: false, clauseError: '' }
    case 'SET_NORM_RESULT':   return { ...state, normLlmJson:   action.payload.llm, normRawJson:   action.payload.raw, normLoading:   false, normError:   '' }
    case 'SET_CLAUSE_LOADING': return { ...state, clauseLoading: action.payload }
    case 'SET_NORM_LOADING':   return { ...state, normLoading:   action.payload }
    case 'SET_CLAUSE_ERROR':   return { ...state, clauseError: action.payload, clauseLoading: false }
    case 'SET_NORM_ERROR':     return { ...state, normError:   action.payload, normLoading:   false }
    case 'SET_PDF_TARGET':    return { ...state, pdfTarget: action.payload }
    case 'RESET':             return { ...initialState }
    default: return state
  }
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
