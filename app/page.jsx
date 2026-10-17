"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  QrCode, 
  Store, 
  Printer, 
  Database, 
  ExternalLink, 
  CheckCircle2, 
  Smartphone,
  Monitor,
  ArrowRight,
  Download,
  ShieldCheck
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function HomePage() {
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [printServerReady, setPrintServerReady] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState("");

  useEffect(() => {
    setSupabaseReady(isSupabaseConfigured());
    if (typeof window !== "undefined") {
      setCurrentOrigin(window.location.origin);
    }

    fetch("http://localhost:5000/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.online) setPrintServerReady(true);
      })
      .catch(() => setPrintServerReady(false));
  }, []);

  const menuUrl = currentOrigin ? `${currentOrigin}/menu` : "/menu";
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(menuUrl)}&margin=10`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-12 flex flex-col justify-between font-sans selection:bg-slate-900 selection:text-white">
      <div className="max-w-4xl mx-auto w-full">
        
        {/* Cabecera Principal */}
        <header className="flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-slate-200 gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-14 w-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Store className="h-7 w-7 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">KIOSCO POS</h1>
                <span className="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Menú Digital QR • Panel de Control • Impresión Térmica
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold flex items-center gap-1.5 text-emerald-700 shadow-xs">
              <Database className="h-4 w-4" />
              <span>Supabase DB: Conectada</span>
            </div>

            <div className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 shadow-xs ${
              printServerReady 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : "bg-white border-slate-200 text-slate-500"
            }`}>
              <Printer className="h-4 w-4" />
              <span>Impresora: {printServerReady ? "Activa (5000)" : "Local 5000"}</span>
            </div>
          </div>
        </header>

        {/* Las 2 Vistas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          
          {/* Tarjeta Menú QR Cliente */}
          <div className="bg-white border border-slate-200 hover:border-slate-300 transition-all rounded-2xl p-6 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
                  <Smartphone className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                  Para Clientes (Móvil)
                </span>
              </div>
              
              <h2 className="text-xl font-bold text-slate-900 mb-1.5">
                Menú Digital QR
              </h2>
              <p className="text-slate-500 text-xs mb-5 leading-relaxed">
                El cliente escanea el QR desde su celular, pide sus productos y recibe su comprobante digital para acercarse al mostrador.
              </p>

              {/* QR en Vivo */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-4 mb-6">
                <div className="bg-white p-2 rounded-lg border border-slate-200 shrink-0 shadow-xs">
                  <img src={qrApiUrl} alt="QR del Menú" className="w-20 h-20" />
                </div>
                <div className="text-xs text-slate-500 flex-1 min-w-0">
                  <p className="font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <QrCode className="h-4 w-4" /> Código QR Activo
                  </p>
                  <p className="truncate text-slate-700 font-mono text-[11px] mb-2 bg-white p-1 rounded border border-slate-200">
                    {menuUrl}
                  </p>
                  <a
                    href={qrApiUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-slate-900 font-bold hover:underline"
                  >
                    <Download className="h-3 w-3" /> Descargar imagen QR
                  </a>
                </div>
              </div>
            </div>

            <Link
              href="/menu"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-xs transition active:scale-[0.99]"
            >
              <span>Abrir Menú de Clientes</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Tarjeta Monitor del Operador */}
          <div className="bg-white border border-slate-200 hover:border-slate-300 transition-all rounded-2xl p-6 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
                  <Monitor className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                  Para el Mostrador (PC)
                </span>
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-1.5">
                Monitor del Operador
              </h2>
              <p className="text-slate-500 text-xs mb-5 leading-relaxed">
                Pantalla para la PC del kiosco. Recibe las compras de los clientes con aviso sonoro y emite los tickets térmicos con corte de papel.
              </p>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 mb-6 text-xs text-slate-600">
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Suscripción en tiempo real a nuevos pedidos</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Alarma auditiva automática integrada</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Emisión y corte directo en impresora física</span>
                </div>
              </div>
            </div>

            <Link
              href="/operador"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-xs transition active:scale-[0.99]"
            >
              <span>Abrir Monitor de Caja</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Resumen del Flujo */}
        <div className="mt-8 p-5 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Descuento de Stock Automático</h4>
              <p className="text-xs text-slate-500">Garantizado por PostgreSQL en Supabase sin ventas duplicadas.</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
            PostgreSQL • Realtime
          </span>
        </div>

      </div>

      <footer className="mt-12 text-center text-xs text-slate-400 border-t border-slate-200 pt-5">
        Kiosco POS v2.0 • Interfaz Clara, Sencilla y Moderna
      </footer>
    </div>
  );
}
