/**
 * Gráficos SVG del diseño editorial (Stitch "Artisanal Butcher").
 * Sin dependencias: SVG puro para mantener el look tech-artesanal.
 */

const DIAS = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM']

/**
 * Línea de tendencia semanal.
 * @param {{ points: { label: string, value: number }[] }} props
 */
export function TendenciaLine({ points = [] }) {
  if (points.length === 0) {
    return (
      <div className="flex-grow w-full h-48 flex items-center justify-center text-sm text-ink-soft">
        Sin datos de la semana
      </div>
    )
  }

  const W = 500
  const H = 150
  const TOP = 20
  const BOTTOM = 125
  const max = Math.max(...points.map((p) => p.value), 1)
  const min = Math.min(...points.map((p) => p.value), 0)
  const range = max - min || 1

  const coords = points.map((p, i) => {
    const x = points.length === 1 ? W / 2 : (i / (points.length - 1)) * W
    const y = BOTTOM - ((p.value - min) / range) * (BOTTOM - TOP)
    return { x, y, ...p }
  })

  const path = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(0)},${c.y.toFixed(0)}`)
    .join(' ')

  return (
    <div className="flex-grow w-full h-48 relative">
      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox={`0 0 ${W} ${H}`}>
        <line stroke="#e8e1dc" strokeDasharray="2 4" strokeWidth="1" x1="0" x2={W} y1="25" y2="25" />
        <line stroke="#e8e1dc" strokeDasharray="2 4" strokeWidth="1" x1="0" x2={W} y1="75" y2="75" />
        <line stroke="#e8e1dc" strokeWidth="1" x1="0" x2={W} y1="125" y2="125" />
        <path className="ed-glow-line" d={path} fill="none" stroke="#8b1a1a" strokeWidth="3" />
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r="4"
            fill="#ffffff"
            stroke="#8b1a1a"
            strokeWidth="2"
            className={i === coords.length - 1 ? 'ed-glow-line' : ''}
          />
        ))}
      </svg>
      <div className="absolute -bottom-6 w-full flex justify-between ed-label text-[10px]">
        {coords.map((c, i) => (
          <span key={i} className={i === coords.length - 1 ? 'text-red-deep' : ''}>
            {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Barras comparativas por sucursal.
 * @param {{ data: { label: string, value: number, full: string }[], format: (n:number)=>string }} props
 */
export function SucursalBars({ data = [], format = (n) => n }) {
  if (data.length === 0) {
    return (
      <div className="flex-grow flex items-center justify-center h-48 text-sm text-ink-soft">
        Sin datos por sucursal
      </div>
    )
  }

  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="flex-grow flex items-end justify-around gap-4 h-48 pb-6 border-b border-line relative mt-4">
      {data.map((d) => (
        <div
          key={d.label}
          className="w-12 flex flex-col items-center gap-2 z-10 group cursor-pointer h-full justify-end"
          title={`${d.full}: ${format(d.value)}`}
        >
          <div className="font-mono text-[10px] text-ink-soft opacity-0 group-hover:opacity-100 transition-opacity mb-1">
            {format(d.value)}
          </div>
          <div
            className="w-full bg-red-deep relative group-hover:brightness-110 transition-all"
            style={{ height: `${Math.max((d.value / max) * 95, 4)}%` }}
          />
          <span className="ed-label text-[10px] text-ink mt-2">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

export { DIAS }
