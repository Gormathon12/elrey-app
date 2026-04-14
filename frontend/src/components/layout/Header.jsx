import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { BellIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import { useSucursales } from '../../hooks/useArqueos'

const PAGE_TITLES = {
  '/':              'Dashboard',
  '/historial':     'Historial de Arqueos',
  '/red':           'Red de Sucursales',
  '/configuracion': 'Configuración',
}

export default function Header({ onSucursalChange, selectedSucursal }) {
  const { user } = useAuthStore()
  const location = useLocation()
  const { sucursales } = useSucursales()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstall, setShowInstall] = useState(false)

  const title = PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/arqueo/') ? 'Detalle de Arqueo' : 'El Rey')

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); setShowInstall(true) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShowInstall(false)
    setDeferredPrompt(null)
  }

  const initials = user?.nombre?.split(' ').map((n) => n[0]).slice(0, 2).join('') || 'U'

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3
                       bg-white/80 backdrop-blur-card border-b border-red-deep/8
                       flex-shrink-0 z-10">
      {/* Título + breadcrumb */}
      <div className="flex items-center gap-3">
        <span className="md:hidden text-xl">🥩</span>
        <div>
          <h1 className="font-display font-bold text-red-deep text-base md:text-lg leading-tight">
            {title}
          </h1>
          {user && (
            <p className="text-[11px] text-gray-400 hidden md:block">
              {user.nombre} · {user.rol}
            </p>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2">
        {/* Selector de sucursal (dueno/encargado) */}
        {(user?.rol === 'dueno' || user?.rol === 'encargado') && onSucursalChange && (
          <select
            value={selectedSucursal || ''}
            onChange={(e) => onSucursalChange(e.target.value ? Number(e.target.value) : null)}
            className="text-sm border border-red-deep/20 rounded-ui px-3 py-1.5
                       bg-white text-gray-700 focus:outline-none focus:ring-2
                       focus:ring-red-deep/20 hidden md:block"
          >
            <option value="">Todas las sucursales</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        )}

        {/* PWA install */}
        {showInstall && (
          <button
            onClick={handleInstall}
            className="hidden md:flex items-center gap-1.5 text-xs font-medium
                       text-red-deep border border-red-deep/20 rounded-ui px-3 py-1.5
                       hover:bg-red-deep/5 transition-colors"
          >
            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
            Instalar app
          </button>
        )}

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-red-deep text-white
                        flex items-center justify-center text-xs font-bold
                        flex-shrink-0">
          {initials}
        </div>
      </div>
    </header>
  )
}
