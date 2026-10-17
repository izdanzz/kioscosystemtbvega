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
  Trash2
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { playChimeSound } from "@/lib/sound";

const DEMO_CATEGORIAS = [
  { id: 1, nombre: "Bebidas", icono: "🥤" },
  { id: 2, nombre: "Snacks", icono: "🍟" },
  { id: 3, nombre: "Golosinas", icono: "🍫" },
  { id: 4, nombre: "Sandwiches", icono: "🥪" },
];

const DEMO_PRODUCTOS = [
  { id: 1, categoria_id: 1, nombre: "Coca Cola 500ml", descripcion: "Botella descartable fría", precio: 1500, stock: 24, activo: true, imagen_url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80" },
  { id: 2, categoria_id: 1, nombre: "Agua Mineral 500ml", descripcion: "Con o sin gas fresca", precio: 900, stock: 30, activo: true, imagen_url: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500&auto=format&fit=crop&q=80" },
  { id: 3, categoria_id: 1, nombre: "Energizante Monster 473ml", descripcion: "Lata original clásica", precio: 2400, stock: 15, activo: true, imagen_url: "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500&auto=format&fit=crop&q=80" },
  { id: 4, categoria_id: 2, nombre: "Papas Fritas Lays 95g", descripcion: "Clásicas crocantes con sal", precio: 1600, stock: 20, activo: true, imagen_url: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80" },
  { id: 5, categoria_id: 2, nombre: "Doritos Mega Queso 90g", descripcion: "Triángulos crujientes de maíz", precio: 1900, stock: 12, activo: true, imagen_url: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80" },
  { id: 6, categoria_id: 3, nombre: "Alfajor Havanna Cacao", descripcion: "Chocolate y dulce de leche", precio: 1400, stock: 30, activo: true, imagen_url: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&auto=format&fit=crop&q=80" },
  { id: 7, categoria_id: 3, nombre: "Chocolate Milka Oreo", descripcion: "Tableta con galletita Oreo 100g", precio: 2200, stock: 10, activo: true, imagen_url: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&auto=format&fit=crop&q=80" },
  { id: 8, categoria_id: 4, nombre: "Sandwich Jamón y Queso", descripcion: "Pan de miga fresco del día", precio: 2200, stock: 8, activo: true, imagen_url: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80" },
];

export default function MenuCliente() {
  const [paso, setPaso] = useState("registro");
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
        console.warn("Fallo lectura Supabase:", err);
      }
    }

    setCategorias(DEMO_CATEGORIAS);
    setProductos(DEMO_PRODUCTOS);
    setIsLiveDB(false);
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

  const agregarAlCarrito = (producto) => {
    const itemActual = carrito.find((i) => i.id === producto.id);
    const cantidadActual = itemActual ? itemActual.cantidad : 0;

    if (cantidadActual >= producto.stock) {
      alert(`Quedan solo ${producto.stock} unidades disponibles.`);
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
    setCarrito([]);
    setMostrarCarritoModal(false);
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
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center selection:bg-slate-900 selection:text-white font-sans">
      <div className="w-full max-w-md bg-white border-x border-slate-200 min-h-screen flex flex-col shadow-xs">
        
        {/* =========================================
            PASO 1: REGISTRO CLIENTE (TB LA VEGA)
            ========================================= */}
        {paso === "registro" && (
          <div className="flex-1 flex flex-col justify-between p-6">
            <div className="pt-14 text-center">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-4 shadow-xs">
                <Store className="h-8 w-8 stroke-[2]" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                TB La Vega
              </h1>
              <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">
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
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-5 rounded-xl text-sm flex items-center justify-center gap-2 transition active:scale-[0.99] shadow-xs"
              >
                <span>Ver Menú</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="text-center pb-4 text-xs text-slate-400">
              TB La Vega
            </div>
          </div>
        )}

        {/* =========================================
            PASO 2: MENÚ DE PRODUCTOS
            ========================================= */}
        {paso === "menu" && (
          <div className="flex-1 flex flex-col pb-24">
            
            {/* Cabecera */}
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 pt-3.5 pb-2.5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">TB La Vega</h2>
                  <span className="text-xs text-slate-500">
                    Cliente: <strong>{nombre}</strong>
                  </span>
                </div>

                <button
                  onClick={() => setMostrarCarritoModal(true)}
                  className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition active:scale-95"
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
                  placeholder="Buscar productos..."
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
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

            {/* Lista de Productos */}
            <main className="flex-1 p-4 space-y-3 bg-slate-50">
              {productosFiltrados.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <p className="font-semibold text-slate-600 text-sm">No encontramos productos</p>
                </div>
              ) : (
                productosFiltrados.map((prod) => {
                  const enCarrito = carrito.find((i) => i.id === prod.id);
                  const cantidad = enCarrito ? enCarrito.cantidad : 0;
                  const sinStock = prod.stock <= 0;

                  return (
                    <div
                      key={prod.id}
                      className="bg-white border border-slate-200 rounded-xl p-3 flex gap-3.5 items-center shadow-xs"
                    >
                      <div className="h-16 w-16 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center relative">
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
                          <Store className="h-6 w-6 text-slate-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm truncate">{prod.nombre}</h3>
                        {prod.descripcion && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">{prod.descripcion}</p>
                        )}
                        <span className="text-sm font-bold text-slate-900 block mt-1">
                          ${Number(prod.precio).toLocaleString("es-AR")}
                        </span>
                      </div>

                      <div className="shrink-0">
                        {cantidad > 0 ? (
                          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 rounded-lg p-1">
                            <button
                              onClick={() => restarDelCarrito(prod.id)}
                              className="h-7 w-7 rounded bg-white text-slate-800 shadow-xs flex items-center justify-center font-bold active:scale-95"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-5 text-center font-bold text-xs text-slate-900">
                              {cantidad}
                            </span>
                            <button
                              onClick={() => agregarAlCarrito(prod)}
                              disabled={cantidad >= prod.stock}
                              className="h-7 w-7 rounded bg-slate-900 text-white shadow-xs flex items-center justify-center font-bold disabled:opacity-40 active:scale-95"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => agregarAlCarrito(prod)}
                            disabled={sinStock}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition active:scale-95 disabled:opacity-40"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Pedir</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </main>

            {/* Barra Inferior Carrito */}
            {totalArticulos > 0 && (
              <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 z-40 bg-gradient-to-t from-white via-white/95 to-transparent pt-6">
                <button
                  onClick={() => setMostrarCarritoModal(true)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-5 rounded-xl flex items-center justify-between shadow-lg active:scale-[0.99] transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-800 text-white text-xs px-2.5 py-0.5 rounded font-bold">
                      {totalArticulos}
                    </span>
                    <span className="text-sm">Ver Carrito</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-base font-bold">
                      ${totalCarrito.toLocaleString("es-AR")}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal Carrito */}
        {mostrarCarritoModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-center items-end sm:items-center p-0 sm:p-4">
            <div className="bg-white border border-slate-200 w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
              
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-slate-800" />
                  <h3 className="font-bold text-slate-900 text-base">Tu Pedido</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={vaciarCarrito}
                    className="p-1.5 text-slate-400 hover:text-red-600 transition"
                    title="Vaciar carrito"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setMostrarCarritoModal(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex-1 overflow-y-auto space-y-3 divide-y divide-slate-100">
                {carrito.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{item.nombre}</h4>
                      <p className="text-xs text-slate-500">
                        ${Number(item.precio).toLocaleString("es-AR")} c/u
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-1">
                        <button
                          onClick={() => restarDelCarrito(item.id)}
                          className="h-6 w-6 rounded bg-white text-slate-700 shadow-xs flex items-center justify-center font-bold"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center font-bold text-xs text-slate-900">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => agregarAlCarrito(item)}
                          disabled={item.cantidad >= item.stock}
                          className="h-6 w-6 rounded bg-slate-900 text-white shadow-xs flex items-center justify-center font-bold disabled:opacity-40"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="font-bold text-sm text-slate-900 w-16 text-right">
                        ${(Number(item.precio) * item.cantidad).toLocaleString("es-AR")}
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
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                        metodoPago === "efectivo"
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Banknote className="h-4 w-4" />
                      <span>Efectivo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodoPago("transferencia")}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                        metodoPago === "transferencia"
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Transferencia / QR</span>
                    </button>
                  </div>
                </div>

                <div className="pt-3">
                  <input
                    type="text"
                    placeholder="Aclaración adicional (opcional)"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-400 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs uppercase font-bold text-slate-500">Total a Pagar</span>
                  <span className="text-2xl font-bold text-slate-900">
                    ${totalCarrito.toLocaleString("es-AR")}
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
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.99] disabled:opacity-50"
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

        {/* Paso 3: Comprobante */}
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
                Acércate a la caja para abonar y retirar.
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
                        ${(Number(item.precio) * item.cantidad).toLocaleString("es-AR")}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase font-bold text-slate-500">Total</span>
                  <span className="text-2xl font-bold text-slate-900">
                    ${Number(pedidoGuardado.total).toLocaleString("es-AR")}
                  </span>
                </div>

                <div className="mt-4 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex justify-between">
                  <span>Pago en caja:</span>
                  <span className="font-bold uppercase text-slate-900">{pedidoGuardado.metodo_pago}</span>
                </div>
              </div>
            </div>

            <div className="py-6">
              <button
                onClick={() => {
                  setPedidoGuardado(null);
                  setPaso("menu");
                }}
                className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold py-3 px-4 rounded-xl text-xs transition"
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
