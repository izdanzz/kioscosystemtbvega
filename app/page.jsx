"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Smartphone, 
  Monitor, 
  ArrowRight, 
  Download,
  Coffee,
  MapPin
} from "lucide-react";

export default function HomePage() {
  const [currentOrigin, setCurrentOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  const menuUrl = currentOrigin ? `${currentOrigin}/menu` : "/menu";
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(menuUrl)}&margin=10`;

  return (
    <div className="min-h-screen bg-[#F1F4F3] text-tb-dark flex flex-col justify-between selection:bg-tb-dark selection:text-tb-gold font-sans">
      
      {/* Barra Superior Decorativa en Verde Petróleo Oscuro de tblavega.com */}
      <div className="h-2 w-full bg-gradient-to-r from-tb-dark via-tb-emerald to-tb-dark"></div>

      <div className="max-w-xl mx-auto w-full px-5 py-10 flex-1 flex flex-col justify-center">
        
        {/* Cabecera Oficial Templo Bíblico La Vega */}
        <div className="text-center mb-8">
          <div className="inline-block p-3 rounded-2xl bg-white shadow-sm border border-tb-sand/80 mb-4">
            <img 
              src="https://assets.cdn.filesafe.space/SzYXoLdE37ybSNUMDx8V/media/7fe3f97b-2a5c-46ab-9176-504c273b278b.png" 
              alt="Templo Bíblico La Vega" 
              className="h-16 w-auto mx-auto object-contain"
            />
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-tb-dark">
            Templo Bíblico La Vega
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="h-px w-6 bg-tb-terracotta/40"></span>
            <p className="text-xs uppercase tracking-widest font-semibold text-tb-terracotta">
              Cafetería & Kiosco Digital
            </p>
            <span className="h-px w-6 bg-tb-terracotta/40"></span>
          </div>
          <p className="text-xs text-tb-muted mt-1">
            Realiza tu pedido desde tu celular en Pesos Dominicanos (DOP)
          </p>
        </div>

        {/* Tarjeta del Código QR para el Mostrador */}
        <div className="bg-white border border-[#E2DFD8] rounded-3xl p-6 mb-7 text-center shadow-xs">
          <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-tb-sand inline-block shadow-inner mb-3">
            <img 
              src={qrApiUrl} 
              alt="Código QR TB La Vega" 
              className="w-44 h-44 mx-auto rounded-xl" 
            />
          </div>
          
          <h3 className="font-serif font-bold text-base text-tb-dark">
            Escanea para ordenar
          </h3>
          <p className="text-xs text-tb-muted mt-0.5 mb-3">
            Apunta la cámara de tu teléfono para abrir el menú sin instalar nada
          </p>

          <a
            href={qrApiUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-tb-dark font-bold hover:text-tb-emerald transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Descargar código QR para imprimir</span>
          </a>
        </div>

        {/* Enlaces Divididos: Cliente vs Operador */}
        <div className="space-y-3.5">
          
          {/* Enlace Clientes (Diseño Estilo Hero Button de tblavega.com) */}
          <Link
            href="/menu"
            className="w-full bg-tb-dark hover:bg-tb-emerald text-white p-4.5 rounded-2xl flex items-center justify-between shadow-md transition-all active:scale-[0.99] border border-tb-gold/20 group"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-tb-gold/15 flex items-center justify-center text-tb-gold group-hover:scale-105 transition">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="text-left">
                <span className="block text-sm font-bold text-white font-serif tracking-wide">
                  Menú Digital para Clientes
                </span>
                <span className="block text-xs text-tb-gold/90 mt-0.5">
                  Ver productos, fotos, precios en DOP y ordenar
                </span>
              </div>
            </div>
            <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-tb-gold group-hover:translate-x-1 transition">
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          {/* Enlace Operador / Caja */}
          <Link
            href="/operador"
            className="w-full bg-white hover:bg-[#FAF8F5] border border-[#E2DFD8] text-tb-dark p-4 rounded-2xl flex items-center justify-between shadow-xs transition-all active:scale-[0.99] group"
          >
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-[#EEEBE5] flex items-center justify-center text-tb-dark group-hover:scale-105 transition">
                <Monitor className="h-5 w-5" />
              </div>
              <div className="text-left">
                <span className="block text-sm font-bold text-tb-dark font-serif tracking-wide">
                  Panel de Caja y Mostrador
                </span>
                <span className="block text-xs text-tb-muted mt-0.5">
                  Control de pedidos en vivo, cobros, fiado e inventario
                </span>
              </div>
            </div>
            <div className="h-9 w-9 rounded-full bg-tb-sand flex items-center justify-center text-tb-dark group-hover:translate-x-1 transition">
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

        </div>

      </div>

      {/* Pie de Página con Información de Contacto de tblavega.com */}
      <footer className="text-center py-6 px-4 text-xs text-tb-muted border-t border-[#E2DFD8] bg-white space-y-1">
        <div className="flex items-center justify-center gap-1.5 text-tb-dark font-medium">
          <MapPin className="h-3.5 w-3.5 text-tb-terracotta" />
          <span>Calle Sánchez #111, La Vega, República Dominicana</span>
        </div>
        <p className="text-[11px] text-tb-muted">
          © {new Date().getFullYear()} Templo Bíblico La Vega • Todos los derechos reservados
        </p>
      </footer>
    </div>
  );
}
