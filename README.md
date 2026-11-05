# Monochrome — B&W Camera

A mobile-first, framework-free, Material Design 3–inspired black-and-white camera progressive web app.

## Features

- Automatically adapts to system light/dark theme
- Rear camera preference, camera switching and permission/error recovery
- Black-and-white live preview and matching full-resolution captures
- Classic, Soft, Punchy, Noir presets plus contrast/brightness adjustments
- Rule-of-thirds grid
- Photo review with download and delete
- JPEG and PNG exports; JPEG quality setting
- Optional local gallery using IndexedDB (photos never leave the device)
- Installable PWA with offline assets and accessible labels/focus styling

## Publish on GitHub Pages

1. Add the files in this folder to the **root** of a GitHub repository (keep `assets/`).
2. Open **Settings → Pages** and set **Deploy from a branch**, branch `main`, folder `/(root)`, then save.
3. Visit `https://YOUR-USERNAME.github.io/YOUR-REPO/` once GitHub Pages has deployed.
4. On Android/Chrome, use the browser menu → **Install app** / **Add to Home screen**.

You can also publish this folder via GitHub Actions or another static HTTPS host. No build step, account or API key is required. All service worker URLs are relative to the app, so project subpaths work correctly.

## Run locally

Camera access needs HTTPS or localhost. Start a local server from this folder, e.g. `python -m http.server 8000`, then open `http://localhost:8000/` on the same computer. Opening `index.html` directly from disk may block camera/PWA features. To test on an Android phone, deploy over HTTPS (GitHub Pages is recommended).

## Photo privacy and storage

- Photo capture and image processing run locally; photos are not transmitted to a server.
- When **Save to local gallery** is on, photos are saved in this browser's IndexedDB. You can turn the setting off. Downloaded files go to the browser/device's download location.
- Clearing browser/site data, private browsing sessions or storage eviction can erase gallery photos. **Download important photos** for a durable copy.
- Browser storage quotas vary; if storage fails, review remains available so you can download the photo.
- Camera permission must be granted in the browser. Other apps may prevent the camera from opening.

## Implementation notes

The viewfinder uses CSS grayscale/contrast/brightness filters. The capture canvas uses matching Canvas 2D filters for export. Capture uses the camera stream's full native frame (no misleading square crop). The gallery's stored images are full resolution, so storage may fill quickly with many large PNG files.

## Files

- `index.html` — semantic accessible UI
- `styles.css` — responsive adaptive Material 3–inspired design tokens
- `app.js` — camera lifecycle, adjustments, capture and IndexedDB gallery
- `manifest.webmanifest` — app install metadata
- `service-worker.js` — subpath-safe offline asset caching
- `assets/` — PWA icons

## Landscape orientation (v3)

The interface automatically arranges the viewfinder on the left and camera controls on the right when the phone rotates. Portrait ratios adapt to landscape (3:4 becomes 4:3; 9:16 becomes 16:9), and image export follows the selected viewfinder crop. Landscape works in a regular browser tab and the installed PWA. If orientation does not rotate, check your phone's system rotation-lock setting.
