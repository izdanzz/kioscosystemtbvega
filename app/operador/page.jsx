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
  Check, 
  X, 
  Plus, 
  Package, 
  Edit2, 
  Trash2, 
  Search, 
  Eye, 
  EyeOff, 
  Banknote, 
  CreditCard, 
  FileText,
  AlertCircle,
  Image as ImageIcon
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { playChimeSound } from "@/lib/sound";

export default function PanelOperador() {
  const [pestanaActiva, setPestanaActiva] = useState("ordenes"); // 'ordenes' | 'inventario'
  const [pedidos, setPedidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sonidoHabilitado, setSonidoHabilitado] = useState(true);
  const [printServerOnline, setPrintServerOnline] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("pendiente");
  const [notificacionAlerta, setNotificacionAlerta] = useState(null);

  // Modal de Cobro & Vuelto / Fiado
  const [pedidoCobrando, setPedidoCobrando] = useState(null);
  const [metodoCobro, setMetodoCobro] = useState("efectivo"); // 'efectivo' | 'transferencia' | 'fiado'
  const [montoEntregado, setMontoEntregado] = useState("");
  const [notaCobro, setNotaCobro] = useState("");
  const [cobrandoProceso, setCobrandoProceso] = useState(false);

  // Ticket para imprimir en pantalla / térmico
  const [ticketParaImprimir, setTicketParaImprimir] = useState(null);

  // Estados para Inventario
  const [busquedaInv, setBusquedaInv] = useState("");
  const [categoriaFiltroInv, setCategoriaFiltroInv] = useState("todas");
  const [modalProducto, setModalProducto] = useState(null);
  const [guardandoProd, setGuardandoProd] = useState(false);

  // Helper de Formato Dominicano (DOP / RD$)
  const formatDOP = (monto) => {
    return "RD$ " + Number(monto || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Fotos predeterminadas para selección rápida en 1 clic
  const fotosPredefinidas = [
    { label: "Refresco", url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80" },
    { label: "Agua", url: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&auto=format&fit=crop&q=80" },
    { label: "Cerveza", url: "https://images.unsplash.com/photo-1608270116666-68164380f839?w=400&auto=format&fit=crop&q=80" },
    { label: "Café", url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80" },
    { label: "Papas / Snack", url: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80" },
    { label: "Sandwich", url: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&auto=format&fit=crop&q=80" },
    { label: "Golosina", url: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&auto=format&fit=crop&q=80" }
  ];

  useEffect(() => {
    verificarPrintServer();
    cargarPedidos();
    cargarInventario();

    const printInterval = setInterval(verificarPrintServer, 10000);

    let canal = null;
    if (isSupabaseConfigured()) {
      canal = supabase
        .channel("operador_realtime_channel_v4")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "pedidos" },
          (payload) => {
            dispararAlertaNuevoPedido(payload.new);
            setTimeout(cargarPedidos, 500);
            setTimeout(cargarPedidos, 1500);
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
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "productos" },
          () => {
            cargarInventario();
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
    if (!isSupabaseConfigured()) return;
    setCargando(true);
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
  };

  const cargarInventario = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data: catData } = await supabase
        .from("categorias")
        .select("*")
        .order("orden", { ascending: true });

      const { data: prodData } = await supabase
        .from("productos")
        .select("*, categorias(nombre)")
        .order("nombre", { ascending: true });

      if (catData) setCategorias(catData);
      if (prodData) setProductos(prodData);
    } catch (err) {
      console.error("Error al cargar inventario:", err);
    }
  };

  // ===============================
  // FLUJO DE COBRO & VUELTO & FIADO
  // ===============================
  const abrirModalCobro = (pedido) => {
    setPedidoCobrando(pedido);
    setMetodoCobro(pedido.metodo_pago || "efectivo");
    setMontoEntregado(String(pedido.total || ""));
    setNotaCobro(pedido.notas || "");
  };

  const confirmarCobroFinal = async () => {
    if (!pedidoCobrando) return;
    setCobrandoProceso(true);

    const total = Number(pedidoCobrando.total) || 0;
    const entregado = parseFloat(montoEntregado) || total;
    const vuelto = Math.max(0, entregado - total);

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from("pedidos")
          .update({
            estado: "cobrado",
            metodo_pago: metodoCobro,
            notas: notaCobro.trim() || null,
            actualizado_en: new Date().toISOString()
          })
          .eq("id", pedidoCobrando.id);

        if (error) throw error;
      }

      setPedidos((prev) =>
        prev.map((p) =>
          p.id === pedidoCobrando.id
            ? { ...p, estado: "cobrado", metodo_pago: metodoCobro, notas: notaCobro }
            : p
        )
      );

      const ticketInfo = {
        id: pedidoCobrando.id,
        cliente: pedidoCobrando.cliente_nombre,
        total: total,
        metodo_pago: metodoCobro,
        monto_recibido: metodoCobro === "efectivo" ? entregado : null,
        vuelto: metodoCobro === "efectivo" ? vuelto : null,
        notas: notaCobro.trim(),
        fecha: new Date(pedidoCobrando.creado_en).toLocaleString(),
        items: pedidoCobrando.detalle_pedido?.map((d) => ({
          nombre: d.productos?.nombre || "Producto",
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          subtotal: d.subtotal || (d.cantidad * d.precio_unitario)
        })) || []
      };

      setTicketParaImprimir(ticketInfo);
      setPedidoCobrando(null);

      // Enviar a print-server local
      try {
        await fetch("http://localhost:5000/imprimir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pedidoId: ticketInfo.id,
            cliente_nombre: ticketInfo.cliente,
            total: ticketInfo.total,
            metodo_pago: ticketInfo.metodo_pago,
            monto_recibido: ticketInfo.monto_recibido,
            vuelto: ticketInfo.vuelto,
            notas: ticketInfo.notas,
            items: ticketInfo.items
          })
        });
      } catch (e) {
        console.warn("Agente local 5000 offline o no detectado:", e);
      }
    } catch (err) {
      alert("Error al procesar cobro: " + err.message);
    } finally {
      setCobrandoProceso(false);
    }
  };

  const cancelarPedido = async (pedidoId) => {
    if (!confirm(`¿Deseas anular la orden #${pedidoId}? El stock se devolverá automáticamente al inventario.`)) return;

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

  const imprimirEnNavegador = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // ===============================
  // GESTIÓN DE INVENTARIO
  // ===============================
  const modificarStockRapido = async (productoId, delta) => {
    const prod = productos.find((p) => p.id === productoId);
    if (!prod) return;

    const nuevoStock = Math.max(0, (prod.stock || 0) + delta);

    setProductos((prev) =>
      prev.map((p) => (p.id === productoId ? { ...p, stock: nuevoStock } : p))
    );

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from("productos")
          .update({ stock: nuevoStock })
          .eq("id", productoId);
      } catch (err) {
        console.error("Error al actualizar stock:", err);
        cargarInventario();
      }
    }
  };

  const toggleActivoProducto = async (productoId, estadoActual) => {
    const nuevoEstado = !estadoActual;
    setProductos((prev) =>
      prev.map((p) => (p.id === productoId ? { ...p, activo: nuevoEstado } : p))
    );

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from("productos")
          .update({ activo: nuevoEstado })
          .eq("id", productoId);
      } catch (err) {
        console.error("Error al cambiar estado:", err);
        cargarInventario();
      }
    }
  };

  const guardarProductoModal = async (e) => {
    e.preventDefault();
    if (!modalProducto.nombre.trim()) return alert("El título o nombre es obligatorio");
    setGuardandoProd(true);

    try {
      const payload = {
        nombre: modalProducto.nombre.trim(),
        precio: parseFloat(modalProducto.precio) || 0,
        stock: parseInt(modalProducto.stock) || 0,
        categoria_id: modalProducto.categoria_id ? parseInt(modalProducto.categoria_id) : null,
        descripcion: modalProducto.descripcion ? modalProducto.descripcion.trim() : null,
        imagen_url: modalProducto.imagen_url ? modalProducto.imagen_url.trim() : null,
        activo: modalProducto.activo ?? true
      };

      if (modalProducto.id) {
        const { error } = await supabase
          .from("productos")
          .update(payload)
          .eq("id", modalProducto.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("productos")
          .insert(payload);
        if (error) throw error;
      }

      setModalProducto(null);
      cargarInventario();
    } catch (err) {
      alert("Error al guardar producto: " + err.message);
    } finally {
      setGuardandoProd(false);
    }
  };

  const eliminarProducto = async (productoId, nombre) => {
    if (!confirm(`¿Estás seguro de eliminar "${nombre}" del inventario?`)) return;

    try {
      const { error } = await supabase.from("productos").delete().eq("id", productoId);
      if (error) throw error;
      setProductos((prev) => prev.filter((p) => p.id !== productoId));
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  };

  // Métricas
  const pendientesCount = pedidos.filter((p) => p.estado === "pendiente").length;
  const cobradosHoy = pedidos.filter((p) => p.estado === "cobrado");
  const totalRecaudado = cobradosHoy.reduce((acc, p) => acc + Number(p.total), 0);

  const pedidosFiltrados = pedidos.filter((p) => {
    if (filtroEstado === "todos") return true;
    return p.estado === filtroEstado;
  });

  const productosFiltradosInv = productos.filter((p) => {
    const coincideCat =
      categoriaFiltroInv === "todas" ||
      String(p.categoria_id) === String(categoriaFiltroInv);
    const coincideBusq =
      p.nombre.toLowerCase().includes(busquedaInv.toLowerCase()) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(busquedaInv.toLowerCase()));
    return coincideCat && coincideBusq;
  });

  // Vuelto calculado para el modal
  const vueltoCalculado = pedidoCobrando
    ? (parseFloat(montoEntregado) || 0) - Number(pedidoCobrando.total || 0)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans">
      <div className="max-w-6xl mx-auto w-full p-4 md:p-8">
        
        {/* Cabecera */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Store className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">TB La Vega • Mostrador</h1>
                <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-md font-bold">
                  En Vivo
                </span>
                <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-md font-bold">
                  DOP (RD$)
                </span>
              </div>
              <p className="text-xs text-slate-500">Panel de control de caja e inventario</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setPestanaActiva("ordenes")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                pestanaActiva === "ordenes"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Pedidos en Vivo ({pendientesCount})</span>
            </button>
            <button
              onClick={() => setPestanaActiva("inventario")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                pestanaActiva === "inventario"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Inventario, Fotos & Precios</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setSonidoHabilitado(!sonidoHabilitado)}
              className={`p-2 rounded-lg border font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                sonidoHabilitado
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white border-slate-200 text-slate-500"
              }`}
              title={sonidoHabilitado ? "Alarma activa" : "Alarma silenciada"}
            >
              {sonidoHabilitado ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </button>
            <button
              onClick={playChimeSound}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
              title="Probar sonido de campanilla"
            >
              <Volume2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Notificación de Alerta */}
        {notificacionAlerta && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping"></span>
              <span className="text-sm font-bold text-amber-900">
                ¡Nuevo Pedido #{notificacionAlerta.id} de {notificacionAlerta.cliente}!
              </span>
              <span className="text-xs text-amber-800 font-semibold">
                ({formatDOP(notificacionAlerta.total)})
              </span>
            </div>
            <button
              onClick={() => setNotificacionAlerta(null)}
              className="text-amber-800 hover:text-amber-950 text-xs font-bold cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* =========================================
            PESTAÑA 1: PEDIDOS EN VIVO
            ========================================= */}
        {pestanaActiva === "ordenes" && (
          <div className="mt-6 space-y-6">
            
            {/* Métricas en DOP */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Por Cobrar
                  </span>
                  <span className="text-2xl font-bold text-slate-900 mt-0.5 block">
                    {pendientesCount} órdenes
                  </span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Clock className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Cobrado Hoy (DOP)
                  </span>
                  <span className="text-2xl font-bold text-emerald-600 mt-0.5 block">
                    {formatDOP(totalRecaudado)}
                  </span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Atendidos
                  </span>
                  <span className="text-2xl font-bold text-slate-900 mt-0.5 block">
                    {cobradosHoy.length} tickets
                  </span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFiltroEstado("pendiente")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filtroEstado === "pendiente"
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Pendientes ({pendientesCount})
                </button>
                <button
                  onClick={() => setFiltroEstado("cobrado")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filtroEstado === "cobrado"
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Cobrados ({cobradosHoy.length})
                </button>
                <button
                  onClick={() => setFiltroEstado("todos")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filtroEstado === "todos"
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Todos ({pedidos.length})
                </button>
              </div>

              <button
                onClick={cargarPedidos}
                className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                title="Actualizar"
              >
                <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin text-slate-900" : ""}`} />
              </button>
            </div>

            {/* Grilla de Pedidos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pedidosFiltrados.length === 0 ? (
                <div className="col-span-full py-16 text-center bg-white border border-slate-200 rounded-2xl text-slate-400">
                  <Clock className="h-10 w-10 mx-auto stroke-1 mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-600 text-sm">No hay pedidos en esta sección</p>
                </div>
              ) : (
                pedidosFiltrados.map((pedido) => {
                  const esPendiente = pedido.estado === "pendiente";
                  const esCobrado = pedido.estado === "cobrado";
                  const esFiado = pedido.metodo_pago === "fiado";

                  return (
                    <div
                      key={pedido.id}
                      className={`rounded-2xl p-4 flex flex-col justify-between bg-white border shadow-xs transition ${
                        esPendiente
                          ? "border-amber-400 ring-2 ring-amber-50"
                          : "border-slate-200 opacity-80"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-[11px] font-mono font-bold text-slate-400 block">
                              ORDEN #{pedido.id}
                            </span>
                            <h3 className="text-base font-bold text-slate-900 capitalize">
                              {pedido.cliente_nombre}
                            </h3>
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              esFiado
                                ? "bg-purple-100 text-purple-900 font-black border border-purple-200"
                                : esPendiente
                                ? "bg-amber-100 text-amber-800"
                                : esCobrado
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {esFiado ? "FIADO" : pedido.estado}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pb-2 mb-2 border-b border-slate-100">
                          <span className={`font-semibold uppercase text-[10px] px-1.5 py-0.5 rounded ${
                            esFiado ? "bg-purple-50 text-purple-700 font-bold" : "bg-slate-100 text-slate-700"
                          }`}>
                            {pedido.metodo_pago}
                          </span>
                          <span className="text-[11px]">
                            {new Date(pedido.creado_en).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <div className="space-y-1.5 py-1 text-xs text-slate-700">
                          {pedido.detalle_pedido && pedido.detalle_pedido.length > 0 ? (
                            pedido.detalle_pedido.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-baseline">
                                <span className="truncate pr-2">
                                  <strong>{item.cantidad}x</strong> {item.productos?.nombre || item.nombre || "Producto"}
                                </span>
                                <span className="font-mono text-slate-600 font-semibold shrink-0">
                                  {formatDOP(item.subtotal || item.cantidad * item.precio_unitario)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-400 italic">Cargando productos...</p>
                          )}
                        </div>

                        {pedido.notas && (
                          <div className="mt-2.5 p-2 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-800">
                            <strong>Nota:</strong> {pedido.notas}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="flex justify-between items-baseline mb-3">
                          <span className="text-xs uppercase font-bold text-slate-500">Total (DOP)</span>
                          <span className="text-xl font-black text-slate-900">
                            {formatDOP(pedido.total)}
                          </span>
                        </div>

                        {esPendiente ? (
                          <div className="space-y-1.5">
                            <button
                              onClick={() => abrirModalCobro(pedido)}
                              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-95 cursor-pointer"
                            >
                              <Printer className="h-4 w-4" />
                              <span>COBRAR / FIADO / TICKET</span>
                            </button>
                            <button
                              onClick={() => cancelarPedido(pedido.id)}
                              className="w-full text-xs text-slate-400 hover:text-red-600 py-1 transition text-center cursor-pointer"
                            >
                              Anular Orden
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
                            <span className="flex items-center gap-1 text-emerald-700 font-bold">
                              <Check className="h-3.5 w-3.5" /> Cobrado
                            </span>
                            <button
                              onClick={() => abrirModalCobro(pedido)}
                              className="text-slate-600 hover:text-slate-900 underline text-[11px] cursor-pointer"
                            >
                              Re-imprimir / Modificar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* =========================================
            PESTAÑA 2: GESTIÓN DE INVENTARIO (FOTOS, TÍTULOS Y DESCRIPCIONES)
            ========================================= */}
        {pestanaActiva === "inventario" && (
          <div className="mt-6 space-y-5">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por título o descripción..."
                    value={busquedaInv}
                    onChange={(e) => setBusquedaInv(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-slate-400 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>

                <select
                  value={categoriaFiltroInv}
                  onChange={(e) => setCategoriaFiltroInv(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none cursor-pointer"
                >
                  <option value="todas">Todas las Categorías</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() =>
                  setModalProducto({
                    nombre: "",
                    precio: "",
                    stock: 10,
                    categoria_id: categorias[0]?.id || null,
                    descripcion: "",
                    imagen_url: "",
                    activo: true
                  })
                }
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 shrink-0 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>+ Nuevo Producto</span>
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Producto (Foto, Título y Descripción)</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4">Precio (DOP)</th>
                      <th className="py-3 px-4">Stock en Mostrador</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productosFiltradosInv.map((prod) => (
                      <tr key={prod.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-14 w-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                              {prod.imagen_url ? (
                                <img src={prod.imagen_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Store className="h-5 w-5 text-slate-400" />
                              )}
                            </div>
                            <div className="max-w-xs">
                              <span className="font-bold text-slate-900 block text-sm">{prod.nombre}</span>
                              {prod.descripcion ? (
                                <span className="text-[11px] text-slate-500 line-clamp-1 block mt-0.5">
                                  {prod.descripcion}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic block mt-0.5">
                                  Sin descripción
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          {prod.categorias?.nombre || "Sin categoría"}
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-900">
                          {formatDOP(prod.precio)}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => modificarStockRapido(prod.id, -1)}
                              className="h-6 w-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                              title="Restar 1"
                            >
                              -
                            </button>
                            <span className="font-bold font-mono text-sm px-2 text-slate-900">
                              {prod.stock}
                            </span>
                            <button
                              onClick={() => modificarStockRapido(prod.id, 1)}
                              className="h-6 w-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                              title="Sumar 1"
                            >
                              +
                            </button>
                            <button
                              onClick={() => modificarStockRapido(prod.id, 5)}
                              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600 cursor-pointer"
                              title="Sumar 5"
                            >
                              +5
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => toggleActivoProducto(prod.id, prod.activo)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                              prod.activo
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {prod.activo ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            <span>{prod.activo ? "Visible" : "Pausado"}</span>
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setModalProducto(prod)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                              title="Editar producto"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => eliminarProducto(prod.id, prod.nombre)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              title="Eliminar producto"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* =========================================
          MODAL: COBRO CON FIADO, VUELTO Y NOTAS (BILLETES DOP)
          ========================================= */}
      {pedidoCobrando && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Cobrar Orden #{pedidoCobrando.id}
                </h3>
                <span className="text-xs text-slate-500">
                  Cliente: <strong className="text-slate-900 capitalize">{pedidoCobrando.cliente_nombre}</strong>
                </span>
              </div>
              <button
                onClick={() => setPedidoCobrando(null)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Total Grande en DOP */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center mb-4">
              <span className="text-xs uppercase font-bold text-slate-500 block">Total a Cobrar</span>
              <span className="text-3xl font-black text-slate-900">
                {formatDOP(pedidoCobrando.total)}
              </span>
            </div>

            {/* Selector de Método de Pago */}
            <div className="space-y-2 mb-4">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Método de Pago
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMetodoCobro("efectivo")}
                  className={`py-2.5 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                    metodoCobro === "efectivo"
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Banknote className="h-4 w-4" />
                  <span>Efectivo (DOP)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoCobro("transferencia")}
                  className={`py-2.5 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                    metodoCobro === "transferencia"
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Transferencia</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoCobro("fiado")}
                  className={`py-2.5 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                    metodoCobro === "fiado"
                      ? "bg-purple-900 border-purple-900 text-white"
                      : "bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100"
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>Fiado / Cuenta</span>
                </button>
              </div>
            </div>

            {/* Si es EFECTIVO: Calculadora con Billetes Dominicanos (RD$ 50, 100, 200, 500, 1000, 2000) */}
            {metodoCobro === "efectivo" && (
              <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ¿Con cuánto abona el cliente? (RD$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Monto entregado en pesos"
                    value={montoEntregado}
                    onChange={(e) => setMontoEntregado(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-base font-bold text-slate-900 outline-none focus:border-slate-900"
                    autoFocus
                  />
                </div>

                {/* Billetes Dominicanos Rápidos */}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setMontoEntregado(String(pedidoCobrando.total))}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 hover:bg-slate-100 cursor-pointer shadow-2xs"
                  >
                    Exacto
                  </button>
                  {[50, 100, 200, 500, 1000, 2000].map((billete) => (
                    <button
                      key={billete}
                      type="button"
                      onClick={() => setMontoEntregado(String(billete))}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
                    >
                      RD$ {billete.toLocaleString("es-DO")}
                    </button>
                  ))}
                </div>

                {/* Cálculo en Vivo del Vuelto */}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600">
                    {vueltoCalculado >= 0 ? "Vuelto / Cambio a entregar:" : "Faltan cobrar:"}
                  </span>
                  <span className={`text-lg font-black ${
                    vueltoCalculado >= 0 ? "text-emerald-700" : "text-amber-600"
                  }`}>
                    {formatDOP(Math.abs(vueltoCalculado))}
                  </span>
                </div>
              </div>
            )}

            {/* Si es FIADO */}
            {metodoCobro === "fiado" && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl mb-4 text-xs text-purple-900 space-y-1">
                <span className="font-bold flex items-center gap-1 text-purple-950">
                  <FileText className="h-4 w-4" /> Venta registrada como Fiado / Cuenta
                </span>
                <p className="text-[11px] text-purple-700">
                  La orden se guardará con estado de cuenta pendiente para llevar el registro de deudas.
                </p>
              </div>
            )}

            {/* Notas / Observaciones del Operador */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nota u Observación (Opcional)
              </label>
              <input
                type="text"
                placeholder={metodoCobro === "fiado" ? "Ej. Paga el viernes / Libreta pág 12" : "Aclaración sobre el cobro"}
                value={notaCobro}
                onChange={(e) => setNotaCobro(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-400"
              />
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPedidoCobrando(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarCobroFinal}
                disabled={cobrandoProceso}
                className="flex-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>
                  {cobrandoProceso
                    ? "Procesando..."
                    : metodoCobro === "fiado"
                    ? "Registrar Fiado & Ticket"
                    : "Confirmar Cobro & Ticket"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL: CREAR / EDITAR PRODUCTO (FOTO, TÍTULO Y DESCRIPCIÓN)
          ========================================= */}
      {modalProducto && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {modalProducto.id ? "Editar Producto" : "Nuevo Producto"}
                </h3>
                <p className="text-xs text-slate-500">Configura la foto, título, descripción y precio en DOP</p>
              </div>
              <button
                onClick={() => setModalProducto(null)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={guardarProductoModal} className="space-y-4 text-xs">
              
              {/* TÍTULO / NOMBRE */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Título o Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cerveza Presidente 355ml"
                  value={modalProducto.nombre || ""}
                  onChange={(e) => setModalProducto({ ...modalProducto, nombre: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:bg-white focus:border-slate-900"
                />
              </div>

              {/* DESCRIPCIÓN DETALLADA */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Descripción del Producto
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Botella bien fría vestida de novia, recién sacada del freezer."
                  value={modalProducto.descripcion || ""}
                  onChange={(e) => setModalProducto({ ...modalProducto, descripcion: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:bg-white focus:border-slate-900"
                />
              </div>

              {/* PRECIO (DOP) Y STOCK */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Precio en DOP (RD$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="180.00"
                    value={modalProducto.precio || ""}
                    onChange={(e) => setModalProducto({ ...modalProducto, precio: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Stock Disponible *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="24"
                    value={modalProducto.stock ?? ""}
                    onChange={(e) => setModalProducto({ ...modalProducto, stock: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900"
                  />
                </div>
              </div>

              {/* CATEGORÍA */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Categoría</label>
                <select
                  value={modalProducto.categoria_id || ""}
                  onChange={(e) => setModalProducto({ ...modalProducto, categoria_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:bg-white focus:border-slate-900 cursor-pointer"
                >
                  <option value="">Selecciona una categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              {/* IMAGEN Y VISTA PREVIA */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  URL de Imagen del Producto
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={modalProducto.imagen_url || ""}
                    onChange={(e) => setModalProducto({ ...modalProducto, imagen_url: e.target.value })}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:bg-white focus:border-slate-900"
                  />
                </div>

                {/* Botones de fotos predefinidas para 1-clic */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    O elige una imagen rápida de muestra:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {fotosPredefinidas.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setModalProducto({ ...modalProducto, imagen_url: item.url })}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] rounded-md font-semibold transition cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vista previa de la imagen cargada */}
                {modalProducto.imagen_url && (
                  <div className="mt-3 p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                    <img
                      src={modalProducto.imagen_url}
                      alt="Vista previa"
                      className="h-16 w-16 object-cover rounded-lg border border-slate-200"
                      onError={(e) => {
                        e.currentTarget.src = "https://via.placeholder.com/150?text=Error";
                      }}
                    />
                    <div className="text-xs text-slate-600">
                      <span className="font-bold text-slate-900 block">Vista previa de imagen</span>
                      <span className="text-[10px] text-slate-400">Esta imagen se mostrará en el menú del cliente.</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalProducto(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoProd}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {guardandoProd ? "Guardando..." : "Guardar Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL: TICKET DE CAJA IMPRIMIBLE EN DOP
          ========================================= */}
      {ticketParaImprimir && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-xl">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 mb-3">
              <span className="font-bold text-xs uppercase text-slate-700 flex items-center gap-1.5">
                <Printer className="h-4 w-4" /> Comprobante
              </span>
              <button
                onClick={() => setTicketParaImprimir(null)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div id="thermal-receipt" className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 leading-snug space-y-2">
              <div className="text-center font-bold">
                <div className="text-sm">TB LA VEGA</div>
                <div className="text-[10px] text-slate-500">TICKET DE VENTA (DOP)</div>
              </div>
              <div className="border-t border-dashed border-slate-300"></div>
              <div className="text-[11px]">
                <div>ORDEN #: {ticketParaImprimir.id}</div>
                <div>FECHA : {ticketParaImprimir.fecha}</div>
                <div>CLIENTE: {ticketParaImprimir.cliente?.toUpperCase()}</div>
                <div>
                  PAGO   : {ticketParaImprimir.metodo_pago === "fiado" ? "*** CUENTA / FIADO ***" : ticketParaImprimir.metodo_pago?.toUpperCase()}
                </div>
              </div>
              <div className="border-t border-dashed border-slate-300"></div>
              <div className="space-y-1 text-[11px]">
                {ticketParaImprimir.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.cantidad}x {item.nombre}</span>
                    <span>{formatDOP(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-slate-300"></div>
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL:</span>
                <span>{formatDOP(ticketParaImprimir.total)}</span>
              </div>

              {ticketParaImprimir.metodo_pago === "efectivo" && ticketParaImprimir.monto_recibido && (
                <div className="text-[11px] pt-1 text-slate-600 border-t border-slate-200">
                  <div className="flex justify-between">
                    <span>ABONO CON:</span>
                    <span>{formatDOP(ticketParaImprimir.monto_recibido)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>VUELTO:</span>
                    <span>{formatDOP(ticketParaImprimir.vuelto || 0)}</span>
                  </div>
                </div>
              )}

              {ticketParaImprimir.notas && (
                <div className="text-[10px] bg-slate-100 p-1.5 rounded mt-1 text-slate-700">
                  NOTA: {ticketParaImprimir.notas}
                </div>
              )}

              <div className="text-center text-[10px] text-slate-500 pt-1">
                ¡GRACIAS POR SU COMPRA!
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={imprimirEnNavegador}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir Ticket</span>
              </button>
              <button
                onClick={() => setTicketParaImprimir(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center text-xs text-slate-400 border-t border-slate-200 py-5">
        TB La Vega • Mostrador • Precios en DOP
      </footer>
    </div>
  );
}
