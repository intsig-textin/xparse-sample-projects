import { AppProvider, useApp } from './store/AppContext'
import UploadPage  from './pages/UploadPage'
import LoadingPage from './pages/LoadingPage'
import ResultsPage from './pages/ResultsPage'

function AppContent() {
  const { state } = useApp()
  if (state.view === 'upload')  return <UploadPage />
  if (state.view === 'loading') return <LoadingPage />
  if (state.view === 'results') return <ResultsPage />
  return null
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
