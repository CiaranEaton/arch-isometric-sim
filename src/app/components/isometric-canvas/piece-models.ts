import * as THREE from 'three';

export type ModelKind =
  | 'user' | 'browser' | 'swatches' | 'rack' | 'database'
  | 'shield' | 'container' | 'cloud' | 'globe' | 'gear' | 'repo';

export interface PieceModel {
  group: THREE.Group;
  materials: THREE.Material[];
}

const KIND_BY_OPTION: Record<string, ModelKind> = {
  vercel: 'cloud', netlify: 'cloud', cloudflare_pages: 'cloud', static_pages: 'cloud', railway: 'cloud',
  docker_k8s: 'container', docker_compose: 'container', aws_ecs: 'container', coolify: 'container',
  hostinger_vps: 'rack'
};

const KIND_BY_CATEGORY: Record<string, ModelKind> = {
  client: 'user', frontend: 'browser', styling: 'swatches', backend: 'rack',
  database: 'database', auth: 'shield', devops: 'container', domain: 'globe', cicd: 'gear', system: 'repo'
};

export const modelKindFor = (category: string, optionId: string): ModelKind =>
  KIND_BY_OPTION[optionId] ?? KIND_BY_CATEGORY[category] ?? 'container';

/* ───────────────────────── Logos ───────────────────────── */

const logoCache = new Map<string, Promise<THREE.Texture | null>>();

