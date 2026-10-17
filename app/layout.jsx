import "./globals.css";

export const metadata = {
  title: "TB La Vega",
  description: "Menú de pedidos y punto de atención TB La Vega",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="antialiased selection:bg-slate-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
