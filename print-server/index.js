// print-server/index.js - Servidor Local de Impresión Térmica ESC/POS para TB La Vega
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
  ticket += "           TB LA VEGA           \n";
  ticket += "       TICKET DE COMPRA         \n";
  ticket += doubleLine + "\n";
  ticket += `ORDEN #: ${pedido.pedidoId || pedido.id || "N/A"}\n`;
  ticket += `FECHA : ${fecha}\n`;
  ticket += `CLIENTE: ${(pedido.cliente_nombre || "Cliente").toUpperCase()}\n`;
  
  if (pedido.metodo_pago === "fiado") {
    ticket += "PAGO   : *** CUENTA / FIADO ***\n";
  } else {
    ticket += `PAGO   : ${(pedido.metodo_pago || "Efectivo").toUpperCase()}\n`;
  }

  ticket += line + "\n";
  ticket += "CANT. PRODUCTO            SUBTOTAL\n";
  ticket += line + "\n";

  const items = pedido.items || pedido.detalle_pedido || [];
  if (items.length === 0) {
    ticket += "1x [Consumo general]      $" + (Number(pedido.total) || 0).toFixed(2) + "\n";
  } else {
    items.forEach((item) => {
      const cant = item.cantidad || 1;
      const nombre = (item.nombre || item.productos?.nombre || "Producto").substring(0, 18).padEnd(18, " ");
      const subtotal = "$" + (Number(item.subtotal) || (Number(item.precio || item.precio_unitario || 0)) * cant).toFixed(2);
      ticket += `${cant}x ${nombre} ${subtotal.padStart(8, " ")}\n`;
    });
  }

  ticket += line + "\n";
  ticket += `TOTAL A PAGAR: $${(Number(pedido.total) || 0).toFixed(2)}\n`;

  if (pedido.metodo_pago === "efectivo" && pedido.monto_recibido) {
    ticket += `ABONO CON    : $${Number(pedido.monto_recibido).toFixed(2)}\n`;
    ticket += `VUELTO       : $${Number(pedido.vuelto || 0).toFixed(2)}\n`;
  }

  if (pedido.notas) {
    ticket += line + "\n";
    ticket += `NOTA: ${pedido.notas}\n`;
  }

  ticket += doubleLine + "\n";
  ticket += "     ¡GRACIAS POR SU COMPRA!    \n";
  ticket += "     Conserve este comprobante  \n";
  ticket += doubleLine + "\n";
  ticket += "[CORTE DE PAPEL ESC/POS]\n";

  return ticket;
}

app.get("/status", (req, res) => {
  res.json({
    online: true,
    port: PORT,
    hardwareUsbAvailable: !!USB,
    mode: USB ? "hardware_ready" : "simulation",
    timestamp: new Date().toISOString()
  });
});

app.post("/imprimir", async (req, res) => {
  const pedido = req.body;
  const pedidoId = pedido.pedidoId || pedido.id || "SIN_ID";

  console.log(`\n========================================`);
  console.log(`🖨️ RECIBIDA ORDEN DE IMPRESIÓN #${pedidoId}`);
  console.log(`========================================`);

  const ticketTexto = generarTextoTicket(pedido);
  console.log(ticketTexto);

  if (escpos && USB) {
    try {
      const device = new USB();
      const printer = new escpos.Printer(device);

      device.open((err) => {
        if (err) {
          console.warn("⚠️ No se pudo conectar al puerto USB físico:", err.message);
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
          .text("TB LA VEGA")
          .text("--------------------------------")
          .align("lt")
          .text(`Orden #: ${pedidoId}`)
          .text(`Cliente: ${pedido.cliente_nombre || "Cliente"}`)
          .text(`Fecha: ${new Date().toLocaleString()}`)
          .text(`Pago: ${(pedido.metodo_pago || "Efectivo").toUpperCase()}`)
          .text("--------------------------------");

        const items = pedido.items || pedido.detalle_pedido || [];
        items.forEach((item) => {
          const cant = item.cantidad || 1;
          const nom = item.nombre || item.productos?.nombre || "Producto";
          const sub = "$" + (Number(item.subtotal) || (Number(item.precio || item.precio_unitario || 0)) * cant).toFixed(2);
          printer.text(`${cant}x ${nom} - ${sub}`);
        });

        printer
          .text("--------------------------------")
          .align("rt")
          .style("b")
          .size(1, 1)
          .text(`TOTAL: $${(Number(pedido.total) || 0).toFixed(2)}`);

        if (pedido.metodo_pago === "efectivo" && pedido.monto_recibido) {
          printer
            .align("rt")
            .text(`Abono: $${Number(pedido.monto_recibido).toFixed(2)}`)
            .text(`Vuelto: $${Number(pedido.vuelto || 0).toFixed(2)}`);
        }

        if (pedido.notas) {
          printer
            .align("lt")
            .text(`Nota: ${pedido.notas}`);
        }

        printer
          .align("ct")
          .text("--------------------------------")
          .text("GRACIAS POR SU COMPRA")
          .feed(2)
          .cut()
          .close();

        console.log("✅ Ticket enviado a impresora térmica USB con éxito.");
        return res.json({ success: true, hardwarePrinted: true, preview: ticketTexto });
      });
      return;
    } catch (err) {
      console.warn("⚠️ Error al interactuar con USB ESC/POS:", err.message);
    }
  }

  res.json({
    success: true,
    simulated: true,
    message: "Ticket procesado correctamente en modo emulación.",
    preview: ticketTexto
  });
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 AGENTE DE IMPRESIÓN TB LA VEGA ACTIVO`);
  console.log(`📡 Escuchando en http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
