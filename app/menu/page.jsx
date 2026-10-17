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
  Coffee, 
  Cookie, 
  Candy, 
  Utensils, 
  Sparkles, 
  HelpCircle,
  CreditCard,
  Banknote
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// Catálogo demo de respaldo si Supabase aún no está configurado
const DEMO_CATEGORIAS = [
  { id: 1, nombre: "Bebidas" },
  { id: 2, nombre: "Snacks" },
  { id: 3, nombre: "Golosinas" },
  { id: 4, nombre: "Sandwiches" },
];

const DEMO_PRODUCTOS = [
  { id: 1, categoria_id: 1, nombre: "Coca Cola 500ml", descripcion: "Botella descartable fría", precio: 1500, stock: 24, activo: true, imagen_url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80" },
  { id: 2, categoria_id: 1, nombre: "Agua Mineral 500ml", descripcion: "Con o sin gas fresca", precio: 900, stock: 30, activo: true, imagen_url: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&auto=format&fit=crop&q=80" },
  { id: 3, categoria_id: 1, nombre: "Monster Energy 473ml", descripcion: "Lata original bien fría", precio: 2400, stock: 15, activo: true, imagen_url: "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400&auto=format&fit=crop&q=80" },
  { id: 4, categoria_id: 2, nombre: "Papas Fritas Lays 95g", descripcion: "Clásicas crocantes con sal", precio: 1600, stock: 20, activo: true, imagen_url: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80" },
  { id: 5, categoria_id: 2, nombre: "Doritos Nacho 90g", descripcion: "Triángulos crujientes de queso", precio: 1900, stock: 12, activo: true, imagen_url: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80" },
  { id: 6, categoria_id: 3, nombre: "Alfajor Havanna", descripcion: "Relleno con abundante dulce de leche", precio: 1400, stock: 30, activo: true, imagen_url: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&auto=format&fit=crop&q=80" },
  { id: 7, categoria_id: 3, nombre: "Chocolate Milka Oreo", descripcion: "Tableta 100g con galletita Oreo", precio: 2200, stock: 10, activo: true, imagen_url: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&auto=format&fit=crop&q=80" },
  { id: 8, categoria_id: 4, nombre: "Sandwich Jamón y Queso", descripcion: "Pan de miga fresco recién preparado", precio: 2200, stock: 8, activo: true, imagen_url: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&auto=format&fit=crop&q=80" },
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
    // Recuperar nombre previo de localStorage si existe
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
        console.warn("Usando catálogo demo local:", err);
      }
    }

    // Modo respaldo visual / local demo
    setCategorias(DEMO_CATEGORIAS);
    setProductos(DEMO_PRODUCTOS);
    setIsLiveDB(false);
  };

  const iniciarCompra = (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMensaje("Por favor escribe tu nombre para continuar.");
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
      alert(`Alcanzaste el stock disponible de ${producto.nombre} (${producto.stock} unid.)`);
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
        // 1. Insertar Pedido
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

        // 2. Insertar Detalle de Pedido (El trigger plpgsql descuenta el stock en la BD)
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
        // Modo simulación local
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

      // Animación de celebración
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
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

  // Filtrado de productos por categoría y texto
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center">
      <div className="w-full max-w-md bg-slate-950 min-h-screen flex flex-col shadow-2xl relative">
        
        {/* =========================================
            PASO 1: REGISTRO DE NOMBRE DEL CLIENTE
            ========================================= */}
        {paso === "registro" && (
          <div className="flex-1 flex flex-col justify-between p-6">
            <div className="pt-10 flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-tr from-teal-400 to-emerald-500 flex items-center justify-center shadow-xl shadow-teal-500/20 mb-6">
                <Store className="h-10 w-10 text-slate-950 stroke-[2.5]" />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                ¡Bienvenido al Kiosco!
              </h1>
              <p className="text-slate-400 text-sm mt-2 max-w-xs leading-relaxed">
                Elige tus productos desde tu celular y retira en caja sin filas.
              </p>
            </div>

            <form onSubmit={iniciarCompra} className="space-y-4 my-8 bg-slate-900/80 p-6 rounded-3xl border border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-teal-400 mb-1">
                ¿Cuál es tu nombre?
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Juan Pérez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 text-white rounded-2xl px-4 py-3.5 text-lg font-medium outline-none transition placeholder:text-slate-600 text-center"
                autoFocus
              />
              <p className="text-xs text-slate-500 text-center">
                Usaremos tu nombre para llamarte cuando tu ticket esté listo.
              </p>

              {errorMensaje && (
                <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{errorMensaje}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black py-4 px-6 rounded-2xl text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/25 active:scale-[0.98]"
              >
                <span>Ver Menú Digital</span>
                <ArrowRight className="h-5 w-5 stroke-[3]" />
              </button>
            </form>

            <div className="text-center pb-4 text-xs text-slate-600">
              Menú Digital Seguro • Kiosco POS v2.0
            </div>
          </div>
        )}

        {/* =========================================
            PASO 2: CATÁLOGO DE PRODUCTOS & CARRITO
            ========================================= */}
        {paso === "menu" && (
          <div className="flex-1 flex flex-col pb-24">
            {/* Barra Superior Fija */}
            <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-teal-400 font-semibold uppercase tracking-wider block">
                    Hola, {nombre} 👋
                  </span>
                  <h2 className="text-lg font-black text-white">Menú del Kiosco</h2>
                </div>

                <button
                  onClick={() => setMostrarCarritoModal(true)}
                  className="relative p-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 transition-all text-slate-200"
                >
                  <ShoppingBag className="h-5 w-5 text-teal-400" />
                  {totalArticulos > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-black h-5 w-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                      {totalArticulos}
                    </span>
                  )}
                </button>
              </div>

              {/* Buscador */}
              <div className="mt-3 relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar chocolates, bebidas, snacks..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-xl pl-10 pr-8 py-2 text-sm text-white placeholder:text-slate-500 outline-none"
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda("")}
                    className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Chips de Categorías */}
              <div className="flex gap-2 overflow-x-auto py-2 no-scrollbar scroll-smooth">
                <button
                  onClick={() => setCategoriaSeleccionada("todas")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    categoriaSeleccionada === "todas"
                      ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Todos los Productos
                </button>
                {categorias.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaSeleccionada(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      String(categoriaSeleccionada) === String(cat.id)
                        ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                        : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {cat.nombre}
                  </button>
                ))}
              </div>
            </header>

            {/* Listado de Productos */}
            <main className="flex-1 p-4 space-y-3">
              {productosFiltrados.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <ShoppingBag className="h-12 w-12 mx-auto stroke-1 mb-2 opacity-50" />
                  <p className="font-semibold text-slate-400">No encontramos productos</p>
                  <p className="text-xs text-slate-600 mt-1">Prueba con otra búsqueda o categoría</p>
                </div>
              ) : (
                productosFiltrados.map((prod) => {
                  const enCarrito = carrito.find((i) => i.id === prod.id);
                  const cantidad = enCarrito ? enCarrito.cantidad : 0;
                  const sinStock = prod.stock <= 0;

                  return (
                    <div
                      key={prod.id}
                      className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3 flex gap-3.5 items-center hover:border-slate-700 transition"
                    >
                      {/* Imagen o Placeholder */}
                      <div className="h-20 w-20 rounded-xl bg-slate-950 overflow-hidden shrink-0 border border-slate-800 flex items-center justify-center relative">
                        {prod.imagen_url ? (
                          <img
                            src={prod.imagen_url}
                            alt={prod.nombre}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <Store className="h-6 w-6 text-slate-700" />
                        )}
                        {prod.stock <= 3 && prod.stock > 0 && (
                          <span className="absolute bottom-1 right-1 bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                            Quedan {prod.stock}
                          </span>
                        )}
                      </div>

                      {/* Información de Producto */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-sm truncate">{prod.nombre}</h3>
                        {prod.descripcion && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">{prod.descripcion}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-base font-black text-teal-400">
                            ${Number(prod.precio).toLocaleString("es-AR")}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            (Stock: {prod.stock})
                          </span>
                        </div>
                      </div>

                      {/* Controles de Cantidad */}
                      <div className="shrink-0">
                        {cantidad > 0 ? (
                          <div className="flex items-center gap-1.5 bg-slate-950 border border-teal-500/40 rounded-xl p-1 shadow-sm">
                            <button
                              onClick={() => restarDelCarrito(prod.id)}
                              className="h-7 w-7 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center active:scale-95"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-5 text-center font-bold text-xs text-teal-300">
                              {cantidad}
                            </span>
                            <button
                              onClick={() => agregarAlCarrito(prod)}
                              disabled={cantidad >= prod.stock}
                              className="h-7 w-7 rounded-lg bg-teal-500 text-slate-950 hover:bg-teal-400 disabled:opacity-40 flex items-center justify-center active:scale-95 font-bold"
                            >
                              <Plus className="h-3.5 w-3.5 stroke-[3]" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => agregarAlCarrito(prod)}
                            disabled={sinStock}
                            className="px-3 py-2 rounded-xl bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500 hover:text-slate-950 text-teal-300 font-bold text-xs flex items-center gap-1 transition active:scale-95 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-teal-300"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Agregar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </main>

            {/* Barra Flotante Inferior de Carrito */}
            {totalArticulos > 0 && (
              <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 z-40 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pt-6">
                <button
                  onClick={() => setMostrarCarritoModal(true)}
                  className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black py-3.5 px-5 rounded-2xl flex items-center justify-between shadow-xl shadow-teal-500/25 active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-950 text-teal-300 text-xs px-2.5 py-1 rounded-xl font-black">
                      {totalArticulos}
                    </span>
                    <span className="text-sm">Ver Pedido</span>
                  </div>
                  <span className="text-base tracking-tight font-black">
                    ${totalCarrito.toLocaleString("es-AR")}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* =========================================
            MODAL DRAWER: REVISIÓN DE CARRITO
            ========================================= */}
        {mostrarCarritoModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
              {/* Header Modal */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-teal-400" />
                  <h3 className="font-bold text-white text-base">Tu Carrito de Compras</h3>
                </div>
                <button
                  onClick={() => setMostrarCarritoModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Lista de Items */}
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
                      <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl p-1">
                        <button
                          onClick={() => restarDelCarrito(item.id)}
                          className="h-6 w-6 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center font-bold text-xs text-teal-300">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => agregarAlCarrito(item)}
                          disabled={item.cantidad >= item.stock}
                          className="h-6 w-6 rounded-lg bg-teal-500 text-slate-950 disabled:opacity-40 flex items-center justify-center font-bold"
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

                {/* Método de Pago */}
                <div className="pt-4 space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400 block">
                    Forma de Pago en Caja
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMetodoPago("efectivo")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                        metodoPago === "efectivo"
                          ? "bg-teal-500/10 border-teal-500 text-teal-400"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      <Banknote className="h-4 w-4" />
                      <span>Efectivo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodoPago("transferencia")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                        metodoPago === "transferencia"
                          ? "bg-teal-500/10 border-teal-500 text-teal-400"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Transferencia / QR</span>
                    </button>
                  </div>
                </div>

                {/* Notas o Aclaraciones */}
                <div className="pt-3">
                  <input
                    type="text"
                    placeholder="Nota adicional (Ej. gaseosa bien fría)"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none"
                  />
                </div>
              </div>

              {/* Footer Modal con Total y Botón */}
              <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Total a pagar:</span>
                  <span className="text-2xl font-black text-teal-400">
                    ${totalCarrito.toLocaleString("es-AR")}
                  </span>
                </div>

                {errorMensaje && (
                  <div className="p-2.5 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300">
                    {errorMensaje}
                  </div>
                )}

                <button
                  onClick={enviarPedido}
                  disabled={cargando}
                  className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black py-3.5 px-6 rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25 active:scale-[0.98] disabled:opacity-50"
                >
                  {cargando ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                      Enviando a Caja...
                    </span>
                  ) : (
                    <>
                      <span>Confirmar Pedido</span>
                      <ArrowRight className="h-5 w-5 stroke-[2.5]" />
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
          <div className="flex-1 flex flex-col justify-between p-6">
            <div className="pt-6 flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mb-4">
                <Check className="h-8 w-8 stroke-[3]" />
              </div>

              <h2 className="text-2xl font-black text-white text-center">
                ¡Pedido Enviado a Caja!
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Acércate al mostrador para abonar y retirar.
              </p>

              {/* Tarjeta tipo Ticket */}
              <div className="w-full mt-6 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-400 to-emerald-500" />

                <div className="flex justify-between items-start border-b border-dashed border-slate-800 pb-4 mb-4">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Número de Orden
                    </span>
                    <span className="text-3xl font-black text-amber-400">
                      #{pedidoGuardado.id}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Cliente
                    </span>
                    <span className="text-base font-bold text-white">
                      {pedidoGuardado.cliente_nombre}
                    </span>
                  </div>
                </div>

                {/* Items del pedido */}
                <div className="space-y-2 border-b border-dashed border-slate-800 pb-4 mb-4 text-xs">
                  {pedidoGuardado.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-slate-300">
                      <span>{item.cantidad}x {item.nombre}</span>
                      <span className="font-semibold text-slate-100">
                        ${(Number(item.precio) * item.cantidad).toLocaleString("es-AR")}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-400">Total a pagar:</span>
                  <span className="text-2xl font-black text-emerald-400">
                    ${Number(pedidoGuardado.total).toLocaleString("es-AR")}
                  </span>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 text-center">
                  Pago seleccionado: <strong className="text-teal-400 uppercase">{pedidoGuardado.metodo_pago}</strong>
                </div>
              </div>
            </div>

            <div className="py-6 space-y-3">
              <button
                onClick={() => {
                  setPedidoGuardado(null);
                  setPaso("menu");
                }}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold py-3.5 px-4 rounded-2xl text-sm flex items-center justify-center gap-2 transition"
              >
                <span>Hacer otro pedido</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
