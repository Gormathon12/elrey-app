import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAuthStore } from './store/authStore'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Arqueo from './pages/Arqueo'
import HistorialArqueos from './pages/HistorialArqueos'
import RedSucursales from './pages/RedSucursales'
import Configuracion from './pages/Configuracion'

function ProtectedRoute({ children, roles }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.rol)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Router>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/arqueo/:id"
            element={
              <ProtectedRoute>
                <Layout><Arqueo /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/historial"
            element={
              <ProtectedRoute>
                <Layout><HistorialArqueos /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/red"
            element={
              <ProtectedRoute>
                <Layout><RedSucursales /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/configuracion"
            element={
              <ProtectedRoute roles={['dueno']}>
                <Layout><Configuracion /></Layout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Router>
  )
}
