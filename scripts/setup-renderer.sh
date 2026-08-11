#!/bin/bash
# ============================================================
# Setup Renderer — Clona y configura el frontend React
# desde el repositorio web de Panel Radio Online.
# ============================================================

set -e

REPO_URL="https://github.com/radioeternalbeat-prog/PANEL-RADIO-ON-LINE-.git"
RENDERER_DIR="renderer"

echo "Configurando frontend (renderer)..."

# Si ya existe, hacer pull
if [ -d "$RENDERER_DIR/.git" ]; then
  echo "Renderer ya existe. Actualizando..."
  cd "$RENDERER_DIR" && git pull && cd ..
else
  # Clonar solo el frontend (sin historial profundo)
  echo "Clonando frontend desde $REPO_URL..."
  git clone --depth 1 "$REPO_URL" "$RENDERER_DIR"
fi

# Instalar dependencias del renderer
echo "Instalando dependencias del renderer..."
cd "$RENDERER_DIR" && npm install

# Agregar variable de entorno para modo Electron
echo "VITE_ELECTRON=true" > .env.local

echo "Setup completado. Ejecuta 'npm run build:renderer' para compilar."
