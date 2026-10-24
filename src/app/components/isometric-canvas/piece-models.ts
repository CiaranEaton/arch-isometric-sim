import * as THREE from 'three';

/** Silueta reconocible de cada pieza. */
export type ModelKind =
  | 'user'
  | 'browser'
  | 'swatches'
  | 'rack'
  | 'database'
  | 'shield'
  | 'container'
  | 'cloud'
  | 'globe'
  | 'gear'
  | 'repo';

export interface PieceModel {
  group: THREE.Group;
  /** Todos los materiales de la pieza: el canvas anima su opacidad y brillo (el logo se suma al cargar). */
  materials: THREE.Material[];
}

/* ───────────────────────── Qué modelo usa cada opción ───────────────────────── */

const KIND_BY_OPTION: Record<string, ModelKind> = {
  // hosting en la nube / edge
  vercel: 'cloud',
  netlify: 'cloud',
  cloudflare_pages: 'cloud',
  static_pages: 'cloud',
  railway: 'cloud',
  // contenedores
  docker_k8s: 'container',
  docker_compose: 'container',
  aws_ecs: 'container',
  coolify: 'container',
  // servidor virtual
  hostinger_vps: 'rack'
};

const KIND_BY_CATEGORY: Record<string, ModelKind> = {
  client: 'user',
  frontend: 'browser',
  styling: 'swatches',
  backend: 'rack',
  database: 'database',
  auth: 'shield',
  devops: 'container',
  domain: 'globe',
  cicd: 'gear',
  system: 'repo'
};

export const modelKindFor = (category: string, optionId: string): ModelKind =>
  KIND_BY_OPTION[optionId] ?? KIND_BY_CATEGORY[category] ?? 'container';

/* ───────────────────────── Logos (decal sobre la pieza) ───────────────────────── */

const logoCache = new Map<string, Promise<THREE.Texture | null>>();

/** Descarga el ícono, lo dibuja sobre una placa clara (se lee en cualquier fondo) y lo cachea. */
function loadLogo(url: string): Promise<THREE.Texture | null> {
  let promise = logoCache.get(url);
  if (!promise) {
    promise = new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        ctx.beginPath();
        ctx.roundRect(8, 8, size - 16, size - 16, 44);
        ctx.fill();

        const iw = img.naturalWidth || size;
        const ih = img.naturalHeight || size;
        const k = Math.min((size * 0.68) / iw, (size * 0.68) / ih);
        ctx.drawImage(img, (size - iw * k) / 2, (size - ih * k) / 2, iw * k, ih * k);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        resolve(texture);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
    logoCache.set(url, promise);
  }
  return promise;
}

function addLogo(
  group: THREE.Group,
  materials: THREE.Material[],
  url: string | undefined,
  x: number,
  y: number,
  z: number,
  size: number
): void {
  if (!url) return;
  void loadLogo(url).then(texture => {
    if (!texture) return;
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false });
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
    decal.position.set(x, y, z);
    group.add(decal);
    materials.push(material);
  });
}

/* ───────────────────────── Fábrica ───────────────────────── */

/**
 * Construye una pieza low-poly con la base en y = 0 y el frente hacia +z.
 * `color` es el de su capa: casco oscuro teñido + detalles brillantes con emissive suave.
 */
