// Entry point. For now: confirm the data files load.
async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

(async () => {
  const status = document.getElementById("data-status");
  try {
    const [tiles, cameras] = await Promise.all([
      loadJSON("data/led-tiles.json"),
      loadJSON("data/cameras.json"),
    ]);
    status.textContent = `✅ ${tiles.tiles.length} tuiles LED · ${cameras.cameras.length} caméras chargées`;
  } catch (err) {
    status.textContent = "⚠️ Données non chargées — voir README (serveur local).";
    console.error(err);
  }
})();
