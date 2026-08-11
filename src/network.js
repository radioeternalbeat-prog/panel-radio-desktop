// ============================================================
// Network Detection — Detecta conectividad a internet.
// Modo offline: BD local, mezcla, playlists, soundboard
// Modo conectado: streaming, estadísticas, mensajes
// ============================================================

const { net } = require("electron");
const log = require("electron-log");

let isOnline = true;
let mainWindowRef = null;
let checkInterval = null;

/**
 * Verifica si hay conexión a internet.
 */
async function verificarConexion() {
  return new Promise((resolve) => {
    try {
      const request = net.request("https://dns.google/resolve?name=google.com");
      request.on("response", (response) => {
        resolve(response.statusCode === 200);
      });
      request.on("error", () => resolve(false));
      setTimeout(() => {
        request.abort();
        resolve(false);
      }, 5000);
      request.end();
    } catch {
      resolve(false);
    }
  });
}

/**
 * Retorna el estado de red actual.
 */
function obtenerEstadoRed() {
  return {
    online: isOnline,
    timestamp: Date.now(),
  };
}


/**
 * Inicia el monitoreo de red periódico.
 * @param {BrowserWindow} mainWindow
 */
function iniciarMonitoreoRed(mainWindow) {
  mainWindowRef = mainWindow;

  // Verificar inmediatamente
  verificarConexion().then((online) => {
    actualizarEstado(online);
  });

  // Verificar cada 15 segundos
  checkInterval = setInterval(async () => {
    const online = await verificarConexion();
    actualizarEstado(online);
  }, 15000);
}

function actualizarEstado(nuevoEstado) {
  if (nuevoEstado !== isOnline) {
    isOnline = nuevoEstado;
    log.info(`[Red] Estado: ${isOnline ? "ONLINE" : "OFFLINE"}`);
    if (mainWindowRef && mainWindowRef.webContents) {
      mainWindowRef.webContents.send("network-status", obtenerEstadoRed());
    }
  }
}

/**
 * Detiene el monitoreo.
 */
function detenerMonitoreoRed() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

module.exports = {
  obtenerEstadoRed,
  iniciarMonitoreoRed,
  detenerMonitoreoRed,
  verificarConexion,
};
