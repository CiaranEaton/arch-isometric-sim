import * as THREE from 'three';

export type Protocol = 'http' | 'token' | 'sql' | 'deploy' | 'dns' | 'ci';

interface ProtocolStyle {
  color: number;
  label: string;
  radius: number;
  opacity: number;
  speed: number;
}

const PROTOCOLS: Record<Protocol, ProtocolStyle> = {
  http: { color: 0x38bdf8, label: 'HTTPS', radius: 0.07, opacity: 0.6, speed: 0.006 },
  token: { color: 0xf59e0b, label: 'Token JWT', radius: 0.07, opacity: 0.6, speed: 0.006 },
  sql: { color: 0x34d399, label: 'SQL', radius: 0.07, opacity: 0.6, speed: 0.006 },
  deploy: { color: 0x94a3b8, label: 'Despliegue', radius: 0.045, opacity: 0.45, speed: 0.004 },
  dns: { color: 0xf472b6, label: 'DNS', radius: 0.045, opacity: 0.45, speed: 0.004 },
  ci: { color: 0xcbd5e1, label: 'CI/CD', radius: 0.045, opacity: 0.45, speed: 0.004 }
};

export interface LinkEnd {
  position: THREE.Vector3;
  name: string;
  optionId: string;
}

/** Quién habla con quién. El sentido (from → to) es el del request. */
export interface LinkPlan {
  from: LinkEnd;
  to: LinkEnd;
  protocol: Protocol;
}

interface Link {
  style: ProtocolStyle;
  curve: THREE.CatmullRomCurve3;
  tubeMat: THREE.MeshStandardMaterial;
  arrowMat: THREE.MeshBasicMaterial;
  particles: { mesh: THREE.Mesh; t: number }[];
  appear: number;
  text: string;
}

const UP = new THREE.Vector3(0, 1, 0);
const hex = (color: number): string => '#' + color.toString(16).padStart(6, '0');

/** NoSQL no es SQL: la etiqueta cambia según la base de datos de destino. */
const labelFor = (plan: LinkPlan): string =>
  plan.protocol === 'sql' && plan.to.optionId === 'mongodb' ? 'NoSQL' : PROTOCOLS[plan.protocol].label;

const textFor = (plan: LinkPlan): string => `${labelFor(plan)} · ${plan.from.name} → ${plan.to.name}`;

const structureOf = (plan: LinkPlan): string =>
  `${plan.from.position.x},${plan.from.position.z}>${plan.to.position.x},${plan.to.position.z}:${plan.protocol}`;

