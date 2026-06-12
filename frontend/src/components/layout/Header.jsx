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
    <header className="flex items-center justify-between px-4 md:px-6 h-16
                       bg-background border-b border-red-deep
                       flex-shrink-0 z-10">
      {/* Logo + título */}
      <div className="flex items-center gap-3">
        <img
          src="/logo.jpg"
          alt="Carnes El Rey"
          className="md:hidden w-9 h-9 rounded-full object-cover ring-1 ring-line"
        />
        <div>
          <h1 className="ed-title text-lg md:text-xl text-red-deep leading-tight">
            {title}
          </h1>
          {user && (
            <p className="ed-label text-[9px] hidden md:block mt-0.5">
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
            className="ed-label text-[11px] border-b border-ink-soft px-2 py-1.5
                       bg-transparent text-ink focus:outline-none focus:border-red-deep
                       hidden md:block cursor-pointer"
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
            className="hidden md:flex items-center gap-1.5 ed-label text-[10px]
                       text-red-deep border border-red-deep/30 px-3 py-1.5
                       hover:bg-red-deep/5 transition-colors"
          >
            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
            Instalar
          </button>
        )}

        {/* Avatar (outline editorial) */}
        <div className="w-9 h-9 rounded-full border border-red-deep text-red-deep
                        flex items-center justify-center text-xs font-bold
                        flex-shrink-0">
          {initials}
        </div>
      </div>
    </header>
  )
}
