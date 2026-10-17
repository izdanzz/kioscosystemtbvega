"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  QrCode, 
  Store, 
  Smartphone, 
  Monitor, 
  ArrowRight, 
  Download 
} from "lucide-react";

export default function HomePage() {
  const [currentOrigin, setCurrentOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  const menuUrl = currentOrigin ? `${currentOrigin}/menu` : "/menu";
  const operadorUrl = currentOrigin ? `${currentOrigin}/operador` : "/operador";
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(menuUrl)}&margin=10`;

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between selection:bg-slate-900 selection:text-white font-sans">
      <div className="max-w-2xl mx-auto w-full px-6 py-12 flex-1 flex flex-col justify-center">
        
        {/* Cabecera Minimalista */}
        <div className="text-center mb-10">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-4 shadow-sm">
            <Store className="h-8 w-8 stroke-[2]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            TB La Vega
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Menú de pedidos y punto de atención
          </p>
        </div>

        {/* QR para Mostrador */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 mb-8 text-center">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 inline-block shadow-xs mb-4">
            <img src={qrApiUrl} alt="Código QR TB La Vega" className="w-44 h-44 mx-auto" />
          </div>
          <p className="text-xs text-slate-600 font-medium mb-3">
            Escanea con la cámara de tu teléfono para hacer tu pedido
          </p>
          <a
            href={qrApiUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-slate-900 font-semibold hover:underline"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Descargar QR para imprimir</span>
          </a>
        </div>

        {/* Enlaces Divididos: Cliente vs Operador */}
        <div className="space-y-3">
          
          {/* Enlace Clientes */}
          <Link
            href="/menu"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-4 px-5 rounded-2xl flex items-center justify-between shadow-xs transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-slate-300" />
              <div className="text-left">
                <span className="block text-sm font-bold">Menú para Clientes</span>
                <span className="block text-xs text-slate-400">Para pedir desde el celular</span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4" />
          </Link>

          {/* Enlace Operador / Caja */}
          <Link
            href="/operador"
            className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 font-semibold py-4 px-5 rounded-2xl flex items-center justify-between transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 text-slate-600" />
              <div className="text-left">
                <span className="block text-sm font-bold">Panel del Operador</span>
                <span className="block text-xs text-slate-500">Para la computadora de caja</span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </Link>

        </div>

      </div>

      <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-100">
        TB La Vega
      </footer>
    </div>
  );
}
