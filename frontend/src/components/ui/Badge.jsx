const CONFIG = {
  ok:      { label: 'OK',      cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  alerta:  { label: 'ALERTA',  cls: 'bg-amber-100   text-amber-700   border-amber-200'  },
  critico: { label: 'CRÍTICO', cls: 'bg-red-100     text-red-700     border-red-200'    },
}

export default function Badge({ estado, className = '' }) {
  const cfg = CONFIG[estado] || CONFIG.ok
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold
                  border tracking-wide ${cfg.cls} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {cfg.label}
    </span>
  )
}
