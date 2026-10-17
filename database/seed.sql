-- ========================================================
-- DATOS SEMILLA (SEED) PARA TB LA VEGA
-- Productos en Pesos Dominicanos (DOP / RD$)
-- Con Imagen, Título y Descripción Detallada
-- ========================================================

-- Limpiar datos existentes de prueba (opcional)
TRUNCATE TABLE detalle_pedido, pedidos, productos, categorias RESTART IDENTITY CASCADE;

-- Categorías
INSERT INTO categorias (nombre, icono, orden) VALUES
('Bebidas', 'Coffee', 1),
('Snacks & Frituras', 'Cookie', 2),
('Sandwiches & Empanadas', 'Utensils', 3),
('Dulces & Golosinas', 'Candy', 4),
('Varios', 'Sparkles', 5);

-- Productos con Foto, Título, Descripción y Precios en Pesos Dominicanos (DOP / RD$)
INSERT INTO productos (categoria_id, nombre, descripcion, precio, stock, activo, imagen_url) VALUES
-- Bebidas
(1, 'Cerveza Presidente 355ml', 'Botella bien fría vestida de novia, clásica dominicana.', 180.00, 36, true, 'https://images.unsplash.com/photo-1608270116666-68164380f839?w=400&auto=format&fit=crop&q=80'),
(1, 'Coca Cola 500ml', 'Botella plástica fría refrescante descartable.', 50.00, 30, true, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80'),
(1, 'Agua Dasani 500ml', 'Agua purificada fría sin gas para calmar la sed.', 25.00, 50, true, 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&auto=format&fit=crop&q=80'),
(1, 'Red Bull Energizante 250ml', 'Lata bien fría para recargar energía al instante.', 150.00, 20, true, 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400&auto=format&fit=crop&q=80'),
(1, 'Café Santo Domingo Colado', 'Café criollo caliente recién colado con aroma tradicional.', 40.00, 45, true, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80'),

-- Snacks & Frituras
(2, 'Platanitos Salados 100g', 'Plátano verde frito crocante con sal fina marina.', 50.00, 25, true, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80'),
(2, 'Papas Fritas Lays Clásicas', 'Bolsa de papas crujientes con su toque exacto de sal.', 75.00, 20, true, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80'),
(2, 'Doritos Nacho Cheese 90g', 'Triángulos de maíz horneados con delicioso sabor a queso.', 75.00, 18, true, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80'),
(2, 'Maní Salado Tostado 100g', 'Maní criollo seleccionado y tostado con sal.', 45.00, 30, true, 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=400&auto=format&fit=crop&q=80'),

-- Sandwiches & Empanadas
(3, 'Sandwich de Jamón y Queso Tostado', 'Pan de agua o molde tostado con jamón cocido y queso derretido.', 130.00, 15, true, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&auto=format&fit=crop&q=80'),
(3, 'Empanada de Pollo Crujiente', 'Masa dorada rellena de pechuga de pollo desmenuzada y sazonada.', 80.00, 20, true, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80'),
(3, 'Empanada de Queso y Maíz', 'Empanada rellena de queso fundido y granos dulces de maíz.', 80.00, 15, true, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80'),

-- Dulces & Golosinas
(4, 'Chocolate Snickers Bar', 'Barra con caramelo, nougat, maní tostado y chocolate con leche.', 65.00, 25, true, 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&auto=format&fit=crop&q=80'),
(4, 'Galletas Oreo 6 unidades', 'Galletas de cacao rellenas de suave crema de vainilla.', 45.00, 35, true, 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&auto=format&fit=crop&q=80'),
(4, 'Chicles Trident Menta', 'Cajita de chicles de menta refrescante sin azúcar.', 35.00, 40, true, 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=400&auto=format&fit=crop&q=80');
