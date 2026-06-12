import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      if (err.code === 'ECONNABORTED' || !err.response) {
        setError('El servidor está iniciando, intentá de nuevo en unos segundos...')
      } else {
        setError(err.response?.data?.detail || 'Usuario o contraseña incorrectos')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo + marca */}
        <div className="text-center mb-10">
          <img
            src="/logo.jpg"
            alt="Carnes El Rey"
            className="w-24 h-24 rounded-full object-cover mx-auto ring-1 ring-line"
          />
          <h1 className="ed-title text-5xl text-red-deep uppercase tracking-tight mt-5">El Rey</h1>
          <p className="ed-label mt-2">Maestros Carniceros</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Usuario */}
          <div>
            <label className="ed-label block mb-2">Usuario</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft text-[20px]">
                person
              </span>
              <input
                className="w-full bg-paper border border-line rounded-lg pl-11 pr-3 py-3 text-ink
                           placeholder:text-ink-soft/60 focus:outline-none focus:border-red-deep
                           transition-colors"
                type="text"
                placeholder="Ingrese su usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                required
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label className="ed-label block mb-2">Contraseña</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft text-[20px]">
                lock
              </span>
              <input
                className="w-full bg-paper border border-line rounded-lg pl-11 pr-11 py-3 text-ink
                           placeholder:text-ink-soft/60 focus:outline-none focus:border-red-deep
                           transition-colors"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-red-deep transition-colors"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-mid bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-red-deep text-white ed-label text-[13px] py-3.5 rounded-lg
                       hover:bg-red-mid transition-colors disabled:opacity-50
                       flex items-center justify-center gap-2 mt-1"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Ingresando...
              </>
            ) : (
              <>
                Ingresar
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </motion.button>
        </form>

        {/* Footer */}
        <p className="ed-label text-[9px] text-center text-ink-soft/70 mt-10">
          Acceso restringido · Personal autorizado
        </p>
      </motion.div>
    </div>
  )
}
