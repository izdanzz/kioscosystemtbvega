"use client";

import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  Check, 
  Store, 
  Search, 
  ArrowRight, 
  X, 
  AlertCircle, 
  CreditCard,
  Banknote,
  FileText,
  ChevronRight,
  Trash2,
  Package,
  Heart
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { playChimeSound } from "@/lib/sound";

export default function MenuCliente() {
  const [paso, setPaso] = useState("registro"); // 'registro' | 'menu' | 'comprobante'
  const [nombre, setNombre] = useState("");
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [mostrarCarritoModal, setMostrarCarritoModal] = useState(false);
  const [productoDetalle, setProductoDetalle] = useState(null); // Modal para ver foto, título y descripción completa
  const [metodoPago, setMetodoPago] = useState("dinero");
  const [notas, setNotas] = useState("");
  const [cargando, setCargando] = useState(false);
  const [pedidoGuardado, setPedidoGuardado] = useState(null);
  const [errorMensaje, setErrorMensaje] = useState("");

  // Helper de Formato Dominicano (DOP / RD$)
  const formatDOP = (monto) => {
    return "RD$ " + Number(monto || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("kiosco_cliente_nombre");
      if (savedName) setNombre(savedName);
    }
    cargarDatos();

    // Suscripción Realtime a cambios en productos (stock / precios actualizados en mostrador)
    let canal = null;
    if (isSupabaseConfigured()) {
      canal = supabase
        .channel("cliente_productos_realtime_tb")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "productos" },
          () => {
            cargarDatos();
          }
        )
        .subscribe();
    }

    return () => {
      if (canal) supabase.removeChannel(canal);
    };
  }, []);

  const cargarDatos = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data: catData } = await supabase
        .from("categorias")
        .select("*")
        .order("orden", { ascending: true });

      const { data: prodData } = await supabase
        .from("productos")
        .select("*, categorias(nombre)")
        .filter("activo", "eq", true)
        .gt("stock", 0)
        .order("nombre", { ascending: true });

      if (catData) setCategorias(catData);
      if (prodData) setProductos(prodData);
    } catch (err) {
      console.warn("Error al cargar menú:", err);
    }
  };

  const iniciarCompra = (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMensaje("Por favor escribe tu nombre para comenzar.");
      return;
    }
    setErrorMensaje("");
    if (typeof window !== "undefined") {
      localStorage.setItem("kiosco_cliente_nombre", nombre.trim());
    }
    setPaso("menu");
  };

  const agregarAlCarrito = (producto, cantidadDeseada = 1) => {
    const itemActual = carrito.find((i) => i.id === producto.id);
    const cantidadActual = itemActual ? itemActual.cantidad : 0;
    const nuevaCantidad = cantidadActual + cantidadDeseada;

    if (nuevaCantidad > producto.stock) {
      alert(`Solo quedan ${producto.stock} unidades de este producto.`);
      return;
    }

    if (itemActual) {
      setCarrito(
        carrito.map((item) =>
          item.id === producto.id ? { ...item, cantidad: nuevaCantidad } : item
        )
      );
    } else {
      setCarrito([...carrito, { ...producto, cantidad: cantidadDeseada }]);
    }
  };

  const restarDelCarrito = (productoId) => {
    const itemActual = carrito.find((i) => i.id === productoId);
    if (!itemActual) return;

    if (itemActual.cantidad === 1) {
      setCarrito(carrito.filter((item) => item.id !== productoId));
    } else {
      setCarrito(
        carrito.map((item) =>
          item.id === productoId ? { ...item, cantidad: item.cantidad - 1 } : item
        )
      );
    }
  };

  const vaciarCarrito = () => {
    setCarrito([]);
    setMostrarCarritoModal(false);
  };

  const totalCarrito = carrito.reduce(
    (acc, item) => acc + Number(item.precio) * item.cantidad,
    0
  );

  const totalArticulos = carrito.reduce((acc, item) => acc + item.cantidad, 0);

  const enviarPedido = async () => {
    if (carrito.length === 0 || cargando) return;
    setCargando(true);
    setErrorMensaje("");

    try {
      if (isSupabaseConfigured()) {
        // 1. Insertar orden en Supabase
        const { data: nuevoPedido, error: errorPedido } = await supabase
          .from("pedidos")
          .insert({
            cliente_nombre: nombre.trim(),
            total: totalCarrito,
            estado: "pendiente",
            metodo_pago: metodoPago,
            notas: notas.trim() || null,
          })
          .select()
          .single();

        if (errorPedido) throw new Error(errorPedido.message);

        // 2. Insertar detalles (PostgreSQL trigger descontará stock atómicamente)
        const detalles = carrito.map((item) => ({
          pedido_id: nuevoPedido.id,
          producto_id: item.id,
          cantidad: item.cantidad,
          precio_unitario: item.precio,
        }));

        const { error: errorDetalles } = await supabase
          .from("detalle_pedido")
          .insert(detalles);

        if (errorDetalles) {
          await supabase.from("pedidos").delete().eq("id", nuevoPedido.id);
          throw new Error("No se pudo procesar: " + errorDetalles.message);
        }

        setPedidoGuardado({
          ...nuevoPedido,
          items: [...carrito],
        });
      } else {
        const fakeId = Math.floor(100 + Math.random() * 900);
        setPedidoGuardado({
          id: fakeId,
          cliente_nombre: nombre.trim(),
          total: totalCarrito,
          estado: "pendiente",
          metodo_pago: metodoPago,
          notas: notas.trim(),
          items: [...carrito],
        });
      }

      playChimeSound();
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });

      setCarrito([]);
      setMostrarCarritoModal(false);
      setPaso("comprobante");
    } catch (err) {
      console.error("Error al procesar orden:", err);
      setErrorMensaje(err.message || "Error al procesar tu pedido. Por favor intenta nuevamente.");
    } finally {
      setCargando(false);
    }
  };

  const productosFiltrados = productos.filter((p) => {
    const coincideCategoria =
      categoriaSeleccionada === "todas" ||
      String(p.categoria_id) === String(categoriaSeleccionada);
    const coincideBusqueda =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(busqueda.toLowerCase()));
    return coincideCategoria && coincideBusqueda;
  });

  return (
    <div className="min-h-screen bg-[#F1F4F3] text-tb-dark flex flex-col items-center font-sans selection:bg-tb-dark selection:text-tb-gold">
      <div className="w-full max-w-lg bg-white border-x border-[#E2DFD8] min-h-screen flex flex-col shadow-sm">
        
        {/* =========================================
            PASO 1: BIENVENIDA & REGISTRO DE CLIENTE
            ========================================= */}
        {paso === "registro" && (
          <div className="flex-1 flex flex-col justify-between p-6">
            <div className="pt-12 text-center">
              <div className="inline-block p-3 rounded-2xl bg-[#FAF8F5] border border-tb-sand shadow-xs mb-4">
                <img 
                  src="https://assets.cdn.filesafe.space/SzYXoLdE37ybSNUMDx8V/media/7fe3f97b-2a5c-46ab-9176-504c273b278b.png" 
                  alt="Templo Bíblico La Vega" 
                  className="h-16 w-auto mx-auto object-contain"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-tb-dark tracking-tight">
                Templo Bíblico La Vega
              </h1>
              <p className="text-xs uppercase tracking-widest font-semibold text-tb-terracotta mt-1">
                Cafetería & Kiosco Digital
              </p>
              <p className="text-tb-muted text-xs mt-2 max-w-xs mx-auto">
                Escribe tu nombre para ver el menú y hacer tu pedido con precios en Pesos Dominicanos (DOP).
              </p>
            </div>

            <form onSubmit={iniciarCompra} className="my-8 bg-[#FAF8F5] p-6 rounded-3xl border border-tb-sand space-y-4 shadow-2xs">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-tb-dark mb-1.5 text-center">
                  ¿Cómo te llamas?
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-white border border-[#D5D0C6] focus:border-tb-dark focus:ring-1 focus:ring-tb-dark text-tb-dark rounded-xl px-4 py-3.5 text-base font-medium outline-none transition placeholder:text-slate-400 text-center"
                  autoFocus
                />
              </div>

              {errorMensaje && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMensaje}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-tb-dark hover:bg-tb-emerald text-tb-gold font-serif font-bold py-3.5 px-5 rounded-xl text-sm flex items-center justify-center gap-2 transition active:scale-[0.99] shadow-sm cursor-pointer border border-tb-gold/20"
              >
                <span>Ver Menú & Ordenar</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="text-center pb-4 text-xs text-tb-muted">
              Templo Bíblico La Vega • Calle Sánchez #111
            </div>
          </div>
        )}

        {/* =========================================
            PASO 2: MENÚ & CATÁLOGO DE PRODUCTOS (FOTO, TÍTULO Y DESCRIPCIÓN)
            ========================================= */}
        {paso === "menu" && (
          <div className="flex-1 flex flex-col pb-24">
            
            {/* Cabecera Estilo tblavega.com en Verde Petróleo Oscuro */}
            <header className="sticky top-0 z-30 bg-tb-dark text-white border-b border-tb-gold/20 px-4 pt-3 pb-3 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <img 
                    src="https://assets.cdn.filesafe.space/SzYXoLdE37ybSNUMDx8V/media/7fe3f97b-2a5c-46ab-9176-504c273b278b.png" 
                    alt="Logo TB La Vega" 
                    className="h-8 w-auto brightness-110"
                  />
                  <div>
                    <h2 className="text-base font-serif font-bold text-white tracking-wide">
                      TB La Vega
                    </h2>
                    <span className="text-[11px] text-tb-gold block">
                      Cliente: <strong>{nombre}</strong> • DOP
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setMostrarCarritoModal(true)}
                  className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 text-tb-gold transition active:scale-95 cursor-pointer border border-tb-gold/30"
                  title="Ver carrito de compras"
                >
                  <ShoppingBag className="h-5 w-5" />
                  {totalArticulos > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-tb-gold text-tb-dark text-[11px] font-black h-5 w-5 rounded-full flex items-center justify-center shadow">
                      {totalArticulos}
                    </span>
                  )}
                </button>
              </div>

              {/* Buscador Integrado */}
              <div className="relative mb-2">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-tb-sand/60" />
                <input
                  type="text"
                  placeholder="Buscar producto, ingrediente o snack..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 focus:bg-white focus:text-tb-dark focus:border-tb-gold rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-tb-sand/60 outline-none transition"
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda("")}
                    className="absolute right-3 top-2.5 text-white/70 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Categorías con Estilo de Pastillas de tblavega.com */}
              <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar">
                <button
                  onClick={() => setCategoriaSeleccionada("todas")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    categoriaSeleccionada === "todas"
                      ? "bg-tb-gold text-tb-dark font-bold shadow-xs"
                      : "bg-white/10 text-tb-sand hover:bg-white/20"
                  }`}
                >
                  Todos
                </button>
                {categorias.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaSeleccionada(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      String(categoriaSeleccionada) === String(cat.id)
                        ? "bg-tb-gold text-tb-dark font-bold shadow-xs"
                        : "bg-white/10 text-tb-sand hover:bg-white/20"
                    }`}
                  >
                    {cat.nombre}
                  </button>
                ))}
              </div>
            </header>

            {/* Listado con Imagen, Título y Descripción con Estética tblavega.com */}
            <main className="flex-1 p-4 space-y-4 bg-[#F1F4F3]">
              {productosFiltrados.length === 0 ? (
                <div className="text-center py-16 text-tb-muted bg-white border border-[#E2DFD8] rounded-2xl p-6">
                  <Package className="h-10 w-10 mx-auto mb-2 text-tb-sand" />
                  <p className="font-serif font-bold text-tb-dark text-base">No encontramos productos en esta sección</p>
                  <p className="text-xs text-tb-muted mt-1">Prueba seleccionando otra categoría o borrando la búsqueda.</p>
                </div>
              ) : (
                productosFiltrados.map((prod) => {
                  const enCarrito = carrito.find((i) => i.id === prod.id);
                  const cantidad = enCarrito ? enCarrito.cantidad : 0;
                  const sinStock = prod.stock <= 0;

                  return (
                    <div
                      key={prod.id}
                      className="bg-white border border-[#E2DFD8] rounded-2xl overflow-hidden shadow-xs hover:border-tb-dark/30 transition flex flex-col"
                    >
                      {/* 1. IMAGEN DEL PRODUCTO (Nitidez, aspect-ratio, zoom sutil) */}
                      <div 
                        onClick={() => setProductoDetalle(prod)}
                        className="relative w-full h-44 bg-[#FAF8F5] cursor-pointer overflow-hidden group"
                      >
                        {prod.imagen_url ? (
                          <img
                            src={prod.imagen_url}
                            alt={prod.nombre}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-tb-sand">
                            <Store className="h-12 w-12 stroke-[1.5]" />
                            <span className="text-[10px] text-tb-muted mt-1 font-serif">TB La Vega</span>
                          </div>
                        )}

                        {/* Etiqueta de Categoría */}
                        {prod.categorias?.nombre && (
                          <span className="absolute top-2.5 left-2.5 bg-tb-dark/90 text-tb-gold text-[10px] font-bold px-2.5 py-0.5 rounded-md shadow-xs backdrop-blur-xs">
                            {prod.categorias.nombre}
                          </span>
                        )}

                        {/* Badge de Stock */}
                        {prod.stock <= 5 && prod.stock > 0 ? (
                          <span className="absolute top-2.5 right-2.5 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                            ¡Solo {prod.stock} disponibles!
                          </span>
                        ) : (
                          <span className="absolute top-2.5 right-2.5 bg-white/90 text-tb-dark text-[10px] font-medium px-2 py-0.5 rounded-md shadow-xs">
                            Stock: {prod.stock}
                          </span>
                        )}
                      </div>

                      {/* 2. TÍTULO, DESCRIPCIÓN Y PRECIO EN DOP */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div 
                          onClick={() => setProductoDetalle(prod)}
                          className="cursor-pointer"
                        >
                          {/* TÍTULO DEL PRODUCTO EN SERIF */}
                          <h3 className="font-serif font-bold text-tb-dark text-lg leading-snug hover:text-tb-emerald transition">
                            {prod.nombre}
                          </h3>

                          {/* DESCRIPCIÓN DEL PRODUCTO */}
                          {prod.descripcion ? (
                            <p className="text-xs text-tb-muted mt-1 leading-relaxed line-clamp-2">
                              {prod.descripcion}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 mt-1 italic">
                              Disponible en cafetería
                            </p>
                          )}
                        </div>

                        {/* FILA INFERIOR: PRECIO EN DOP Y BOTÓN DE ACCIÓN */}
                        <div className="mt-4 pt-3 border-t border-[#F1EFEA] flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-tb-terracotta block">
                              Precio
                            </span>
                            <span className="text-lg font-black text-tb-dark tracking-tight">
                              {formatDOP(prod.precio)}
                            </span>
                          </div>

                          <div>
                            {cantidad > 0 ? (
                              <div className="flex items-center gap-1 bg-[#FAF8F5] border border-tb-sand rounded-xl p-1">
                                <button
                                  onClick={() => restarDelCarrito(prod.id)}
                                  className="h-7 w-7 rounded-lg bg-white text-tb-dark shadow-xs flex items-center justify-center font-bold active:scale-95 cursor-pointer"
                                  title="Quitar uno"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="w-6 text-center font-bold text-xs text-tb-dark">
                                  {cantidad}
                                </span>
                                <button
                                  onClick={() => agregarAlCarrito(prod)}
                                  disabled={cantidad >= prod.stock}
                                  className="h-7 w-7 rounded-lg bg-tb-dark text-tb-gold shadow-xs flex items-center justify-center font-bold disabled:opacity-40 active:scale-95 cursor-pointer"
                                  title="Agregar otro"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => agregarAlCarrito(prod)}
                                disabled={sinStock}
                                className="px-4 py-2 rounded-xl bg-tb-dark hover:bg-tb-emerald text-tb-gold font-serif font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 disabled:opacity-40 cursor-pointer border border-tb-gold/20"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Agregar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </main>

            {/* Barra Inferior Flotante del Carrito Estilo tblavega.com */}
            {totalArticulos > 0 && (
              <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 z-40 bg-gradient-to-t from-[#F1F4F3] via-[#F1F4F3]/95 to-transparent pt-6">
                <button
                  onClick={() => setMostrarCarritoModal(true)}
                  className="w-full bg-tb-dark hover:bg-tb-emerald text-white font-serif font-bold py-3.5 px-5 rounded-2xl flex items-center justify-between shadow-xl active:scale-[0.99] transition cursor-pointer border border-tb-gold/30"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="bg-tb-gold text-tb-dark text-xs px-2.5 py-0.5 rounded-full font-sans font-black">
                      {totalArticulos}
                    </span>
                    <span className="text-sm tracking-wide">Ver Mi Orden</span>
                  </div>
                  <div className="flex items-center gap-1 text-tb-gold font-sans">
                    <span className="text-base font-black">
                      {formatDOP(totalCarrito)}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {/* =========================================
            MODAL DE DETALLE DEL PRODUCTO (IMAGEN, TÍTULO Y DESCRIPCIÓN COMPLETA)
            ========================================= */}
        {productoDetalle && (
          <div className="fixed inset-0 z-50 bg-tb-dark/60 backdrop-blur-xs flex justify-center items-end sm:items-center p-0 sm:p-4">
            <div className="bg-white border border-[#E2DFD8] w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              
              {/* Imagen Grande */}
              <div className="relative w-full h-56 bg-[#FAF8F5]">
                {productoDetalle.imagen_url ? (
                  <img
                    src={productoDetalle.imagen_url}
                    alt={productoDetalle.nombre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-tb-sand">
                    <Store className="h-16 w-16 stroke-[1.5]" />
                    <span className="text-xs text-tb-muted mt-2 font-serif">TB La Vega</span>
                  </div>
                )}
                
                <button
                  onClick={() => setProductoDetalle(null)}
                  className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>

                {productoDetalle.categorias?.nombre && (
                  <span className="absolute bottom-3 left-3 bg-tb-dark text-tb-gold text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                    {productoDetalle.categorias.nombre}
                  </span>
                )}
              </div>

              {/* Contenido Completo */}
              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                <div>
                  <h2 className="text-xl font-serif font-bold text-tb-dark leading-snug">
                    {productoDetalle.nombre}
                  </h2>
                  <div className="text-2xl font-black text-tb-dark mt-1 font-sans">
                    {formatDOP(productoDetalle.precio)}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-tb-terracotta mb-1">
                    Descripción del Producto
                  </h4>
                  <p className="text-sm text-tb-dark leading-relaxed bg-[#FAF8F5] p-3.5 rounded-2xl border border-tb-sand">
                    {productoDetalle.descripcion || "Producto fresco listo para ordenar en cafetería."}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-tb-muted py-1">
                  <span>Stock disponible en cafetería:</span>
                  <span className="font-bold text-tb-dark">{productoDetalle.stock} unidades</span>
                </div>
              </div>

              {/* Botón Inferior */}
              <div className="p-4 border-t border-[#E2DFD8] bg-[#FAF8F5]">
                <button
                  onClick={() => {
                    agregarAlCarrito(productoDetalle, 1);
                    setProductoDetalle(null);
                  }}
                  disabled={productoDetalle.stock <= 0}
                  className="w-full bg-tb-dark hover:bg-tb-emerald text-tb-gold font-serif font-bold py-3.5 px-5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] disabled:opacity-50 cursor-pointer border border-tb-gold/20"
                >
                  <Plus className="h-4 w-4" />
                  <span>Agregar a la Orden • {formatDOP(productoDetalle.precio)}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            MODAL DE REVISIÓN DEL CARRITO
            ========================================= */}
        {mostrarCarritoModal && (
          <div className="fixed inset-0 z-50 bg-tb-dark/60 backdrop-blur-xs flex justify-center items-end sm:items-center p-0 sm:p-4">
            <div className="bg-white border border-[#E2DFD8] w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
              
              <div className="p-4 border-b border-[#E2DFD8] flex items-center justify-between bg-tb-dark text-white">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-tb-gold" />
                  <h3 className="font-serif font-bold text-white text-base">Tu Pedido • TB La Vega</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={vaciarCarrito}
                    className="p-1.5 text-tb-sand/70 hover:text-red-400 transition cursor-pointer"
                    title="Vaciar carrito"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setMostrarCarritoModal(false)}
                    className="p-1.5 text-tb-sand/70 hover:text-white cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex-1 overflow-y-auto space-y-3 divide-y divide-slate-100">
                {carrito.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-[#FAF8F5] border border-tb-sand overflow-hidden shrink-0 flex items-center justify-center">
                        {item.imagen_url ? (
                          <img src={item.imagen_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Store className="h-4 w-4 text-tb-sand" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-tb-dark truncate">{item.nombre}</h4>
                        <p className="text-xs text-tb-muted">
                          {formatDOP(item.precio)} c/u
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="flex items-center gap-1 bg-[#FAF8F5] rounded-lg p-1 border border-tb-sand">
                        <button
                          onClick={() => restarDelCarrito(item.id)}
                          className="h-6 w-6 rounded bg-white text-tb-dark shadow-2xs flex items-center justify-center font-bold cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center font-bold text-xs text-tb-dark font-sans">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => agregarAlCarrito(item)}
                          disabled={item.cantidad >= item.stock}
                          className="h-6 w-6 rounded bg-tb-dark text-tb-gold shadow-2xs flex items-center justify-center font-bold disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="font-bold text-xs text-tb-dark min-w-16 text-right font-sans">
                        {formatDOP(Number(item.precio) * item.cantidad)}
                      </span>
                    </div>
                  </div>
                ))}

                <div className="pt-4 space-y-2">
                  <label className="text-xs font-bold uppercase text-tb-terracotta block">
                    ¿Cómo pagarás tu pedido? *
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setMetodoPago("dinero")}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-2 transition cursor-pointer ${
                        metodoPago === "dinero"
                          ? "bg-tb-dark border-tb-dark text-tb-gold shadow-xs"
                          : "bg-[#FAF8F5] border-tb-sand text-tb-muted hover:bg-tb-sand"
                      }`}
                    >
                      <Banknote className="h-5 w-5 text-emerald-600" />
                      <div className="text-center sm:text-left">
                        <span className="block font-bold">Dinero</span>
                        <span className="text-[10px] opacity-75 font-normal">Pagas en mostrador</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodoPago("fiado")}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-2 transition cursor-pointer ${
                        metodoPago === "fiado"
                          ? "bg-purple-900 border-purple-900 text-white shadow-xs"
                          : "bg-purple-50/50 border-purple-200 text-purple-900 hover:bg-purple-100/50"
                      }`}
                    >
                      <FileText className="h-5 w-5 text-purple-600" />
                      <div className="text-center sm:text-left">
                        <span className="block font-bold">Fiado</span>
                        <span className="text-[10px] opacity-75 font-normal">Anotar en cuenta</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="pt-3">
                  <input
                    type="text"
                    placeholder="Aclaración adicional (ej. Sin cebolla, bebida bien fría)"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-tb-sand focus:bg-white focus:border-tb-dark rounded-xl px-3 py-2 text-xs text-tb-dark placeholder:text-slate-400 outline-none"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-[#E2DFD8] bg-[#FAF8F5] space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs uppercase font-bold text-tb-terracotta">Total a Pagar (DOP)</span>
                  <span className="text-2xl font-black text-tb-dark font-sans">
                    {formatDOP(totalCarrito)}
                  </span>
                </div>

                {errorMensaje && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                    {errorMensaje}
                  </div>
                )}

                <button
                  onClick={enviarPedido}
                  disabled={cargando}
                  className="w-full bg-tb-dark hover:bg-tb-emerald text-tb-gold font-serif font-bold py-3.5 px-5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] disabled:opacity-50 cursor-pointer border border-tb-gold/20"
                >
                  {cargando ? (
                    <span>Enviando orden a caja...</span>
                  ) : (
                    <>
                      <span>Confirmar Pedido</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            PASO 3: COMPROBANTE DIGITAL DEL CLIENTE
            ========================================= */}
        {paso === "comprobante" && pedidoGuardado && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-[#F1F4F3]">
            <div className="pt-6 flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-tb-dark text-tb-gold flex items-center justify-center mb-3 shadow-md border border-tb-gold/30">
                <Check className="h-8 w-8 stroke-[2.5]" />
              </div>

              <h2 className="text-2xl font-serif font-bold text-tb-dark text-center">
                ¡Pedido Enviado a Caja!
              </h2>
              <p className="text-tb-muted text-xs mt-1 text-center max-w-xs">
                Pasa por el mostrador de cafetería para abonar y retirar tus productos. ¡Dios te bendiga!
              </p>

              <div className="w-full mt-6 bg-white border border-[#E2DFD8] rounded-3xl p-5 shadow-xs">
                <div className="flex justify-between items-start border-b border-dashed border-[#D5D0C6] pb-3 mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-tb-terracotta uppercase tracking-wider block">
                      ORDEN
                    </span>
                    <span className="text-3xl font-black text-tb-dark font-sans">
                      #{pedidoGuardado.id}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-tb-terracotta uppercase tracking-wider block">
                      CLIENTE
                    </span>
                    <span className="text-base font-serif font-bold text-tb-dark capitalize">
                      {pedidoGuardado.cliente_nombre}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 border-b border-dashed border-[#D5D0C6] pb-3 mb-3 text-xs">
                  {pedidoGuardado.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-tb-dark">
                      <span>{item.cantidad}x {item.nombre}</span>
                      <span className="font-bold font-sans">
                        {formatDOP(Number(item.precio) * item.cantidad)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase font-bold text-tb-terracotta">Total a Pagar</span>
                  <span className="text-2xl font-black text-tb-dark font-sans">
                    {formatDOP(pedidoGuardado.total)}
                  </span>
                </div>

                <div className="mt-4 p-2.5 rounded-xl bg-[#FAF8F5] border border-tb-sand text-xs text-tb-dark flex justify-between items-center">
                  <span>Método de pago seleccionado:</span>
                  <span className={`font-bold uppercase px-2 py-0.5 rounded-md text-[11px] ${
                    pedidoGuardado.metodo_pago === "fiado"
                      ? "bg-purple-100 text-purple-900 border border-purple-200"
                      : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                  }`}>
                    {pedidoGuardado.metodo_pago === "fiado" ? "Fiado / Cuenta" : "Dinero en Efectivo"}
                  </span>
                </div>

                {pedidoGuardado.notas && (
                  <div className="mt-2 text-[11px] text-tb-muted bg-[#FAF8F5] p-2 rounded-lg border border-tb-sand">
                    Nota: {pedidoGuardado.notas}
                  </div>
                )}
              </div>
            </div>

            <div className="py-6">
              <button
                onClick={() => {
                  setPedidoGuardado(null);
                  setPaso("menu");
                }}
                className="w-full bg-white border border-[#D5D0C6] hover:bg-[#FAF8F5] text-tb-dark font-serif font-bold py-3.5 px-4 rounded-xl text-xs transition cursor-pointer shadow-xs"
              >
                Hacer otro pedido
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
