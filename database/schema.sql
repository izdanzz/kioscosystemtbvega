-- ========================================================
-- ESQUEMA COMPLETO DE BASE DE DATOS: KIOSCO POS V2.0
-- Supabase PostgreSQL + Triggers de Stock + Realtime + RLS
-- ========================================================

-- 1. TABLA DE CATEGORÍAS
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    icono VARCHAR(50) DEFAULT 'Package',
    orden INT DEFAULT 0
);

-- 2. TABLA DE PRODUCTOS E INVENTARIO
CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    categoria_id INT REFERENCES categorias(id) ON DELETE SET NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL CHECK (precio >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    activo BOOLEAN DEFAULT TRUE,
    imagen_url TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA DE PEDIDOS / ÓRDENES
DO $$ BEGIN
    CREATE TYPE estado_pedido_enum AS ENUM ('pendiente', 'cobrado', 'cancelado');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    cliente_nombre VARCHAR(100) NOT NULL,
    estado estado_pedido_enum DEFAULT 'pendiente',
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    metodo_pago VARCHAR(50) DEFAULT 'efectivo',
    notas TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA DETALLE DE PEDIDOS
CREATE TABLE IF NOT EXISTS detalle_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES productos(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);

-- ========================================================
-- TRIGGER DE DESCUENTO AUTOMÁTICO DE STOCK
-- ========================================================
CREATE OR REPLACE FUNCTION descontar_stock_al_pedir()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_actual INT;
    v_producto_nombre VARCHAR(100);
BEGIN
    -- Obtener nombre y stock actual del producto
    SELECT stock, nombre INTO v_stock_actual, v_producto_nombre
    FROM productos
    WHERE id = NEW.producto_id;

    -- Verificar que exista stock suficiente
    IF v_stock_actual IS NULL THEN
        RAISE EXCEPTION 'El producto ID % no existe.', NEW.producto_id;
    END IF;

    IF v_stock_actual < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para "%" (Disponible: %, Solicitado: %)', 
            v_producto_nombre, v_stock_actual, NEW.cantidad;
    END IF;

    -- Descontar stock atómicamente
    UPDATE productos 
    SET stock = stock - NEW.cantidad 
    WHERE id = NEW.producto_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_descontar_stock ON detalle_pedido;
CREATE TRIGGER trg_descontar_stock
AFTER INSERT ON detalle_pedido
FOR EACH ROW
EXECUTE FUNCTION descontar_stock_al_pedir();

-- ========================================================
-- TRIGGER DE REPOSICIÓN DE STOCK SI SE CANCELA EL PEDIDO
-- ========================================================
CREATE OR REPLACE FUNCTION reponer_stock_al_cancelar()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado <> 'cancelado' AND NEW.estado = 'cancelado' THEN
        UPDATE productos p
        SET stock = p.stock + dp.cantidad
        FROM detalle_pedido dp
        WHERE dp.pedido_id = NEW.id AND dp.producto_id = p.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reponer_stock ON pedidos;
CREATE TRIGGER trg_reponer_stock
AFTER UPDATE ON pedidos
FOR EACH ROW
EXECUTE FUNCTION reponer_stock_al_cancelar();

-- ========================================================
-- POLÍTICAS DE ACCESO PÚBLICO (RLS) PARA KIOSCO
-- Permite que los clientes consulten menú e ingresen pedidos
-- ========================================================
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_pedido ENABLE ROW LEVEL SECURITY;

-- Políticas para Categorías
DROP POLICY IF EXISTS "Lectura pública de categorias" ON categorias;
CREATE POLICY "Lectura pública de categorias" ON categorias FOR SELECT USING (true);
DROP POLICY IF EXISTS "Modificación libre de categorias" ON categorias;
CREATE POLICY "Modificación libre de categorias" ON categorias FOR ALL USING (true);

-- Políticas para Productos
DROP POLICY IF EXISTS "Lectura pública de productos" ON productos;
CREATE POLICY "Lectura pública de productos" ON productos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Modificación libre de productos" ON productos;
CREATE POLICY "Modificación libre de productos" ON productos FOR ALL USING (true);

-- Políticas para Pedidos
DROP POLICY IF EXISTS "Permitir crear pedidos a anonimos" ON pedidos;
CREATE POLICY "Permitir crear pedidos a anonimos" ON pedidos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir leer pedidos" ON pedidos;
CREATE POLICY "Permitir leer pedidos" ON pedidos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir actualizar pedidos (caja)" ON pedidos;
CREATE POLICY "Permitir actualizar pedidos (caja)" ON pedidos FOR UPDATE USING (true);

-- Políticas para Detalle Pedido
DROP POLICY IF EXISTS "Permitir insertar detalle pedido" ON detalle_pedido;
CREATE POLICY "Permitir insertar detalle pedido" ON detalle_pedido FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir leer detalle pedido" ON detalle_pedido;
CREATE POLICY "Permitir leer detalle pedido" ON detalle_pedido FOR SELECT USING (true);

-- ========================================================
-- HABILITAR REALTIME EN SUPABASE
-- ========================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE pedidos;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE productos;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