export function buildPiece(kind: ModelKind, color: number, logoUrl?: string): PieceModel {
  const tint = new THREE.Color(color);
  const group = new THREE.Group();
  const materials: THREE.Material[] = [];

  const mat = (c: THREE.ColorRepresentation, base: number, rough = 0.5, metal = 0.3): THREE.MeshStandardMaterial => {
    const m = new THREE.MeshStandardMaterial({
      color: c,
      roughness: rough,
      metalness: metal,
      emissive: tint,
      transparent: true,
      opacity: 0
    });
    m.userData['base'] = base; // brillo de reposo; el canvas lo multiplica en preview
    materials.push(m);
    return m;
  };

  const body = mat(tint.clone().multiplyScalar(0.45), 0.12);
  const accent = mat(tint, 0.7, 0.4, 0.2);
  const dark = mat(0x070d14, 0.04, 0.6, 0.4);
  const light = mat(0xe2e8f0, 0.5, 0.4, 0.1);

  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number): THREE.Mesh =>
    add(new THREE.BoxGeometry(w, h, d), m, x, y, z);
  const cyl = (rt: number, rb: number, h: number, m: THREE.Material, x: number, y: number, z: number, seg = 20): THREE.Mesh =>
    add(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z);
  const logo = (x: number, y: number, z: number, size: number): void => addLogo(group, materials, logoUrl, x, y, z, size);

  switch (kind) {
    case 'user': {
      cyl(1.3, 1.3, 0.12, dark, 0, 0.06, 0, 24);
      add(new THREE.CapsuleGeometry(0.5, 0.9, 4, 10), accent, 0, 1.15, 0);
      add(new THREE.SphereGeometry(0.46, 12, 10), light, 0, 2.3, 0);
      break;
    }

    case 'browser': {
      const screen = mat(tint.clone().multiplyScalar(0.7), 0.35);
      box(1.5, 0.08, 1.0, dark, 0, 0.04, 0);
      cyl(0.18, 0.28, 0.6, dark, 0, 0.38, 0, 12);
      box(3.1, 2.2, 0.2, dark, 0, 1.9, 0); // marco
      box(2.9, 0.3, 0.06, accent, 0, 2.78, 0.1); // barra del navegador
      [-1.2, -0.95, -0.7].forEach(x => add(new THREE.SphereGeometry(0.07, 8, 6), light, x, 2.78, 0.16));
      box(2.9, 1.65, 0.06, screen, 0, 1.78, 0.1); // pantalla
      logo(0, 1.78, 0.15, 1.2);
      break;
    }

    case 'swatches': {
      box(3.2, 0.1, 1.6, dark, 0, 0.05, 0);
      const bars: [number, number, THREE.Material][] = [
        [-1, 1, body],
        [0, 1.6, accent],
        [1, 2.2, light]
      ];
      bars.forEach(([x, h, m]) => box(0.8, h, 0.8, m, x, 0.1 + h / 2, 0));
      break;
    }

    case 'rack': {
      box(2.9, 0.1, 2.0, dark, 0, 0.05, 0);
      [0, 1, 2].forEach(i => {
        const y = 0.5 + i * 0.9;
        box(2.4, 0.76, 1.6, body, 0, y, 0);
        box(2.2, 0.5, 0.05, dark, 0, y, 0.82);
        add(new THREE.BoxGeometry(0.14, 0.14, 0.06), accent, -0.85, y, 0.86); // LEDs
        add(new THREE.BoxGeometry(0.14, 0.14, 0.06), light, -0.6, y, 0.86);
      });
      logo(0.75, 2.3, 0.9, 0.55);
      break;
    }

    case 'database': {
      [0, 1, 2].forEach(i => {
        const y = 0.4 + i * 0.85;
        cyl(1.25, 1.25, 0.7, body, 0, y, 0, 24);
        cyl(1.3, 1.3, 0.08, accent, 0, y + 0.18, 0, 24);
      });
      break;
    }

    case 'shield': {
      cyl(1.45, 1.45, 0.1, dark, 0, 0.05, 0, 24);
      const shape = new THREE.Shape();
      shape.moveTo(0, 1.7);
      shape.lineTo(1.3, 1.25);
      shape.lineTo(1.3, 0.2);
      shape.quadraticCurveTo(1.3, -0.8, 0, -1.3);
      shape.quadraticCurveTo(-1.3, -0.8, -1.3, 0.2);
      shape.lineTo(-1.3, 1.25);
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.3,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.06,
        bevelSegments: 1,
        curveSegments: 8
      });
      geometry.translate(0, 0, -0.15);
      add(geometry, body, 0, 1.45, 0);
      box(0.9, 0.7, 0.2, accent, 0, 1.3, 0.28); // candado
      add(new THREE.TorusGeometry(0.28, 0.08, 8, 14, Math.PI), accent, 0, 1.65, 0.28);
      break;
    }

    case 'container': {
      box(3.1, 1.8, 1.7, body, 0, 1.0, 0);
      for (let i = 0; i < 9; i++) box(0.09, 1.55, 0.06, dark, -1.28 + i * 0.32, 1.0, 0.87); // costillas
      box(3.2, 0.1, 1.8, accent, 0, 0.1, 0);
      box(3.2, 0.1, 1.8, accent, 0, 1.9, 0);
      [-1.55, 1.55].forEach(x => box(0.1, 1.8, 0.1, accent, x, 1.0, 0.85));
      box(1.2, 1.2, 0.05, dark, 0, 1.0, 0.92); // placa del logo
      logo(0, 1.0, 0.96, 0.95);
      break;
    }

    case 'cloud': {
      const puffs: [number, number, number, number, THREE.Material][] = [
        [-0.9, 1.5, 0, 0.8, body],
        [0.1, 2.0, 0, 1.0, accent],
        [1.0, 1.5, 0.1, 0.8, body],
        [0, 1.4, 0.5, 0.7, body]
      ];
      puffs.forEach(([x, y, z, r, m]) => add(new THREE.IcosahedronGeometry(r, 1), m, x, y, z));
      [-0.8, 0, 0.8].forEach(x => box(0.08, 0.8, 0.08, accent, x, 0.45, 0)); // haces hacia la plataforma
      break;
    }

    case 'globe': {
      cyl(0.9, 1.1, 0.2, dark, 0, 0.1, 0, 20);
      cyl(0.15, 0.15, 0.6, dark, 0, 0.5, 0, 10);
      add(new THREE.IcosahedronGeometry(1.2, 2), body, 0, 1.9, 0);
      const wire = mat(tint, 0.9);
      wire.wireframe = true;
      add(new THREE.IcosahedronGeometry(1.26, 2), wire, 0, 1.9, 0);
      add(new THREE.TorusGeometry(1.7, 0.05, 8, 48), accent, 0, 1.9, 0).rotation.x = Math.PI / 2.3;
      break;
    }

    case 'gear': {
      cyl(0.6, 0.8, 0.6, dark, 0, 0.3, 0, 16);
      const cy = 1.8;
      cyl(1.0, 1.0, 0.5, body, 0, cy, 0, 24).rotation.x = Math.PI / 2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        box(0.45, 0.45, 0.5, accent, Math.cos(a) * 1.12, cy + Math.sin(a) * 1.12, 0).rotation.z = a;
      }
      cyl(0.4, 0.4, 0.56, dark, 0, cy, 0, 16).rotation.x = Math.PI / 2;
      break;
    }

    case 'repo': {
      box(3.2, 0.1, 3.0, dark, 0, 0.05, 0);
      const cells: [number, number][] = [
        [-0.7, -0.7],
        [0.7, -0.7],
        [-0.7, 0.7],
        [0.7, 0.7]
      ];
      cells.forEach(([x, z], i) => {
        const h = 1.2 + (i % 2) * 0.5;
        box(1.2, h, 1.2, i % 2 ? accent : body, x, 0.1 + h / 2, z);
      });
      break;
    }
  }

  return { group, materials };
}