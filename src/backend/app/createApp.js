// ============================================================
// Backend Express completo para Electron Desktop.
// Incluye: auth, estaciones, streaming placeholder, y frontend.
// Usa better-sqlite3 para BD local.
// ============================================================

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

let db = null;
let JWT_SECRET = null;

/**
 * Crea y configura la aplicación Express con todas las rutas.
 * @param {object} options - { dataPath, uploadsPath, ffmpegPath, jwtSecret }
 * @returns {express.Application}
 */
function createApp({ dataPath, uploadsPath, ffmpegPath, jwtSecret }) {
  JWT_SECRET = jwtSecret;
  const app = express();

  // Middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Servir archivos subidos
  app.use("/uploads", express.static(uploadsPath));

  // Inicializar base de datos
  inicializarDB(dataPath);

  // ---- Rutas ----
  app.get("/api/health", (req, res) => {
    res.json({
      ok: true,
      servicio: "PANEL RADIO ONLINE (Desktop)",
      version: require("../../../package.json").version,
      modo: "electron",
      ts: Date.now(),
    });
  });

  // === AUTH ===
  app.post("/api/auth/login", (req, res) => {
    const { usuario, clave } = req.body || {};
    if (!usuario || !clave) {
      return res.status(400).json({ mensaje: "Usuario y contraseña requeridos." });
    }

    const user = db.prepare("SELECT * FROM usuarios WHERE usuario = ?").get(usuario);
    if (!user) {
      return res.status(401).json({ mensaje: "Credenciales incorrectas." });
    }

    const ok = bcrypt.compareSync(clave, user.clave_hash);
    if (!ok) {
      return res.status(401).json({ mensaje: "Credenciales incorrectas." });
    }

    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, rol: user.rol },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      usuario: {
        id: user.id,
        usuario: user.usuario,
        nombre: user.nombre,
        rol: user.rol,
        plan: user.plan || "Pro",
        maxEstaciones: user.max_estaciones || 5,
        enTrial: false,
        licenciaActiva: true,
      },
    });
  });

  app.post("/api/auth/registro", (req, res) => {
    const { usuario, nombre, clave } = req.body || {};
    if (!usuario || !clave || !nombre) {
      return res.status(400).json({ mensaje: "Usuario, nombre y contraseña requeridos." });
    }

    const existe = db.prepare("SELECT id FROM usuarios WHERE usuario = ?").get(usuario);
    if (existe) {
      return res.status(409).json({ mensaje: "El usuario ya existe." });
    }

    const hash = bcrypt.hashSync(clave, 10);
    const id = require("crypto").randomUUID();
    db.prepare(
      "INSERT INTO usuarios (id, usuario, nombre, clave_hash, rol, plan, max_estaciones) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, usuario, nombre, hash, "usuario", "Pro", 5);

    const token = jwt.sign(
      { id, usuario, rol: "usuario" },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      token,
      usuario: {
        id,
        usuario,
        nombre,
        rol: "usuario",
        plan: "Pro",
        maxEstaciones: 5,
        enTrial: false,
        licenciaActiva: true,
      },
    });
  });

  app.get("/api/auth/perfil", requiereAuth, (req, res) => {
    const user = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(req.usuario.id);
    if (!user) return res.status(404).json({ mensaje: "Usuario no encontrado." });
    res.json({
      id: user.id,
      usuario: user.usuario,
      nombre: user.nombre,
      rol: user.rol,
      plan: user.plan || "Pro",
      maxEstaciones: user.max_estaciones || 5,
      enTrial: false,
      licenciaActiva: true,
    });
  });

  // === ESTACIONES ===
  app.get("/api/estaciones", requiereAuth, (req, res) => {
    const estaciones = db.prepare("SELECT * FROM estaciones WHERE usuario_id = ?").all(req.usuario.id);
    res.json(estaciones);
  });

  app.post("/api/estaciones", requiereAuth, (req, res) => {
    const { nombre, host, puerto, montaje, usuario, password, bitrate, formato } = req.body || {};
    if (!nombre) return res.status(400).json({ mensaje: "Nombre requerido." });

    const id = require("crypto").randomUUID();
    db.prepare(`
      INSERT INTO estaciones (id, usuario_id, nombre, host, puerto, montaje, source_user, source_pass, bitrate, formato, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.usuario.id, nombre, host || "", puerto || 8000, montaje || "/stream",
      usuario || "source", password || "", bitrate || 128, formato || "audio/mpeg", "offline");

    const estacion = db.prepare("SELECT * FROM estaciones WHERE id = ?").get(id);
    res.status(201).json(estacion);
  });

  app.put("/api/estaciones/:id", requiereAuth, (req, res) => {
    const { nombre, host, puerto, montaje, usuario, password, bitrate, formato } = req.body || {};
    db.prepare(`
      UPDATE estaciones SET nombre=?, host=?, puerto=?, montaje=?, source_user=?, source_pass=?, bitrate=?, formato=?
      WHERE id=? AND usuario_id=?
    `).run(nombre, host, puerto, montaje, usuario, password, bitrate, formato, req.params.id, req.usuario.id);

    const estacion = db.prepare("SELECT * FROM estaciones WHERE id = ?").get(req.params.id);
    res.json(estacion);
  });

  app.post("/api/estaciones/:id/iniciar", requiereAuth, (req, res) => {
    db.prepare("UPDATE estaciones SET estado = 'online' WHERE id = ?").run(req.params.id);
    const est = db.prepare("SELECT * FROM estaciones WHERE id = ?").get(req.params.id);
    res.json(est);
  });

  app.post("/api/estaciones/:id/detener", requiereAuth, (req, res) => {
    db.prepare("UPDATE estaciones SET estado = 'offline' WHERE id = ?").run(req.params.id);
    const est = db.prepare("SELECT * FROM estaciones WHERE id = ?").get(req.params.id);
    res.json(est);
  });

  app.delete("/api/estaciones/:id", requiereAuth, (req, res) => {
    db.prepare("DELETE FROM estaciones WHERE id = ? AND usuario_id = ?").run(req.params.id, req.usuario.id);
    res.json({ ok: true });
  });

  // === STREAMING (placeholder — conecta con icecastEncoder si está disponible) ===
  app.post("/api/streaming/test", requiereAuth, (req, res) => {
    // En desktop, el test real requiere las funciones del encoder
    res.json({ ok: true, mensaje: "Test simulado en modo desktop. Configura el servidor para transmitir." });
  });

  app.post("/api/streaming/conectar", requiereAuth, (req, res) => {
    res.json({ ok: true, mensaje: "Conexión iniciada." });
  });

  app.post("/api/streaming/desconectar", requiereAuth, (req, res) => {
    res.json({ ok: true, mensaje: "Desconectado." });
  });

  app.get("/api/streaming/estado/:estacionId", requiereAuth, (req, res) => {
    res.json({ conectado: false, estado: "desconectado", bytesEnviados: 0, duracion: 0 });
  });

  // === AUTODJ / SAMPLES ===
  app.get("/api/autodj/canciones", requiereAuth, (req, res) => {
    const canciones = db.prepare("SELECT * FROM canciones WHERE usuario_id = ? ORDER BY titulo").all(req.usuario.id);
    res.json(canciones);
  });

  app.post("/api/samples/subir", requiereAuth, (req, res) => {
    res.json({ ok: true, mensaje: "Subida procesada." });
  });

  // === ESTADÍSTICAS ===
  app.get("/api/estadisticas", requiereAuth, (req, res) => {
    res.json({ oyentes: 0, pico: 0, horasAlAire: 0, canciones: 0 });
  });

  // === LICENCIAS / PLANES ===
  app.get("/api/licencias/planes", (req, res) => {
    res.json([
      { id: "starter", nombre: "Starter", precio: 0, maxEstaciones: 1, bitrate: 128 },
      { id: "pro", nombre: "Pro", precio: 9.99, maxEstaciones: 5, bitrate: 320 },
      { id: "enterprise", nombre: "Enterprise", precio: 29.99, maxEstaciones: 20, bitrate: 320 },
    ]);
  });

  // === MENSAJES ===
  app.get("/api/mensajes", requiereAuth, (req, res) => {
    res.json([]);
  });

  // 404 para API
  app.use("/api", (req, res) => {
    res.status(404).json({ mensaje: "Recurso no encontrado." });
  });

  // Servir frontend compilado (renderer/dist)
  const rendererDist = path.join(__dirname, "../../../renderer/dist");
  if (fs.existsSync(rendererDist)) {
    app.use(express.static(rendererDist));
    app.get(/^(?!\/api|\/ws).*/, (req, res) => {
      res.sendFile(path.join(rendererDist, "index.html"));
    });
  }

  return app;
}

// ---- Helpers ----

function requiereAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ mensaje: "Token requerido." });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = payload;
    next();
  } catch {
    return res.status(401).json({ mensaje: "Token inválido o expirado." });
  }
}

function inicializarDB(dataPath) {
  const Database = require("better-sqlite3");
  const dbPath = path.join(dataPath, "panel-radio.db");
  db = new Database(dbPath);

  // Crear tablas si no existen
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      usuario TEXT UNIQUE NOT NULL,
      nombre TEXT NOT NULL,
      clave_hash TEXT NOT NULL,
      rol TEXT DEFAULT 'usuario',
      plan TEXT DEFAULT 'Pro',
      max_estaciones INTEGER DEFAULT 5,
      creado TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS estaciones (
      id TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL,
      nombre TEXT NOT NULL,
      host TEXT DEFAULT '',
      puerto INTEGER DEFAULT 8000,
      montaje TEXT DEFAULT '/stream',
      source_user TEXT DEFAULT 'source',
      source_pass TEXT DEFAULT '',
      bitrate INTEGER DEFAULT 128,
      formato TEXT DEFAULT 'audio/mpeg',
      estado TEXT DEFAULT 'offline',
      oyentesActuales INTEGER DEFAULT 0,
      picoOyentes INTEGER DEFAULT 0,
      oyentesMaximos INTEGER DEFAULT 100,
      cancionActual TEXT DEFAULT '',
      uptime TEXT DEFAULT '',
      creado TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS canciones (
      id TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL,
      titulo TEXT NOT NULL,
      artista TEXT DEFAULT '',
      album TEXT DEFAULT '',
      duracion INTEGER DEFAULT 0,
      archivo TEXT DEFAULT '',
      creado TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );
  `);

  // Crear usuario admin si no existe
  const admin = db.prepare("SELECT id FROM usuarios WHERE usuario = 'admin'").get();
  if (!admin) {
    const id = require("crypto").randomUUID();
    const hash = bcrypt.hashSync("admin123", 10);
    db.prepare(
      "INSERT INTO usuarios (id, usuario, nombre, clave_hash, rol, plan, max_estaciones) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, "admin", "Administrador", hash, "superadmin", "Enterprise", 20);
    console.log("Usuario admin creado (admin / admin123)");
  }
}

module.exports = createApp;
