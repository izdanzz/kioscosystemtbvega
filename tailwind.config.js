/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tb: {
          dark: '#001D20',       // Color primario oscuro de tblavega.com (Deep Petrol Teal)
          darker: '#001315',     // Tono más profundo
          emerald: '#055346',    // Verde bosque esmeralda
          gold: '#FFDE95',       // Dorado champagne / acento de tblavega.com
          'gold-hover': '#f3c395',
          sand: '#EEEBE5',       // Crema cálido lino de tblavega.com
          cream: '#F1F4F3',      // Fondo sutil off-white
          terracotta: '#B38D79', // Acento cuero/terracota
          muted: '#526061',      // Gris verdoso para texto secundario
        }
      },
      fontFamily: {
        serif: ['"EB Garamond"', 'Georgia', 'serif'],
        sans: ['"Outfit"', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
