import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [username, setUsername]  = useState('')
  const [password, setPassword]  = useState('')
  const [loading, setLoading]    = useState(false)
  const [error, setError]        = useState(null)
  const { login }                = useAuth()
  const navigate                 = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const user = await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Email o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream bg-pattern flex items-center justify-center p-4">
      {/* Gradiente de fondo */}
      <div className="absolute inset-0 bg-gradient-to-br from-cream via-cream to-earth/20 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm"
      >
        {/* Card */}
        <div className="glass-card p-8">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-center mb-8"
          >
            <motion.div
              animate={{ rotate: [0, -5, 5, -5, 0] }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-6xl mb-3 inline-block"
            >
              🥩
            </motion.div>
            <h1 className="font-display text-4xl font-bold text-red-deep">El Rey</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium tracking-wide">
              Sistema de Arqueos de Caja
            </p>
          </motion.div>

          {/* Formulario */}
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label className="label">Usuario</label>
              <input
                className="input-field"
                type="text"
                placeholder="kcoria"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                required
              />
            </div>

            <div>
              <label className="label">Contraseña</label>
              <input
                className="input-field"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-mid bg-red-50 border border-red-200
                           rounded-ui px-3 py-2 text-center"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="w-full btn-primary py-3 text-base mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Ingresando...
                </span>
              ) : 'Ingresar'}
            </motion.button>
          </motion.form>

          {/* Hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-xs text-gray-400 mt-6"
          >
            kcoria · elrey2026
          </motion.p>
        </div>

        {/* Versión */}
        <p className="text-center text-xs text-gray-400 mt-4">El Rey v1.0</p>
      </motion.div>
    </div>
  )
}
