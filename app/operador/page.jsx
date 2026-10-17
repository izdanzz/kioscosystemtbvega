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
  Calendar,
  Copy,
  CheckCheck,
  TrendingUp,
  FileCheck,
  UserCheck,
  AlertTriangle
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { playChimeSound } from "@/lib/sound";

export default function PanelOperador() {
  const [pestanaActiva, setPestanaActiva] = useState("ordenes"); // 'ordenes' | 'inventario' | 'cierre'
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

  // Tickets imprimibles
  const [ticketParaImprimir, setTicketParaImprimir] = useState(null);
  const [ticketCierreParaImprimir, setTicketCierreParaImprimir] = useState(null);

  // Estados para Inventario
  const [busquedaInv, setBusquedaInv] = useState("");
  const [categoriaFiltroInv, setCategoriaFiltroInv] = useState("todas");
  const [modalProducto, setModalProducto] = useState(null);
  const [guardandoProd, setGuardandoProd] = useState(false);

  // Estados para Cierre del Día
  const [fechaCierre, setFechaCierre] = useState(new Date().toLocaleDateString("en-CA"));
  const [verTodosFiados, setVerTodosFiados] = useState(true);
  const [copiadoToast, setCopiadoToast] = useState(false);
  const [modalSaldarFiado, setModalSaldarFiado] = useState(null);

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
        .channel("operador_realtime_tblavega_v6")
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
        .limit(150);

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

  const saldarDeudaFiado = async (pedidoId, metodoPagoNuevo = "efectivo") => {
    try {
      const fechaHoy = new Date().toLocaleDateString("es-DO");
      const notaActual = modalSaldarFiado?.notas || "";
      const notaActualizada = notaActual ? `${notaActual} [Saldado el ${fechaHoy} en ${metodoPagoNuevo}]` : `Fiado saldado el ${fechaHoy} en ${metodoPagoNuevo}`;

      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from("pedidos")
          .update({
            estado: "cobrado",
            metodo_pago: metodoPagoNuevo,
            notas: notaActualizada,
            actualizado_en: new Date().toISOString()
          })
          .eq("id", pedidoId);

        if (error) throw error;
      }

      setPedidos((prev) =>
        prev.map((p) =>
          p.id === pedidoId
            ? { ...p, estado: "cobrado", metodo_pago: metodoPagoNuevo, notas: notaActualizada }
            : p
        )
      );

      setModalSaldarFiado(null);
    } catch (e) {
      alert("Error al saldar fiado: " + e.message);
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

  // =========================================
  // CÁLCULOS DINÁMICOS PARA "TERMINÓ EL DÍA"
  // =========================================
  const pedidosDelDia = pedidos.filter((p) => {
    if (!p.creado_en) return false;
    const fechaP = new Date(p.creado_en).toLocaleDateString("en-CA");
    return fechaP === fechaCierre;
  });

  const pedidosCobradosDia = pedidosDelDia.filter((p) => p.estado === "cobrado" && p.metodo_pago !== "fiado");
  const pedidosFiadosDia = pedidosDelDia.filter((p) => p.metodo_pago === "fiado");
  const pedidosCanceladosDia = pedidosDelDia.filter((p) => p.estado === "cancelado");

  const totalEfectivoDia = pedidosDelDia
    .filter((p) => p.metodo_pago === "efectivo" && p.estado === "cobrado")
    .reduce((acc, p) => acc + Number(p.total), 0);

  const totalTransferenciaDia = pedidosDelDia
    .filter((p) => p.metodo_pago === "transferencia" && p.estado === "cobrado")
    .reduce((acc, p) => acc + Number(p.total), 0);

  const totalFiadoDia = pedidosDelDia
    .filter((p) => p.metodo_pago === "fiado")
    .reduce((acc, p) => acc + Number(p.total), 0);

  const totalVentasDia = totalEfectivoDia + totalTransferenciaDia + totalFiadoDia;

  // Lista de fiados
  const fiadosHistoricos = pedidos.filter((p) => p.metodo_pago === "fiado");
  const fiadosListaAMostrar = verTodosFiados ? fiadosHistoricos : pedidosFiadosDia;
  const totalFiadosHistoricos = fiadosHistoricos.reduce((acc, p) => acc + Number(p.total), 0);

  // Ranking de productos vendidos en el día
  const productosVendidosMap = {};
  pedidosDelDia
    .filter((p) => p.estado !== "cancelado")
    .forEach((p) => {
      p.detalle_pedido?.forEach((item) => {
        const prodId = item.producto_id || item.nombre || "prod";
        const prodNombre = item.productos?.nombre || item.nombre || "Producto";
        const cant = Number(item.cantidad) || 1;
        const sub = Number(item.subtotal) || (Number(item.precio_unitario) * cant) || 0;

        if (!productosVendidosMap[prodId]) {
          productosVendidosMap[prodId] = {
            id: prodId,
            nombre: prodNombre,
            cantidad: 0,
            subtotal: 0
          };
        }
        productosVendidosMap[prodId].cantidad += cant;
        productosVendidosMap[prodId].subtotal += sub;
      });
    });

  const rankingProductosDia = Object.values(productosVendidosMap).sort((a, b) => b.cantidad - a.cantidad);

  // Acción: Imprimir Ticket Cierre de Día
  const imprimirCierreDia = async () => {
    const dataCierre = {
      fecha: fechaCierre,
      totalVendido: totalVentasDia,
      totalEfectivo: totalEfectivoDia,
      totalTransferencia: totalTransferenciaDia,
      totalFiado: totalFiadoDia,
      ordenesCobradas: pedidosCobradosDia.length,
      ordenesFiadas: pedidosFiadosDia.length,
      fiados: fiadosListaAMostrar.map((f) => ({
        cliente: f.cliente_nombre,
        total: f.total,
        notas: f.notas
      })),
      productosVendidos: rankingProductosDia
    };

    setTicketCierreParaImprimir(dataCierre);

    try {
      await fetch("http://localhost:5000/imprimir-cierre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataCierre)
      });
    } catch (e) {
      console.warn("Print server offline:", e);
    }
  };

  // Acción: Copiar Resumen para WhatsApp
  const copiarResumenWhatsApp = () => {
    let msg = `📊 *CIERRE DEL DÍA - TEMPLO BÍBLICO LA VEGA*\n`;
    msg += `📅 *Fecha:* ${fechaCierre}\n`;
    msg += `--------------------------------------\n`;
    msg += `💰 *TOTAL VENTAS:* ${formatDOP(totalVentasDia)}\n`;
    msg += `💵 *Efectivo en Caja:* ${formatDOP(totalEfectivoDia)}\n`;
    msg += `💳 *Transferencias:* ${formatDOP(totalTransferenciaDia)}\n`;
    msg += `📝 *Fiados del Día:* ${formatDOP(totalFiadoDia)}\n`;
    msg += `👥 *Pedidos Atendidos:* ${pedidosDelDia.length} (${pedidosCobradosDia.length} cobrados, ${pedidosFiadosDia.length} fiados)\n\n`;

    if (fiadosListaAMostrar.length > 0) {
      msg += `📌 *CLIENTES QUE DEBEN FIADO (${fiadosListaAMostrar.length}):*\n`;
      fiadosListaAMostrar.forEach((f, i) => {
        msg += `${i + 1}. *${f.cliente_nombre}:* ${formatDOP(f.total)}`;
        if (f.notas) msg += ` _(${f.notas})_`;
        msg += `\n`;
      });
      msg += `\n`;
    }

    if (rankingProductosDia.length > 0) {
      msg += `🛒 *TOP PRODUCTOS VENDIDOS:*\n`;
      rankingProductosDia.slice(0, 10).forEach((p) => {
        msg += `• ${p.cantidad}x ${p.nombre} - ${formatDOP(p.subtotal)}\n`;
      });
    }

    navigator.clipboard.writeText(msg);
    setCopiadoToast(true);
    setTimeout(() => setCopiadoToast(false), 3000);
  };

  // Cálculos pestaña 1 (Pedidos en Vivo)
  const pendientesCount = pedidos.filter((p) => p.estado === "pendiente").length;
  const cobradosHoyGeneral = pedidos.filter((p) => p.estado === "cobrado");
  const totalRecaudadoGeneral = cobradosHoyGeneral.reduce((acc, p) => acc + Number(p.total), 0);

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

  // Vuelto calculado para modal de cobro
  const vueltoCalculado = pedidoCobrando
    ? (parseFloat(montoEntregado) || 0) - Number(pedidoCobrando.total || 0)
    : 0;

  return (
    <div className="min-h-screen bg-[#F1F4F3] text-tb-dark flex flex-col justify-between font-sans selection:bg-tb-dark selection:text-tb-gold">
      
      {/* Barra de Acento Superior */}
      <div className="h-1.5 w-full bg-gradient-to-r from-tb-dark via-tb-emerald to-tb-gold"></div>

      <div className="max-w-6xl mx-auto w-full p-4 md:p-8 flex-1">
        
        {/* Cabecera Oficial Templo Bíblico La Vega */}
        <header className="bg-tb-dark text-white rounded-3xl p-5 mb-6 shadow-md border border-tb-gold/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2 rounded-2xl bg-white shadow-xs">
              <img 
                src="https://assets.cdn.filesafe.space/SzYXoLdE37ybSNUMDx8V/media/7fe3f97b-2a5c-46ab-9176-504c273b278b.png" 
                alt="TB La Vega" 
                className="h-10 w-auto object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-serif font-bold tracking-wide text-white">
                  Templo Bíblico La Vega
                </h1>
                <span className="bg-tb-gold text-tb-dark text-[10px] px-2 py-0.5 rounded-md font-bold font-sans">
                  Caja
                </span>
                <span className="bg-white/10 text-tb-gold text-[10px] px-2 py-0.5 rounded-md font-sans">
                  DOP (RD$)
                </span>
              </div>
              <p className="text-xs text-tb-sand/70 mt-0.5">Control de órdenes, cobros, fiados y cierre</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Navegación por pestañas: Órdenes | Inventario | Terminó el Día */}
            <div className="flex items-center gap-1 bg-white/10 p-1 rounded-2xl border border-white/10">
              <button
                onClick={() => setPestanaActiva("ordenes")}
                className={`px-3 py-1.5 rounded-xl text-xs font-serif font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  pestanaActiva === "ordenes"
                    ? "bg-tb-gold text-tb-dark shadow-xs"
                    : "text-tb-sand hover:text-white"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Pedidos ({pendientesCount})</span>
              </button>

              <button
                onClick={() => setPestanaActiva("inventario")}
                className={`px-3 py-1.5 rounded-xl text-xs font-serif font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  pestanaActiva === "inventario"
                    ? "bg-tb-gold text-tb-dark shadow-xs"
                    : "text-tb-sand hover:text-white"
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                <span>Inventario</span>
              </button>

              <button
                onClick={() => setPestanaActiva("cierre")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-serif font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  pestanaActiva === "cierre"
                    ? "bg-tb-gold text-tb-dark shadow-xs"
                    : "bg-white/15 text-white hover:bg-white/25 border border-tb-gold/40"
                }`}
              >
                <FileCheck className="h-3.5 w-3.5 text-tb-gold" />
                <span>Terminó el Día</span>
                {fiadosHistoricos.length > 0 && (
                  <span className="bg-purple-800 text-purple-200 text-[9px] px-1.5 py-0.2 rounded-full font-sans">
                    {fiadosHistoricos.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSonidoHabilitado(!sonidoHabilitado)}
                className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  sonidoHabilitado
                    ? "bg-tb-gold text-tb-dark border-tb-gold"
                    : "bg-white/10 border-white/20 text-tb-sand"
                }`}
                title={sonidoHabilitado ? "Alarma de pedidos activa" : "Alarma silenciada"}
              >
                {sonidoHabilitado ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              </button>
              <button
                onClick={playChimeSound}
                className="p-2 rounded-xl bg-white/10 border border-white/20 text-tb-gold hover:bg-white/20 cursor-pointer"
                title="Probar sonido de campanilla"
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Notificación de Alerta de Nuevo Pedido */}
        {notificacionAlerta && (
          <div className="mb-6 p-4 rounded-2xl bg-tb-dark text-tb-gold border border-tb-gold/40 flex items-center justify-between shadow-lg animate-bounce">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-tb-gold animate-ping"></span>
              <span className="text-sm font-serif font-bold text-white">
                ¡Nuevo Pedido #{notificacionAlerta.id} de {notificacionAlerta.cliente}!
              </span>
              <span className="text-xs text-tb-gold font-sans font-black">
                ({formatDOP(notificacionAlerta.total)})
              </span>
            </div>
            <button
              onClick={() => setNotificacionAlerta(null)}
              className="text-tb-gold hover:text-white text-xs font-bold underline cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Toast de Confirmación al copiar para WhatsApp */}
        {copiadoToast && (
          <div className="fixed bottom-6 right-6 z-50 bg-tb-dark text-tb-gold px-4 py-3 rounded-2xl border border-tb-gold/30 shadow-2xl flex items-center gap-2 font-bold text-xs animate-in fade-in slide-in-from-bottom-2">
            <CheckCheck className="h-4 w-4 text-emerald-400" />
            <span>¡Resumen del día copiado para enviar por WhatsApp!</span>
          </div>
        )}

        {/* =========================================
            PESTAÑA 1: PEDIDOS EN VIVO
            ========================================= */}
        {pestanaActiva === "ordenes" && (
          <div className="space-y-6">
            
            {/* Métricas en DOP */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-[#E2DFD8] rounded-3xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-tb-terracotta uppercase tracking-wider block">
                    Por Cobrar
                  </span>
                  <span className="text-2xl font-black text-tb-dark mt-0.5 block font-sans">
                    {pendientesCount} órdenes
                  </span>
                </div>
                <div className="h-11 w-11 rounded-2xl bg-[#FAF8F5] text-amber-700 flex items-center justify-center font-bold border border-tb-sand">
                  <Clock className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white border border-[#E2DFD8] rounded-3xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-tb-terracotta uppercase tracking-wider block">
                    Cobrado Hoy (DOP)
                  </span>
                  <span className="text-2xl font-black text-tb-emerald mt-0.5 block font-sans">
                    {formatDOP(totalRecaudadoGeneral)}
                  </span>
                </div>
                <div className="h-11 w-11 rounded-2xl bg-[#FAF8F5] text-tb-emerald flex items-center justify-center font-bold border border-tb-sand">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white border border-[#E2DFD8] rounded-3xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-tb-terracotta uppercase tracking-wider block">
                    Atendidos
                  </span>
                  <span className="text-2xl font-black text-tb-dark mt-0.5 block font-sans">
                    {cobradosHoyGeneral.length} tickets
                  </span>
                </div>
                <div className="h-11 w-11 rounded-2xl bg-[#FAF8F5] text-tb-dark flex items-center justify-center font-bold border border-tb-sand">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFiltroEstado("pendiente")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-serif font-bold transition cursor-pointer ${
                    filtroEstado === "pendiente"
                      ? "bg-tb-dark text-tb-gold shadow-xs"
                      : "bg-white border border-[#E2DFD8] text-tb-muted hover:bg-[#FAF8F5]"
                  }`}
                >
                  Pendientes ({pendientesCount})
                </button>
                <button
                  onClick={() => setFiltroEstado("cobrado")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-serif font-bold transition cursor-pointer ${
                    filtroEstado === "cobrado"
                      ? "bg-tb-dark text-tb-gold shadow-xs"
                      : "bg-white border border-[#E2DFD8] text-tb-muted hover:bg-[#FAF8F5]"
                  }`}
                >
                  Cobrados ({cobradosHoyGeneral.length})
                </button>
                <button
                  onClick={() => setFiltroEstado("todos")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-serif font-bold transition cursor-pointer ${
                    filtroEstado === "todos"
                      ? "bg-tb-dark text-tb-gold shadow-xs"
                      : "bg-white border border-[#E2DFD8] text-tb-muted hover:bg-[#FAF8F5]"
                  }`}
                >
                  Todos ({pedidos.length})
                </button>
              </div>

              <button
                onClick={cargarPedidos}
                className="p-2 rounded-xl bg-white border border-[#E2DFD8] hover:bg-[#FAF8F5] text-tb-dark transition cursor-pointer"
                title="Actualizar pedidos"
              >
                <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin text-tb-emerald" : ""}`} />
              </button>
            </div>

            {/* Grilla de Pedidos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pedidosFiltrados.length === 0 ? (
                <div className="col-span-full py-16 text-center bg-white border border-[#E2DFD8] rounded-3xl text-tb-muted">
                  <Clock className="h-10 w-10 mx-auto stroke-1 mb-2 text-tb-sand" />
                  <p className="font-serif font-bold text-tb-dark text-base">No hay pedidos en esta sección</p>
                </div>
              ) : (
                pedidosFiltrados.map((pedido) => {
                  const esPendiente = pedido.estado === "pendiente";
                  const esCobrado = pedido.estado === "cobrado";
                  const esFiado = pedido.metodo_pago === "fiado";

                  return (
                    <div
                      key={pedido.id}
                      className={`rounded-3xl p-5 flex flex-col justify-between bg-white border shadow-xs transition ${
                        esPendiente
                          ? "border-amber-400 ring-2 ring-amber-100"
                          : "border-[#E2DFD8] opacity-90"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-[11px] font-mono font-bold text-tb-terracotta block">
                              ORDEN #{pedido.id}
                            </span>
                            <h3 className="text-base font-serif font-bold text-tb-dark capitalize">
                              {pedido.cliente_nombre}
                            </h3>
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${
                              esFiado
                                ? "bg-purple-100 text-purple-900 font-black border border-purple-200"
                                : esPendiente
                                ? "bg-amber-100 text-amber-900 border border-amber-200"
                                : esCobrado
                                ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                                : "bg-red-100 text-red-900"
                            }`}
                          >
                            {esFiado ? "FIADO" : pedido.estado}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-tb-muted pb-2 mb-2 border-b border-tb-sand">
                          <span className={`font-semibold uppercase text-[10px] px-2 py-0.5 rounded-md ${
                            esFiado ? "bg-purple-50 text-purple-700 font-bold" : "bg-[#FAF8F5] text-tb-dark"
                          }`}>
                            {pedido.metodo_pago}
                          </span>
                          <span className="text-[11px]">
                            {new Date(pedido.creado_en).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <div className="space-y-1.5 py-1 text-xs text-tb-dark">
                          {pedido.detalle_pedido && pedido.detalle_pedido.length > 0 ? (
                            pedido.detalle_pedido.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-baseline">
                                <span className="truncate pr-2">
                                  <strong>{item.cantidad}x</strong> {item.productos?.nombre || item.nombre || "Producto"}
                                </span>
                                <span className="font-mono text-tb-muted font-semibold shrink-0">
                                  {formatDOP(item.subtotal || item.cantidad * item.precio_unitario)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-400 italic">Cargando productos...</p>
                          )}
                        </div>

                        {pedido.notas && (
                          <div className="mt-2.5 p-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                            <strong>Nota:</strong> {pedido.notas}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-tb-sand">
                        <div className="flex justify-between items-baseline mb-3">
                          <span className="text-xs uppercase font-bold text-tb-terracotta">Total (DOP)</span>
                          <span className="text-xl font-black text-tb-dark font-sans">
                            {formatDOP(pedido.total)}
                          </span>
                        </div>

                        {esPendiente ? (
                          <div className="space-y-1.5">
                            <button
                              onClick={() => abrirModalCobro(pedido)}
                              className="w-full bg-tb-dark hover:bg-tb-emerald text-tb-gold font-serif font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-95 cursor-pointer border border-tb-gold/20"
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
                          <div className="flex items-center justify-between text-xs text-tb-muted bg-[#FAF8F5] p-2 rounded-xl border border-tb-sand">
                            <span className="flex items-center gap-1 text-tb-emerald font-bold">
                              <Check className="h-3.5 w-3.5" /> Cobrado
                            </span>
                            <button
                              onClick={() => abrirModalCobro(pedido)}
                              className="text-tb-dark hover:text-tb-emerald underline text-[11px] cursor-pointer"
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
            PESTAÑA 2: GESTIÓN DE INVENTARIO
            ========================================= */}
        {pestanaActiva === "inventario" && (
          <div className="space-y-5">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por título o descripción..."
                    value={busquedaInv}
                    onChange={(e) => setBusquedaInv(e.target.value)}
                    className="w-full bg-white border border-[#E2DFD8] focus:border-tb-dark rounded-xl pl-9 pr-4 py-2 text-xs text-tb-dark outline-none"
                  />
                </div>

                <select
                  value={categoriaFiltroInv}
                  onChange={(e) => setCategoriaFiltroInv(e.target.value)}
                  className="bg-white border border-[#E2DFD8] rounded-xl px-3 py-2 text-xs text-tb-dark outline-none cursor-pointer"
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
                className="bg-tb-dark hover:bg-tb-emerald text-tb-gold font-serif font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 shrink-0 cursor-pointer border border-tb-gold/20"
              >
                <Plus className="h-4 w-4" />
                <span>+ Nuevo Producto</span>
              </button>
            </div>

            <div className="bg-white border border-[#E2DFD8] rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] border-b border-[#E2DFD8] text-tb-terracotta uppercase tracking-wider font-semibold">
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
                      <tr key={prod.id} className="hover:bg-[#FAF8F5] transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-14 w-14 rounded-2xl bg-[#FAF8F5] border border-tb-sand overflow-hidden shrink-0 flex items-center justify-center relative">
                              {prod.imagen_url ? (
                                <img src={prod.imagen_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Store className="h-5 w-5 text-tb-sand" />
                              )}
                            </div>
                            <div className="max-w-xs">
                              <span className="font-serif font-bold text-tb-dark block text-sm">{prod.nombre}</span>
                              {prod.descripcion ? (
                                <span className="text-[11px] text-tb-muted line-clamp-1 block mt-0.5">
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

                        <td className="py-3 px-4 text-tb-muted">
                          {prod.categorias?.nombre || "Sin categoría"}
                        </td>

                        <td className="py-3 px-4 font-bold text-tb-dark font-sans">
                          {formatDOP(prod.precio)}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => modificarStockRapido(prod.id, -1)}
                              className="h-6 w-6 rounded bg-[#FAF8F5] hover:bg-tb-sand text-tb-dark font-bold flex items-center justify-center cursor-pointer border border-tb-sand"
                              title="Restar 1"
                            >
                              -
                            </button>
                            <span className="font-bold font-mono text-sm px-2 text-tb-dark">
                              {prod.stock}
                            </span>
                            <button
                              onClick={() => modificarStockRapido(prod.id, 1)}
                              className="h-6 w-6 rounded bg-[#FAF8F5] hover:bg-tb-sand text-tb-dark font-bold flex items-center justify-center cursor-pointer border border-tb-sand"
                              title="Sumar 1"
                            >
                              +
                            </button>
                            <button
                              onClick={() => modificarStockRapido(prod.id, 5)}
                              className="px-1.5 py-0.5 rounded bg-[#FAF8F5] hover:bg-tb-sand text-[10px] font-bold text-tb-dark cursor-pointer border border-tb-sand"
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
                                ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
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
                              className="p-1.5 rounded-lg text-tb-dark hover:bg-[#FAF8F5] cursor-pointer"
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

        {/* =========================================
            PESTAÑA 3: TERMINÓ EL DÍA / CIERRE DE CAJA
            ========================================= */}
        {pestanaActiva === "cierre" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Cabecera del Cierre con selector de fecha y botones de acción */}
            <div className="bg-white border border-[#E2DFD8] rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-tb-terracotta flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4 text-tb-emerald" />
                  Auditoría & Cierre de Cafetería
                </span>
                <h2 className="text-xl font-serif font-bold text-tb-dark mt-0.5">
                  Resumen de Ventas del Día
                </h2>
                <p className="text-xs text-tb-muted">
                  Balance de ingresos, cuentas por cobrar (fiado) y productos despachados
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                
                {/* Selector de Fecha */}
                <div className="flex items-center gap-1.5 bg-[#FAF8F5] border border-tb-sand p-1.5 rounded-2xl">
                  <Calendar className="h-4 w-4 text-tb-terracotta ml-1" />
                  <input
                    type="date"
                    value={fechaCierre}
                    onChange={(e) => setFechaCierre(e.target.value)}
                    className="bg-transparent text-xs font-bold text-tb-dark outline-none cursor-pointer"
                  />
                  <button
                    onClick={() => setFechaCierre(new Date().toLocaleDateString("en-CA"))}
                    className="px-2 py-0.5 bg-white text-[10px] font-bold text-tb-dark rounded-lg border border-tb-sand hover:bg-tb-sand cursor-pointer"
                    title="Ver hoy"
                  >
                    Hoy
                  </button>
                </div>

                {/* Botón WhatsApp */}
                <button
                  onClick={copiarResumenWhatsApp}
                  className="px-3.5 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-serif font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition active:scale-95"
                  title="Copiar reporte formateado para WhatsApp"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Enviar por WhatsApp</span>
                </button>

                {/* Botón Imprimir Ticket Z */}
                <button
                  onClick={imprimirCierreDia}
                  className="px-4 py-2.5 rounded-2xl bg-tb-dark hover:bg-tb-emerald text-tb-gold font-serif font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition active:scale-95 border border-tb-gold/20"
                  title="Imprimir ticket de cierre en impresora térmica"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Imprimir Cierre (Z)</span>
                </button>

              </div>
            </div>

            {/* Tarjetas de Balance Financiero del Día */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              
              <div className="bg-white border border-[#E2DFD8] rounded-3xl p-4.5 shadow-xs">
                <span className="text-[10px] font-bold text-tb-terracotta uppercase tracking-wider block">
                  Total General Vendido
                </span>
                <span className="text-2xl font-black text-tb-dark mt-1 block font-sans">
                  {formatDOP(totalVentasDia)}
                </span>
                <span className="text-[11px] text-tb-muted mt-0.5 block">
                  {pedidosDelDia.length} órdenes registradas
                </span>
              </div>

              <div className="bg-white border border-emerald-200 bg-emerald-50/20 rounded-3xl p-4.5 shadow-xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Efectivo en Caja
                </span>
                <span className="text-2xl font-black text-emerald-800 mt-1 block font-sans">
                  {formatDOP(totalEfectivoDia)}
                </span>
                <span className="text-[11px] text-emerald-700 mt-0.5 block">
                  Dinero físico a rendir
                </span>
              </div>

              <div className="bg-white border border-blue-200 bg-blue-50/20 rounded-3xl p-4.5 shadow-xs">
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                  Transferencias / QR
                </span>
                <span className="text-2xl font-black text-blue-900 mt-1 block font-sans">
                  {formatDOP(totalTransferenciaDia)}
                </span>
                <span className="text-[11px] text-blue-700 mt-0.5 block">
                  En cuenta bancaria
                </span>
              </div>

              <div className="bg-white border border-purple-200 bg-purple-50/20 rounded-3xl p-4.5 shadow-xs">
                <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                  Fiados / Deudas
                </span>
                <span className="text-2xl font-black text-purple-900 mt-1 block font-sans">
                  {formatDOP(totalFiadoDia)}
                </span>
                <span className="text-[11px] text-purple-700 mt-0.5 block">
                  {pedidosFiadosDia.length} cuentas pendientes
                </span>
              </div>

            </div>

            {/* SECCIÓN 1: ¿QUIÉN DEBE FIADO? (CUENTAS POR COBRAR) */}
            <div className="bg-white border border-[#E2DFD8] rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-tb-sand gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-serif font-bold text-tb-dark">
                      ¿Quién Debe Fiado? (Cuentas por Cobrar)
                    </h3>
                    <p className="text-xs text-tb-muted">
                      Listado detallado de hermanos o clientes con consumo fiado
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-tb-muted font-medium">Ver:</span>
                  <button
                    onClick={() => setVerTodosFiados(false)}
                    className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
                      !verTodosFiados
                        ? "bg-purple-900 text-white"
                        : "bg-[#FAF8F5] text-tb-dark border border-tb-sand"
                    }`}
                  >
                    Solo de este día ({pedidosFiadosDia.length})
                  </button>
                  <button
                    onClick={() => setVerTodosFiados(true)}
                    className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
                      verTodosFiados
                        ? "bg-purple-900 text-white"
                        : "bg-[#FAF8F5] text-tb-dark border border-tb-sand"
                    }`}
                  >
                    Todos los pendientes ({fiadosHistoricos.length})
                  </button>
                </div>
              </div>

              {fiadosListaAMostrar.length === 0 ? (
                <div className="text-center py-8 text-tb-muted">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-serif font-bold text-tb-dark text-base">¡No hay deudas fiadas en este filtro!</p>
                  <p className="text-xs text-tb-muted">Todas las ventas han sido cobradas o no hay fiados pendientes.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {fiadosListaAMostrar.map((fiado) => (
                    <div
                      key={fiado.id}
                      className="bg-purple-50/40 border border-purple-200 rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:border-purple-400 transition"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-1.5">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-purple-700">
                              ORDEN #{fiado.id} • {new Date(fiado.creado_en).toLocaleDateString("es-DO")}
                            </span>
                            <h4 className="font-serif font-bold text-base text-tb-dark capitalize">
                              {fiado.cliente_nombre}
                            </h4>
                          </div>
                          <span className="bg-purple-200 text-purple-900 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                            DEBE FIADO
                          </span>
                        </div>

                        {/* Desglose de lo que consumió */}
                        <div className="space-y-1 py-1.5 text-xs text-slate-700 border-t border-purple-100 mt-1">
                          {fiado.detalle_pedido?.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-[11px]">
                              <span>{item.cantidad}x {item.productos?.nombre || item.nombre || "Producto"}</span>
                              <span className="font-mono text-slate-500">{formatDOP(item.subtotal || item.cantidad * item.precio_unitario)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Nota de la deuda */}
                        {fiado.notas && (
                          <div className="mt-2 p-2 rounded-lg bg-white border border-purple-200 text-xs text-purple-950 font-medium">
                            <strong>Nota:</strong> {fiado.notas}
                          </div>
                        )}
                      </div>

                      <div className="mt-3.5 pt-2.5 border-t border-purple-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-purple-700 block">Total a Pagar</span>
                          <span className="text-lg font-black text-purple-950 font-sans">
                            {formatDOP(fiado.total)}
                          </span>
                        </div>

                        <button
                          onClick={() => setModalSaldarFiado(fiado)}
                          className="px-3 py-1.5 rounded-xl bg-purple-900 hover:bg-purple-950 text-white font-serif font-bold text-xs shadow-xs cursor-pointer transition active:scale-95"
                        >
                          Saldar Deuda
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {fiadosListaAMostrar.length > 0 && (
                <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-tb-sand flex items-center justify-between text-xs text-purple-900 font-bold">
                  <span>Total acumulado en cuentas fiadas:</span>
                  <span className="text-base text-purple-950 font-black">{formatDOP(verTodosFiados ? totalFiadosHistoricos : totalFiadoDia)}</span>
                </div>
              )}
            </div>

            {/* SECCIÓN 2: RESUMEN DE PRODUCTOS MÁS VENDIDOS (RANKING DEL DÍA) */}
            <div className="bg-white border border-[#E2DFD8] rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-tb-sand">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 text-tb-emerald flex items-center justify-center font-bold">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-tb-dark">
                    Productos Más Vendidos del Día
                  </h3>
                  <p className="text-xs text-tb-muted">
                    Conteo de unidades despachadas para reposición de stock
                  </p>
                </div>
              </div>

              {rankingProductosDia.length === 0 ? (
                <p className="text-center py-8 text-xs text-tb-muted">No hay registros de ventas en la fecha seleccionada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F5] border-b border-[#E2DFD8] text-tb-terracotta uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">#</th>
                        <th className="py-2.5 px-4">Producto</th>
                        <th className="py-2.5 px-4 text-center">Unidades Vendidas</th>
                        <th className="py-2.5 px-4 text-right">Total Generado (DOP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rankingProductosDia.map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#FAF8F5]">
                          <td className="py-3 px-4 font-bold text-tb-terracotta">{idx + 1}</td>
                          <td className="py-3 px-4 font-serif font-bold text-tb-dark text-sm">{item.nombre}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2.5 py-1 rounded-full bg-tb-sand text-tb-dark font-black font-mono">
                              {item.cantidad} u.
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-black font-sans text-tb-dark text-sm">
                            {formatDOP(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SECCIÓN 3: DETALLE DE A QUIÉN SE LE VENDIÓ (REGISTRO COMPLETO DEL DÍA) */}
            <div className="bg-white border border-[#E2DFD8] rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-tb-sand">
                <div className="h-9 w-9 rounded-xl bg-[#FAF8F5] text-tb-dark flex items-center justify-center font-bold border border-tb-sand">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-tb-dark">
                    Registro de Todas las Ventas del Día
                  </h3>
                  <p className="text-xs text-tb-muted">
                    Historial cronológico con nombre del cliente, productos y método de pago
                  </p>
                </div>
              </div>

              {pedidosDelDia.length === 0 ? (
                <p className="text-center py-8 text-xs text-tb-muted">No hay pedidos en la fecha seleccionada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F5] border-b border-[#E2DFD8] text-tb-terracotta uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">Hora</th>
                        <th className="py-2.5 px-4">Cliente</th>
                        <th className="py-2.5 px-4">Productos Despachados</th>
                        <th className="py-2.5 px-4 text-center">Método de Pago</th>
                        <th className="py-2.5 px-4 text-right">Total (DOP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pedidosDelDia.map((p) => (
                        <tr key={p.id} className="hover:bg-[#FAF8F5]">
                          <td className="py-3 px-4 text-tb-muted font-mono whitespace-nowrap">
                            {new Date(p.creado_en).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-serif font-bold text-tb-dark block capitalize text-sm">
                              {p.cliente_nombre}
                            </span>
                            {p.notas && (
                              <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded block mt-0.5 max-w-xs truncate">
                                Nota: {p.notas}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-0.5 text-slate-700">
                              {p.detalle_pedido?.map((item, i) => (
                                <div key={i}>
                                  <strong>{item.cantidad}x</strong> {item.productos?.nombre || item.nombre || "Producto"}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${
                                p.metodo_pago === "fiado"
                                  ? "bg-purple-100 text-purple-900 border border-purple-200 font-black"
                                  : p.metodo_pago === "efectivo"
                                  ? "bg-emerald-100 text-emerald-900"
                                  : "bg-blue-100 text-blue-900"
                              }`}
                            >
                              {p.metodo_pago}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-black font-sans text-tb-dark text-sm">
                            {formatDOP(p.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* =========================================
          MODAL: SALDAR DEUDA DE FIADO
          ========================================= */}
      {modalSaldarFiado && (
        <div className="fixed inset-0 z-50 bg-tb-dark/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2DFD8] rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-tb-sand mb-4">
              <h3 className="font-serif font-bold text-base text-tb-dark">
                Saldar Deuda de Fiado
              </h3>
              <button
                onClick={() => setModalSaldarFiado(null)}
                className="text-slate-400 hover:text-tb-dark cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 text-center mb-4">
              <span className="text-[11px] font-bold text-purple-800 uppercase block">Cliente</span>
              <h4 className="font-serif font-bold text-lg text-purple-950 capitalize mt-0.5">
                {modalSaldarFiado.cliente_nombre}
              </h4>
              <span className="text-2xl font-black text-purple-950 font-sans block mt-1">
                {formatDOP(modalSaldarFiado.total)}
              </span>
            </div>

            <p className="text-xs text-tb-muted mb-3 text-center">
              ¿Cómo está pagando el cliente para liquidar esta deuda?
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => saldarDeudaFiado(modalSaldarFiado.id, "efectivo")}
                className="p-3 rounded-2xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-serif font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition active:scale-95"
              >
                <Banknote className="h-5 w-5 text-emerald-700" />
                <span>Efectivo</span>
              </button>
              <button
                onClick={() => saldarDeudaFiado(modalSaldarFiado.id, "transferencia")}
                className="p-3 rounded-2xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-950 font-serif font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition active:scale-95"
              >
                <CreditCard className="h-5 w-5 text-blue-700" />
                <span>Transferencia</span>
              </button>
            </div>

            <button
              onClick={() => setModalSaldarFiado(null)}
              className="w-full py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-tb-sand text-tb-dark font-bold text-xs cursor-pointer border border-tb-sand"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL: TICKET DE CIERRE DEL DÍA (REPORTE Z)
          ========================================= */}
      {ticketCierreParaImprimir && (
        <div className="fixed inset-0 z-50 bg-tb-dark/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2DFD8] rounded-3xl max-w-sm w-full p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2.5 border-b border-tb-sand mb-3">
              <span className="font-serif font-bold text-xs uppercase text-tb-dark flex items-center gap-1.5">
                <Printer className="h-4 w-4 text-tb-terracotta" /> Reporte de Cierre del Día
              </span>
              <button
                onClick={() => setTicketCierreParaImprimir(null)}
                className="text-slate-400 hover:text-tb-dark cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div id="thermal-receipt" className="bg-[#FAF8F5] p-4 rounded-2xl border border-tb-sand font-mono text-xs text-tb-dark leading-snug space-y-2">
              <div className="text-center font-bold">
                <div className="text-sm font-serif">TEMPLO BÍBLICO LA VEGA</div>
                <div className="text-[10px] text-tb-terracotta">CIERRE DE CAJA / DÍA (REPORTE Z)</div>
              </div>
              <div className="border-t border-dashed border-[#D5D0C6]"></div>
              <div className="text-[11px] space-y-0.5">
                <div>FECHA AUDITADA: {ticketCierreParaImprimir.fecha}</div>
                <div>EMISIÓN TICKET : {new Date().toLocaleString()}</div>
                <div>ÓRDENES TOTALES: {ticketCierreParaImprimir.ordenesCobradas + ticketCierreParaImprimir.ordenesFiadas}</div>
              </div>
              <div className="border-t border-dashed border-[#D5D0C6]"></div>
              
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-bold text-sm">
                  <span>TOTAL VENDIDO:</span>
                  <span>{formatDOP(ticketCierreParaImprimir.totalVendido)}</span>
                </div>
                <div className="flex justify-between text-emerald-800">
                  <span>• EFECTIVO EN CAJA:</span>
                  <span>{formatDOP(ticketCierreParaImprimir.totalEfectivo)}</span>
                </div>
                <div className="flex justify-between text-blue-800">
                  <span>• TRANSFERENCIAS:</span>
                  <span>{formatDOP(ticketCierreParaImprimir.totalTransferencia)}</span>
                </div>
                <div className="flex justify-between text-purple-900 font-bold">
                  <span>• FIADO / DEUDAS:</span>
                  <span>{formatDOP(ticketCierreParaImprimir.totalFiado)}</span>
                </div>
              </div>

              {ticketCierreParaImprimir.fiados && ticketCierreParaImprimir.fiados.length > 0 && (
                <>
                  <div className="border-t border-dashed border-[#D5D0C6]"></div>
                  <div className="text-[10px] font-bold text-purple-950 uppercase">CLIENTES QUE DEBEN FIADO:</div>
                  <div className="space-y-1 text-[10px]">
                    {ticketCierreParaImprimir.fiados.map((f, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{i + 1}. {f.cliente}</span>
                        <span className="font-bold">{formatDOP(f.total)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {ticketCierreParaImprimir.productosVendidos && ticketCierreParaImprimir.productosVendidos.length > 0 && (
                <>
                  <div className="border-t border-dashed border-[#D5D0C6]"></div>
                  <div className="text-[10px] font-bold text-tb-dark uppercase">TOP PRODUCTOS DESPACHADOS:</div>
                  <div className="space-y-1 text-[10px]">
                    {ticketCierreParaImprimir.productosVendidos.slice(0, 8).map((p, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{p.cantidad}x {p.nombre}</span>
                        <span>{formatDOP(p.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="border-t border-dashed border-[#D5D0C6]"></div>
              <div className="text-center text-[10px] text-tb-muted pt-1">
                COMPROBANTE OFICIAL DE RENDICIÓN DE CUENTAS
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={imprimirEnNavegador}
                className="flex-1 bg-tb-dark hover:bg-tb-emerald text-tb-gold font-serif font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-tb-gold/20"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir Ticket</span>
              </button>
              <button
                onClick={() => setTicketCierreParaImprimir(null)}
                className="px-4 py-2.5 bg-[#FAF8F5] hover:bg-tb-sand text-tb-dark font-bold rounded-xl text-xs cursor-pointer border border-tb-sand"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL: COBRO CON FIADO, VUELTO Y NOTAS (ORDEN INDIVIDUAL)
          ========================================= */}
      {pedidoCobrando && (
        <div className="fixed inset-0 z-50 bg-tb-dark/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2DFD8] rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-tb-sand mb-4">
              <div>
                <h3 className="font-serif font-bold text-base text-tb-dark">
                  Cobrar Orden #{pedidoCobrando.id}
                </h3>
                <span className="text-xs text-tb-muted">
                  Cliente: <strong className="text-tb-dark capitalize font-serif">{pedidoCobrando.cliente_nombre}</strong>
                </span>
              </div>
              <button
                onClick={() => setPedidoCobrando(null)}
                className="text-slate-400 hover:text-tb-dark cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Total Grande en DOP */}
            <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-tb-sand text-center mb-4">
              <span className="text-xs uppercase font-bold text-tb-terracotta block">Total a Cobrar</span>
              <span className="text-3xl font-black text-tb-dark font-sans">
                {formatDOP(pedidoCobrando.total)}
              </span>
            </div>

            {/* Selector de Método de Pago */}
            <div className="space-y-2 mb-4">
              <label className="block text-xs font-bold text-tb-dark uppercase">
                Método de Pago
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMetodoCobro("efectivo")}
                  className={`py-2.5 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                    metodoCobro === "efectivo"
                      ? "bg-tb-dark border-tb-dark text-tb-gold"
                      : "bg-[#FAF8F5] border-tb-sand text-tb-dark hover:bg-tb-sand"
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
                      ? "bg-tb-dark border-tb-dark text-tb-gold"
                      : "bg-[#FAF8F5] border-tb-sand text-tb-dark hover:bg-tb-sand"
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
                      : "bg-purple-50 border-purple-200 text-purple-900 hover:bg-purple-100"
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>Fiado / Cuenta</span>
                </button>
              </div>
            </div>

            {/* Si es EFECTIVO: Calculadora con Billetes Dominicanos (RD$ 50, 100, 200, 500, 1000, 2000) */}
            {metodoCobro === "efectivo" && (
              <div className="space-y-3 p-3.5 bg-[#FAF8F5] border border-tb-sand rounded-2xl mb-4">
                <div>
                  <label className="block text-xs font-bold text-tb-dark mb-1">
                    ¿Con cuánto abona el cliente? (RD$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Monto entregado en pesos"
                    value={montoEntregado}
                    onChange={(e) => setMontoEntregado(e.target.value)}
                    className="w-full bg-white border border-[#D5D0C6] rounded-xl p-2.5 text-base font-bold text-tb-dark outline-none focus:border-tb-dark"
                    autoFocus
                  />
                </div>

                {/* Billetes Dominicanos Rápidos */}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setMontoEntregado(String(pedidoCobrando.total))}
                    className="px-2.5 py-1 bg-white border border-tb-sand rounded-lg font-bold text-tb-dark hover:bg-tb-sand cursor-pointer shadow-2xs"
                  >
                    Exacto
                  </button>
                  {[50, 100, 200, 500, 1000, 2000].map((billete) => (
                    <button
                      key={billete}
                      type="button"
                      onClick={() => setMontoEntregado(String(billete))}
                      className="px-2.5 py-1 bg-white border border-tb-sand rounded-lg font-bold text-tb-dark hover:bg-tb-sand cursor-pointer shadow-2xs"
                    >
                      RD$ {billete.toLocaleString("es-DO")}
                    </button>
                  ))}
                </div>

                {/* Cálculo en Vivo del Vuelto */}
                <div className="pt-2 border-t border-tb-sand flex justify-between items-center text-xs">
                  <span className="font-bold text-tb-muted">
                    {vueltoCalculado >= 0 ? "Vuelto / Cambio a entregar:" : "Faltan cobrar:"}
                  </span>
                  <span className={`text-lg font-black ${
                    vueltoCalculado >= 0 ? "text-tb-emerald" : "text-amber-700"
                  }`}>
                    {formatDOP(Math.abs(vueltoCalculado))}
                  </span>
                </div>
              </div>
            )}

            {/* Si es FIADO */}
            {metodoCobro === "fiado" && (
              <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl mb-4 text-xs text-purple-900 space-y-1">
                <span className="font-bold flex items-center gap-1 text-purple-950 font-serif text-sm">
                  <FileText className="h-4 w-4" /> Venta registrada como Fiado / Cuenta
                </span>
                <p className="text-[11px] text-purple-700">
                  La orden se guardará con estado de cuenta pendiente para llevar el registro de deudas en el Cierre del Día.
                </p>
              </div>
            )}

            {/* Notas / Observaciones del Operador */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-tb-dark mb-1">
                Nota u Observación (Opcional)
              </label>
              <input
                type="text"
                placeholder={metodoCobro === "fiado" ? "Ej. Paga el viernes / Libreta pág 12" : "Aclaración sobre el cobro"}
                value={notaCobro}
                onChange={(e) => setNotaCobro(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-tb-sand rounded-xl p-2.5 text-xs text-tb-dark outline-none focus:bg-white focus:border-tb-dark"
              />
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPedidoCobrando(null)}
                className="flex-1 py-3 rounded-xl bg-[#FAF8F5] hover:bg-tb-sand font-bold text-tb-dark text-xs cursor-pointer border border-tb-sand"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarCobroFinal}
                disabled={cobrandoProceso}
                className="flex-2 py-3 px-4 rounded-xl bg-tb-dark hover:bg-tb-emerald text-tb-gold font-serif font-bold text-xs flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer border border-tb-gold/20"
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
        <div className="fixed inset-0 z-50 bg-tb-dark/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2DFD8] rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-tb-sand mb-4">
              <div>
                <h3 className="font-serif font-bold text-base text-tb-dark">
                  {modalProducto.id ? "Editar Producto" : "Nuevo Producto"}
                </h3>
                <p className="text-xs text-tb-muted">Configura foto, título, descripción y precio en DOP</p>
              </div>
              <button
                onClick={() => setModalProducto(null)}
                className="text-slate-400 hover:text-tb-dark cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={guardarProductoModal} className="space-y-4 text-xs">
              
              {/* TÍTULO / NOMBRE */}
              <div>
                <label className="block font-bold text-tb-dark mb-1">
                  Título o Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cerveza Presidente 355ml / Café Santo Domingo"
                  value={modalProducto.nombre || ""}
                  onChange={(e) => setModalProducto({ ...modalProducto, nombre: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-tb-sand rounded-xl p-2.5 text-sm outline-none focus:bg-white focus:border-tb-dark"
                />
              </div>

              {/* DESCRIPCIÓN DETALLADA */}
              <div>
                <label className="block font-bold text-tb-dark mb-1">
                  Descripción del Producto
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Bien fría, con hielo, o recién preparado."
                  value={modalProducto.descripcion || ""}
                  onChange={(e) => setModalProducto({ ...modalProducto, descripcion: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-tb-sand rounded-xl p-2.5 text-xs outline-none focus:bg-white focus:border-tb-dark"
                />
              </div>

              {/* PRECIO (DOP) Y STOCK */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-tb-dark mb-1">
                    Precio en DOP (RD$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="180.00"
                    value={modalProducto.precio || ""}
                    onChange={(e) => setModalProducto({ ...modalProducto, precio: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-tb-sand rounded-xl p-2.5 text-sm font-bold text-tb-dark outline-none focus:bg-white focus:border-tb-dark"
                  />
                </div>
                <div>
                  <label className="block font-bold text-tb-dark mb-1">
                    Stock Disponible *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="24"
                    value={modalProducto.stock ?? ""}
                    onChange={(e) => setModalProducto({ ...modalProducto, stock: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-tb-sand rounded-xl p-2.5 text-sm font-bold text-tb-dark outline-none focus:bg-white focus:border-tb-dark"
                  />
                </div>
              </div>

              {/* CATEGORÍA */}
              <div>
                <label className="block font-bold text-tb-dark mb-1">Categoría</label>
                <select
                  value={modalProducto.categoria_id || ""}
                  onChange={(e) => setModalProducto({ ...modalProducto, categoria_id: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-tb-sand rounded-xl p-2.5 outline-none focus:bg-white focus:border-tb-dark cursor-pointer"
                >
                  <option value="">Selecciona una categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              {/* IMAGEN Y VISTA PREVIA */}
              <div>
                <label className="block font-bold text-tb-dark mb-1">
                  URL de Imagen del Producto
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={modalProducto.imagen_url || ""}
                    onChange={(e) => setModalProducto({ ...modalProducto, imagen_url: e.target.value })}
                    className="flex-1 bg-[#FAF8F5] border border-tb-sand rounded-xl p-2.5 text-xs outline-none focus:bg-white focus:border-tb-dark"
                  />
                </div>

                {/* Botones de fotos predefinidas para 1-clic */}
                <div className="space-y-1">
                  <span className="text-[10px] text-tb-terracotta block font-semibold">
                    O elige una imagen rápida de muestra:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {fotosPredefinidas.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setModalProducto({ ...modalProducto, imagen_url: item.url })}
                        className="px-2.5 py-1 bg-[#FAF8F5] hover:bg-tb-sand text-tb-dark text-[10px] rounded-lg font-semibold transition cursor-pointer border border-tb-sand"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vista previa de la imagen cargada */}
                {modalProducto.imagen_url && (
                  <div className="mt-3 p-2 bg-[#FAF8F5] rounded-xl border border-tb-sand flex items-center gap-3">
                    <img
                      src={modalProducto.imagen_url}
                      alt="Vista previa"
                      className="h-16 w-16 object-cover rounded-xl border border-tb-sand"
                      onError={(e) => {
                        e.currentTarget.src = "https://via.placeholder.com/150?text=Error";
                      }}
                    />
                    <div className="text-xs text-tb-muted">
                      <span className="font-bold text-tb-dark block font-serif">Vista previa de imagen</span>
                      <span className="text-[10px]">Esta imagen se mostrará en el menú del cliente.</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-tb-sand">
                <button
                  type="button"
                  onClick={() => setModalProducto(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-tb-sand font-bold text-tb-dark cursor-pointer border border-tb-sand"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoProd}
                  className="px-5 py-2.5 rounded-xl bg-tb-dark hover:bg-tb-emerald text-tb-gold font-serif font-bold disabled:opacity-50 cursor-pointer shadow-sm border border-tb-gold/20"
                >
                  {guardandoProd ? "Guardando..." : "Guardar Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL: TICKET DE VENTA INDIVIDUAL IMPRIMIBLE EN DOP
          ========================================= */}
      {ticketParaImprimir && (
        <div className="fixed inset-0 z-50 bg-tb-dark/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2DFD8] rounded-3xl max-w-sm w-full p-5 shadow-2xl">
            <div className="flex justify-between items-center pb-2.5 border-b border-tb-sand mb-3">
              <span className="font-serif font-bold text-xs uppercase text-tb-dark flex items-center gap-1.5">
                <Printer className="h-4 w-4 text-tb-terracotta" /> Comprobante TB La Vega
              </span>
              <button
                onClick={() => setTicketParaImprimir(null)}
                className="text-slate-400 hover:text-tb-dark cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div id="thermal-receipt" className="bg-[#FAF8F5] p-4 rounded-2xl border border-tb-sand font-mono text-xs text-tb-dark leading-snug space-y-2">
              <div className="text-center font-bold">
                <div className="text-sm font-serif">TEMPLO BÍBLICO LA VEGA</div>
                <div className="text-[10px] text-tb-terracotta">TICKET DE VENTA (DOP)</div>
              </div>
              <div className="border-t border-dashed border-[#D5D0C6]"></div>
              <div className="text-[11px]">
                <div>ORDEN #: {ticketParaImprimir.id}</div>
                <div>FECHA : {ticketParaImprimir.fecha}</div>
                <div>CLIENTE: {ticketParaImprimir.cliente?.toUpperCase()}</div>
                <div>
                  PAGO   : {ticketParaImprimir.metodo_pago === "fiado" ? "*** CUENTA / FIADO ***" : ticketParaImprimir.metodo_pago?.toUpperCase()}
                </div>
              </div>
              <div className="border-t border-dashed border-[#D5D0C6]"></div>
              <div className="space-y-1 text-[11px]">
                {ticketParaImprimir.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.cantidad}x {item.nombre}</span>
                    <span>{formatDOP(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-[#D5D0C6]"></div>
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL:</span>
                <span>{formatDOP(ticketParaImprimir.total)}</span>
              </div>

              {ticketParaImprimir.metodo_pago === "efectivo" && ticketParaImprimir.monto_recibido && (
                <div className="text-[11px] pt-1 text-tb-muted border-t border-tb-sand">
                  <div className="flex justify-between">
                    <span>ABONO CON:</span>
                    <span>{formatDOP(ticketParaImprimir.monto_recibido)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-tb-dark">
                    <span>VUELTO:</span>
                    <span>{formatDOP(ticketParaImprimir.vuelto || 0)}</span>
                  </div>
                </div>
              )}

              {ticketParaImprimir.notas && (
                <div className="text-[10px] bg-white p-2 rounded-lg mt-1 text-tb-dark border border-tb-sand">
                  NOTA: {ticketParaImprimir.notas}
                </div>
              )}

              <div className="text-center text-[10px] text-tb-muted pt-1">
                ¡GRACIAS POR SU COMPRA! DIOS LE BENDIGA.
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={imprimirEnNavegador}
                className="flex-1 bg-tb-dark hover:bg-tb-emerald text-tb-gold font-serif font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-tb-gold/20"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir Ticket</span>
              </button>
              <button
                onClick={() => setTicketParaImprimir(null)}
                className="px-4 py-2.5 bg-[#FAF8F5] hover:bg-tb-sand text-tb-dark font-bold rounded-xl text-xs cursor-pointer border border-tb-sand"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pie de Página */}
      <footer className="text-center text-xs text-tb-muted border-t border-[#E2DFD8] bg-white py-4 mt-8">
        Templo Bíblico La Vega • Mostrador • Precios en DOP
      </footer>
    </div>
  );
}