function loadLogo(url: string): Promise<THREE.Texture | null> {
  let promise = logoCache.get(url);
  if (!promise) {
    promise = new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'; // Fondo oscuro para estilo industrial
        ctx.beginPath(); ctx.roundRect(8, 8, size - 16, size - 16, 44); ctx.fill();
        
        // Borde interior
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 4;
        ctx.stroke();

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

function addLogo(group: THREE.Group, materials: THREE.Material[], url: string | undefined, x: number, y: number, z: number, size: number): void {
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

export function buildPiece(kind: ModelKind, color: number, logoUrl?: string): PieceModel {
  const tint = new THREE.Color(color);
  const group = new THREE.Group();
  const materials: THREE.Material[] = [];

  // Materiales base con el nuevo look físico
  const mat = (c: THREE.ColorRepresentation, base: number, rough = 0.5, metal = 0.6): THREE.MeshPhysicalMaterial => {
    const m = new THREE.MeshPhysicalMaterial({
      color: c,
      roughness: rough,
      metalness: metal,
      emissive: tint,
      transparent: true,
      opacity: 0,
      clearcoat: 0.4,
      clearcoatRoughness: 0.2
    });
    m.userData['base'] = base;
    materials.push(m);
    return m;
  };

  const body = mat(tint.clone().multiplyScalar(0.4), 0.1); // Color oscuro principal
  const accent = mat(tint, 0.7, 0.3, 0.7); // Color brillante
  const dark = mat(0x070d14, 0.02, 0.7, 0.8); // Metal oscuro (casi negro)
  const light = mat(0xe2e8f0, 0.4, 0.2, 0.5); // Luces LED

  // Base universal para todos los modelos (el "pad" metálico)
  const baseGeo = new THREE.CylinderGeometry(1.5, 1.6, 0.15, 8);
  const baseMesh = new THREE.Mesh(baseGeo, dark);
  baseMesh.position.y = 0.075;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);
  
  // Un pequeño aro de neón alrededor de la base
  const ringGeo = new THREE.TorusGeometry(1.55, 0.04, 8, 32);
  const ringMesh = new THREE.Mesh(ringGeo, accent);
  ringMesh.rotation.x = Math.PI / 2;
  ringMesh.position.y = 0.15;
  group.add(ringMesh);

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

  // Ajustamos todo para que la base en Y=0 sea el pad.
  switch (kind) {
    case 'user': {
      add(new THREE.CapsuleGeometry(0.5, 0.9, 4, 10), body, 0, 1.2, 0);
      add(new THREE.SphereGeometry(0.45, 12, 10), light, 0, 2.3, 0);
      // Conexión
      cyl(0.15, 0.2, 0.5, dark, 0, 0.4, 0);
      break;
    }

    case 'browser': {
      const screen = mat(tint.clone().multiplyScalar(0.6), 0.3);
      cyl(0.3, 0.4, 0.6, dark, 0, 0.45, 0, 12); // Soporte
      box(3.2, 2.2, 0.2, dark, 0, 1.9, 0); // Marco
      box(3.0, 0.3, 0.1, accent, 0, 2.8, 0.1); // Barra
      box(2.9, 1.6, 0.1, screen, 0, 1.8, 0.12); // Pantalla
      // LEDs indicadores
      [-1.2, -0.95, -0.7].forEach(x => add(new THREE.SphereGeometry(0.06, 8, 6), light, x, 2.8, 0.16));
      logo(0, 1.8, 0.2, 1.2);
      break;
    }

    case 'swatches': {
      const bars: [number, number, THREE.Material][] = [[-1, 1, body], [0, 1.5, accent], [1, 2.0, light]];
      bars.forEach(([x, h, m]) => box(0.8, h, 0.8, m, x, 0.15 + h / 2, 0));
      break;
    }

    case 'rack': {
      [0, 1, 2].forEach(i => {
        const y = 0.6 + i * 0.85;
        box(2.6, 0.75, 1.8, body, 0, y, 0);
        box(2.4, 0.5, 0.1, dark, 0, y, 0.9); // Frente oscuro
        // Luces LED industriales
        add(new THREE.BoxGeometry(0.15, 0.15, 0.05), accent, -0.9, y, 0.95);
        add(new THREE.BoxGeometry(0.15, 0.15, 0.05), light, -0.6, y, 0.95);
        add(new THREE.BoxGeometry(0.15, 0.15, 0.05), light, 0.8, y, 0.95);
        // Rejillas de ventilación
        for(let j=0; j<3; j++) box(1.0, 0.05, 0.05, dark, 0.1, y+0.2 - j*0.15, 0.95);
      });
      logo(0, 2.5, 1.0, 0.8);
      break;
    }

    case 'database': {
      [0, 1, 2].forEach(i => {
        const y = 0.5 + i * 0.8;
        cyl(1.3, 1.3, 0.7, body, 0, y, 0, 24);
        cyl(1.35, 1.35, 0.1, accent, 0, y + 0.2, 0, 24); // Anillo brillante
        // Luces parpadeantes
        add(new THREE.SphereGeometry(0.08, 8, 8), light, 0, y - 0.2, 1.3);
      });
      break;
    }

    case 'shield': {
      const shape = new THREE.Shape();
      shape.moveTo(0, 1.6); shape.lineTo(1.2, 1.2); shape.lineTo(1.2, 0.2);
      shape.quadraticCurveTo(1.2, -0.8, 0, -1.2); shape.quadraticCurveTo(-1.2, -0.8, -1.2, 0.2);
      shape.lineTo(-1.2, 1.2); shape.closePath();
      
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2 });
      geometry.translate(0, 0, -0.2);
      add(geometry, body, 0, 1.6, 0);
      
      // Núcleo de energía
      box(0.8, 0.8, 0.2, accent, 0, 1.4, 0.25);
      add(new THREE.TorusGeometry(0.3, 0.08, 8, 16, Math.PI), light, 0, 1.8, 0.25);
      break;
    }

    case 'container': {
      box(3.2, 2.0, 1.8, body, 0, 1.15, 0);
      // Costillas industriales
      for (let i = 0; i < 10; i++) box(0.08, 1.7, 0.1, dark, -1.35 + i * 0.3, 1.15, 0.95);
      box(3.4, 0.15, 2.0, dark, 0, 0.2, 0); // Base
      box(3.4, 0.15, 2.0, accent, 0, 2.1, 0); // Techo
      // Esquinas
      [-1.6, 1.6].forEach(x => box(0.15, 2.0, 0.15, accent, x, 1.15, 0.9));
      // Logo
      box(1.4, 1.4, 0.1, dark, 0, 1.15, 1.0);
      logo(0, 1.15, 1.05, 1.1);
      break;
    }

    case 'cloud': {
      const puffs: [number, number, number, number, THREE.Material][] = [
        [-1.0, 1.6, 0, 0.8, body], [0.1, 2.1, 0, 1.0, accent], 
        [1.0, 1.6, 0.1, 0.8, body], [0, 1.5, 0.6, 0.7, body]
      ];
      puffs.forEach(([x, y, z, r, m]) => add(new THREE.IcosahedronGeometry(r, 1), m, x, y, z));
      // Conexiones de datos
      [-0.9, 0, 0.9].forEach(x => box(0.1, 1.0, 0.1, accent, x, 0.6, 0)); 
      break;
    }

    case 'globe': {
      cyl(0.2, 0.4, 0.8, dark, 0, 0.6, 0, 12); // Eje
      add(new THREE.IcosahedronGeometry(1.3, 2), body, 0, 2.2, 0);
      const wire = mat(tint, 0.9);
      wire.wireframe = true;
      add(new THREE.IcosahedronGeometry(1.35, 2), wire, 0, 2.2, 0);
      add(new THREE.TorusGeometry(1.8, 0.06, 8, 48), accent, 0, 2.2, 0).rotation.x = Math.PI / 2.5;
      break;
    }

    case 'gear': {
      cyl(0.8, 1.0, 0.6, dark, 0, 0.45, 0, 16);
      const cy = 1.9;
      cyl(1.1, 1.1, 0.6, body, 0, cy, 0, 24).rotation.x = Math.PI / 2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        box(0.5, 0.5, 0.6, accent, Math.cos(a) * 1.25, cy + Math.sin(a) * 1.25, 0).rotation.z = a;
      }
      cyl(0.5, 0.5, 0.7, light, 0, cy, 0, 16).rotation.x = Math.PI / 2; // Núcleo brillante
      break;
    }

    case 'repo': {
      const cells: [number, number][] = [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]];
      cells.forEach(([x, z], i) => {
        const h = 1.4 + (i % 2) * 0.6;
        box(1.3, h, 1.3, i % 2 ? accent : body, x, 0.15 + h / 2, z);
      });
      break;
    }
  }

  return { group, materials };
}