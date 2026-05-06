import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      typography: {
        invert: {
          css: {
            '--tw-prose-body': '#d6d3d1',
            '--tw-prose-headings': '#fafaf9',
          },
        },
      },
    },
  },
  plugins: [],
}
export default config
