import { NavLink, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/',          icon: 'dashboard',  label: 'Inicio'   },
  { to: '/historial', icon: 'history',    label: 'Historial'},
  { to: '/red',       icon: 'storefront', label: 'Red'      },
]

export default function BottomNav({ onNewArqueo }) {
  const location = useLocation()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40
                    bg-paper border-t border-line
                    shadow-[0_-2px_10px_rgba(30,27,24,0.03)]
                    safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-2.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to)

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex-1 flex flex-col items-center gap-0.5 py-1 relative"
            >
              <span
                className={`material-symbols-outlined text-[24px] transition-colors
                           ${isActive ? 'text-red-deep icon-fill' : 'text-ink-soft'}`}
              >
                {item.icon}
              </span>
              <span className={`ed-label text-[9px] transition-colors
                               ${isActive ? 'text-red-deep' : 'text-ink-soft'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-red-deep" />
              )}
            </NavLink>
          )
        })}

        {/* FAB Nuevo Arqueo */}
        {onNewArqueo && (
          <button
            onClick={onNewArqueo}
            className="flex-1 flex flex-col items-center gap-0.5 py-1"
          >
            <span className="material-symbols-outlined text-[24px] text-red-deep">add_circle</span>
            <span className="ed-label text-[9px] text-red-deep">Arqueo</span>
          </button>
        )}
      </div>
    </nav>
  )
}
