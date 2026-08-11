// ============================================================
// Backend embebido — Arranca Express + SQLite dentro de Electron.
// Reutiliza la lógica del backend de PANEL-RADIO-ON-LINE- pero
// adaptada para correr localmente sin servidor externo.
// ============================================================

const http = require("http");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");
const log = require("electron-log");

let server = null;
let expressApp = null;

// Paths para datos persistentes del usuario
function getUserDataPath() {
  return path.join(app.getPath("userData"), "data");
}

function getUploadsPath() {
  return path.join(app.getPath("userData"), "uploads");
}

/**
 * Inicializa y arranca el servidor Express embebido.
 * @returns {Promise<number>} Puerto en el que escucha el backend
 */
async function iniciarBackend() {
  const dataPath = getUserDataPath();
  const uploadsPath = getUploadsPath();

  // Crear directorios si no existen
  fs.mkdirSync(dataPath, { recursive: true });
  fs.mkdirSync(uploadsPath, { recursive: true });

  // Configurar variables de entorno para el backend
  process.env.NODE_ENV = process.env.NODE_ENV || "production";
  process.env.DATA_DIR = dataPath;
  process.env.UPLOADS_DIR = uploadsPath;
  process.env.JWT_SECRET = process.env.JWT_SECRET || generarSecretLocal();
  process.env.PORT = "0"; // Puerto dinámico

  // FFmpeg path
  const ffmpegPath = obtenerFFmpegPath();
  if (ffmpegPath) {
    process.env.FFMPEG_PATH = ffmpegPath;
    log.info(`FFmpeg: ${ffmpegPath}`);
  }

  return new Promise((resolve, reject) => {
    try {
      // Importar Express app (requiere que el backend esté copiado en src/backend/app/)
      // En producción se empaqueta; en desarrollo se puede referenciar directamente.
      const createApp = require("./app/createApp");
      expressApp = createApp({
        dataPath,
        uploadsPath,
        ffmpegPath,
        jwtSecret: process.env.JWT_SECRET,
      });

      server = http.createServer(expressApp);

      // WebSocket setup (si el backend lo necesita)
      const { setupWebSockets } = require("./app/websockets");
      setupWebSockets(server);

      server.listen(0, "127.0.0.1", () => {
        const port = server.address().port;
        log.info(`Backend Express escuchando en http://127.0.0.1:${port}`);
        resolve(port);
      });

      server.on("error", (err) => {
        log.error("Error en servidor backend:", err);
        reject(err);
      });

    } catch (err) {
      log.error("Error creando Express app:", err);
      reject(err);
    }
  });
}

/**
 * Detiene el backend Express limpiamente.
 */
async function detenerBackend() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        log.info("Backend Express detenido");
        resolve();
      });
      // Forzar cierre después de 3s
      setTimeout(() => {
        server = null;
        resolve();
      }, 3000);
    } else {
      resolve();
    }
  });
}

/**
 * Genera un JWT secret persistente para la instancia local.
 * Usa un archivo JSON simple en userData (sin electron-store).
 */
function generarSecretLocal() {
  const secretsPath = path.join(app.getPath("userData"), "secrets.json");
  let secrets = {};

  // Leer secrets existentes
  try {
    if (fs.existsSync(secretsPath)) {
      secrets = JSON.parse(fs.readFileSync(secretsPath, "utf-8"));
    }
  } catch { /* archivo corrupto, regenerar */ }

  if (!secrets["jwt-secret"]) {
    const { randomBytes } = require("crypto");
    secrets["jwt-secret"] = randomBytes(64).toString("hex");
    fs.writeFileSync(secretsPath, JSON.stringify(secrets, null, 2), "utf-8");
    log.info("Nuevo JWT secret generado y guardado");
  }

  return secrets["jwt-secret"];
}

/**
 * Obtiene la ruta al binario de FFmpeg empaquetado.
 */
function obtenerFFmpegPath() {
  // En producción: resources/ffmpeg/
  // En desarrollo: intenta ffmpeg-static del node_modules
  if (app.isPackaged) {
    const platform = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
    const resourcePath = path.join(process.resourcesPath, "ffmpeg", platform);
    if (fs.existsSync(resourcePath)) return resourcePath;
  }

  // Fallback: ffmpeg-static
  try {
    const ffmpegStatic = require("ffmpeg-static");
    if (fs.existsSync(ffmpegStatic)) return ffmpegStatic;
  } catch { /* not available */ }

  // Fallback: sistema
  return null;
}

module.exports = {
  iniciarBackend,
  detenerBackend,
  getUserDataPath,
  getUploadsPath,
  obtenerFFmpegPath,
};
