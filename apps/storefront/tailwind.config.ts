import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-playfair)', 'serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      colors: {
        wine: {
          tint: '#A9445B',
          light: '#8C1C2A',
          DEFAULT: '#6D0F1B',
          dark: '#4D0A13'
        },
        ivory: {
          light: '#FDFCFB',
          DEFAULT: '#F8F5F2',
          dark: '#E8DED7',
        },
        charcoal: {
          light: '#3A3A3A',
          DEFAULT: '#1A1A1A',
          dark: '#0A0A0A'
        },
        beige: {
          light: '#F9F7F5',
          DEFAULT: '#E8DED7',
          dark: '#D6BCB4'
        },
        rose: {
          light: '#EAD1D1',
          DEFAULT: '#D6AFAF',
          dark: '#B08D8D'
        },
        gold: {
          DEFAULT: '#C6A769',
          muted: '#D4C3A1'
        },
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        'theme-bg': 'var(--bg)',
        'theme-surface': 'var(--surface)',
        'theme-text': 'var(--text-primary)',
        'theme-text-muted': 'var(--text-secondary)',
        'theme-border': 'var(--border)',
        'theme-glass': 'var(--glass-bg)',
        'theme-glass-border': 'var(--glass-border)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 12s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        }
      }
    },
  },
  plugins: [],
};
export default config;
