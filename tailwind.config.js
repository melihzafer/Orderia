/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
        },
        accent: {
          DEFAULT: '#D946EF',
          soft: '#FDF4FF',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#F3F4F6',
        },
        state: {
          pending: {
            bg: '#EDE9FE',
            text: '#6D28D9',
            border: '#C4B5FD'
          },
          delivered: {
            bg: '#D1FAE5',
            text: '#047857',
            border: '#6EE7B7'
          },
          paid: {
            bg: '#E5E7EB',
            text: '#6B7280',
            border: '#D1D5DB'
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace']
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      }
    },
  },
  plugins: [],
}
