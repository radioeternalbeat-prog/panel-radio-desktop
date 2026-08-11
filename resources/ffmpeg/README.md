# FFmpeg Binaries

Place platform-specific FFmpeg binaries here:

- `win/ffmpeg.exe` — Windows x64
- `mac/ffmpeg` — macOS (universal or x64)

These get bundled into the app via electron-builder's `extraResources`.

## Download

- Windows: https://github.com/BtbN/FFmpeg-Builds/releases (ffmpeg-master-latest-win64-gpl.zip)
- macOS: https://evermeet.cx/ffmpeg/ or `brew install ffmpeg` and copy the binary

Place only the `ffmpeg` executable (not the entire archive).
