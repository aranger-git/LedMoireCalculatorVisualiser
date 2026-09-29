// 3D view: LED wall, camera with frustum, moiré risk heatmap on the floor, optional plan underlay.
// World: metres. Wall face on z = 0 facing +z, centred on x = 0. Floor at y = 0.
import * as THREE from "three";
import { OrbitControls } from "../vendor/three/OrbitControls.js";

const RISK_RGBA = {
  low: [12, 163, 12, 70],
  moderate: [250, 178, 25, 150],
  high: [208, 59, 59, 170],
};

export function createScene(container, { onFloorClick } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x15161a);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x333333, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(10, 20, 15);
  scene.add(sun);

  const orbitCam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 2000);
  orbitCam.position.set(18, 14, 30);
  const controls = new OrbitControls(orbitCam, renderer.domElement);
  controls.target.set(0, 2, 8);
  controls.maxPolarAngle = Math.PI / 2 - 0.02;
  controls.enableDamping = true;

  // Floor + grid
  const grid = new THREE.GridHelper(400, 400, 0x3a3c44, 0x26282e);
  grid.position.y = 0.001;
  scene.add(grid);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x1b1c20 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Plan underlay
  const planMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
  const plan = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), planMat);
  plan.rotation.x = -Math.PI / 2;
  plan.position.y = 0.004;
  plan.visible = false;
  scene.add(plan);

  // Risk heatmap
  const heatMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
  const heat = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), heatMat);
  heat.rotation.x = -Math.PI / 2;
  heat.position.y = 0.008;
  scene.add(heat);

  // LED wall
  let wallCanvas = document.createElement("canvas");
  let wallTex = new THREE.CanvasTexture(wallCanvas);
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 0.1),
    [
      new THREE.MeshStandardMaterial({ color: 0x111111 }),
      new THREE.MeshStandardMaterial({ color: 0x111111 }),
      new THREE.MeshStandardMaterial({ color: 0x111111 }),
      new THREE.MeshStandardMaterial({ color: 0x111111 }),
      new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 1 }),
      new THREE.MeshStandardMaterial({ color: 0x111111 }),
    ],
  );
  scene.add(wall);

  // Camera model + frustum
  const camRig = new THREE.PerspectiveCamera(10, 16 / 9, 0.05, 2000); // the modelled broadcast camera
  const body = new THREE.Group();
  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.5), new THREE.MeshStandardMaterial({ color: 0x2a78d6 }));
  bodyMesh.position.z = 0.1;
  const lensMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.3, 20), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  lensMesh.rotation.x = Math.PI / 2;
  lensMesh.position.z = -0.28;
  body.add(bodyMesh, lensMesh);
  const tripod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 8), new THREE.MeshStandardMaterial({ color: 0x555555 }));
  scene.add(body, tripod);

  const frustumGeo = new THREE.BufferGeometry();
  frustumGeo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(16 * 3), 3));
  const frustum = new THREE.LineSegments(frustumGeo, new THREE.LineBasicMaterial({ color: 0x8fc1ff }));
  scene.add(frustum);

  let view = "free";
  let lastModel = null;

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    orbitCam.aspect = w / h;
    orbitCam.updateProjectionMatrix();
    if (lastModel) placeCamera(lastModel);
  }
  new ResizeObserver(resize).observe(container);

  function drawWallTexture(m) {
    const { cols, rows } = m.wall;
    const px = 64;
    // A GPU texture can't change size after upload, so each redraw gets a fresh canvas + texture.
    wallCanvas = document.createElement("canvas");
    wallCanvas.width = Math.min(cols * px, 2048);
    wallCanvas.height = Math.min(rows * px, 2048);
    const g = wallCanvas.getContext("2d");
    const grad = g.createLinearGradient(0, 0, wallCanvas.width, wallCanvas.height);
    grad.addColorStop(0, "#1f4fa8");
    grad.addColorStop(0.5, "#7a3fc4");
    grad.addColorStop(1, "#d6542a");
    g.fillStyle = grad;
    g.fillRect(0, 0, wallCanvas.width, wallCanvas.height);
    g.strokeStyle = "rgba(0,0,0,0.45)";
    g.lineWidth = 2;
    const cw = wallCanvas.width / cols;
    const rh = wallCanvas.height / rows;
    for (let c = 1; c < cols; c++) { g.beginPath(); g.moveTo(c * cw, 0); g.lineTo(c * cw, wallCanvas.height); g.stroke(); }
    for (let r = 1; r < rows; r++) { g.beginPath(); g.moveTo(0, r * rh); g.lineTo(wallCanvas.width, r * rh); g.stroke(); }
    g.fillStyle = "rgba(255,255,255,0.9)";
    g.font = `bold ${Math.round(wallCanvas.height / 6)}px system-ui, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(m.wall.label || "", wallCanvas.width / 2, wallCanvas.height / 2);
    wallTex.dispose();
    wallTex = new THREE.CanvasTexture(wallCanvas);
    wallTex.colorSpace = THREE.SRGBColorSpace;
    wall.material[4].emissiveMap = wallTex;
    wall.material[4].needsUpdate = true;
  }

  function placeCamera(m) {
    const { x, y, z, hfovDeg, aspect } = m.cam;
    const aim = new THREE.Vector3(0, m.wall.bottom + m.wall.h / 2, 0);
    camRig.position.set(x, y, z);
    camRig.aspect = aspect;
    camRig.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(hfovDeg) / 2) / aspect));
    camRig.lookAt(aim);
    camRig.updateProjectionMatrix();
    camRig.updateMatrixWorld();

    body.position.copy(camRig.position);
    body.quaternion.copy(camRig.quaternion);
    tripod.scale.y = Math.max(y - 0.15, 0.05);
    tripod.position.set(x, tripod.scale.y / 2, z);

    // Frustum: rays through the four frame corners, clipped on the wall plane (z = 0).
    const th = Math.tan(THREE.MathUtils.degToRad(hfovDeg) / 2);
    const tv = th / aspect;
    const corners = [[-th, -tv], [th, -tv], [th, tv], [-th, tv]].map(([a, b]) => {
      const dir = new THREE.Vector3(a, b, -1).transformDirection(camRig.matrixWorld);
      const t = dir.z < -1e-6 ? -camRig.position.z / dir.z : 200;
      return camRig.position.clone().addScaledVector(dir, Math.min(t, 400));
    });
    const pos = frustumGeo.attributes.position.array;
    let i = 0;
    const push = (v) => { pos[i++] = v.x; pos[i++] = v.y; pos[i++] = v.z; };
    for (const c of corners) { push(camRig.position); push(c); }
    for (let k = 0; k < 4; k++) { push(corners[k]); push(corners[(k + 1) % 4]); }
    frustumGeo.attributes.position.needsUpdate = true;
    frustumGeo.computeBoundingSphere();

    if (view === "camera") {
      const w = container.clientWidth, h = container.clientHeight;
      camRig.aspect = w / h;
      camRig.fov = THREE.MathUtils.radToDeg(2 * Math.atan(th / camRig.aspect));
      camRig.updateProjectionMatrix();
    }
  }

  function setHeatmap(hm) {
    const tex = new THREE.DataTexture(hm.rgba, hm.nx, hm.nz, THREE.RGBAFormat);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    heatMat.map?.dispose();
    heatMat.map = tex;
    heatMat.needsUpdate = true;
    const w = hm.xmax - hm.xmin;
    const d = hm.zmax - hm.zmin;
    heat.scale.set(w, d, 1);
    heat.position.set((hm.xmin + hm.xmax) / 2, 0.008, (hm.zmin + hm.zmax) / 2);
  }

  function update(m) {
    lastModel = m;
    wall.scale.set(m.wall.w, m.wall.h, 1);
    wall.position.set(0, m.wall.bottom + m.wall.h / 2, -0.05);
    drawWallTexture(m);
    placeCamera(m);
    if (m.heat) setHeatmap(m.heat);
  }

  function setPlan(p) {
    if (!p || !p.source) { plan.visible = false; return; }
    if (planMat.map?.image !== p.source) {
      planMat.map?.dispose();
      const tex = new THREE.CanvasTexture(p.source);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      planMat.map = tex;
      planMat.needsUpdate = true;
    }
    const aspect = p.source.height / p.source.width;
    plan.scale.set(p.widthM, p.widthM * aspect, 1);
    plan.position.set(p.offX, 0.004, p.offZ);
    plan.rotation.set(-Math.PI / 2, 0, THREE.MathUtils.degToRad(p.rotDeg));
    planMat.opacity = p.opacity;
    plan.visible = true;
  }

  function setView(v) {
    view = v;
    controls.enabled = v === "free";
    // From the camera's own position its body and lens would block the view.
    body.visible = tripod.visible = frustum.visible = v === "free";
    if (lastModel) placeCamera(lastModel);
  }

  // Click on the floor (not a drag) places the camera.
  const ray = new THREE.Raycaster();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let down = null;
  renderer.domElement.addEventListener("pointerdown", (e) => (down = { x: e.clientX, y: e.clientY }));
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!down || view !== "free") return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 5 || !onFloorClick) return;
    const r = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, orbitCam);
    const hit = new THREE.Vector3();
    if (ray.ray.intersectPlane(floorPlane, hit) && hit.z > 0.5) onFloorClick(hit.x, hit.z);
  });

  function frame(m) {
    // Fit wall and camera in the orbit view.
    const z = m.cam.z;
    orbitCam.position.set(Math.max(z * 0.6, 8), Math.max(z * 0.5, 6), z * 1.25 + 6);
    controls.target.set(0, m.wall.bottom + m.wall.h / 3, z * 0.45);
    controls.update();
  }

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, view === "camera" ? camRig : orbitCam);
  });

  return { update, setPlan, setView, frame, RISK_RGBA };
}

// Builds the RGBA grid for the floor heatmap. evaluate(x, z) returns a level string.
// Texture row 0 sits at v = 0, which lands on the far edge (zmax) once the plane is laid flat.
export function buildHeatmap({ xmin, xmax, zmin, zmax, nx, nz }, evaluate) {
  const rgba = new Uint8Array(nx * nz * 4);
  for (let j = 0; j < nz; j++) {
    const z = zmax - ((j + 0.5) / nz) * (zmax - zmin);
    for (let i = 0; i < nx; i++) {
      const x = xmin + ((i + 0.5) / nx) * (xmax - xmin);
      const c = RISK_RGBA[evaluate(x, z)];
      rgba.set(c, (j * nx + i) * 4);
    }
  }
  return { rgba, nx, nz, xmin, xmax, zmin, zmax };
}
