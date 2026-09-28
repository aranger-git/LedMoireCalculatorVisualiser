# LED Moiré Calculator & Visualiser

A browser tool from **Ranger Son Éclairage** that answers one question before load-in:

> "Will this camera moiré on that LED wall, from that position, with that lens?"

It's for sales (setting client expectations), for techs (placing cameras) and for clients (a link we can put in a proposal).

## Status

🚧 **Setup only.** The v1 calculator and 3D view are next.

## Planned v1

1. **Calculator.** Enter LED pitch, camera sensor, resolution, focal length, distance and aperture. It compares how big one LED pixel lands on the sensor with one camera pixel and gives a moiré risk rating.
2. **3D view.** Shows the wall and the camera position with green, yellow or red risk zones as you move the camera.
3. **Moiré preview.** Simulates the two grids interfering so clients can see the effect.
4. **Client mode.** A simplified FR/EN view to share from proposals.
5. **Later.** Refresh rate vs. shutter (scan lines) and a picker for RSE's LED inventory.

## How it's built

- Plain HTML, CSS and JavaScript with **no build step**. You can open `index.html` directly in a browser.
- The 3D view will use [Three.js](https://threejs.org/), loaded from a CDN.
- It will be hosted free on **GitHub Pages**.

## Folder layout

```
index.html          ← the app's main page
css/style.css       ← styles
js/main.js          ← app logic
data/led-tiles.json ← LED tiles (pitch, panel size) — edit to match RSE inventory
data/cameras.json   ← camera bodies (sensor size, resolution)
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
