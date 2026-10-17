// print-server/test-print.js - Script de prueba para validar la emisión de tickets
const http = require("http");

const data = JSON.stringify({
  pedidoId: 999,
  cliente_nombre: "Prueba Sistema",
  metodo_pago: "efectivo",
  total: 3100.00,
  items: [
    { nombre: "Coca Cola 500ml", cantidad: 1, precio_unitario: 1500, subtotal: 1500 },
    { nombre: "Papas Fritas Lays", cantidad: 1, precio_unitario: 1600, subtotal: 1600 }
  ]
});

const req = http.request(
  {
    hostname: "localhost",
    port: 5000,
    path: "/imprimir",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    },
  },
  (res) => {
    let body = "";
    res.on("data", (chunk) => (body += chunk));
    res.on("end", () => {
      console.log("Respuesta del Print Server:", body);
    });
  }
);

req.on("error", (e) => {
  console.error("Error conectando con localhost:5000:", e.message);
  console.log("Asegúrate de que el servidor esté encendido con: node print-server/index.js");
});

req.write(data);
req.end();
