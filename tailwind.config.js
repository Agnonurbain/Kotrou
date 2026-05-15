/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        kotrou: {
          orange: '#F97316',
          vert: '#16A34A',
          jaune: '#FBBF24',
          rouge: '#DC2626',
          gris: '#374151',
          fond: '#F9FAFB',
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        transport: {
          gbaka: '#F97316',
          woro: '#3B82F6',
          sotra: '#8B5CF6',
          marche: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
