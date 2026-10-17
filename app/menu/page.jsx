"use client";

import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  Check, 
  Clock, 
  Store, 
  Search, 
  ArrowRight, 
  X, 
  Receipt, 
  AlertCircle, 
  CreditCard,
  Banknote,
  Sparkles,
  Flame,
  ChevronRight,
  ShieldCheck,
  QrCode,
  Share2,
  Trash2
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { playChimeSound } from "@/lib/sound";

// Catálogo demo de respaldo ultra-estético
const DEMO_CATEGORIAS = [
  { id: 1, nombre: "Bebidas", icono: "🥤" },
  { id: 2, nombre: "Snacks", icono: "🍟" },
  { id: 3, nombre: "Golosinas", icono: "🍫" },
  { id: 4, nombre: "Sandwiches", icono: "🥪" },
];

const DEMO_PRODUCTOS = [
  { id: 1, categoria_id: 1, nombre: "Coca Cola 500ml", descripcion: "Botella descartable bien fría", precio: 1500, stock: 24, activo: true, imagen_url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80", tag: "Más Vendido" },
  { id: 2, categoria_id: 1, nombre: "Agua Mineral 500ml", descripcion: "Glaciar con o sin gas fresca", precio: 900, stock: 30, activo: true, imagen_url: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500&auto=format&fit=crop&q=80" },
  { id: 3, categoria_id: 1, nombre: "Monster Energy 473ml", descripcion: "Lata original clásica fría", precio: 2400, stock: 15, activo: true, imagen_url: "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500&auto=format&fit=crop&q=80", tag: "En Oferta" },
  { id: 4, categoria_id: 2, nombre: "Papas Fritas Lays 95g", descripcion: "Clásicas crocantes y saladas", precio: 1600, stock: 20, activo: true, imagen_url: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80" },
  { id: 5, categoria_id: 2, nombre: "Doritos Mega Queso 90g", descripcion: "Triángulos de maíz crocantes", precio: 1900, stock: 12, activo: true, imagen_url: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80" },
  { id: 6, categoria_id: 3, nombre: "Alfajor Havanna Cacao", descripcion: "Doble chocolate con dulce de leche", precio: 1400, stock: 30, activo: true, imagen_url: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&auto=format&fit=crop&q=80", tag: "Favorito" },
  { id: 7, categoria_id: 3, nombre: "Chocolate Milka Oreo", descripcion: "Chocolate con leche suizo 100g", precio: 2200, stock: 10, activo: true, imagen_url: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&auto=format&fit=crop&q=80" },
  { id: 8, categoria_id: 4, nombre: "Sandwich Jamón y Queso", descripcion: "Pan de miga triple recién hecho", precio: 2200, stock: 8, activo: true, imagen_url: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80", tag: "Fresco" },
];

export default function MenuCliente() {
  const [paso, setPaso] = useState("registro"); // 'registro' | 'menu' | 'comprobante'
  const [nombre, setNombre] = useState("");
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [mostrarCarritoModal, setMostrarCarritoModal] = useState(false);
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [notas, setNotas] = useState("");
  const [cargando, setCargando] = useState(false);
  const [pedidoGuardado, setPedidoGuardado] = useState(null);
  const [errorMensaje, setErrorMensaje] = useState("");
  const [isLiveDB, setIsLiveDB] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("kiosco_cliente_nombre");
      if (savedName) setNombre(savedName);
    }
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    if (isSupabaseConfigured()) {
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

        if (prodData && prodData.length > 0) {
          setCategorias(catData || []);
          setProductos(prodData);
          setIsLiveDB(true);
          return;
        }
      } catch (err) {
        console.warn("Fallo lectura Supabase, usando catálogo local:", err);
      }
    }

    setCategorias(DEMO_CATEGORIAS);
    setProductos(DEMO_PRODUCTOS);
    setIsLiveDB(false);
  };

  const iniciarCompra = (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMensaje("Por favor dinos tu nombre para comenzar tu orden.");
      return;
    }
    setErrorMensaje("");
    if (typeof window !== "undefined") {
      localStorage.setItem("kiosco_cliente_nombre", nombre.trim());
    }
    setPaso("menu");
  };

  const agregarAlCarrito = (producto) => {
    const itemActual = carrito.find((i) => i.id === producto.id);
    const cantidadActual = itemActual ? itemActual.cantidad : 0;

    if (cantidadActual >= producto.stock) {
      alert(`⚠️ Solo quedan ${producto.stock} unidades disponibles de este producto.`);
      return;
    }

    if (itemActual) {
      setCarrito(
        carrito.map((item) =>
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      );
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
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
    if (confirm("¿Deseas vaciar el carrito?")) {
      setCarrito([]);
      setMostrarCarritoModal(false);
    }
  };

  const totalCarrito = carrito.reduce(
    (acc, item) => acc + Number(item.precio) * item.cantidad,
    0
  );

  const totalArticulos = carrito.reduce((acc, item) => acc + item.cantidad, 0);

  const enviarPedido = async () => {
    if (carrito.length === 0) return;
    setCargando(true);
    setErrorMensaje("");

    try {
      if (isLiveDB) {
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
          throw new Error("No se pudo descontar el stock: " + errorDetalles.message);
        }

        setPedidoGuardado({
          ...nuevoPedido,
          items: [...carrito],
        });
      } else {
        const fakeId = Math.floor(100 + Math.random() * 900);
        const simulado = {
          id: fakeId,
          cliente_nombre: nombre.trim(),
          total: totalCarrito,
          estado: "pendiente",
          metodo_pago: metodoPago,
          notas: notas.trim(),
          creado_en: new Date().toISOString(),
          items: [...carrito],
        };
        setPedidoGuardado(simulado);
      }

      playChimeSound();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#14b8a6", "#f59e0b", "#10b981", "#6366f1"]
      });

      setCarrito([]);
      setMostrarCarritoModal(false);
      setPaso("comprobante");
    } catch (err) {
      console.error("Error al procesar orden:", err);
      setErrorMensaje(err.message || "Error al procesar tu pedido. Intenta nuevamente.");
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center selection:bg-teal-500 selection:text-slate-950 font-sans">
      <div className="w-full max-w-md bg-slate-900/90 border-x border-slate-800/80 min-h-screen flex flex-col relative shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        
        {/* =========================================
            PASO 1: REGISTRO VISUAL ULTRA ELEGANTE
            ========================================= */}
        {paso === "registro" && (
          <div className="flex-1 flex flex-col justify-between p-6 relative overflow-hidden">
            {/* Glow decorativo de fondo */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="pt-12 flex flex-col items-center text-center relative z-10">
              <div className="relative mb-6">
                <div className="h-24 w-24 rounded-3xl bg-gradient-to-tr from-teal-400 via-teal-500 to-emerald-400 p-0.5 shadow-2xl shadow-teal-500/30 flex items-center justify-center">
                  <div className="h-full w-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                    <Store className="h-12 w-12 text-teal-400 stroke-[2.2]" />
                  </div>
                </div>
                <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-md uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> ABIERTO
                </span>
              </div>

              <h1 className="text-3xl font-black text-white tracking-tight">
                Kiosco Digital
              </h1>
              <p className="text-slate-400 text-sm mt-2 max-w-xs leading-relaxed">
                Ordena tus productos favoritos desde tu móvil y retira en caja sin filas.
              </p>
            </div>

            <form onSubmit={iniciarCompra} className="space-y-4 my-8 bg-slate-950/70 p-6 rounded-3xl border border-slate-800/80 shadow-2xl relative z-10">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-teal-400">
                  ¿Cómo te llamas?
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ej. Valentina Morales"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 focus:border-teal-400 focus:ring-4 focus:ring-teal-500/20 text-white rounded-2xl px-5 py-4 text-base font-semibold outline-none transition placeholder:text-slate-600 text-center shadow-inner"
                    autoFocus
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 text-center">
                El cajero te llamará por este nombre cuando tu orden esté lista.
              </p>

              {errorMensaje && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{errorMensaje}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-slate-950 font-black py-4 px-6 rounded-2xl text-base flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-teal-500/25 active:scale-[0.98] group"
              >
                <span>Entrar al Menú</span>
                <ArrowRight className="h-5 w-5 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <div className="text-center pb-4 text-[11px] text-slate-600 flex items-center justify-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-500" />
              <span>Menú Oficial • Stock en Tiempo Real</span>
            </div>
          </div>
        )}

        {/* =========================================
            PASO 2: CATÁLOGO DE PRODUCTOS ESTILO S-TIER
            ========================================= */}
        {paso === "menu" && (
          <div className="flex-1 flex flex-col pb-28">
            {/* Header Sticky */}
            <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 px-4 pt-3.5 pb-2.5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest block">
                      HOLA, {nombre.toUpperCase()} 👋
                    </span>
                    <h2 className="text-base font-black text-white leading-tight">Menú de Kiosco</h2>
                  </div>
                </div>

                <button
                  onClick={() => setMostrarCarritoModal(true)}
                  className="relative p-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 transition-all text-slate-200 active:scale-95 shadow-md"
                >
                  <ShoppingBag className="h-5 w-5 text-teal-400" />
                  {totalArticulos > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/40 animate-bounce">
                      {totalArticulos}
                    </span>
                  )}
                </button>
              </div>

              {/* Buscador Moderno */}
              <div className="relative mb-2.5">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar chocolates, bebidas, snacks..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-800 focus:border-teal-500/80 focus:ring-2 focus:ring-teal-500/20 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none transition"
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda("")}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Categorías Scrolleables */}
              <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar scroll-smooth">
                <button
                  onClick={() => setCategoriaSeleccionada("todas")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    categoriaSeleccionada === "todas"
                      ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-lg shadow-teal-500/25"
                      : "bg-slate-900 border border-slate-800/80 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>✨</span>
                  <span>Todos</span>
                </button>
                {categorias.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaSeleccionada(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      String(categoriaSeleccionada) === String(cat.id)
                        ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-lg shadow-teal-500/25"
                        : "bg-slate-900 border border-slate-800/80 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>{cat.icono || "🏷️"}</span>
                    <span>{cat.nombre}</span>
                  </button>
                ))}
              </div>
            </header>

            {/* Listado de Productos */}
            <main className="flex-1 p-4 space-y-3">
              {productosFiltrados.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <ShoppingBag className="h-12 w-12 mx-auto stroke-1 mb-3 text-slate-600" />
                  <p className="font-bold text-slate-400 text-sm">No encontramos productos</p>
                  <p className="text-xs text-slate-600 mt-1">Prueba cambiando el filtro o la búsqueda</p>
                </div>
              ) : (
                productosFiltrados.map((prod) => {
                  const enCarrito = carrito.find((i) => i.id === prod.id);
                  const cantidad = enCarrito ? enCarrito.cantidad : 0;
                  const sinStock = prod.stock <= 0;

                  return (
                    <div
                      key={prod.id}
                      className="bg-slate-950/80 border border-slate-800/80 hover:border-teal-500/40 rounded-2xl p-3 flex gap-3.5 items-center transition-all duration-200 shadow-sm relative group overflow-hidden"
                    >
                      {/* Imagen con Badges */}
                      <div className="h-20 w-20 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-800 flex items-center justify-center relative">
                        {prod.imagen_url ? (
                          <img
                            src={prod.imagen_url}
                            alt={prod.nombre}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <Store className="h-6 w-6 text-slate-700" />
                        )}

                        {prod.tag && (
                          <span className="absolute top-1 left-1 bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-md shadow">
                            {prod.tag}
                          </span>
                        )}

                        {prod.stock <= 5 && prod.stock > 0 && !prod.tag && (
                          <span className="absolute bottom-1 right-1 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow">
                            Quedan {prod.stock}
                          </span>
                        )}
                      </div>

                      {/* Detalles */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-sm truncate leading-snug">{prod.nombre}</h3>
                        {prod.descripcion && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{prod.descripcion}</p>
                        )}
                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-base font-black text-teal-400">
                            ${Number(prod.precio).toLocaleString("es-AR")}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Stock: {prod.stock}
                          </span>
                        </div>
                      </div>

                      {/* Botón interactivo de cantidad */}
                      <div className="shrink-0">
                        {cantidad > 0 ? (
                          <div className="flex items-center gap-1.5 bg-slate-900 border border-teal-500/50 rounded-xl p-1 shadow-md">
                            <button
                              onClick={() => restarDelCarrito(prod.id)}
                              className="h-7 w-7 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center active:scale-95 transition"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-5 text-center font-black text-xs text-teal-300">
                              {cantidad}
                            </span>
                            <button
                              onClick={() => agregarAlCarrito(prod)}
                              disabled={cantidad >= prod.stock}
                              className="h-7 w-7 rounded-lg bg-teal-500 text-slate-950 hover:bg-teal-400 disabled:opacity-40 flex items-center justify-center active:scale-95 transition font-bold"
                            >
                              <Plus className="h-3.5 w-3.5 stroke-[3]" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => agregarAlCarrito(prod)}
                            disabled={sinStock}
                            className="px-3.5 py-2 rounded-xl bg-teal-500/15 border border-teal-500/30 hover:bg-teal-500 hover:text-slate-950 text-teal-300 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 disabled:opacity-40 shadow-sm"
                          >
                            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                            <span>Pedir</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </main>

            {/* Barra Inferior Flotante de Carrito */}
            {totalArticulos > 0 && (
              <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 z-40 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pt-8">
                <button
                  onClick={() => setMostrarCarritoModal(true)}
                  className="w-full bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-slate-950 font-black py-4 px-5 rounded-2xl flex items-center justify-between shadow-2xl shadow-teal-500/30 active:scale-[0.99] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-950 text-teal-300 text-xs px-2.5 py-1 rounded-xl font-black shadow-inner">
                      {totalArticulos} {totalArticulos === 1 ? "ítem" : "ítems"}
                    </span>
                    <span className="text-sm font-bold">Ver Mi Carrito</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-black tracking-tight">
                      ${totalCarrito.toLocaleString("es-AR")}
                    </span>
                    <ChevronRight className="h-5 w-5 stroke-[3] group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {/* =========================================
            MODAL DRAWER: REVISIÓN DE PEDIDO
            ========================================= */}
        {mostrarCarritoModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-center items-end sm:items-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
              
              {/* Header Modal */}
              <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/50">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Resumen de tu Pedido</h3>
                    <p className="text-[11px] text-slate-400">{nombre}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={vaciarCarrito}
                    className="p-2 text-slate-400 hover:text-rose-400 transition"
                    title="Vaciar carrito"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setMostrarCarritoModal(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Items */}
              <div className="p-4 flex-1 overflow-y-auto space-y-3 divide-y divide-slate-800/60">
                {carrito.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-white">{item.nombre}</h4>
                      <p className="text-xs text-slate-400">
                        ${Number(item.precio).toLocaleString("es-AR")} c/u
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1">
                        <button
                          onClick={() => restarDelCarrito(item.id)}
                          className="h-6 w-6 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center active:scale-95"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center font-bold text-xs text-teal-300">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => agregarAlCarrito(item)}
                          disabled={item.cantidad >= item.stock}
                          className="h-6 w-6 rounded-lg bg-teal-500 text-slate-950 disabled:opacity-40 flex items-center justify-center font-bold active:scale-95"
                        >
                          <Plus className="h-3 w-3 stroke-[3]" />
                        </button>
                      </div>
                      <span className="font-black text-sm text-teal-400 w-16 text-right">
                        ${(Number(item.precio) * item.cantidad).toLocaleString("es-AR")}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Forma de Pago */}
                <div className="pt-4 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    Forma de Pago en Caja
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMetodoPago("efectivo")}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                        metodoPago === "efectivo"
                          ? "bg-teal-500/10 border-teal-500 text-teal-400 shadow-sm"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Banknote className="h-4 w-4" />
                      <span>Efectivo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodoPago("transferencia")}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                        metodoPago === "transferencia"
                          ? "bg-teal-500/10 border-teal-500 text-teal-400 shadow-sm"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Transferencia / QR</span>
                    </button>
                  </div>
                </div>

                {/* Nota para el cajero */}
                <div className="pt-3">
                  <input
                    type="text"
                    placeholder="¿Alguna aclaración? (Ej. coca sin azúcar)"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none"
                  />
                </div>
              </div>

              {/* Total y Confirmar */}
              <div className="p-4 border-t border-slate-800/80 bg-slate-950 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs uppercase font-bold text-slate-400">Total a Pagar</span>
                  <span className="text-2xl font-black text-teal-400">
                    ${totalCarrito.toLocaleString("es-AR")}
                  </span>
                </div>

                {errorMensaje && (
                  <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300">
                    {errorMensaje}
                  </div>
                )}

                <button
                  onClick={enviarPedido}
                  disabled={cargando}
                  className="w-full bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-slate-950 font-black py-4 px-6 rounded-2xl text-base flex items-center justify-center gap-2 shadow-xl shadow-teal-500/25 active:scale-[0.98] disabled:opacity-50"
                >
                  {cargando ? (
                    <span className="flex items-center gap-2 font-bold">
                      <span className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                      Enviando a Caja...
                    </span>
                  ) : (
                    <>
                      <span>Confirmar Orden</span>
                      <ArrowRight className="h-5 w-5 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            PASO 3: TICKET DIGITAL TIPO RECIBO FÍSICO
            ========================================= */}
        {paso === "comprobante" && pedidoGuardado && (
          <div className="flex-1 flex flex-col justify-between p-6">
            <div className="pt-6 flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/20 animate-in zoom-in duration-300">
                <Check className="h-8 w-8 stroke-[3]" />
              </div>

              <h2 className="text-2xl font-black text-white text-center">
                ¡Orden Recibida!
              </h2>
              <p className="text-slate-400 text-xs mt-1 text-center">
                Acércate al mostrador de caja con este número de orden.
              </p>

              {/* Tarjeta Simulación Recibo */}
              <div className="w-full mt-6 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-teal-400 to-emerald-500" />

                <div className="flex justify-between items-start border-b border-dashed border-slate-800 pb-4 mb-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                      TICKET DE CAJA
                    </span>
                    <span className="text-3xl font-black text-amber-400">
                      #{pedidoGuardado.id}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                      CLIENTE
                    </span>
                    <span className="text-base font-bold text-white capitalize">
                      {pedidoGuardado.cliente_nombre}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 border-b border-dashed border-slate-800 pb-4 mb-4 text-xs">
                  {pedidoGuardado.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-slate-300">
                      <span>{item.cantidad}x {item.nombre}</span>
                      <span className="font-semibold text-slate-100 font-mono">
                        ${(Number(item.precio) * item.cantidad).toLocaleString("es-AR")}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase font-bold text-slate-400">Total a Abonar</span>
                  <span className="text-2xl font-black text-emerald-400">
                    ${Number(pedidoGuardado.total).toLocaleString("es-AR")}
                  </span>
                </div>

                <div className="mt-4 p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Pago:</span>
                  <span className="font-bold text-teal-400 uppercase tracking-wider">
                    {pedidoGuardado.metodo_pago}
                  </span>
                </div>
              </div>
            </div>

            <div className="py-6 space-y-3">
              <button
                onClick={() => {
                  setPedidoGuardado(null);
                  setPaso("menu");
                }}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition"
              >
                <span>Hacer un nuevo pedido</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
