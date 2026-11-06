# Monochrome Camera

A standalone, responsive B&W camera Progressive Web App, suitable for static hosting on GitHub Pages.

## Deploy

Upload these files to the root of a GitHub repository, then enable **Settings → Pages → Deploy from a branch → main / (root)**. Open the resulting HTTPS URL on your phone; grant camera permission. You can optionally add it to your home screen.

## Features

- Adaptive portrait/landscape layout, with a vertical control rail in landscape.
- Actual 1:1, 3:4, 9:16 and full-sensor aspect-ratio preview and matching crop on capture.
- Black-and-white looks, brightness, contrast, grid, JPEG/PNG, and JPEG quality.
- Automatically mirrored front-camera preview **and saved photo** by default; rear camera is unmirrored.
- Automatic download after capture is enabled by default. Filename includes local timestamp.
- Session gallery with review, manual download, and removal from gallery.
- Browser-local settings, keyboard focus indicators, descriptive controls, reduced-motion support, and live status messages.

## Browser limitations

Camera access requires HTTPS (GitHub Pages qualifies) or localhost, and a browser supporting `getUserMedia`. The browser chooses the physical camera and resolution; the Full setting reflects the stream's actual resolution and aspect ratio. Photos are JPEG or PNG made from the video stream, not a native camera still-photo API; maximum resolution depends on the browser/device stream. Browser download settings ultimately determine whether photos go directly to Downloads, prompt for a directory, or require user interaction. Some mobile browsers restrict multiple automatic downloads. The in-app gallery is in-memory for the current tab session, not permanent; save files to Downloads to keep them. The service worker caches the app shell, not photographs.

## Privacy

Camera processing is local in the browser; this project does not upload photographs or use an analytics service.
