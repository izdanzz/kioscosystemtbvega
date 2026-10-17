# 🏪 KIOSCO POS V2.0 - Menú Digital QR + Realtime + Impresión Térmica

Sistema de Punto de Venta (POS) completamente automatizado y profesional para kioscos y pequeños comercios:
- **Menú Digital QR Móvil** (`/menu`): Para que los clientes ordenen desde su propio celular sin instalar nada.
- **Base de Datos Atómica Supabase (PostgreSQL)**: Descuento automático de stock con triggers `plpgsql` y WebSockets en tiempo real.
- **Panel de Operador / Cajero** (`/operador`): Recepción de órdenes al instante con alerta auditiva (`ding/chime`), métricas y cobro con 1 clic.
- **Microservicio Local de Impresión ESC/POS** (`print-server/`): Comunicación directa con impresoras térmicas USB de 58mm y 80mm con corte de ticket (y emulador/consola seguro si estás probando sin impresora física).

---

## 🚀 Puesta en Marcha en 3 Pasos

### Paso 1: Configurar la Base de Datos en Supabase
1. Ingresa a [supabase.com](https://supabase.com) y crea un nuevo proyecto gratuito.
2. Abre la pestaña lateral **SQL Editor** y haz clic en **New query**.
3. Copia y pega todo el contenido de [`database/schema.sql`](./database/schema.sql) y presiona **Run**.
4. (Opcional para productos de prueba) Copia y pega el contenido de [`database/seed.sql`](./database/seed.sql) y presiona **Run**.
5. Ve a **Project Settings -> API** y copia:
   - **Project URL**
   - **anon / public key**
6. Abre el archivo `.env.local` en este proyecto y coloca tus credenciales:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima-aqui
   ```

---

### Paso 2: Iniciar la Aplicación Web (Next.js)
En tu terminal en la carpeta del proyecto:
```bash
npm run dev
```
La aplicación estará disponible en:
- **Página Principal / Hub**: [http://localhost:3000](http://localhost:3000)
- **Menú Móvil del Cliente**: [http://localhost:3000/menu](http://localhost:3000/menu)
- **Panel del Cajero (Mostrador)**: [http://localhost:3000/operador](http://localhost:3000/operador)

---

### Paso 3: Iniciar el Agente de Impresión Térmica Local
En una segunda terminal (o en segundo plano en la PC del cajero):
```bash
npm run print-agent
```
Escuchará en `http://localhost:5000`. 
- Si tienes una impresora térmica USB conectada, enviará los comandos directos de corte ESC/POS.
- Si estás en desarrollo o sin impresora física, el servidor formateará e imprimirá el ticket de forma idéntica en la consola sin fallar.

---

## 📱 Código QR para los Clientes
Para que los clientes accedan desde sus celulares:
1. Una vez desplegado el proyecto (por ejemplo en Vercel de forma gratuita), obtendrás una URL como `https://tu-kiosco.vercel.app/menu`.
2. Puedes generar el código QR con cualquier generador o directamente desde la pantalla principal [http://localhost:3000](http://localhost:3000), imprimirlo y colocarlo en el mostrador.
