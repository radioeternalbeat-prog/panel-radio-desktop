// ============================================================
// Panel Radio Online — Electron Main Process
// Arranca el backend Express embebido, crea la ventana principal,
// configura tray icon, auto-updater y maneja IPC.
// ============================================================

const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const log = require("electron-log");

const { iniciarBackend, detenerBackend } = require("./backend/server");
const { crearTray, destruirTray } = require("./tray");
const { configurarAutoUpdater } = require("./updater");
const { registrarIPCHandlers } = require("./ipc/handlers");
const { obtenerEstadoRed } = require("./network");

// Logs
log.transports.file.level = "info";
log.transports.console.level = "debug";
log.info("Panel Radio Desktop iniciando...");

// Prevenir múltiples instancias
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;
let backendPort = null;
const isDev = !app.isPackaged;

// Paths
const PRELOAD_PATH = path.join(__dirname, "preload.js");
const RENDERER_DEV_URL = "http://localhost:5173";
const RENDERER_PROD_PATH = path.join(__dirname, "../renderer/dist/index.html");

function crearVentana() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "Panel Radio Online",
    icon: path.join(__dirname, "../build/icon.png"),
    webPreferences: {
      preload: PRELOAD_PATH,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Necesario para acceder a fs vía preload
      devTools: isDev, // Solo en desarrollo
    },
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    backgroundColor: "#121214",
    show: false,
  });

  // Cargar frontend
  if (isDev) {
    mainWindow.loadURL(RENDERER_DEV_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(RENDERER_PROD_PATH);
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    log.info("Ventana principal visible");
  });

  // Prevenir cierre — minimizar a tray
  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

async function iniciarApp() {
  try {
    // 1. Iniciar backend Express embebido
    backendPort = await iniciarBackend();
    log.info(`Backend corriendo en puerto ${backendPort}`);

    // 2. Crear ventana
    crearVentana();

    // 3. Crear tray icon
    crearTray(mainWindow);

    // 4. Registrar IPC handlers
    registrarIPCHandlers(mainWindow);

    // 5. Auto-updater (solo en producción)
    if (!isDev) {
      configurarAutoUpdater(mainWindow);
    }

    // 6. Enviar puerto del backend al renderer
    mainWindow.webContents.on("did-finish-load", () => {
      mainWindow.webContents.send("backend-port", backendPort);
      mainWindow.webContents.send("network-status", obtenerEstadoRed());
    });

  } catch (err) {
    log.error("Error fatal al iniciar:", err);
    dialog.showErrorBox(
      "Error al iniciar Panel Radio Online",
      `No se pudo iniciar la aplicación:\n${err.message}\n\nLa aplicación se cerrará.`
    );
    app.quit();
  }
}

// App ready
app.whenReady().then(iniciarApp);

// macOS: re-crear ventana al hacer clic en el dock
app.on("activate", () => {
  if (mainWindow === null) {
    crearVentana();
  } else {
    mainWindow.show();
  }
});

// Segunda instancia: mostrar ventana existente
app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// Antes de cerrar: detener backend
app.on("before-quit", async () => {
  app.isQuitting = true;
  destruirTray();
  await detenerBackend();
  log.info("App cerrándose limpiamente");
});

// Cerrar en Windows/Linux cuando todas las ventanas se cierran
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Seguridad: prevenir navegación externa
app.on("web-contents-created", (_, contents) => {
  contents.on("will-navigate", (event, url) => {
    if (!url.startsWith("http://localhost") && !url.startsWith("file://")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
});
