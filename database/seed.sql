-- ========================================================
-- DATOS SEMILLA (SEED) PARA KIOSCO POS V2.0
-- ========================================================

-- Limpiar datos existentes de prueba (opcional)
TRUNCATE TABLE detalle_pedido, pedidos, productos, categorias RESTART IDENTITY CASCADE;

-- Categorías
INSERT INTO categorias (nombre, icono, orden) VALUES
('Bebidas', 'Coffee', 1),
('Snacks', 'Cookie', 2),
('Golosinas', 'Candy', 3),
('Sandwiches', 'Utensils', 4),
('Cigarrillos & Varios', 'Sparkles', 5);

-- Productos
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, activo, imagen_url) VALUES
-- Bebidas
(1, 'Coca Cola 500ml', 'Botella descartable fría', 1500.00, 24, true, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80'),
(1, 'Agua Mineral 500ml', 'Con o sin gas fresca', 900.00, 30, true, 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&auto=format&fit=crop&q=80'),
(1, 'Energizante Monster 473ml', 'Monster Energy original lata', 2400.00, 15, true, 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400&auto=format&fit=crop&q=80'),
(1, 'Cerveza Quilmes 473ml', 'Lata fría clásica', 1800.00, 18, true, 'https://images.unsplash.com/photo-1608270116666-68164380f839?w=400&auto=format&fit=crop&q=80'),
(1, 'Café Espresso al Paso', 'Café molido en el momento en vaso térmico', 1200.00, 50, true, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80'),

-- Snacks
(2, 'Papas Fritas Lays Clásicas', 'Bolsa 95g crocantes', 1600.00, 20, true, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80'),
(2, 'Doritos Nacho Cheese 90g', 'Triángulos de maíz con queso', 1900.00, 12, true, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80'),
(2, 'Maní Salado Cervecero 120g', 'Maní pelado tostado con sal', 800.00, 25, true, 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=400&auto=format&fit=crop&q=80'),

-- Golosinas
(3, 'Alfajor Havanna Chocolate', 'Alfajor relleno con abundante dulce de leche', 1400.00, 30, true, 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&auto=format&fit=crop&q=80'),
(3, 'Chocolate Milka Oreo 100g', 'Chocolate con leche y galletita Oreo', 2200.00, 10, true, 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&auto=format&fit=crop&q=80'),
(3, 'Caramelos Sugus Confitados', 'Cajita 50g sabores surtidos', 600.00, 40, true, 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=400&auto=format&fit=crop&q=80'),
(3, 'Chicles Beldent Menta', 'Caja de 18 unidades sin azúcar', 750.00, 35, true, 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=400&auto=format&fit=crop&q=80'),

-- Sandwiches
(4, 'Sandwich de Jamón y Queso', 'Pan de miga fresco recién preparado', 2200.00, 8, true, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&auto=format&fit=crop&q=80'),
(4, 'Medialuna con Jamón y Queso', 'Medialuna tostada caliente', 1500.00, 12, true, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80');
