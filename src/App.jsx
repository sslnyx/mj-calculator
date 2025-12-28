import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

const AppContent = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-[100svh] flex flex-col items-center justify-center bg-orange gap-4">
        <div className="loading-spinner"></div>
        <p className="font-title text-2xl">Loading...</p>
      </div>
    )
  }

  return user ? <Dashboard /> : <Login />
}

function App() {
  return (
    <AuthProvider>
      <div className="app-container">
        <AppContent />
      </div>
    </AuthProvider>
  )
}

export default App
