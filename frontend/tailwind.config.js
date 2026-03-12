/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          50: '#f5f0e8',
          100: '#e8dfc8',
          200: '#c9a96e',
          300: '#b8923a',
          400: '#9a7a2d',
          500: '#7a6020',
          600: '#5a4515',
          700: '#2a2016',
        },
        ink: {
          50: '#f8f7f5',
          100: '#e8e4dc',
          200: '#c8c0b0',
          300: '#a89880',
          400: '#887060',
          500: '#685040',
          600: '#483028',
          700: '#281810',
        },
        void: {
          50: '#f0f0f8',
          100: '#d8d8f0',
          200: '#9898c8',
          300: '#6868a8',
          400: '#484888',
          500: '#282868',
          600: '#181848',
          700: '#0d0d14',
          800: '#080810',
          900: '#04040a',
        },
        gold: '#c9a96e',
        'gold-light': '#e8c98a',
        'gold-dark': '#9a7a3a',
        parchment: '#f5f0e8',
        'parchment-dark': '#e8dfc8',
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Crimson Text', 'Georgia', 'serif'],
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'fade-up': 'fadeUp 0.7s ease-out forwards',
        'slide-in': 'slideIn 0.5s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2.5s linear infinite',
        'typewriter': 'typewriter 3s steps(40) forwards',
        'cursor': 'cursor 1s step-end infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        glow: {
          '0%': { textShadow: '0 0 10px rgba(201,169,110,0.3)' },
          '100%': { textShadow: '0 0 30px rgba(201,169,110,0.8), 0 0 60px rgba(201,169,110,0.3)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'gold': '0 0 30px rgba(201,169,110,0.15), 0 4px 24px rgba(0,0,0,0.4)',
        'gold-hover': '0 0 50px rgba(201,169,110,0.25), 0 8px 32px rgba(0,0,0,0.5)',
        'card': '0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05) inset',
        'card-hover': '0 8px 40px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.08) inset',
        'inner-gold': 'inset 0 1px 0 rgba(201,169,110,0.1)',
      },
    },
  },
  plugins: [],
};
