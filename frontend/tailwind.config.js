/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FAF3EE',
        background: '#FAF3EE',
        'red-deep': '#8B1A1A',
        'red-mid': '#C0392B',
        earth: '#E8A87C',
        'brown-light': '#6B4030',
        surface: 'rgba(255,255,255,0.82)',
        // Editorial design system (Stitch "Artisanal Butcher")
        copper: '#B87333',
        paper: '#FFFFFF',
        ink: '#1e1b18',
        'ink-soft': '#58413f',
        line: '#e8e1dc',
        'line-soft': '#e0bfbc',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        editorial: ['"EB Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
        ui: '12px',
      },
      boxShadow: {
        card: '0 4px 32px rgba(139,26,26,0.08)',
        'card-hover': '0 8px 40px rgba(139,26,26,0.14)',
      },
      backdropBlur: {
        card: '16px',
      },
      fontSize: {
        fluid: 'clamp(0.875rem, 2vw, 1rem)',
      },
    },
  },
  plugins: [],
}