/** Arco que sale de un lado de la pieza origen y entra por un lado de la pieza destino. */
function makeCurve(a: THREE.Vector3, b: THREE.Vector3): THREE.CatmullRomCurve3 {
  const dir = b.clone().sub(a).setY(0).normalize();
  const start = a.clone().add(dir.clone().multiplyScalar(1.3)).setY(1.7);
  const end = b.clone().sub(dir.clone().multiplyScalar(1.3)).setY(1.7);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  mid.y = 3.3;
  return new THREE.CatmullRomCurve3([start, mid, end]);
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse(child => {
    const item = child as THREE.Object3D & { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
    item.geometry?.dispose();
    const materials = Array.isArray(item.material) ? item.material : item.material ? [item.material] : [];
    materials.forEach(m => m.dispose());
  });
}

export class ConnectorLayer {
  readonly group = new THREE.Group();

  private links: Link[] = [];
  private hitMeshes: THREE.Object3D[] = [];
  private readonly hitLinks = new Map<THREE.Object3D, Link>();
  private hovered: Link | null = null;
  private structure = '';

  private readonly tip: HTMLDivElement;
  private readonly legend: HTMLDivElement;

  constructor(private readonly overlay: HTMLElement) {
    this.tip = document.createElement('div');
    this.tip.className = 'sb3d-tip';
    this.legend = document.createElement('div');
    this.legend.className = 'sb3d-legend';
    this.legend.style.display = 'none';
    overlay.append(this.tip, this.legend);
  }

  /** Reconstruye solo si cambió la estructura; si únicamente cambiaron nombres, actualiza los textos. */
  set(plans: LinkPlan[]): void {
    const structure = plans.map(structureOf).join('|');
    if (structure === this.structure) {
      this.links.forEach((link, i) => (link.text = textFor(plans[i])));
      this.renderLegend(plans);
      return;
    }

    this.structure = structure;
    this.clear();
    this.links = plans.map(plan => this.build(plan));
    this.renderLegend(plans);
  }

  update(): void {
    for (const link of this.links) {
      const hovered = link === this.hovered;
      link.appear = Math.min(1, link.appear + 0.03);

      const target = (hovered ? 0.95 : link.style.opacity) * link.appear;
      link.tubeMat.opacity += (target - link.tubeMat.opacity) * 0.2;
      link.tubeMat.emissiveIntensity += ((hovered ? 1.1 : 0.5) - link.tubeMat.emissiveIntensity) * 0.2;
      link.arrowMat.opacity = link.appear;

      for (const p of link.particles) {
        p.t = (p.t + link.style.speed) % 1;
        link.curve.getPoint(p.t, p.mesh.position);
        // nacen y mueren suavemente en los extremos
        p.mesh.scale.setScalar(Math.max(Math.min(1, p.t * 8, (1 - p.t) * 8), 0.001) * (hovered ? 1.35 : 1));
        p.mesh.visible = link.appear > 0.6;
      }
    }
  }

  /** (x, y) en píxeles dentro del overlay. Devuelve true si el puntero está sobre un conector. */
  hover(raycaster: THREE.Raycaster, x: number, y: number): boolean {
    const hit = raycaster.intersectObjects(this.hitMeshes, false)[0];
    this.hovered = hit ? (this.hitLinks.get(hit.object) ?? null) : null;

    if (!this.hovered) {
      this.tip.style.opacity = '0';
      return false;
    }

    this.tip.textContent = this.hovered.text;
    this.tip.style.borderColor = hex(this.hovered.style.color);
    const left = Math.min(x + 14, this.overlay.clientWidth - this.tip.offsetWidth - 8);
    this.tip.style.transform = `translate3d(${Math.max(8, left)}px, ${y + 14}px, 0)`;
    this.tip.style.opacity = '1';
    return true;
  }

  leave(): void {
    this.hovered = null;
    this.tip.style.opacity = '0';
  }

  dispose(): void {
    this.clear();
    this.tip.remove();
    this.legend.remove();
  }

  /* ───────────── Internos ───────────── */

  private build(plan: LinkPlan): Link {
    const style = PROTOCOLS[plan.protocol];
    const curve = makeCurve(plan.from.position, plan.to.position);

    const tubeMat = new THREE.MeshStandardMaterial({
      color: style.color,
      emissive: style.color,
      emissiveIntensity: 0.5,
      roughness: 0.4,
      transparent: true,
      opacity: 0
    });
    this.group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, style.radius, 8, false), tubeMat));

    // Tubo invisible y más grueso: facilita pasar el mouse por encima
    const hit = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.45, 6, false), new THREE.MeshBasicMaterial({ visible: false }));
    this.group.add(hit);

    // Punta de flecha: marca el sentido del request
    const arrowMat = new THREE.MeshBasicMaterial({ color: style.color, transparent: true, opacity: 0 });
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(style.radius * 3.2, style.radius * 8, 10), arrowMat);
    arrow.position.copy(curve.getPoint(0.8));
    arrow.quaternion.setFromUnitVectors(UP, curve.getTangent(0.8));
    this.group.add(arrow);

    // Partículas que fluyen de origen a destino
    const particleColor = new THREE.Color(style.color).lerp(new THREE.Color(0xffffff), 0.5);
    const particles = [0, 1 / 3, 2 / 3].map(t => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(style.radius * 1.8, 10, 8), new THREE.MeshBasicMaterial({ color: particleColor }));
      mesh.visible = false;
      this.group.add(mesh);
      return { mesh, t };
    });

    const link: Link = { style, curve, tubeMat, arrowMat, particles, appear: 0, text: textFor(plan) };
    this.hitLinks.set(hit, link);
    this.hitMeshes.push(hit);
    return link;
  }

  private clear(): void {
    this.group.children.slice().forEach(child => {
      this.group.remove(child);
      disposeObject(child);
    });
    this.links = [];
    this.hitMeshes = [];
    this.hitLinks.clear();
    this.hovered = null;
    this.tip.style.opacity = '0';
  }

  private renderLegend(plans: LinkPlan[]): void {
    const seen = new Map<Protocol, string>();
    for (const plan of plans) {
      if (!seen.has(plan.protocol)) seen.set(plan.protocol, labelFor(plan));
    }

    this.legend.replaceChildren(
      ...[...seen].map(([protocol, text]) => {
        const item = document.createElement('span');
        const dot = document.createElement('i');
        dot.style.background = hex(PROTOCOLS[protocol].color);
        item.append(dot, text);
        return item;
      })
    );
    this.legend.style.display = seen.size ? 'flex' : 'none';
  }
}