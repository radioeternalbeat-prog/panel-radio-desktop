#!/bin/bash
# ============================================================
# Download FFmpeg — Descarga binarios para empaquetar
# ============================================================

set -e

FFMPEG_VERSION="7.0"
RESOURCES_DIR="resources/ffmpeg"

echo "Descargando FFmpeg para empaquetado..."

mkdir -p "$RESOURCES_DIR/win" "$RESOURCES_DIR/mac"

# Windows
if [ ! -f "$RESOURCES_DIR/win/ffmpeg.exe" ]; then
  echo "Descargando FFmpeg para Windows..."
  curl -L -o /tmp/ffmpeg-win.zip \
    "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
  unzip -j /tmp/ffmpeg-win.zip "*/bin/ffmpeg.exe" -d "$RESOURCES_DIR/win/" 2>/dev/null || true
  rm -f /tmp/ffmpeg-win.zip
  echo "FFmpeg Windows descargado."
else
  echo "FFmpeg Windows ya existe."
fi

# macOS
if [ ! -f "$RESOURCES_DIR/mac/ffmpeg" ]; then
  echo "Descargando FFmpeg para macOS..."
  curl -L -o "$RESOURCES_DIR/mac/ffmpeg" \
    "https://evermeet.cx/ffmpeg/ffmpeg-${FFMPEG_VERSION}.7z" 2>/dev/null || \
  echo "Descarga macOS requiere 7z o descargar manualmente de https://evermeet.cx/ffmpeg/"
  chmod +x "$RESOURCES_DIR/mac/ffmpeg" 2>/dev/null || true
  echo "FFmpeg macOS descargado."
else
  echo "FFmpeg macOS ya existe."
fi

echo "Listo. Binarios en $RESOURCES_DIR/"
