// ============================================================
// WebSocket setup para el backend embebido.
// Maneja /ws (métricas) y /ws-stream (streaming audio).
// ============================================================

const { WebSocketServer } = require("ws");
const log = require("electron-log");

/**
 * Configura los WebSocket servers en el servidor HTTP.
 * @param {http.Server} server
 */
function setupWebSockets(server) {
  const wssMetricas = new WebSocketServer({ noServer: true });
  const wssStreaming = new WebSocketServer({ noServer: true });

  // Métricas: enviar snapshots periódicos
  wssMetricas.on("connection", (socket) => {
    log.debug("[WS /ws] Nueva conexión de métricas");
    socket.send(JSON.stringify({ tipo: "metricas", ts: Date.now(), estaciones: [] }));
  });

  // Streaming: recibir audio chunks del frontend
  wssStreaming.on("connection", (ws) => {
    const estacionId = ws.estacionId;
    log.info(`[WS /ws-stream] Conectado: estacion=${estacionId}`);

    ws.on("message", (data) => {
      // Aquí se integra con icecastEncoder para enviar chunks al servidor
      // Por ahora: log de actividad
    });

    ws.on("close", () => {
      log.info(`[WS /ws-stream] Desconectado: estacion=${estacionId}`);
    });

    ws.send(JSON.stringify({ tipo: "listo", transcoding: false, formato: "audio/webm" }));
  });

  // Upgrade handler centralizado
  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url, "http://localhost");

    if (url.pathname === "/ws-stream") {
      const estacionId = url.searchParams.get("estacionId");
      if (!estacionId) {
        socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
        socket.destroy();
        return;
      }
      wssStreaming.handleUpgrade(request, socket, head, (ws) => {
        ws.estacionId = estacionId;
        wssStreaming.emit("connection", ws, request);
      });
    } else if (url.pathname === "/ws") {
      wssMetricas.handleUpgrade(request, socket, head, (ws) => {
        wssMetricas.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Broadcast de métricas cada 3s
  setInterval(() => {
    const snapshot = JSON.stringify({
      tipo: "metricas",
      ts: Date.now(),
      estaciones: [],
    });
    for (const client of wssMetricas.clients) {
      if (client.readyState === client.OPEN) {
        client.send(snapshot);
      }
    }
  }, 3000);

  return { wssMetricas, wssStreaming };
}

module.exports = { setupWebSockets };
