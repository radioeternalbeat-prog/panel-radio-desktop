# Panel Radio Online — Desktop App

Aplicacion de escritorio para **Panel Radio Online** construida con Electron. Empaqueta el backend Express + SQLite y el frontend React en una sola app que funciona offline y online.

## Arquitectura

```
panel-radio-desktop/
├── src/
│   ├── main.js              ← Proceso principal Electron
│   ├── preload.js           ← Bridge IPC (contextBridge)
│   ├── tray.js              ← Tray icon con controles
│   ├── updater.js           ← Auto-updater (GitHub Releases)
│   ├── network.js           ← Deteccion de conectividad
│   ├── ipc/
│   │   └── handlers.js      ← IPC handlers (archivos, dialogos, etc.)
│   └── backend/
│       ├── server.js         ← Arranca Express embebido
│       └── app/
│           ├── createApp.js  ← Express app (integrar rutas del repo web)
│           └── websockets.js ← WebSocket /ws y /ws-stream
├── renderer/                 ← Frontend React (clonado del repo web)
├── resources/
│   ├── ffmpeg/              ← Binarios FFmpeg por plataforma
│   └── data/                ← Datos iniciales (schemas, seeds)
├── build/                   ← Iconos para electron-builder
├── scripts/
│   ├── setup-renderer.sh   ← Clona y configura frontend
│   └── download-ffmpeg.sh  ← Descarga binarios FFmpeg
└── package.json             ← Config Electron + electron-builder
```

## Requisitos

- Node.js 20+
- npm 9+
- Git

## Setup rapido

```bash
# 1. Clonar este repo
git clone https://github.com/radioeternalbeat-prog/panel-radio-desktop.git
cd panel-radio-desktop

# 2. Instalar dependencias del main process
npm install

# 3. Configurar el frontend (clona el repo web en /renderer)
bash scripts/setup-renderer.sh

# 4. (Opcional) Descargar FFmpeg para empaquetado
bash scripts/download-ffmpeg.sh
```

## Desarrollo

```bash
# Modo desarrollo: frontend con HMR + Electron
npm run dev
```

Esto arranca:
1. Vite dev server en `localhost:5173` (renderer)
2. Electron cargando `localhost:5173`
3. Backend Express en un puerto dinamico (auto-asignado)

## Build (Produccion)

```bash
# Compilar frontend
npm run build:renderer

# Build Windows
npm run build:win

# Build macOS
npm run build:mac

# Build ambos
npm run build:all
```

Los instaladores se generan en `dist-electron/`.

## Modos de operacion

### Modo Offline
- Base de datos SQLite local (userData)
- Mezclador DJ completo con Web Audio
- Playlists y biblioteca de musica local
- Soundboard con efectos
- Drag & drop de archivos MP3 del sistema
- FFmpeg integrado para transcoding

### Modo Online (cuando hay internet)
- Streaming a Icecast/Centova/SHOUTcast/AzuraCast
- Estadisticas en tiempo real
- Mensajes de WhatsApp
- Sincronizacion de datos
- Actualizaciones automaticas

## Tray Icon

Al minimizar la ventana, la app se oculta en la bandeja del sistema con controles:
- Play / Pause
- Stop
- Mute / Unmute
- Mostrar Panel
- Salir

## Auto-Updater

Las actualizaciones se publican como GitHub Releases. La app verifica automaticamente cada 4 horas y al iniciar (despues de 10s). Si hay una actualizacion, se descarga en background y se instala al cerrar.

Para publicar una actualizacion:
```bash
# Incrementar version en package.json
npm version patch

# Build y publicar
npm run build:all
# Subir los archivos de dist-electron/ como GitHub Release
```

## Stack

- **Electron 32** — Shell de escritorio
- **React 19** — Frontend (mismo que la version web)
- **Express 4** — Backend embebido
- **SQLite** (better-sqlite3) — Base de datos local
- **FFmpeg** — Transcoding audio WebM → MP3
- **electron-builder** — Empaquetado Win/Mac
- **electron-updater** — Actualizaciones automaticas

## Integracion con el repo web

Este proyecto reutiliza el codigo de:
- Frontend: https://github.com/radioeternalbeat-prog/PANEL-RADIO-ON-LINE-
- Backend: las rutas y servicios del directorio `server/` del mismo repo

El script `setup-renderer.sh` clona el frontend. Para el backend, copia los archivos del directorio `server/src/` del repo web a `src/backend/app/` y adapta los imports.

## Licencia

MIT - Eternal Beat Medios
