// print-server/index.js - Servidor Local de Impresión Térmica ESC/POS
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Intentar cargar módulo opcional escpos
let escpos = null;
let USB = null;
try {
  escpos = require("escpos");
  escpos.USB = require("escpos-usb");
  USB = escpos.USB;
} catch (e) {
  // En caso de que no esté compilado nativamente para Windows aún
  console.log("ℹ️ Módulo ESC/POS nativo no detectado. Modo emulador activo.");
}

function generarTextoTicket(pedido) {
  const line = "--------------------------------";
  const doubleLine = "================================";
  const fecha = new Date().toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  let ticket = "\n";
  ticket += doubleLine + "\n";
  ticket += "       KIOSCO AUTOMATIZADO      \n";
  ticket += "       TICKET DE PEDIDO         \n";
  ticket += doubleLine + "\n";
  ticket += `ORDEN #: ${pedido.pedidoId || pedido.id || "N/A"}\n`;
  ticket += `FECHA : ${fecha}\n`;
  ticket += `CLIENTE: ${(pedido.cliente_nombre || "Cliente").toUpperCase()}\n`;
  ticket += `PAGO   : ${(pedido.metodo_pago || "Efectivo").toUpperCase()}\n`;
  ticket += line + "\n";
  ticket += "CANT. PRODUCTO            SUBTOTAL\n";
  ticket += line + "\n";

  const items = pedido.items || pedido.detalle_pedido || [];
  if (items.length === 0) {
    ticket += "1x [Consumo general]      $" + (pedido.total || 0).toFixed(2) + "\n";
  } else {
    items.forEach((item) => {
      const cant = item.cantidad || 1;
      const nombre = (item.nombre || item.productos?.nombre || "Producto").substring(0, 18).padEnd(18, " ");
      const subtotal = "$" + (item.subtotal || (item.precio || item.precio_unitario || 0) * cant).toFixed(2);
      ticket += `${cant}x ${nombre} ${subtotal.padStart(8, " ")}\n`;
    });
  }

  ticket += line + "\n";
  ticket += `TOTAL A PAGAR: $${(Number(pedido.total) || 0).toFixed(2)}\n`;
  ticket += doubleLine + "\n";
  ticket += "     ¡GRACIAS POR SU COMPRA!    \n";
  ticket += "     Conserve este comprobante  \n";
  ticket += doubleLine + "\n";
  ticket += "[CORTE DE PAPEL ESC/POS]\n";

  return ticket;
}

// Endpoint de estado de salud
app.get("/status", (req, res) => {
  res.json({
    online: true,
    port: PORT,
    hardwareUsbAvailable: !!USB,
    mode: USB ? "hardware_ready" : "simulation",
    timestamp: new Date().toISOString()
  });
});

// Endpoint principal para imprimir
app.post("/imprimir", async (req, res) => {
  const pedido = req.body;
  const pedidoId = pedido.pedidoId || pedido.id || "SIN_ID";

  console.log(`\n========================================`);
  console.log(`🖨️ RECIBIDA ORDEN DE IMPRESIÓN #${pedidoId}`);
  console.log(`========================================`);

  const ticketTexto = generarTextoTicket(pedido);
  console.log(ticketTexto);

  // Si escpos y USB están disponibles e inicializados
  if (escpos && USB) {
    try {
      const device = new USB();
      const printer = new escpos.Printer(device);

      device.open((err) => {
        if (err) {
          console.warn("⚠️ No se pudo conectar directamente al puerto USB de la impresora:", err.message);
          return res.json({
            success: true,
            simulated: true,
            message: "Impresora física no detectada en USB. Ticket simulado en consola.",
            preview: ticketTexto
          });
        }

        printer
          .font("a")
          .align("ct")
          .style("b")
          .size(1, 1)
          .text("KIOSCO AUTOMATIZADO")
          .text("--------------------------------")
          .align("lt")
          .text(`Orden #: ${pedidoId}`)
          .text(`Cliente: ${pedido.cliente_nombre || "Cliente"}`)
          .text(`Fecha: ${new Date().toLocaleString()}`)
          .text("--------------------------------");

        const items = pedido.items || pedido.detalle_pedido || [];
        items.forEach((item) => {
          const cant = item.cantidad || 1;
          const nom = item.nombre || item.productos?.nombre || "Producto";
          const sub = "$" + (item.subtotal || (item.precio || item.precio_unitario || 0) * cant).toFixed(2);
          printer.text(`${cant}x ${nom} - ${sub}`);
        });

        printer
          .text("--------------------------------")
          .align("rt")
          .style("b")
          .size(1, 1)
          .text(`TOTAL: $${(Number(pedido.total) || 0).toFixed(2)}`)
          .align("ct")
          .text("--------------------------------")
          .text("GRACIAS POR SU COMPRA")
          .feed(2)
          .cut()
          .close();

        console.log("✅ Ticket enviado a impresora térmica USB con éxito.");
        return res.json({ success: true, hardwarePrinted: true });
      });
      return;
    } catch (err) {
      console.warn("⚠️ Error al interactuar con USB ESC/POS:", err.message);
    }
  }

  // Fallback simulador en consola (útil para pruebas en desarrollo)
  res.json({
    success: true,
    simulated: true,
    message: "Ticket procesado correctamente en modo simulación (consola).",
    preview: ticketTexto
  });
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 AGENTE DE IMPRESIÓN KIOSCO POS V2.0 ACTIVO`);
  console.log(`📡 Escuchando en http://localhost:${PORT}`);
  console.log(`🔍 Endpoint de test: http://localhost:${PORT}/status`);
  console.log(`======================================================\n`);
});
