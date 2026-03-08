export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        surface: '#12121a',
        primary: '#3b82f6',
        primary_glow: 'rgba(59, 130, 246, 0.5)',
        danger: '#ef4444',
        danger_glow: 'rgba(239, 68, 68, 0.5)',
        textMain: '#f8fafc',
        textMuted: '#94a3b8'
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
