import "./globals.css";

export const metadata = {
  title: "Kiosco POS V2.0 - Menú QR & Facturación",
  description: "Sistema POS Automatizado con Menú QR para Clientes y Panel de Operador con Impresión Térmica",
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
      <body className="antialiased selection:bg-teal-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
