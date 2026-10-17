"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Bell, 
  BellOff, 
  Printer, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  RefreshCw, 
  AlertCircle, 
  Volume2, 
  XCircle, 
  Store,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { playChimeSound } from "@/lib/sound";

export default function PanelOperador() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sonidoHabilitado, setSonidoHabilitado] = useState(true);
  const [printServerOnline, setPrintServerOnline] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("pendiente"); // 'pendiente' | 'cobrado' | 'todos'
  const [procesandoId, setProcesandoId] = useState(null);
  const [notificacionAlerta, setNotificacionAlerta] = useState(null);
  const audioUnlockedRef = useRef(false);

  useEffect(() => {
    verificarPrintServer();
    cargarPedidos();

    // Comprobar print-server periódicamente cada 15 segundos
    const printInterval = setInterval(verificarPrintServer, 15000);

    // Suscripción Realtime a Supabase en tabla 'pedidos'
    let canal = null;
    if (isSupabaseConfigured()) {
      canal = supabase
        .channel("pedidos_kiosco_channel")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "pedidos" },
          async (payload) => {
            dispararAlertaNuevoPedido(payload.new);
            // Recargar para obtener también los detalles de productos relacionados
            cargarPedidos();
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "pedidos" },
          (payload) => {
            setPedidos((prev) =>
              prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
            );
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(printInterval);
      if (canal) supabase.removeChannel(canal);
    };
  }, []);

  const verificarPrintServer = async () => {
    try {
      const res = await fetch("http://localhost:5000/status", { cache: "no-store" });
      const data = await res.json();
      setPrintServerOnline(data.online === true);
    } catch {
      setPrintServerOnline(false);
    }
  };

  const dispararAlertaNuevoPedido = (pedido) => {
    if (sonidoHabilitado) {
      playChimeSound();
    }
    setNotificacionAlerta(`¡Nueva Orden #${pedido.id} de ${pedido.cliente_nombre}!`);
    setTimeout(() => setNotificacionAlerta(null), 6000);
  };

  const cargarPedidos = async () => {
    setCargando(true);
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("pedidos")
          .select("*, detalle_pedido(*, productos(nombre))")
          .order("creado_en", { ascending: false })
          .limit(50);

        if (error) throw error;
        setPedidos(data || []);
      } catch (err) {
        console.error("Error al cargar pedidos de Supabase:", err);
      } finally {
        setCargando(false);
      }
    } else {
      // Pedidos simulados de demostración para primera ejecución
      setPedidos([
        {
          id: 101,
          cliente_nombre: "Martín Gómez",
          estado: "pendiente",
          total: 3900.00,
          metodo_pago: "efectivo",
          creado_en: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
          detalle_pedido: [
            { id: 1, cantidad: 1, precio_unitario: 1500, productos: { nombre: "Coca Cola 500ml" } },
            { id: 2, cantidad: 1, precio_unitario: 2400, productos: { nombre: "Monster Energy 473ml" } }
          ]
        },
        {
          id: 102,
          cliente_nombre: "Lucía Fernández",
          estado: "pendiente",
          total: 1600.00,
          metodo_pago: "transferencia",
          creado_en: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
          detalle_pedido: [
            { id: 3, cantidad: 1, precio_unitario: 1600, productos: { nombre: "Papas Fritas Lays 95g" } }
          ]
        }
      ]);
      setCargando(false);
    }
  };

  const cobrarEImprimir = async (pedido) => {
    setProcesandoId(pedido.id);

    try {
      // 1. Actualizar estado en Supabase
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from("pedidos")
          .update({ estado: "cobrado", actualizado_en: new Date().toISOString() })
          .eq("id", pedido.id);

        if (error) throw error;
      }

      // 2. Actualizar estado local inmediatamente
      setPedidos((prev) =>
        prev.map((p) => (p.id === pedido.id ? { ...p, estado: "cobrado" } : p))
      );

      // 3. Disparar impresión al microservicio local ESC/POS
      try {
        const payloadImpresion = {
          pedidoId: pedido.id,
          cliente_nombre: pedido.cliente_nombre,
          total: pedido.total,
          metodo_pago: pedido.metodo_pago,
          items: pedido.detalle_pedido?.map((d) => ({
            nombre: d.productos?.nombre || "Ítem",
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
            subtotal: d.subtotal || (d.cantidad * d.precio_unitario)
          }))
        };

        const resPrint = await fetch("http://localhost:5000/imprimir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadImpresion)
        });

        const printResult = await resPrint.json();
        if (printResult.success) {
          setNotificacionAlerta(`Pedido #${pedido.id} cobrado e impreso con éxito.`);
        }
      } catch (errPrint) {
        console.warn("No se pudo conectar con el agente de impresión:", errPrint);
        setNotificacionAlerta(`Pedido #${pedido.id} cobrado. (Print Server apagado o no detectado)`);
      }
    } catch (err) {
      console.error("Error al cobrar pedido:", err);
      alert("Error al actualizar pedido: " + err.message);
    } finally {
      setProcesandoId(null);
      setTimeout(() => setNotificacionAlerta(null), 5000);
    }
  };

  const cancelarPedido = async (pedidoId) => {
    if (!confirm(`¿Estás seguro de cancelar la orden #${pedidoId}? El stock será restaurado.`)) return;

    try {
      if (isSupabaseConfigured()) {
        await supabase
          .from("pedidos")
          .update({ estado: "cancelado", actualizado_en: new Date().toISOString() })
          .eq("id", pedidoId);
      }

      setPedidos((prev) =>
        prev.map((p) => (p.id === pedidoId ? { ...p, estado: "cancelado" } : p))
      );
    } catch (e) {
      alert("Error al cancelar pedido: " + e.message);
    }
  };

  // Simulación de prueba de orden entrante
  const crearPedidoPrueba = async () => {
    const nombres = ["Facundo", "Camila", "Rodrigo", "Sofía", "Alejandro"];
    const nombreRandom = nombres[Math.floor(Math.random() * nombres.length)];
    const nuevoId = Math.floor(100 + Math.random() * 900);

    const pedidoMock = {
      id: nuevoId,
      cliente_nombre: `${nombreRandom} (Prueba)`,
      estado: "pendiente",
      total: 3100.00,
      metodo_pago: "efectivo",
      creado_en: new Date().toISOString(),
      detalle_pedido: [
        { id: 10, cantidad: 1, precio_unitario: 1500, productos: { nombre: "Coca Cola 500ml" } },
        { id: 11, cantidad: 1, precio_unitario: 1600, productos: { nombre: "Papas Lays 95g" } }
      ]
    };

    setPedidos((prev) => [pedidoMock, ...prev]);
    dispararAlertaNuevoPedido(pedidoMock);
  };

  // Métricas
  const pendientesCount = pedidos.filter((p) => p.estado === "pendiente").length;
  const cobradosHoy = pedidos.filter((p) => p.estado === "cobrado");
  const totalRecaudado = cobradosHoy.reduce((acc, p) => acc + Number(p.total), 0);

  // Filtrado
  const pedidosFiltrados = pedidos.filter((p) => {
    if (filtroEstado === "todos") return true;
    return p.estado === filtroEstado;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col justify-between">
      <div className="max-w-7xl mx-auto w-full">
        
        {/* Cabecera Superior del Operador */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Store className="h-6 w-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">MONITOR DE CAJA</h1>
                <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  EN TIEMPO REAL
                </span>
              </div>
              <p className="text-xs text-slate-400">Recepción de órdenes de clientes e impresión térmica ESC/POS</p>
            </div>
          </div>

          {/* Controles de Sonido, Impresora y Recarga */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Botón de prueba de sonido */}
            <button
              onClick={() => {
                audioUnlockedRef.current = true;
                playChimeSound();
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold flex items-center gap-1.5 transition active:scale-95"
              title="Probar sonido y desbloquear audio del navegador"
            >
              <Volume2 className="h-4 w-4 text-amber-400" />
              <span>Probar Chime</span>
            </button>

            {/* Switch de Sonido */}
            <button
              onClick={() => setSonidoHabilitado(!sonidoHabilitado)}
              className={`px-3 py-2 rounded-xl border font-semibold flex items-center gap-1.5 transition ${
                sonidoHabilitado
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                  : "bg-slate-900 border-slate-800 text-slate-500"
              }`}
            >
              {sonidoHabilitado ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              <span>{sonidoHabilitado ? "Alarma: ACTIVA" : "Alarma: MUTE"}</span>
            </button>

            {/* Estado del Agente de Impresión */}
            <div
              className={`px-3 py-2 rounded-xl border font-semibold flex items-center gap-1.5 ${
                printServerOnline
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400"
                  : "bg-slate-900 border-slate-800 text-slate-400"
              }`}
              title={printServerOnline ? "Servidor local ESC/POS en puerto 5000 listo" : "Inicia: node print-server/index.js"}
            >
              <Printer className="h-4 w-4" />
              <span>Impresora: {printServerOnline ? "ONLINE" : "OFFLINE"}</span>
            </div>

            {/* Botón de Simulación de Orden */}
            <button
              onClick={crearPedidoPrueba}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black flex items-center gap-1.5 shadow-md shadow-teal-500/20 active:scale-95"
            >
              <Sparkles className="h-4 w-4 stroke-[2.5]" />
              <span>+ Simular Orden</span>
            </button>
          </div>
        </header>

        {/* Notificación Flotante de Alerta */}
        {notificacionAlerta && (
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-teal-500/20 border border-amber-500/40 flex items-center justify-between animate-in fade-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <p className="text-sm font-bold text-amber-300">{notificacionAlerta}</p>
            </div>
            <button
              onClick={() => setNotificacionAlerta(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Barra de Estadísticas y Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
          <div className="bg-slate-900/70 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                Órdenes Pendientes
              </span>
              <span className="text-3xl font-black text-white mt-1 block">
                {pendientesCount}
              </span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-slate-900/70 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                Recaudado Hoy
              </span>
              <span className="text-3xl font-black text-emerald-400 mt-1 block">
                ${totalRecaudado.toLocaleString("es-AR")}
              </span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Pedidos Cobrados
              </span>
              <span className="text-3xl font-black text-white mt-1 block">
                {cobradosHoy.length}
              </span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltroEstado("pendiente")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                filtroEstado === "pendiente"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Pendientes ({pendientesCount})
            </button>
            <button
              onClick={() => setFiltroEstado("cobrado")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                filtroEstado === "cobrado"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Cobrados ({cobradosHoy.length})
            </button>
            <button
              onClick={() => setFiltroEstado("todos")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                filtroEstado === "todos"
                  ? "bg-slate-700 text-white"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Todos ({pedidos.length})
            </button>
          </div>

          <button
            onClick={cargarPedidos}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:text-white text-slate-400 transition"
            title="Actualizar listado"
          >
            <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin text-teal-400" : ""}`} />
          </button>
        </div>

        {/* Grilla de Tarjetas de Pedidos */}
        <main>
          {pedidosFiltrados.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl">
              <Clock className="h-12 w-12 mx-auto stroke-1 text-slate-600 mb-3" />
              <p className="text-lg font-bold text-slate-400">No hay pedidos en esta sección</p>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                Cuando los clientes confirmen órdenes desde el código QR, aparecerán aquí automáticamente en tiempo real.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pedidosFiltrados.map((pedido) => {
                const esPendiente = pedido.estado === "pendiente";
                const esCobrado = pedido.estado === "cobrado";
                const estaProcesando = procesandoId === pedido.id;

                return (
                  <div
                    key={pedido.id}
                    className={`rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 shadow-xl relative overflow-hidden ${
                      esPendiente
                        ? "bg-slate-900 border-2 border-amber-500/80 shadow-amber-500/10 ring-1 ring-amber-500/30"
                        : esCobrado
                        ? "bg-slate-900/60 border border-emerald-900/40 opacity-80"
                        : "bg-slate-900/40 border border-slate-800 opacity-60"
                    }`}
                  >
                    {/* Indicador superior de estado */}
                    {esPendiente && (
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 to-yellow-500" />
                    )}

                    <div>
                      {/* Cabecera de la Tarjeta */}
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-xs text-slate-400 font-mono block">
                            ORDEN #{pedido.id}
                          </span>
                          <h3 className="text-xl font-black text-white capitalize">
                            {pedido.cliente_nombre}
                          </h3>
                        </div>

                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                            esPendiente
                              ? "bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse"
                              : esCobrado
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                              : "bg-rose-500/20 border-rose-500/40 text-rose-400"
                          }`}
                        >
                          {pedido.estado}
                        </span>
                      </div>

                      {/* Método de pago & Hora */}
                      <div className="flex items-center justify-between text-xs text-slate-400 pb-3 mb-3 border-b border-slate-800">
                        <span className="bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 font-mono uppercase text-[11px]">
                          Pago: {pedido.metodo_pago}
                        </span>
                        <span>
                          {new Date(pedido.creado_en).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>

                      {/* Lista de Productos del Detalle */}
                      <div className="space-y-2 py-2">
                        {pedido.detalle_pedido && pedido.detalle_pedido.length > 0 ? (
                          pedido.detalle_pedido.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm text-slate-300">
                              <span className="font-medium">
                                <strong className="text-amber-400 font-bold">{item.cantidad}x</strong>{" "}
                                {item.productos?.nombre || item.nombre || "Producto"}
                              </span>
                              <span className="font-mono text-slate-400 text-xs">
                                ${(item.subtotal || item.cantidad * item.precio_unitario).toFixed(2)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500 italic">Detalle de productos registrado</p>
                        )}
                      </div>

                      {pedido.notas && (
                        <div className="mt-2 p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-200">
                          <strong>Nota:</strong> {pedido.notas}
                        </div>
                      )}
                    </div>

                    {/* Total y Botón de Acción */}
                    <div className="mt-6 pt-4 border-t border-slate-800">
                      <div className="flex justify-between items-baseline mb-4">
                        <span className="text-xs uppercase font-bold text-slate-400">Total a Cobrar</span>
                        <span className="text-3xl font-black text-emerald-400">
                          ${Number(pedido.total).toFixed(2)}
                        </span>
                      </div>

                      {esPendiente ? (
                        <div className="space-y-2">
                          <button
                            onClick={() => cobrarEImprimir(pedido)}
                            disabled={estaProcesando}
                            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black py-3.5 px-4 rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition disabled:opacity-50"
                          >
                            {estaProcesando ? (
                              <span className="flex items-center gap-2">
                                <span className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                                Cobrando & Imprimiendo...
                              </span>
                            ) : (
                              <>
                                <Printer className="h-5 w-5 stroke-[2.5]" />
                                <span>COBRAR E IMPRIMIR</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => cancelarPedido(pedido.id)}
                            className="w-full text-xs text-slate-500 hover:text-rose-400 py-1.5 transition text-center"
                          >
                            Cancelar Pedido
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                            <CheckCircle2 className="h-4 w-4" /> Cobrado & Atendido
                          </span>
                          <button
                            onClick={() => cobrarEImprimir(pedido)}
                            className="hover:text-slate-300 flex items-center gap-1 underline text-[11px]"
                          >
                            <Printer className="h-3 w-3" /> Re-imprimir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <footer className="mt-12 text-center text-xs text-slate-500 border-t border-slate-900 pt-6">
        Kiosco POS v2.0 • Terminal de Operador conectado a Supabase Realtime & ESC/POS Local
      </footer>
    </div>
  );
}
