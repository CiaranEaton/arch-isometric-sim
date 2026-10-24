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
  http: { color: 0x38bdf8, label: 'HTTPS', radius: 0.08, opacity: 0.8, speed: 0.006 },
  token: { color: 0xf59e0b, label: 'Token JWT', radius: 0.08, opacity: 0.8, speed: 0.006 },
  sql: { color: 0x34d399, label: 'SQL', radius: 0.08, opacity: 0.8, speed: 0.006 },
  deploy: { color: 0x94a3b8, label: 'Despliegue', radius: 0.06, opacity: 0.6, speed: 0.004 },
  dns: { color: 0xf472b6, label: 'DNS', radius: 0.06, opacity: 0.6, speed: 0.004 },
  ci: { color: 0xcbd5e1, label: 'CI/CD', radius: 0.06, opacity: 0.6, speed: 0.004 }
};

export interface LinkEnd {
  position: THREE.Vector3;
  name: string;
  optionId: string;
}

export interface LinkPlan {
  from: LinkEnd;
  to: LinkEnd;
  protocol: Protocol;
}

interface Link {
  style: ProtocolStyle;
  curve: THREE.CatmullRomCurve3;
  coreMat: THREE.MeshStandardMaterial;
  pipeMat: THREE.MeshStandardMaterial;
  arrowMat: THREE.MeshBasicMaterial;
  particles: { mesh: THREE.Mesh; t: number }[];
  appear: number;
  text: string;
}

const UP = new THREE.Vector3(0, 1, 0);
const hex = (color: number): string => '#' + color.toString(16).padStart(6, '0');

const labelFor = (plan: LinkPlan): string =>
  plan.protocol === 'sql' && plan.to.optionId === 'mongodb' ? 'NoSQL' : PROTOCOLS[plan.protocol].label;

const textFor = (plan: LinkPlan): string => `${labelFor(plan)} · ${plan.from.name} → ${plan.to.name}`;

const structureOf = (plan: LinkPlan): string =>
  `${plan.from.position.x},${plan.from.position.z}>${plan.to.position.x},${plan.to.position.z}:${plan.protocol}`;

/** Curva más industrial, con un arco más alto */
function makeCurve(a: THREE.Vector3, b: THREE.Vector3): THREE.CatmullRomCurve3 {
  const dir = b.clone().sub(a).setY(0).normalize();
  const start = a.clone().add(dir.clone().multiplyScalar(1.4)).setY(1.6);
  const end = b.clone().sub(dir.clone().multiplyScalar(1.4)).setY(1.6);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  mid.y = 3.5; // Arco más alto para que pase por encima
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

      const target = link.appear;
      // El "núcleo" de energía brilla más al pasar el mouse
      link.coreMat.opacity += ((hovered ? 1 : 0.7) * target - link.coreMat.opacity) * 0.2;
      link.coreMat.emissiveIntensity += ((hovered ? 2.0 : 1.0) - link.coreMat.emissiveIntensity) * 0.2;
      
      // El tubo exterior (la tubería física) se ilumina un poco
      link.pipeMat.opacity += (0.8 * target - link.pipeMat.opacity) * 0.2;
      link.pipeMat.emissiveIntensity += ((hovered ? 0.6 : 0.2) - link.pipeMat.emissiveIntensity) * 0.2;

      link.arrowMat.opacity = link.appear;

      for (const p of link.particles) {
        p.t = (p.t + link.style.speed) % 1;
        link.curve.getPoint(p.t, p.mesh.position);
        p.mesh.scale.setScalar(Math.max(Math.min(1, p.t * 8, (1 - p.t) * 8), 0.001) * (hovered ? 1.5 : 1));
        p.mesh.visible = link.appear > 0.6;
      }
    }
  }

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

  private build(plan: LinkPlan): Link {
    const style = PROTOCOLS[plan.protocol];
    const curve = makeCurve(plan.from.position, plan.to.position);

    // 1. La tubería física (exterior oscuro y metálico)
    const pipeMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.4,
      transparent: true,
      opacity: 0,
      emissive: style.color,
      emissiveIntensity: 0.1
    });
    this.group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, style.radius * 1.6, 12, false), pipeMat));

    // 2. El núcleo de energía (interior brillante)
    const coreMat = new THREE.MeshStandardMaterial({
      color: style.color,
      emissive: style.color,
      emissiveIntensity: 1.0,
      roughness: 0.2,
      transparent: true,
      opacity: 0
    });
    this.group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, style.radius * 0.8, 8, false), coreMat));

    // 3. Hitbox invisible para el mouse
    const hit = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.5, 6, false), new THREE.MeshBasicMaterial({ visible: false }));
    this.group.add(hit);

    // 4. Flecha (Válvula de salida)
    const arrowMat = new THREE.MeshBasicMaterial({ color: style.color, transparent: true, opacity: 0 });
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(style.radius * 3.5, style.radius * 9, 12), arrowMat);
    arrow.position.copy(curve.getPoint(0.85));
    arrow.quaternion.setFromUnitVectors(UP, curve.getTangent(0.85));
    this.group.add(arrow);

    // 5. Partículas (Los datos viajando)
    const particleColor = new THREE.Color(style.color).lerp(new THREE.Color(0xffffff), 0.8);
    const particles = [0, 1 / 3, 2 / 3].map(t => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(style.radius * 2.0, 12, 12), new THREE.MeshBasicMaterial({ color: particleColor }));
      mesh.visible = false;
      this.group.add(mesh);
      return { mesh, t };
    });

    const link: Link = { style, curve, pipeMat, coreMat, arrowMat, particles, appear: 0, text: textFor(plan) };
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