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
  AlertCircle,
  Smartphone,
  Monitor,
  ArrowRight,
  ShieldCheck,
  Download,
  Share2,
  Sparkles
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 flex flex-col justify-between selection:bg-teal-500 selection:text-slate-950 font-sans relative overflow-hidden">
      {/* Luces difuminadas de fondo */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto w-full relative z-10">
        
        {/* Cabecera Principal */}
        <header className="flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-slate-800/80 gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-3xl bg-gradient-to-tr from-teal-400 via-teal-500 to-emerald-400 p-0.5 shadow-2xl shadow-teal-500/20">
              <div className="h-full w-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                <Store className="h-8 w-8 text-teal-400 stroke-[2.2]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-3xl font-black tracking-tight text-white">KIOSCO POS</h1>
                <span className="bg-gradient-to-r from-teal-500/20 to-emerald-500/20 border border-teal-500/40 text-teal-300 text-xs px-3 py-1 rounded-full font-black tracking-wide">
                  v2.0 PRO
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                Menú QR Autónomo • Supabase Realtime • Impresión Térmica USB ESC/POS
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="px-3.5 py-2 rounded-2xl border font-bold flex items-center gap-2 bg-emerald-950/40 border-emerald-500/40 text-emerald-400 shadow-sm">
              <Database className="h-4 w-4" />
              <span>Base de Datos: ACTIVA</span>
            </div>

            <div className={`px-3.5 py-2 rounded-2xl border font-bold flex items-center gap-2 ${
              printServerReady 
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400" 
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}>
              <Printer className="h-4 w-4" />
              <span>Print Agent: {printServerReady ? "ONLINE (5000)" : "LOCAL 5000"}</span>
            </div>
          </div>
        </header>

        {/* Acceso a las 2 Vistas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          
          {/* Tarjeta Menú Digital QR */}
          <div className="bg-slate-900/60 border border-slate-800/80 hover:border-teal-500/50 transition-all duration-300 rounded-3xl p-7 flex flex-col justify-between group shadow-xl relative overflow-hidden backdrop-blur-sm">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="h-12 w-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <Smartphone className="h-6 w-6" />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
                  Clientes (Móvil)
                </span>
              </div>
              
              <h2 className="text-2xl font-black text-white mb-2 group-hover:text-teal-300 transition-colors">
                Menú Digital QR
              </h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                El cliente escanea el código, escribe su nombre, navega el catálogo en vivo con descuento automático de stock y genera su ticket digital.
              </p>

              {/* Generador de QR en Vivo */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 flex items-center gap-4 mb-6 shadow-inner">
                <div className="bg-white p-2 rounded-xl shrink-0 shadow-md">
                  <img src={qrApiUrl} alt="QR del Menú" className="w-20 h-20" />
                </div>
                <div className="text-xs text-slate-400 flex-1 min-w-0">
                  <p className="font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                    <QrCode className="h-4 w-4 text-teal-400" /> Código QR Listo
                  </p>
                  <p className="truncate text-teal-400 font-mono text-[11px] mb-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                    {menuUrl}
                  </p>
                  <a
                    href={qrApiUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 font-bold"
                  >
                    <Download className="h-3 w-3" /> Descargar imagen QR
                  </a>
                </div>
              </div>
            </div>

            <Link
              href="/menu"
              className="w-full bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-slate-950 font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-teal-500/20 active:scale-[0.98]"
            >
              <span>Abrir Menú Móvil</span>
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </Link>
          </div>

          {/* Tarjeta Panel del Operador */}
          <div className="bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/50 transition-all duration-300 rounded-3xl p-7 flex flex-col justify-between group shadow-xl relative overflow-hidden backdrop-blur-sm">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Monitor className="h-6 w-6" />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  Caja / Mostrador (PC)
                </span>
              </div>

              <h2 className="text-2xl font-black text-white mb-2 group-hover:text-amber-300 transition-colors">
                Monitor de Operador
              </h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Pantalla en tiempo real con WebSockets para la PC del cajero. Recibe órdenes al instante con campanilla acústica, control de totales y botón de cobro e impresión térmica.
              </p>

              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-2.5 mb-6 text-xs text-slate-300 shadow-inner">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Suscripción Supabase Realtime WebSockets activa</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Alarma acústica automática integrada</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Disparo directo al Agente de Impresión Local</span>
                </div>
              </div>
            </div>

            <Link
              href="/operador"
              className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-500/20 active:scale-[0.98]"
            >
              <span>Abrir Monitor de Caja</span>
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </Link>
          </div>
        </div>

        {/* Banner Informativo */}
        <div className="mt-8 p-6 rounded-3xl bg-slate-900/40 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Descuento Atómico de Stock Activo</h4>
              <p className="text-xs text-slate-400">Los triggers plpgsql aseguran que el stock no se duplique ni se venda de más.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-teal-400 font-mono">
            <span>PostgreSQL + Realtime</span>
          </div>
        </div>

      </div>

      <footer className="mt-12 text-center text-xs text-slate-600 border-t border-slate-900 pt-6">
        Kiosco POS v2.0 • Diseñado para máxima velocidad, estética y fiabilidad
      </footer>
    </div>
  );
}
