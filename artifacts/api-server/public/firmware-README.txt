OTA Firmware Files
==================

Place your compiled firmware binary here as:
  firmware.bin

To build it:
  Arduino IDE > Sketch > Export Compiled Binary
  Copy the .bin file here, rename to firmware.bin

When shipping a new firmware version:
  1. Replace firmware.bin with the new build
  2. Update version.txt to match FIRMWARE_VERSION in config.h
  3. Redeploy the server

Both files are served publicly at:
  /version.txt
  /firmware.bin

No authentication is required (by design - the ESP32 needs plain HTTP/HTTPS access).
