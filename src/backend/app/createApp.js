// ============================================================
// Crea la instancia de Express adaptada para Electron.
// Esta es la versión embebida del backend de PANEL-RADIO-ON-LINE-.
//
// Para integrar: copia el backend del repo web aquí y adapta los imports.
// Este archivo actúa como punto de entrada que configura Express
// con las mismas rutas pero usando paths locales.
// ============================================================

const express = require("express");
const cors = require("cors");
const path = require("path");

/**
 * Crea y configura la aplicación Express.
 * @param {object} options - { dataPath, uploadsPath, ffmpegPath }
 * @returns {express.Application}
 */
function createApp({ dataPath, uploadsPath, ffmpegPath }) {
  const app = express();

  // Middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Servir archivos subidos (samples, música)
  app.use("/uploads", express.static(uploadsPath));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({
      ok: true,
      servicio: "PANEL RADIO ONLINE (Desktop)",
      version: require("../../../package.json").version,
      modo: "electron",
      ts: Date.now(),
    });
  });

  // ============================================================
  // INTEGRACIÓN DEL BACKEND:
  //
  // Aquí se deben importar las rutas del backend del repo web:
  //   - auth.routes.js
  //   - estaciones.routes.js
  //   - streaming.routes.js
  //   - autodj.routes.js
  //   - estadisticas.routes.js
  //   - etc.
  //
  // Para integrar, ejecuta el script setup:
  //   npm run setup:backend
  //
  // Esto copia y adapta las rutas del repositorio web.
  // ============================================================

  // Placeholder: rutas se agregan al integrar el backend completo
  app.get("/api/status", (req, res) => {
    res.json({
      ok: true,
      mensaje: "Backend Electron listo. Integra las rutas del repo web para funcionalidad completa.",
      dataPath,
      uploadsPath,
      ffmpegDisponible: !!ffmpegPath,
    });
  });

  // 404 para API
  app.use("/api", (req, res) => {
    res.status(404).json({ mensaje: "Recurso no encontrado." });
  });

  // Servir frontend compilado (renderer/dist)
  const rendererDist = path.join(__dirname, "../../../renderer/dist");
  const { existsSync } = require("fs");
  if (existsSync(rendererDist)) {
    app.use(express.static(rendererDist));
    app.get(/^(?!\/api|\/ws).*/, (req, res) => {
      res.sendFile(path.join(rendererDist, "index.html"));
    });
  }

  return app;
}

module.exports = createApp;
