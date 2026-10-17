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

    // Probar conexión con print-server local
    fetch("http://localhost:5000/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.online) setPrintServerReady(true);
      })
      .catch(() => setPrintServerReady(false));
  }, []);

  const menuUrl = currentOrigin ? `${currentOrigin}/menu` : "/menu";
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(menuUrl)}&margin=10`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 flex flex-col justify-between">
      <div className="max-w-5xl mx-auto w-full">
        {/* Cabecera Principal */}
        <header className="flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-slate-800 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Store className="h-6 w-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">KIOSCO POS</h1>
                <span className="bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  v2.0 PRO
                </span>
              </div>
              <p className="text-sm text-slate-400">Sistema Automatizado de Menú QR, Caja en Tiempo Real e Impresión ESC/POS</p>
            </div>
          </div>

          {/* Badges de Estado del Sistema */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-medium ${
              supabaseReady 
                ? "bg-emerald-950/40 border-emerald-700/50 text-emerald-400" 
                : "bg-amber-950/40 border-amber-700/50 text-amber-300"
            }`}>
              <Database className="h-3.5 w-3.5" />
              <span>Supabase DB: {supabaseReady ? "Conectado" : "Pendiente Config"}</span>
            </div>

            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-medium ${
              printServerReady 
                ? "bg-emerald-950/40 border-emerald-700/50 text-emerald-400" 
                : "bg-slate-900 border-slate-700 text-slate-400"
            }`}>
              <Printer className="h-3.5 w-3.5" />
              <span>Print Server: {printServerReady ? "Activo (5000)" : "Inactivo"}</span>
            </div>
          </div>
        </header>

        {/* Alerta si Supabase aún no tiene credenciales en .env.local */}
        {!supabaseReady && (
          <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-300">Paso necesario para datos en vivo:</p>
              <p className="text-slate-300 mt-0.5">
                Pega tus credenciales de Supabase en <code className="bg-slate-900 text-teal-400 px-1.5 py-0.5 rounded text-xs border border-slate-700">.env.local</code> y ejecuta el script <code className="bg-slate-900 text-teal-400 px-1.5 py-0.5 rounded text-xs border border-slate-700">database/schema.sql</code> en el editor SQL de Supabase.
              </p>
            </div>
          </div>
        )}

        {/* Accesos a Módulos Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Tarjeta Menú QR Cliente */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-teal-500/50 transition-all rounded-3xl p-6 flex flex-col justify-between group shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <Smartphone className="h-6 w-6" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
                  Vista Cliente (Móvil)
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mb-2 group-hover:text-teal-300 transition-colors">
                Menú Digital QR
              </h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Interfaz web optimizada para teléfonos. Solicita nombre al cliente, muestra catálogo con stock en vivo, valida disponibilidad y genera comprobante digital.
              </p>

              {/* Vista previa del QR */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-4 mb-6">
                <div className="bg-white p-2 rounded-xl shrink-0">
                  <img src={qrApiUrl} alt="Código QR del Menú" className="w-20 h-20" />
                </div>
                <div className="text-xs text-slate-400">
                  <p className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                    <QrCode className="h-4 w-4 text-teal-400" /> Código QR del Menú
                  </p>
                  <p className="truncate max-w-[200px] text-teal-400 font-mono text-[11px] mb-1">
                    {menuUrl}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Escanea con la cámara de tu móvil para probar el flujo de compra.
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/menu"
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/20"
            >
              <span>Abrir Menú de Clientes</span>
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </Link>
          </div>

          {/* Tarjeta Panel Operador / Caja */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 transition-all rounded-3xl p-6 flex flex-col justify-between group shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Monitor className="h-6 w-6" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  Vista Mostrador (PC)
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
                Panel del Operador / Cajero
              </h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Pantalla en tiempo real con WebSockets para la computadora del kiosco. Notificación sonora instantánea, tarjetas de órdenes entrantes, métricas de venta y cobro con impresión térmica.
              </p>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 mb-6 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Suscripción Realtime a nuevos pedidos</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Alarma de audio automática al recibir compras</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Disparo directo a impresora ESC/POS local (puerto 5000)</span>
                </div>
              </div>
            </div>

            <Link
              href="/operador"
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"
            >
              <span>Abrir Monitor de Caja</span>
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </Link>
          </div>
        </div>

        {/* Guía Rápida de Arquitectura en 3 Pasos */}
        <div className="mt-8 p-6 rounded-3xl bg-slate-900/50 border border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal-400" />
            Flujo Operativo Automatizado
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <span className="font-bold text-teal-400 text-sm block mb-1">1. Cliente en el Kiosco</span>
              <p className="text-slate-400">Escanea el QR, ingresa su nombre, elige productos y confirma su pedido. El comprobante digital le indica ir a caja.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <span className="font-bold text-teal-400 text-sm block mb-1">2. Base de Datos Atómica</span>
              <p className="text-slate-400">PostgreSQL descuenta el stock de forma atómica mediante triggers plpgsql y emite el evento WebSockets.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <span className="font-bold text-teal-400 text-sm block mb-1">3. Cajero y Ticket Térmico</span>
              <p className="text-slate-400">El cajero escucha el aviso sonoro en pantalla, cobra y presiona "Cobrar e Imprimir" emitiendo el ticket físico.</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-12 text-center text-xs text-slate-500 border-t border-slate-900 pt-6">
        Kiosco POS v2.0 • Diseñado para alto rendimiento y estética profesional
      </footer>
    </div>
  );
}
