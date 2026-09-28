# LED Moiré Calculator & Visualiser

A browser tool from **Ranger Son Éclairage** that answers one question before load-in:

> "Will this camera moiré on that LED wall, from that position, with that lens?"

It's for sales (setting client expectations), for techs (placing cameras) and for clients (a link we can put in a proposal).

## Status

✅ **v1 calculator is live in `index.html`:**
- Pick the LED wall, camera and lens (RSE stock is marked ★), then set focal length, distance, aperture and how far the subject stands in front of the wall.
- It gives a moiré risk rating (Low / Possible / High) and the numbers behind it: LED pixel size on the sensor, wall blur, moiré contrast.
- A simulated camera preview shows what the sensor records.
- A risk curve shows risk by distance or by focal length. Click the curve to jump to that setting.
- Copy link saves the whole setup in the URL, so it can go into an email or a proposal.
- FR / EN toggle.

⚠️ The risk thresholds (6 % / 25 %) and lens sharpness are **provisional**. Calibrate against a real wall with the PMW-400L before promising a client anything.

## Next

1. 3D view: wall and camera position, with the risk zones on the floor plan.
2. Simplified client mode.
3. Refresh rate vs. shutter (scan lines).

## How it's built

- Plain HTML, CSS and JavaScript with **no build step**. You can open `index.html` directly in a browser.
- The 3D view will use [Three.js](https://threejs.org/), loaded from a CDN.
- It will be hosted free on **GitHub Pages**.

## Folder layout

```
index.html          ← the app's main page
css/style.css       ← styles
js/moire.js         ← the physics (optics, sampling, risk)
js/main.js          ← the interface
data/led-tiles.json ← LED tiles (pitch, panel size) — edit to match RSE inventory
data/cameras.json   ← camera bodies (sensor size, resolution)
data/lenses.json    ← lenses (zoom range, aperture, extender)
docs/               ← guides (start with docs/GITHUB-GUIDE.md)
```

## Editing the data

The LED and camera lists are plain JSON files. Anyone on the team can update them straight on github.com: open the file, click the ✏️ pencil icon, edit it and click **Commit changes**. There's no code involved.

## Running it locally

Double-click `index.html`. If your browser blocks the data files from loading, run this from the project folder instead:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.
