"use client";

import { useState, useEffect } from "react";
import { 
  Bell, 
  BellOff, 
  Printer, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  RefreshCw, 
  Store,
  Volume2, 
  Sparkles,
  ChevronRight,
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
  const [ticketImpresoPreview, setTicketImpresoPreview] = useState(null);

  useEffect(() => {
    verificarPrintServer();
    cargarPedidos();

    const printInterval = setInterval(verificarPrintServer, 10000);

    let canal = null;
    if (isSupabaseConfigured()) {
      canal = supabase
        .channel("pedidos_kiosco_light")
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
        console.error("Error al cargar pedidos:", err);
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
        console.warn("Print server offline:", errPrint);
      }
    } catch (err) {
      console.error("Error al cobrar pedido:", err);
      alert("Error: " + err.message);
    } finally {
      setProcesandoId(null);
    }
  };

  const cancelarPedido = async (pedidoId) => {
    if (!confirm(`¿Deseas anular la orden #${pedidoId}? El stock se devolverá al inventario.`)) return;

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
      alert("Error al anular: " + e.message);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans">
      <div className="max-w-7xl mx-auto w-full p-4 md:p-8">
        
        {/* Cabecera Superior Clara */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 border-b border-slate-200 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Store className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">MONITOR DE CAJA</h1>
                <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  En Vivo
                </span>
              </div>
              <p className="text-xs text-slate-500">Recepción de órdenes e impresión de tickets térmicos</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={playChimeSound}
              className="px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-xs"
            >
              <Volume2 className="h-4 w-4 text-slate-600" />
              <span>Probar Alerta</span>
            </button>

            <button
              onClick={() => setSonidoHabilitado(!sonidoHabilitado)}
              className={`px-3 py-2 rounded-lg border font-semibold flex items-center gap-1.5 transition ${
                sonidoHabilitado
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white border-slate-200 text-slate-500"
              }`}
            >
              {sonidoHabilitado ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              <span>{sonidoHabilitado ? "Alarma: Activa" : "Alarma: Mute"}</span>
            </button>

            <div
              className={`px-3 py-2 rounded-lg border font-semibold flex items-center gap-1.5 ${
                printServerOnline
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-white border-slate-200 text-slate-500"
              }`}
            >
              <Printer className="h-4 w-4" />
              <span>Impresora: {printServerOnline ? "Conectada (5000)" : "Local 5000"}</span>
            </div>

            <button
              onClick={crearPedidoPrueba}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition"
            >
              <Sparkles className="h-4 w-4" />
              <span>+ Probar Orden</span>
            </button>
          </div>
        </header>

        {/* Notificación Emergente de Alerta */}
        {notificacionAlerta && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping"></span>
              <span className="text-sm font-bold text-amber-900">
                ¡Nuevo Pedido #{notificacionAlerta.id} de {notificacionAlerta.cliente}!
              </span>
              <span className="text-xs text-amber-800 font-semibold">
                (${Number(notificacionAlerta.total).toLocaleString("es-AR")})
              </span>
            </div>
            <button
              onClick={() => setNotificacionAlerta(null)}
              className="text-amber-800 hover:text-amber-950 text-xs font-bold"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Tarjetas de Resumen Numérico */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Órdenes por Cobrar
              </span>
              <span className="text-3xl font-extrabold text-slate-900 mt-1 block">
                {pendientesCount}
              </span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Recaudado Hoy
              </span>
              <span className="text-3xl font-extrabold text-emerald-600 mt-1 block">
                ${totalRecaudado.toLocaleString("es-AR")}
              </span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Pedidos Atendidos
              </span>
              <span className="text-3xl font-extrabold text-slate-900 mt-1 block">
                {cobradosHoy.length}
              </span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Filtros de Estado */}
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltroEstado("pendiente")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                filtroEstado === "pendiente"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Pendientes ({pendientesCount})
            </button>
            <button
              onClick={() => setFiltroEstado("cobrado")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                filtroEstado === "cobrado"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Cobrados ({cobradosHoy.length})
            </button>
            <button
              onClick={() => setFiltroEstado("todos")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                filtroEstado === "todos"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Todos ({pedidos.length})
            </button>
          </div>

          <button
            onClick={cargarPedidos}
            className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
            title="Recargar listado"
          >
            <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin text-slate-900" : ""}`} />
          </button>
        </div>

        {/* Grilla de Tarjetas Claras */}
        <main>
          {pedidosFiltrados.length === 0 ? (
            <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl">
              <Clock className="h-10 w-10 mx-auto stroke-1 text-slate-300 mb-2" />
              <p className="text-base font-bold text-slate-700">No hay pedidos en esta sección</p>
              <p className="text-xs text-slate-400 mt-1">
                Cuando los clientes confirmen órdenes desde el QR, aparecerán aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {pedidosFiltrados.map((pedido) => {
                const esPendiente = pedido.estado === "pendiente";
                const esCobrado = pedido.estado === "cobrado";
                const estaProcesando = procesandoId === pedido.id;

                return (
                  <div
                    key={pedido.id}
                    className={`rounded-2xl p-5 flex flex-col justify-between transition-all bg-white border shadow-xs ${
                      esPendiente
                        ? "border-amber-400 ring-2 ring-amber-100"
                        : "border-slate-200 opacity-80"
                    }`}
                  >
                    <div>
                      {/* Cabecera de la Orden */}
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-xs font-mono font-bold text-slate-400 block">
                            ORDEN #{pedido.id}
                          </span>
                          <h3 className="text-lg font-bold text-slate-900 capitalize">
                            {pedido.cliente_nombre}
                          </h3>
                        </div>

                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                            esPendiente
                              ? "bg-amber-100 text-amber-800"
                              : esCobrado
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {pedido.estado}
                        </span>
                      </div>

                      {/* Método de pago y Hora */}
                      <div className="flex items-center justify-between text-xs text-slate-500 pb-2.5 mb-2.5 border-b border-slate-100">
                        <span className="font-semibold uppercase text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {pedido.metodo_pago}
                        </span>
                        <span>
                          {new Date(pedido.creado_en).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>

                      {/* Lista de Productos */}
                      <div className="space-y-1.5 py-1">
                        {pedido.detalle_pedido && pedido.detalle_pedido.length > 0 ? (
                          pedido.detalle_pedido.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-slate-700">
                              <span>
                                <strong className="text-slate-900 font-bold">{item.cantidad}x</strong>{" "}
                                {item.productos?.nombre || item.nombre || "Producto"}
                              </span>
                              <span className="font-mono text-slate-500">
                                ${(item.subtotal || item.cantidad * item.precio_unitario).toFixed(2)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 italic">Detalle de productos registrado</p>
                        )}
                      </div>

                      {pedido.notas && (
                        <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-800">
                          <strong>Nota:</strong> {pedido.notas}
                        </div>
                      )}
                    </div>

                    {/* Total y Botón de Cobro */}
                    <div className="mt-5 pt-3 border-t border-slate-100">
                      <div className="flex justify-between items-baseline mb-3">
                        <span className="text-xs uppercase font-bold text-slate-500">Total a Cobrar</span>
                        <span className="text-2xl font-bold text-slate-900">
                          ${Number(pedido.total).toFixed(2)}
                        </span>
                      </div>

                      {esPendiente ? (
                        <div className="space-y-1.5">
                          <button
                            onClick={() => cobrarEImprimir(pedido)}
                            disabled={estaProcesando}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.99] disabled:opacity-50"
                          >
                            {estaProcesando ? (
                              <span>Cobrando e Imprimiendo...</span>
                            ) : (
                              <>
                                <Printer className="h-4 w-4" />
                                <span>COBRAR E IMPRIMIR</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => cancelarPedido(pedido.id)}
                            className="w-full text-xs text-slate-400 hover:text-red-600 py-1 transition text-center"
                          >
                            Anular Orden
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                            <Check className="h-4 w-4" /> Cobrado
                          </span>
                          <button
                            onClick={() => cobrarEImprimir(pedido)}
                            className="text-slate-600 hover:text-slate-900 underline text-[11px]"
                          >
                            Re-imprimir
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

      {/* Modal Vista Previa del Ticket */}
      {ticketImpresoPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-xl">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 mb-3">
              <span className="font-bold text-xs uppercase text-slate-700 flex items-center gap-1.5">
                <Printer className="h-4 w-4" /> Ticket Emitido
              </span>
              <button
                onClick={() => setTicketImpresoPreview(null)}
                className="text-slate-400 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <pre className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-800 font-mono text-[11px] leading-tight overflow-x-auto whitespace-pre">
              {ticketImpresoPreview}
            </pre>
            <button
              onClick={() => setTicketImpresoPreview(null)}
              className="w-full mt-3 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-lg text-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <footer className="text-center text-xs text-slate-400 border-t border-slate-200 py-5">
        Kiosco POS • Interfaz Clara y Rápida para el Mostrador
      </footer>
    </div>
  );
}
