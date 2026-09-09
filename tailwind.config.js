/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        card: 'var(--card)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        pu: 'var(--pu)',
        pu2: 'var(--pu2)',
        puD: 'var(--puD)',
        puSoft: 'var(--puSoft)',
        te: 'var(--te)',
        teSoft: 'var(--teSoft)',
        or: 'var(--or)',
        orSoft: 'var(--orSoft)',
        rd: 'var(--rd)',
        rdSoft: 'var(--rdSoft)',
        bl: 'var(--bl)',
        blSoft: 'var(--blSoft)',
        pk: 'var(--pk)',
        pkSoft: 'var(--pkSoft)',
        gr: 'var(--gr)',
        grSoft: 'var(--grSoft)',
      },
      borderRadius: {
        card: 'var(--radius)',
      },
      boxShadow: {
        card: 'var(--shadow)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'PingFang SC',
          'Microsoft YaHei',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
