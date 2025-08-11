import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        synthwave: {
          // Dark backgrounds (from image)
          'dark-blue': '#000221',
          'dark-purple': '#261447',
          'deep-blue': '#023788',
          'blue': '#02578B',
          'teal-blue': '#025F88',

          // Primary neon colors (from image)
          'neon-orange': '#FF6C11',
          'neon-green': '#20E516',
          'neon-cyan': '#00A0D0',
          'bright-blue': '#006DD0',

          // Accent colors
          'peach': '#FF8664',

          // UI colors
          'card-bg': 'rgba(38, 20, 71, 0.7)',
          'overlay': 'rgba(0, 2, 33, 0.9)',
        },

        // Semantic color mappings (easy to swap themes)
        theme: {
          // Backgrounds
          'bg-primary': 'var(--theme-bg-primary)',
          'bg-secondary': 'var(--theme-bg-secondary)',
          'bg-accent': 'var(--theme-bg-accent)',

          // Text
          'text-primary': 'var(--theme-text-primary)',
          'text-secondary': 'var(--theme-text-secondary)',
          'text-accent': 'var(--theme-text-accent)',

          // Interactive
          'link': 'var(--theme-link)',
          'link-hover': 'var(--theme-link-hover)',
          'button-primary': 'var(--theme-button-primary)',
          'button-secondary': 'var(--theme-button-secondary)',

          // Borders
          'border': 'var(--theme-border)',
          'border-accent': 'var(--theme-border-accent)',
        }
      },
      backgroundImage: {
        'synthwave-gradient': 'linear-gradient(180deg, #241744 0%, #0A0E27 50%, #241217 100%)',
        'neon-glow': 'radial-gradient(circle at center, rgba(245, 18, 119, 0.3) 0%, transparent 70%)',
        'grid-pattern': 'linear-gradient(rgba(245, 18, 119, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 18, 119, 0.1) 1px, transparent 1px)',
      },
      boxShadow: {
        'neon-orange': '0 0 20px rgba(255, 108, 17, 0.5)',
        'neon-cyan': '0 0 20px rgba(0, 160, 208, 0.5)',
        'neon-green': '0 0 20px rgba(32, 229, 22, 0.5)',
        'synthwave': '0 0 30px rgba(255, 108, 17, 0.3), 0 0 60px rgba(0, 160, 208, 0.2)',
      },
      animation: {
        'neon-pulse': 'neon-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'grid-float': 'grid-float 20s ease infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'neon-pulse': {
          '0%, 100%': {
            opacity: '1',
          },
          '50%': {
            opacity: '0.7',
          },
        },
        'grid-float': {
          '0%, 100%': {
            transform: 'translateY(0)',
          },
          '50%': {
            transform: 'translateY(-20px)',
          },
        },
        'glow': {
          from: {
            textShadow: '0 0 10px #FF6C11, 0 0 20px #FF6C11, 0 0 30px #FF6C11',
          },
          to: {
            textShadow: '0 0 20px #FF6C11, 0 0 30px #FF6C11, 0 0 40px #FF6C11',
          },
        },
      },
      fontFamily: {
        'retro': ['var(--font-inter)', 'sans-serif'],
        'display': ['var(--font-inter)', 'sans-serif'],
        'sans': ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;