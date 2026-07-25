/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        graphite: '#0F1417',
        surface: '#171D21',
        raised: '#1E262B',
        border: '#2A3338',
        ink: '#E8E6E1',
        muted: '#8B9296',
        copper: '#C4753A',
        'copper-bright': '#E0975A',
        silicon: '#5B8FA8',
        positive: '#6FA97A',
        negative: '#C4574A',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'die-grid': 'linear-gradient(#2A3338 1px, transparent 1px), linear-gradient(90deg, #2A3338 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}
