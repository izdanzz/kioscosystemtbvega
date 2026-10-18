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
    ticket += "PAGO   : DINERO EN EFECTIVO\n";
  }

  ticket += line + "\n";
  ticket += "CANT. PRODUCTO            SUBTOTAL\n";
  ticket += line + "\n";

  const items = pedido.items || pedido.detalle_pedido || [];
  if (items.length === 0) {
    ticket += "1x [Consumo general]   RD$" + (Number(pedido.total) || 0).toFixed(2) + "\n";
  } else {
    items.forEach((item) => {
      const cant = item.cantidad || 1;
      const nombre = (item.nombre || item.productos?.nombre || "Producto").substring(0, 16).padEnd(16, " ");
      const subtotal = "RD$" + (Number(item.subtotal) || (Number(item.precio || item.precio_unitario || 0)) * cant).toFixed(2);
      ticket += `${cant}x ${nombre} ${subtotal.padStart(10, " ")}\n`;
    });
  }

  ticket += line + "\n";
  ticket += `TOTAL A PAGAR: RD$ ${(Number(pedido.total) || 0).toFixed(2)}\n`;

  if ((pedido.metodo_pago === "dinero" || pedido.metodo_pago === "efectivo") && pedido.monto_recibido) {
    ticket += `ABONO CON    : RD$ ${Number(pedido.monto_recibido).toFixed(2)}\n`;
    ticket += `VUELTO       : RD$ ${Number(pedido.vuelto || 0).toFixed(2)}\n`;
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
          .text(`Pago: ${pedido.metodo_pago === "fiado" ? "*** CUENTA / FIADO ***" : "DINERO EN EFECTIVO"}`)
          .text("--------------------------------");

        const items = pedido.items || pedido.detalle_pedido || [];
        items.forEach((item) => {
          const cant = item.cantidad || 1;
          const nom = item.nombre || item.productos?.nombre || "Producto";
          const sub = "RD$ " + (Number(item.subtotal) || (Number(item.precio || item.precio_unitario || 0)) * cant).toFixed(2);
          printer.text(`${cant}x ${nom} - ${sub}`);
        });

        printer
          .text("--------------------------------")
          .align("rt")
          .style("b")
          .size(1, 1)
          .text(`TOTAL: RD$ ${(Number(pedido.total) || 0).toFixed(2)}`);

        if ((pedido.metodo_pago === "dinero" || pedido.metodo_pago === "efectivo") && pedido.monto_recibido) {
          printer
            .align("rt")
            .text(`Abono: RD$ ${Number(pedido.monto_recibido).toFixed(2)}`)
            .text(`Vuelto: RD$ ${Number(pedido.vuelto || 0).toFixed(2)}`);
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

function generarTextoCierre(cierre) {
  const line = "--------------------------------";
  const doubleLine = "================================";
  const fecha = new Date().toLocaleString("es-DO", {
    dateStyle: "short",
    timeStyle: "short",
  });

  let ticket = "\n" + doubleLine + "\n";
  ticket += "     TEMPLO BÍBLICO LA VEGA     \n";
  ticket += "       RESUMEN DEL DÍA          \n";
  ticket += doubleLine + "\n";
  if (cierre.codigo) ticket += `SESIÓN  : ${cierre.codigo}\n`;
  if (cierre.cajero) ticket += `CAJERO  : ${cierre.cajero}\n`;
  ticket += `EMISIÓN : ${fecha}\n`;
  ticket += `FECHA   : ${cierre.fecha || "Hoy"}\n`;
  ticket += line + "\n";
  ticket += "RESUMEN DE INGRESOS (DOP):\n";
  ticket += `TOTAL VENDIDO : RD$ ${Number(cierre.totalVendido || 0).toFixed(2)}\n`;
  ticket += `• DINERO / EFECTIVO : RD$ ${Number(cierre.totalEfectivo || 0).toFixed(2)}\n`;
  ticket += `• FIADO / DEUDA     : RD$ ${Number(cierre.totalFiado || 0).toFixed(2)}\n`;
  ticket += `ÓRDENES COBRADAS: ${cierre.ordenesCobradas || 0}\n`;
  ticket += `ÓRDENES FIADAS  : ${cierre.ordenesFiadas || 0}\n`;

  if (cierre.fiados && cierre.fiados.length > 0) {
    ticket += line + "\n";
    ticket += "CLIENTES QUE DEBEN FIADO:\n";
    cierre.fiados.forEach((f, idx) => {
      ticket += `${idx + 1}. ${(f.cliente || "Cliente").toUpperCase()}: RD$ ${Number(f.total).toFixed(2)}\n`;
      if (f.notas) ticket += `   Nota: ${f.notas}\n`;
    });
  }

  if (cierre.productosVendidos && cierre.productosVendidos.length > 0) {
    ticket += line + "\n";
    ticket += "PRODUCTOS MÁS VENDIDOS:\n";
    cierre.productosVendidos.slice(0, 10).forEach((p) => {
      const cant = `${p.cantidad}x`.padEnd(5, " ");
      const nom = (p.nombre || "Prod").substring(0, 15).padEnd(15, " ");
      const sub = `RD$${Number(p.subtotal).toFixed(2)}`.padStart(12, " ");
      ticket += `${cant}${nom}${sub}\n`;
    });
  }

  ticket += doubleLine + "\n";
  ticket += "  REPORTE OFICIAL DE CIERRE Z   \n";
  ticket += doubleLine + "\n";
  ticket += "[CORTE DE PAPEL ESC/POS]\n";

  return ticket;
}

app.post("/imprimir-cierre", async (req, res) => {
  const cierre = req.body;
  console.log(`\n========================================`);
  console.log(`📊 RECIBIDA SOLICITUD DE CIERRE DE DÍA`);
  console.log(`========================================`);

  const ticketTexto = generarTextoCierre(cierre);
  console.log(ticketTexto);

  if (escpos && USB) {
    try {
      const device = new USB();
      const printer = new escpos.Printer(device);

      device.open((err) => {
        if (err) {
          console.warn("⚠️ No se pudo conectar al puerto USB:", err.message);
          return res.json({ success: true, simulated: true, preview: ticketTexto });
        }

        printer
          .font("a")
          .align("ct")
          .style("b")
          .size(1, 1)
          .text("TEMPLO BÍBLICO LA VEGA")
          .text("RESUMEN DEL DÍA")
          .text("--------------------------------")
          .align("lt")
          .text(`Fecha: ${new Date().toLocaleString()}`)
          .text(`Total Vendido: RD$ ${Number(cierre.totalVendido || 0).toFixed(2)}`)
          .text(`Dinero en Caja: RD$ ${Number(cierre.totalEfectivo || 0).toFixed(2)}`)
          .text(`Fiados: RD$ ${Number(cierre.totalFiado || 0).toFixed(2)}`)
          .text("--------------------------------");

        if (cierre.fiados && cierre.fiados.length > 0) {
          printer.text("CLIENTES FIADOS:");
          cierre.fiados.forEach((f) => {
            printer.text(`• ${f.cliente}: RD$ ${Number(f.total).toFixed(2)}`);
          });
          printer.text("--------------------------------");
        }

        printer
          .align("ct")
          .text("REPORTE Z DE AUDITORIA")
          .feed(2)
          .cut()
          .close();

        return res.json({ success: true, hardwarePrinted: true, preview: ticketTexto });
      });
      return;
    } catch (e) {
      console.warn("⚠️ Error con impresora:", e.message);
    }
  }

  res.json({
    success: true,
    simulated: true,
    message: "Reporte de cierre procesado en emulación.",
    preview: ticketTexto
  });
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 AGENTE DE IMPRESIÓN TB LA VEGA ACTIVO`);
  console.log(`📡 Escuchando en http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
