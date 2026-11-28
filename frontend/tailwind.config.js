/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      // `next/font` publishes the chosen typeface as the `--font-sans`
      // variable on the <html> element (see src/app/layout.tsx). The
      // `font-sans` utility has to read that variable, otherwise the
      // website renders in the system UI font and the webfont is served
      // without ever being used.
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
    },
  },
  plugins: [],
};
