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
  Filter,
  Plus,
  ArrowUpRight,
  Check,
  X
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { playChimeSound } from "@/lib/sound";

export default function PanelOperador() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sonidoHabilitado, setSonidoHabilitado] = useState(true);
  const [printServerOnline, setPrintServerOnline] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("pendiente");
  const [procesandoId, setProcesandoId] = useState(null);
  const [notificacionAlerta, setNotificacionAlerta] = useState(null);
  const [mostrarModalManual, setMostrarModalManual] = useState(false);
  const [nuevoManualCliente, setNuevoManualCliente] = useState("");
  const [nuevoManualTotal, setNuevoManualTotal] = useState("");
  const [nuevoManualMetodo, setNuevoManualMetodo] = useState("efectivo");
  const [ticketImpresoPreview, setTicketImpresoPreview] = useState(null);

  useEffect(() => {
    verificarPrintServer();
    cargarPedidos();

    const printInterval = setInterval(verificarPrintServer, 10000);

    let canal = null;
    if (isSupabaseConfigured()) {
      canal = supabase
        .channel("pedidos_kiosco_channel_v2")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "pedidos" },
          (payload) => {
            dispararAlertaNuevoPedido(payload.new);
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
    setNotificacionAlerta({
      id: pedido.id,
      cliente: pedido.cliente_nombre,
      total: pedido.total
    });
    setTimeout(() => setNotificacionAlerta(null), 8000);
  };

  const cargarPedidos = async () => {
    setCargando(true);
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("pedidos")
          .select("*, detalle_pedido(*, productos(nombre))")
          .order("creado_en", { ascending: false })
          .limit(60);

        if (error) throw error;
        setPedidos(data || []);
      } catch (err) {
        console.error("Error al cargar pedidos de Supabase:", err);
      } finally {
        setCargando(false);
      }
    } else {
      setPedidos([
        {
          id: 101,
          cliente_nombre: "Martín Gómez",
          estado: "pendiente",
          total: 3900.00,
          metodo_pago: "efectivo",
          creado_en: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
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
          creado_en: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
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
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from("pedidos")
          .update({ estado: "cobrado", actualizado_en: new Date().toISOString() })
          .eq("id", pedido.id);

        if (error) throw error;
      }

      setPedidos((prev) =>
        prev.map((p) => (p.id === pedido.id ? { ...p, estado: "cobrado" } : p))
      );

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
        if (printResult.preview) {
          setTicketImpresoPreview(printResult.preview);
        }
      } catch (errPrint) {
        console.warn("Agente de impresión offline:", errPrint);
      }
    } catch (err) {
      console.error("Error al cobrar pedido:", err);
      alert("Error: " + err.message);
    } finally {
      setProcesandoId(null);
    }
  };

  const cancelarPedido = async (pedidoId) => {
    if (!confirm(`¿Deseas anular la orden #${pedidoId}? El inventario se restaurará en la base de datos.`)) return;

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
      alert("Error al cancelar: " + e.message);
    }
  };

  const crearPedidoPrueba = async () => {
    const nombres = ["Camila Rivas", "Lucas Benítez", "Julieta Sosa", "Matías Albornoz", "Carolina Duarte"];
    const nombreRandom = nombres[Math.floor(Math.random() * nombres.length)];
    const nuevoId = Math.floor(100 + Math.random() * 900);

    const pedidoMock = {
      id: nuevoId,
      cliente_nombre: nombreRandom,
      estado: "pendiente",
      total: 3700.00,
      metodo_pago: Math.random() > 0.5 ? "efectivo" : "transferencia",
      creado_en: new Date().toISOString(),
      detalle_pedido: [
        { id: 10, cantidad: 1, precio_unitario: 1500, productos: { nombre: "Coca Cola 500ml" } },
        { id: 11, cantidad: 1, precio_unitario: 2200, productos: { nombre: "Chocolate Milka Oreo" } }
      ]
    };

    setPedidos((prev) => [pedidoMock, ...prev]);
    dispararAlertaNuevoPedido(pedidoMock);
  };

  const pendientesCount = pedidos.filter((p) => p.estado === "pendiente").length;
  const cobradosHoy = pedidos.filter((p) => p.estado === "cobrado");
  const totalRecaudado = cobradosHoy.reduce((acc, p) => acc + Number(p.total), 0);

  const pedidosFiltrados = pedidos.filter((p) => {
    if (filtroEstado === "todos") return true;
    return p.estado === filtroEstado;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-amber-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto w-full p-4 md:p-8">
        
        {/* Barra Superior con Métricas y Controles */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 border-b border-slate-800/80 gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-500 to-yellow-500 p-0.5 shadow-xl shadow-amber-500/20">
              <div className="h-full w-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Store className="h-7 w-7 text-amber-400 stroke-[2.2]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">MONITOR DE CAJA</h1>
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider">
                  REALTIME
                </span>
              </div>
              <p className="text-xs text-slate-400">Punto de Cobro y Facturación Térmica ESC/POS</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <button
              onClick={playChimeSound}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold flex items-center gap-1.5 transition active:scale-95"
            >
              <Volume2 className="h-4 w-4 text-amber-400" />
              <span>Chime Test</span>
            </button>

            <button
              onClick={() => setSonidoHabilitado(!sonidoHabilitado)}
              className={`px-3.5 py-2 rounded-xl border font-bold flex items-center gap-1.5 transition ${
                sonidoHabilitado
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                  : "bg-slate-900 border-slate-800 text-slate-500"
              }`}
            >
              {sonidoHabilitado ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              <span>{sonidoHabilitado ? "Alarma ON" : "Alarma MUTE"}</span>
            </button>

            <div
              className={`px-3.5 py-2 rounded-xl border font-bold flex items-center gap-1.5 ${
                printServerOnline
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400 shadow-sm shadow-emerald-500/10"
                  : "bg-slate-900 border-slate-800 text-slate-400"
              }`}
            >
              <Printer className="h-4 w-4" />
              <span>Impresora: {printServerOnline ? "ONLINE" : "LOCAL 5000"}</span>
            </div>

            <button
              onClick={crearPedidoPrueba}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black flex items-center gap-1.5 shadow-lg shadow-teal-500/20 active:scale-95 transition"
            >
              <Sparkles className="h-4 w-4 stroke-[2.5]" />
              <span>+ Simular Orden</span>
            </button>
          </div>
        </header>

        {/* Notificación Flotante con Alarma */}
        {notificacionAlerta && (
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-teal-500/20 border border-amber-500/50 flex items-center justify-between shadow-2xl animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <div>
                <span className="text-sm font-black text-amber-300">
                  ¡NUEVO PEDIDO #{notificacionAlerta.id} de {notificacionAlerta.cliente}!
                </span>
                <span className="text-xs text-slate-300 ml-2">
                  Total: ${Number(notificacionAlerta.total).toLocaleString("es-AR")}
                </span>
              </div>
            </div>
            <button
              onClick={() => setNotificacionAlerta(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1"
            >
              Entendido
            </button>
          </div>
        )}

        {/* Tarjetas KPI de Estado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
          <div className="bg-slate-900/60 border border-amber-500/30 rounded-3xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden group">
            <div className="relative z-10">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
                Órdenes en Espera
              </span>
              <span className="text-4xl font-black text-white mt-1 block">
                {pendientesCount}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Esperando cobro en caja</span>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="h-7 w-7" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-emerald-500/30 rounded-3xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden group">
            <div className="relative z-10">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block">
                Total Cobrado Hoy
              </span>
              <span className="text-4xl font-black text-emerald-400 mt-1 block tracking-tight">
                ${totalRecaudado.toLocaleString("es-AR")}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">{cobradosHoy.length} tickets facturados</span>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <DollarSign className="h-7 w-7" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden group">
            <div className="relative z-10">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                Total Registros
              </span>
              <span className="text-4xl font-black text-white mt-1 block">
                {pedidos.length}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Historial en sesión</span>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-300 shrink-0">
              <CheckCircle2 className="h-7 w-7" />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltroEstado("pendiente")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                filtroEstado === "pendiente"
                  ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Pendientes ({pendientesCount})
            </button>
            <button
              onClick={() => setFiltroEstado("cobrado")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                filtroEstado === "cobrado"
                  ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Cobrados ({cobradosHoy.length})
            </button>
            <button
              onClick={() => setFiltroEstado("todos")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
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
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:text-white text-slate-400 transition"
            title="Recargar"
          >
            <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin text-teal-400" : ""}`} />
          </button>
        </div>

        {/* Grilla de Tarjetas */}
        <main>
          {pedidosFiltrados.length === 0 ? (
            <div className="text-center py-24 bg-slate-900/30 border border-dashed border-slate-800/80 rounded-3xl">
              <Clock className="h-14 w-14 mx-auto stroke-1 text-slate-700 mb-3" />
              <p className="text-lg font-bold text-slate-300">No hay pedidos en esta sección</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Las órdenes creadas por los clientes mediante el código QR aparecerán aquí en vivo.
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
                        ? "bg-slate-900 border-2 border-amber-400/90 shadow-2xl shadow-amber-500/10 ring-2 ring-amber-500/20"
                        : esCobrado
                        ? "bg-slate-900/60 border border-emerald-900/50 opacity-80"
                        : "bg-slate-900/40 border border-slate-800 opacity-60"
                    }`}
                  >
                    {esPendiente && (
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 to-yellow-400" />
                    )}

                    <div>
                      {/* Encabezado Orden */}
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-[11px] text-slate-500 font-mono block font-bold">
                            ORDEN #{pedido.id}
                          </span>
                          <h3 className="text-xl font-black text-white capitalize leading-tight">
                            {pedido.cliente_nombre}
                          </h3>
                        </div>

                        <span
                          className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                            esPendiente
                              ? "bg-amber-400/20 border-amber-400/50 text-amber-300 animate-pulse"
                              : esCobrado
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                              : "bg-rose-500/20 border-rose-500/40 text-rose-400"
                          }`}
                        >
                          {pedido.estado}
                        </span>
                      </div>

                      {/* Método de pago & Hora */}
                      <div className="flex items-center justify-between text-xs text-slate-400 pb-3 mb-3 border-b border-slate-800/80">
                        <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 font-mono uppercase text-[11px] font-bold text-slate-300">
                          {pedido.metodo_pago === "efectivo" ? "💵 EFECTIVO" : "💳 TRANSFERENCIA / QR"}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {new Date(pedido.creado_en).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>

                      {/* Lista de Productos */}
                      <div className="space-y-2 py-2">
                        {pedido.detalle_pedido && pedido.detalle_pedido.length > 0 ? (
                          pedido.detalle_pedido.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm text-slate-300">
                              <span className="font-medium">
                                <strong className="text-amber-400 font-black">{item.cantidad}x</strong>{" "}
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
                        <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-200">
                          <strong>Nota:</strong> {pedido.notas}
                        </div>
                      )}
                    </div>

                    {/* Total y Acción */}
                    <div className="mt-6 pt-4 border-t border-slate-800/80">
                      <div className="flex justify-between items-baseline mb-4">
                        <span className="text-xs uppercase font-bold text-slate-400">Total a Cobrar</span>
                        <span className="text-3xl font-black text-emerald-400 tracking-tight">
                          ${Number(pedido.total).toFixed(2)}
                        </span>
                      </div>

                      {esPendiente ? (
                        <div className="space-y-2">
                          <button
                            onClick={() => cobrarEImprimir(pedido)}
                            disabled={estaProcesando}
                            className="w-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black py-4 px-4 rounded-2xl text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/25 active:scale-[0.98] transition disabled:opacity-50"
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
                            Anular Orden
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                            <CheckCircle2 className="h-4 w-4" /> Cobrado & Finalizado
                          </span>
                          <button
                            onClick={() => cobrarEImprimir(pedido)}
                            className="hover:text-white flex items-center gap-1 underline text-[11px]"
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

      {/* Modal Vista Previa de Ticket Térmico */}
      {ticketImpresoPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
              <span className="font-bold text-xs uppercase text-teal-400 flex items-center gap-1.5">
                <Printer className="h-4 w-4" /> Ticket Térmico Emitido
              </span>
              <button
                onClick={() => setTicketImpresoPreview(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-emerald-400 font-mono text-[11px] leading-tight overflow-x-auto whitespace-pre">
              {ticketImpresoPreview}
            </pre>
            <button
              onClick={() => setTicketImpresoPreview(null)}
              className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs"
            >
              Cerrar Vista Previa
            </button>
          </div>
        </div>
      )}

      <footer className="text-center text-xs text-slate-600 border-t border-slate-900 py-6">
        Kiosco POS v2.0 • Diseñado para máxima velocidad en mostrador
      </footer>
    </div>
  );
}
