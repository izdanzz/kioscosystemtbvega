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
  ChevronRight,
  Trash2,
  Info,
  Package
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
  const [metodoPago, setMetodoPago] = useState("efectivo");
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

    // Suscripción Realtime a cambios en productos (stock / precios actualizados en caja)
    let canal = null;
    if (isSupabaseConfigured()) {
      canal = supabase
        .channel("cliente_productos_realtime")
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center font-sans selection:bg-slate-900 selection:text-white">
      <div className="w-full max-w-lg bg-white border-x border-slate-200 min-h-screen flex flex-col shadow-xs">
        
        {/* =========================================
            PASO 1: IDENTIFICACIÓN DEL CLIENTE
            ========================================= */}
        {paso === "registro" && (
          <div className="flex-1 flex flex-col justify-between p-6">
            <div className="pt-16 text-center">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-4 shadow-xs">
                <Store className="h-8 w-8 stroke-[2]" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                TB La Vega
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Escribe tu nombre para iniciar tu pedido
              </p>
            </div>

            <form onSubmit={iniciarCompra} className="my-8 bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 text-center">
                  Tu Nombre
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-white border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-slate-900 rounded-xl px-4 py-3.5 text-base font-medium outline-none transition placeholder:text-slate-400 text-center"
                  autoFocus
                />
              </div>

              {errorMensaje && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMensaje}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-5 rounded-xl text-sm flex items-center justify-center gap-2 transition active:scale-[0.99] shadow-xs cursor-pointer"
              >
                <span>Ver Menú Digital</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="text-center pb-4 text-xs text-slate-400">
              TB La Vega • Precios en Pesos Dominicanos (DOP)
            </div>
          </div>
        )}

        {/* =========================================
            PASO 2: CATÁLOGO DE PRODUCTOS (IMAGEN, TÍTULO Y DESCRIPCIÓN)
            ========================================= */}
        {paso === "menu" && (
          <div className="flex-1 flex flex-col pb-24">
            
            {/* Cabecera */}
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 pt-3.5 pb-2.5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">TB La Vega</h2>
                  <span className="text-xs text-slate-500">
                    Cliente: <strong>{nombre}</strong> • <span className="text-emerald-700 font-semibold">Precios en DOP</span>
                  </span>
                </div>

                <button
                  onClick={() => setMostrarCarritoModal(true)}
                  className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition active:scale-95 cursor-pointer"
                  title="Ver carrito"
                >
                  <ShoppingBag className="h-5 w-5" />
                  {totalArticulos > 0 && (
                    <span className="absolute -top-1 -right-1 bg-slate-900 text-white text-[11px] font-bold h-5 w-5 rounded-full flex items-center justify-center shadow">
                      {totalArticulos}
                    </span>
                  )}
                </button>
              </div>

              {/* Buscador */}
              <div className="relative mb-2.5">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar producto, descripción o categoría..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-200 focus:bg-white focus:border-slate-400 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition"
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda("")}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Categorías */}
              <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar">
                <button
                  onClick={() => setCategoriaSeleccionada("todas")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    categoriaSeleccionada === "todas"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat.nombre}
                  </button>
                ))}
              </div>
            </header>

            {/* Listado con Imagen, Título y Descripción de cada producto */}
            <main className="flex-1 p-4 space-y-4 bg-slate-50">
              {productosFiltrados.length === 0 ? (
                <div className="text-center py-16 text-slate-400 bg-white border border-slate-200 rounded-2xl p-6">
                  <Package className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-700 text-sm">No encontramos productos en esta sección</p>
                  <p className="text-xs text-slate-400 mt-1">Prueba seleccionando otra categoría o borrando la búsqueda.</p>
                </div>
              ) : (
                productosFiltrados.map((prod) => {
                  const enCarrito = carrito.find((i) => i.id === prod.id);
                  const cantidad = enCarrito ? enCarrito.cantidad : 0;
                  const sinStock = prod.stock <= 0;

                  return (
                    <div
                      key={prod.id}
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-sm transition flex flex-col"
                    >
                      {/* 1. IMAGEN DEL PRODUCTO (Destacada, nítida con badge de stock) */}
                      <div 
                        onClick={() => setProductoDetalle(prod)}
                        className="relative w-full h-44 bg-slate-100 cursor-pointer overflow-hidden group"
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
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                            <Store className="h-12 w-12 stroke-[1.5]" />
                            <span className="text-[10px] text-slate-400 mt-1">TB La Vega</span>
                          </div>
                        )}

                        {/* Etiqueta de Categoría */}
                        {prod.categorias?.nombre && (
                          <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-xs text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                            {prod.categorias.nombre}
                          </span>
                        )}

                        {/* Badge de Stock */}
                        {prod.stock <= 5 && prod.stock > 0 ? (
                          <span className="absolute top-2.5 right-2.5 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                            ¡Solo {prod.stock} disponibles!
                          </span>
                        ) : (
                          <span className="absolute top-2.5 right-2.5 bg-slate-900/70 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded-md">
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
                          {/* TÍTULO DEL PRODUCTO */}
                          <h3 className="font-bold text-slate-900 text-base leading-snug hover:text-slate-700 transition">
                            {prod.nombre}
                          </h3>

                          {/* DESCRIPCIÓN DEL PRODUCTO */}
                          {prod.descripcion ? (
                            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed line-clamp-2">
                              {prod.descripcion}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 mt-1.5 italic">
                              Disponible en mostrador
                            </p>
                          )}
                        </div>

                        {/* FILA INFERIOR: PRECIO EN DOP Y BOTÓN DE ACCIÓN */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Precio
                            </span>
                            <span className="text-lg font-black text-slate-900 tracking-tight">
                              {formatDOP(prod.precio)}
                            </span>
                          </div>

                          <div>
                            {cantidad > 0 ? (
                              <div className="flex items-center gap-1 bg-slate-100 border border-slate-300 rounded-xl p-1">
                                <button
                                  onClick={() => restarDelCarrito(prod.id)}
                                  className="h-7 w-7 rounded-lg bg-white text-slate-800 shadow-xs flex items-center justify-center font-bold active:scale-95 cursor-pointer"
                                  title="Quitar uno"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="w-6 text-center font-bold text-xs text-slate-900">
                                  {cantidad}
                                </span>
                                <button
                                  onClick={() => agregarAlCarrito(prod)}
                                  disabled={cantidad >= prod.stock}
                                  className="h-7 w-7 rounded-lg bg-slate-900 text-white shadow-xs flex items-center justify-center font-bold disabled:opacity-40 active:scale-95 cursor-pointer"
                                  title="Agregar otro"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => agregarAlCarrito(prod)}
                                disabled={sinStock}
                                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 disabled:opacity-40 cursor-pointer"
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

            {/* Barra Inferior Flotante del Carrito */}
            {totalArticulos > 0 && (
              <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 z-40 bg-gradient-to-t from-white via-white/95 to-transparent pt-6">
                <button
                  onClick={() => setMostrarCarritoModal(true)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-5 rounded-xl flex items-center justify-between shadow-lg active:scale-[0.99] transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-800 text-white text-xs px-2.5 py-0.5 rounded font-bold">
                      {totalArticulos}
                    </span>
                    <span className="text-sm">Ver Carrito</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-base font-bold">
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
            MODAL DE DETALLE DEL PRODUCTO (IMAGEN COMPLETA, TÍTULO Y DESCRIPCIÓN)
            ========================================= */}
        {productoDetalle && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-center items-end sm:items-center p-0 sm:p-4">
            <div className="bg-white border border-slate-200 w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              
              {/* Imagen Grande */}
              <div className="relative w-full h-56 bg-slate-100">
                {productoDetalle.imagen_url ? (
                  <img
                    src={productoDetalle.imagen_url}
                    alt={productoDetalle.nombre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                    <Store className="h-16 w-16 stroke-[1.5]" />
                    <span className="text-xs text-slate-400 mt-2">TB La Vega</span>
                  </div>
                )}
                
                <button
                  onClick={() => setProductoDetalle(null)}
                  className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>

                {productoDetalle.categorias?.nombre && (
                  <span className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs text-slate-900 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                    {productoDetalle.categorias.nombre}
                  </span>
                )}
              </div>

              {/* Contenido Completo */}
              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 leading-snug">
                    {productoDetalle.nombre}
                  </h2>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {formatDOP(productoDetalle.precio)}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Descripción del Producto
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    {productoDetalle.descripcion || "Producto fresco listo para ordenar en mostrador."}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 py-1">
                  <span>Stock disponible en mostrador:</span>
                  <span className="font-bold text-slate-900">{productoDetalle.stock} unidades</span>
                </div>
              </div>

              {/* Botón Inferior */}
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <button
                  onClick={() => {
                    agregarAlCarrito(productoDetalle, 1);
                    setProductoDetalle(null);
                  }}
                  disabled={productoDetalle.stock <= 0}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Agregar al Carrito • {formatDOP(productoDetalle.precio)}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            MODAL DE REVISIÓN DEL CARRITO
            ========================================= */}
        {mostrarCarritoModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-center items-end sm:items-center p-0 sm:p-4">
            <div className="bg-white border border-slate-200 w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
              
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-slate-800" />
                  <h3 className="font-bold text-slate-900 text-base">Tu Pedido</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={vaciarCarrito}
                    className="p-1.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
                    title="Vaciar carrito"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setMostrarCarritoModal(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex-1 overflow-y-auto space-y-3 divide-y divide-slate-100">
                {carrito.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.imagen_url ? (
                          <img src={item.imagen_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Store className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 truncate">{item.nombre}</h4>
                        <p className="text-xs text-slate-500">
                          {formatDOP(item.precio)} c/u
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                        <button
                          onClick={() => restarDelCarrito(item.id)}
                          className="h-6 w-6 rounded bg-white text-slate-700 shadow-xs flex items-center justify-center font-bold cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center font-bold text-xs text-slate-900">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => agregarAlCarrito(item)}
                          disabled={item.cantidad >= item.stock}
                          className="h-6 w-6 rounded bg-slate-900 text-white shadow-xs flex items-center justify-center font-bold disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="font-bold text-xs text-slate-900 min-w-16 text-right">
                        {formatDOP(Number(item.precio) * item.cantidad)}
                      </span>
                    </div>
                  </div>
                ))}

                <div className="pt-4 space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-600 block">
                    Forma de Pago en Caja
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMetodoPago("efectivo")}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        metodoPago === "efectivo"
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Banknote className="h-4 w-4" />
                      <span>Efectivo (DOP)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodoPago("transferencia")}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        metodoPago === "transferencia"
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Transferencia</span>
                    </button>
                  </div>
                </div>

                <div className="pt-3">
                  <input
                    type="text"
                    placeholder="Aclaración adicional (ej. Sin cebolla, bebida bien fría)"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-400 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs uppercase font-bold text-slate-500">Total a Pagar (DOP)</span>
                  <span className="text-2xl font-black text-slate-900">
                    {formatDOP(totalCarrito)}
                  </span>
                </div>

                {errorMensaje && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                    {errorMensaje}
                  </div>
                )}

                <button
                  onClick={enviarPedido}
                  disabled={cargando}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
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
          <div className="flex-1 flex flex-col justify-between p-6 bg-slate-50">
            <div className="pt-6 flex flex-col items-center">
              <div className="h-14 w-14 rounded-full bg-slate-900 text-white flex items-center justify-center mb-3">
                <Check className="h-7 w-7 stroke-[2.5]" />
              </div>

              <h2 className="text-2xl font-bold text-slate-900 text-center">
                ¡Pedido Enviado!
              </h2>
              <p className="text-slate-500 text-xs mt-1 text-center">
                Pasa por el mostrador para abonar y retirar tus productos.
              </p>

              <div className="w-full mt-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex justify-between items-start border-b border-dashed border-slate-200 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      ORDEN
                    </span>
                    <span className="text-3xl font-black text-slate-900">
                      #{pedidoGuardado.id}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      CLIENTE
                    </span>
                    <span className="text-base font-bold text-slate-900 capitalize">
                      {pedidoGuardado.cliente_nombre}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 border-b border-dashed border-slate-200 pb-3 mb-3 text-xs">
                  {pedidoGuardado.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-slate-700">
                      <span>{item.cantidad}x {item.nombre}</span>
                      <span className="font-bold text-slate-900">
                        {formatDOP(Number(item.precio) * item.cantidad)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase font-bold text-slate-500">Total a Pagar</span>
                  <span className="text-2xl font-black text-slate-900">
                    {formatDOP(pedidoGuardado.total)}
                  </span>
                </div>

                <div className="mt-4 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex justify-between">
                  <span>Pago en mostrador:</span>
                  <span className="font-bold uppercase text-slate-900">{pedidoGuardado.metodo_pago}</span>
                </div>

                {pedidoGuardado.notas && (
                  <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
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
                className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold py-3.5 px-4 rounded-xl text-xs transition cursor-pointer shadow-xs"
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
