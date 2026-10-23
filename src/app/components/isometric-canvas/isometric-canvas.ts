import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  computed,
  effect,
  inject,
  viewChild
} from '@angular/core';
import * as THREE from 'three';
import {
  ArchitectureSelection,
  NodeCategory,
  OPTION_VISUALS,
  OptionVisual,
  ShapeKind
} from '../../models/architecture.models';
import { ArchitectureStateService } from '../../services/architecture-state.service';

/* ───────────────────────── Constantes de escena ───────────────────────── */

const FRUSTUM = 12;
const BASE_OFFSET = new THREE.Vector3(18, 18, 18);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const NODE_BASE_Y = 0.95;

/** Orden = paso 1..5 del wizard (el paso 0 es el tipo de sistema). */
const NODE_CATEGORIES: NodeCategory[] = ['frontend', 'backend', 'database', 'auth', 'devops'];

const SLOTS: Record<NodeCategory, THREE.Vector3> = {
  frontend: new THREE.Vector3(-6, 0, 0),
  backend: new THREE.Vector3(1, 0, 0),
  database: new THREE.Vector3(5, 0, 0),
  auth: new THREE.Vector3(-2, 0, -3.5),
  devops: new THREE.Vector3(1, 0, 4.5)
};

const ROLES: Record<NodeCategory, string> = {
  frontend: 'CAPA CLIENTE',
  backend: 'BACKEND CORE',
  database: 'DATOS',
  auth: 'SEGURIDAD',
  devops: 'DEPLOY'
};

const CONNECTIONS: [NodeCategory, NodeCategory][] = [
  ['frontend', 'auth'],
  ['frontend', 'backend'],
  ['auth', 'backend'],
  ['backend', 'database'],
  ['backend', 'devops']
];

const SCENE_CENTER = new THREE.Vector3(-0.5, 0, 0.5);
const FALLBACK_VISUAL: OptionVisual = { color: 0x10b981, shape: 'box', short: 'NODE' };
const PARTICLE_COUNT = 140;

/* ───────────────────────── Tipos internos ───────────────────────── */

interface ViewState {
  step: number;
  built: boolean;
  highlighted: string;
  selection: ArchitectureSelection;
}

interface NodeEntry {
  category: NodeCategory;
  optionId: string;
  group: THREE.Group;
  body: THREE.Mesh;
  bodyMat: THREE.MeshStandardMaterial;
  edgeMat: THREE.LineBasicMaterial | null;
  labelMat: THREE.SpriteMaterial;
  spawn: number;
  phase: number;
  targetOpacity: number;
  targetEmissive: number;
}

interface FadeMat {
  mat: THREE.Material & { opacity: number };
  max: number;
}

interface Pulse {
  mesh: THREE.Mesh;
  curve: THREE.CatmullRomCurve3;
  progress: number;
  speed: number;
}

const easeOutBack = (x: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

const visualOf = (optionId: string): OptionVisual => OPTION_VISUALS[optionId] ?? FALLBACK_VISUAL;

/* ───────────────────────── Componente ───────────────────────── */

@Component({
  selector: 'app-isometric-canvas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`:host { display: block; position: relative; width: 100%; height: 100%; }`],
  template: `<div #host class="absolute inset-0"></div>`
})
export class IsometricCanvasComponent implements AfterViewInit, OnDestroy {
  private readonly state = inject(ArchitectureStateService);
  private readonly ngZone = inject(NgZone);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');

  /** Todo lo que el 3D necesita saber, derivado del estado compartido. */
  private readonly viewState = computed<ViewState>(() => ({
    step: this.state.step(),
    built: this.state.isBuilt(),
    highlighted: this.state.highlightedId(),
    selection: this.state.selection()
  }));

  // three.js
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private rafId: number | null = null;
  private resizeObserver?: ResizeObserver;
  private ready = false;
  private width = 1;
  private height = 1;

  // grupos
  private readonly nodesGroup = new THREE.Group();
  private readonly cablesGroup = new THREE.Group();
  private readonly platformGroup = new THREE.Group();

  // nodos / cables / plataforma
  private readonly nodes = new Map<NodeCategory, NodeEntry>();
  private pulses: Pulse[] = [];
  private cablesKey = '';
  private platformType: string | null = null;
  private platformFades: FadeMat[] = [];
  private platformMode: 'preview' | 'confirmed' = 'preview';
  private platformSpawn = 1;

  // orbe
  private readonly orb = new THREE.Group();
  private orbSphere!: THREE.Mesh;
  private orbRingA!: THREE.Mesh;
  private orbRingB!: THREE.Mesh;
  private orbMats: THREE.MeshBasicMaterial[] = [];
  private readonly orbColor = new THREE.Color(FALLBACK_VISUAL.color);
  private readonly orbTargetColor = new THREE.Color(FALLBACK_VISUAL.color);
  private readonly orbTargetPos = new THREE.Vector3();
  private orbTargetScale = 0;
  private orbScale = 0.0001;

  // cámara
  private readonly focus = SCENE_CENTER.clone();
  private readonly targetFocus = SCENE_CENTER.clone();
  private targetZoom = 1;
  private readonly viewShift = new THREE.Vector2(0, 0);
  private readonly targetShift = new THREE.Vector2(0, 0);
  private readonly pointer = new THREE.Vector2(0, 0);
  private readonly pointerSmooth = new THREE.Vector2(0, 0);
  private readonly tmpOffset = new THREE.Vector3();
  private readonly tmpPoint = new THREE.Vector3();

  // partículas
  private particles!: THREE.Points;
  private particleSpeeds = new Float32Array(PARTICLE_COUNT);

  constructor() {
    // Reacciona a cada cambio de paso / opción resaltada / selección
    effect(() => {
      const s = this.viewState(); // se lee SIEMPRE para que el effect quede suscrito
      if (!this.ready) return;
      this.applyState(s);
    });
  }

  /* ───────────── Ciclo de vida ───────────── */

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initThree();
      this.createGrid();
      this.createOrb();
      this.createParticles();

      this.ready = true;
      this.applyState(this.viewState());

      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(this.host().nativeElement);
      window.addEventListener('pointermove', this.onPointerMove, { passive: true });

      this.animate();
    });
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    window.removeEventListener('pointermove', this.onPointerMove);

    this.nodes.forEach(entry => this.disposeObject(entry.group));
    this.nodes.clear();
    this.disposeObject(this.cablesGroup);
    this.disposeObject(this.platformGroup);
    this.disposeObject(this.orb);
    if (this.particles) this.disposeObject(this.particles);

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
  }

  /* ───────────── Inicialización ───────────── */

  private initThree(): void {
    const el = this.host().nativeElement;
    this.width = el.clientWidth || window.innerWidth;
    this.height = el.clientHeight || window.innerHeight;
    const aspect = this.width / this.height;

    this.scene = new THREE.Scene();
    this.scene.background = null; // transparente: se ve el fondo oscuro del body

    this.camera = new THREE.OrthographicCamera(-FRUSTUM * aspect, FRUSTUM * aspect, FRUSTUM, -FRUSTUM, 0.1, 1000);
    this.camera.zoom = 0.7; // pequeño "intro": arranca lejos y se acerca
    this.camera.position.copy(this.focus).add(BASE_OFFSET);
    this.camera.lookAt(this.focus);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width, this.height);
    this.renderer.domElement.style.display = 'block';
    el.appendChild(this.renderer.domElement);

    // Luces suaves: el color lo aporta el emissive de cada figura
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    const key = new THREE.DirectionalLight(0x10b981, 1.1);
    key.position.set(15, 25, 15);
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x22d3ee, 0.7);
    rim.position.set(-15, 15, -15);
    this.scene.add(rim);

    this.scene.add(this.platformGroup, this.nodesGroup, this.cablesGroup);
  }

  private createGrid(): void {
    const grid = new THREE.GridHelper(40, 40, 0x10b981, 0x064e3b);
    grid.position.y = -0.4;
    const mat = grid.material as THREE.LineBasicMaterial;
    mat.transparent = true;
    mat.opacity = 0.45;
    this.scene.add(grid);
  }

  private createOrb(): void {
    const makeMat = (opacity: number, wireframe = false): THREE.MeshBasicMaterial => {
      const m = new THREE.MeshBasicMaterial({
        color: this.orbColor,
        transparent: true,
        opacity,
        wireframe,
        depthWrite: false
      });
      this.orbMats.push(m);
      return m;
    };

    this.orbSphere = new THREE.Mesh(new THREE.SphereGeometry(2.1, 28, 18), makeMat(0.16, true));
    const glow = new THREE.Mesh(new THREE.SphereGeometry(1.95, 24, 16), makeMat(0.05));
    (glow.material as THREE.MeshBasicMaterial).side = THREE.BackSide;

    this.orbRingA = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.03, 8, 96), makeMat(0.6));
    this.orbRingA.rotation.x = Math.PI / 2.4;
    this.orbRingB = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.025, 8, 96), makeMat(0.4));
    this.orbRingB.rotation.y = Math.PI / 2.8;

    this.orb.add(this.orbSphere, glow, this.orbRingA, this.orbRingB);
    this.orb.scale.setScalar(0.0001);
    this.orb.visible = false;
    this.scene.add(this.orb);
  }

  private createParticles(): void {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 36;
      positions[i * 3 + 1] = Math.random() * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 36;
      this.particleSpeeds[i] = 0.004 + Math.random() * 0.008;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.particles = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0x34d399,
        size: 3, // px: en cámara ortográfica no hay atenuación por distancia
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.5,
        depthWrite: false
      })
    );
    this.scene.add(this.particles);
  }

  /* ───────────── Estado → escena ───────────── */

  private applyState(s: ViewState): void {
    const { step, built, highlighted, selection } = s;

    /* 1) Qué figuras deben existir y en qué modo */
    const desired = new Map<NodeCategory, { optionId: string; mode: 'preview' | 'confirmed' }>();
    NODE_CATEGORIES.forEach((category, i) => {
      const stepIndex = i + 1;
      if (built || stepIndex < step) {
        desired.set(category, { optionId: selection[category], mode: 'confirmed' });
      } else if (stepIndex === step) {
        desired.set(category, { optionId: highlighted, mode: 'preview' });
      }
    });

    // quitar las que sobran (por ejemplo al volver atrás)
    for (const [category, entry] of this.nodes) {
      if (!desired.has(category)) {
        this.nodesGroup.remove(entry.group);
        this.disposeObject(entry.group);
        this.nodes.delete(category);
      }
    }

    // crear / reemplazar / actualizar modo
    desired.forEach((want, category) => {
      let entry = this.nodes.get(category);
      if (!entry || entry.optionId !== want.optionId) {
        if (entry) {
          this.nodesGroup.remove(entry.group);
          this.disposeObject(entry.group);
        }
        entry = this.createNode(category, want.optionId);
        this.nodes.set(category, entry);
      }
      entry.targetOpacity = want.mode === 'preview' ? 0.8 : 1;
      entry.targetEmissive = want.mode === 'preview' ? 0.55 : 0.2;
    });

    /* 2) Plataforma (tipo de sistema) */
    const platformType = step === 0 && !built ? highlighted : (selection['system'] ?? 'default');
    if (platformType !== this.platformType) {
      this.buildPlatform(platformType);
    }
    this.platformMode = built || step > 0 ? 'confirmed' : 'preview';

    /* 3) Cables entre las figuras visibles */
    const visible = NODE_CATEGORIES.filter(c => desired.has(c));
    const key = visible.join('|');
    if (key !== this.cablesKey) {
      this.cablesKey = key;
      this.rebuildCables(new Set(visible));
    }

    /* 4) Orbe y cámara */
    this.orbTargetColor.setHex(visualOf(highlighted).color);

    if (built) {
      this.orbTargetScale = 0;
      this.targetFocus.copy(SCENE_CENTER);
      this.targetZoom = 0.85;
    } else if (step === 0) {
      this.orbTargetPos.set(SCENE_CENTER.x, 0.5, SCENE_CENTER.z);
      this.orbTargetScale = 3.3;
      this.targetFocus.copy(SCENE_CENTER);
      this.targetZoom = 1;
    } else {
      const slot = SLOTS[NODE_CATEGORIES[step - 1]];
      this.orbTargetPos.set(slot.x, NODE_BASE_Y, slot.z);
      this.orbTargetScale = 1.3;
      this.targetFocus.set(slot.x, 0, slot.z);
      this.targetZoom = 1.55;
    }

    // En el wizard el menú ocupa la izquierda: movemos la escena hacia la derecha (o hacia arriba en móvil)
    if (built) {
      this.targetShift.set(0, 0);
    } else if (window.innerWidth >= 900) {
      this.targetShift.set(0.19, 0);
    } else {
      this.targetShift.set(0, 0.2);
    }
  }

  /* ───────────── Figuras ───────────── */

  private createNode(category: NodeCategory, optionId: string): NodeEntry {
    const visual = visualOf(optionId);
    const slot = SLOTS[category];

    const geometry = this.makeGeometry(visual.shape);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: visual.color,
      roughness: 0.45,
      metalness: 0.3,
      emissive: visual.color,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0
    });
    const body = new THREE.Mesh(geometry, bodyMat);

    // Aristas para dar el look "wireframe tech" (en figuras curvas se omiten para no ensuciar)
    let edgeMat: THREE.LineBasicMaterial | null = null;
    if (visual.shape !== 'torus' && visual.shape !== 'cylinder' && visual.shape !== 'cone') {
      edgeMat = new THREE.LineBasicMaterial({ color: 0x6ee7b7, transparent: true, opacity: 0 });
      body.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 40), edgeMat));
    }

    const label = this.makeLabel(ROLES[category], visual.short, visual.color);

    const group = new THREE.Group();
    group.add(body, label.sprite);
    label.sprite.position.set(0, 2.6, 0);
    group.position.set(slot.x, NODE_BASE_Y, slot.z);
    group.scale.setScalar(0.0001);
    this.nodesGroup.add(group);

    return {
      category,
      optionId,
      group,
      body,
      bodyMat,
      edgeMat,
      labelMat: label.material,
      spawn: 0,
      phase: Math.random() * Math.PI * 2,
      targetOpacity: 1,
      targetEmissive: 0.2
    };
  }

  private makeGeometry(shape: ShapeKind): THREE.BufferGeometry {
    switch (shape) {
      case 'octa':
        return new THREE.OctahedronGeometry(1.5);
      case 'tetra':
        return new THREE.TetrahedronGeometry(1.7);
      case 'icosa':
        return new THREE.IcosahedronGeometry(1.4, 0);
      case 'dodeca':
        return new THREE.DodecahedronGeometry(1.4);
      case 'cylinder':
        return new THREE.CylinderGeometry(1.2, 1.2, 1.8, 32);
      case 'cone':
        return new THREE.ConeGeometry(1.3, 2.1, 32);
      case 'torus':
        return new THREE.TorusGeometry(1, 0.4, 16, 48);
      case 'box':
      default:
        return new THREE.BoxGeometry(2.2, 1.6, 2.2);
    }
  }

  private makeLabel(role: string, name: string, color: number): { sprite: THREE.Sprite; material: THREE.SpriteMaterial } {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;
    const hex = '#' + new THREE.Color(color).getHexString();

    ctx.textAlign = 'center';
    ctx.font = '600 26px ui-monospace, "Courier New", monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.95)';
    ctx.fillText(role, 256, 50);

    ctx.font = '800 52px ui-monospace, "Courier New", monospace';
    ctx.shadowColor = hex;
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(name, 256, 114);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, opacity: 0 });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(5.12, 1.6, 1);
    sprite.renderOrder = 10;
    return { sprite, material };
  }

  /* ───────────── Plataforma (tipo de sistema) ───────────── */

  private buildPlatform(type: string): void {
    this.platformType = type;
    this.platformGroup.children.slice().forEach(child => {
      this.platformGroup.remove(child);
      this.disposeObject(child);
    });
    this.platformFades = [];
    this.platformSpawn = 0;

    const addSlab = (w: number, d: number, x: number, z: number, color: number, edgeColor: number): void => {
      const geometry = new THREE.BoxGeometry(w, 0.35, d);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x03120d,
        emissive: color,
        emissiveIntensity: 0.18,
        roughness: 0.6,
        metalness: 0.2,
        transparent: true,
        opacity: 0
      });
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.set(x, -0.2, z);

      const edgeMat = new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0 });
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMat));

      this.platformGroup.add(mesh);
      this.platformFades.push({ mat, max: 0.85 }, { mat: edgeMat, max: 0.9 });
    };

    if (type === 'microservices') {
      // Una base independiente por cada servicio
      NODE_CATEGORIES.forEach(category => {
        const slot = SLOTS[category];
        addSlab(3.8, 3.8, slot.x, slot.z, 0xa78bfa, 0xc4b5fd);
      });
    } else {
      // Una sola base compartida
      addSlab(17, 13, SCENE_CENTER.x, SCENE_CENTER.z, 0x10b981, 0x34d399);
    }
  }

  /* ───────────── Cables ───────────── */

  private rebuildCables(visible: Set<NodeCategory>): void {
    this.cablesGroup.children.slice().forEach(child => {
      this.cablesGroup.remove(child);
      this.disposeObject(child);
    });
    this.pulses = [];

    CONNECTIONS.forEach(([a, b]) => {
      if (visible.has(a) && visible.has(b)) this.connect(a, b);
    });
  }

  private connect(a: NodeCategory, b: NodeCategory): void {
    const start = SLOTS[a].clone().setY(NODE_BASE_Y);
    const end = SLOTS[b].clone().setY(NODE_BASE_Y);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.y += 2.2;

    const curve = new THREE.CatmullRomCurve3([start, mid, end]);

    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 32, 0.05, 8, false),
      new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true, transparent: true, opacity: 0.4 })
    );
    this.cablesGroup.add(tube);

    const pulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x6ee7b7 })
    );
    this.cablesGroup.add(pulse);

    this.pulses.push({
      mesh: pulse,
      curve,
      progress: Math.random(),
      speed: 0.008 + Math.random() * 0.004
    });
  }

  /* ───────────── Loop de animación ───────────── */

  private onPointerMove = (e: PointerEvent): void => {
    this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
  };

  private onResize(): void {
    const el = this.host().nativeElement;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return;

    this.width = w;
    this.height = h;
    const aspect = w / h;
    this.camera.left = -FRUSTUM * aspect;
    this.camera.right = FRUSTUM * aspect;
    this.camera.top = FRUSTUM;
    this.camera.bottom = -FRUSTUM;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);

    // recalcular el desplazamiento si cambió entre escritorio y móvil
    this.applyState(this.viewState());
  }

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);
    const t = performance.now();

    this.updateCamera();
    this.updateOrb(t);
    this.updateNodes(t);
    this.updatePlatform();
    this.updatePulses();
    this.updateParticles();

    this.renderer.render(this.scene, this.camera);
  };

  private updateCamera(): void {
    const k = 0.06;

    this.focus.lerp(this.targetFocus, k);
    this.camera.zoom += (this.targetZoom - this.camera.zoom) * k;
    this.viewShift.lerp(this.targetShift, k);
    this.pointerSmooth.lerp(this.pointer, 0.05);

    // Parallax con el mouse: la cámara orbita un poco alrededor del foco
    this.tmpOffset.copy(BASE_OFFSET).applyAxisAngle(Y_AXIS, this.pointerSmooth.x * 0.2);
    this.tmpOffset.y += this.pointerSmooth.y * 2;

    this.camera.position.copy(this.focus).add(this.tmpOffset);
    this.camera.lookAt(this.focus);

    // setViewOffset también actualiza la matriz de proyección (aplica zoom y desplazamiento)
    this.camera.setViewOffset(
      this.width,
      this.height,
      -this.viewShift.x * this.width,
      this.viewShift.y * this.height,
      this.width,
      this.height
    );
  }

  private updateOrb(t: number): void {
    const orb = this.orb;
    orb.position.lerp(this.orbTargetPos, 0.08);

    this.orbScale += (this.orbTargetScale - this.orbScale) * 0.08;
    const pulse = 1 + Math.sin(t * 0.003) * 0.02;
    orb.scale.setScalar(Math.max(this.orbScale * pulse, 0.0001));
    orb.visible = this.orbScale > 0.02;

    this.orbColor.lerp(this.orbTargetColor, 0.1);
    this.orbMats.forEach(m => m.color.copy(this.orbColor));

    this.orbSphere.rotation.y += 0.004;
    this.orbRingA.rotation.z += 0.012;
    this.orbRingB.rotation.x += 0.009;
  }

  private updateNodes(t: number): void {
    this.nodes.forEach(entry => {
      entry.spawn = Math.min(1, entry.spawn + 0.04);
      entry.group.scale.setScalar(Math.max(easeOutBack(entry.spawn), 0.0001));
      entry.group.position.y = NODE_BASE_Y + Math.sin(t * 0.002 + entry.phase) * 0.1;
      entry.body.rotation.y += 0.007;

      entry.bodyMat.opacity += (entry.targetOpacity - entry.bodyMat.opacity) * 0.12;
      entry.bodyMat.emissiveIntensity += (entry.targetEmissive - entry.bodyMat.emissiveIntensity) * 0.12;
      if (entry.edgeMat) entry.edgeMat.opacity = entry.bodyMat.opacity;
      entry.labelMat.opacity += (1 - entry.labelMat.opacity) * 0.12;
    });
  }

  private updatePlatform(): void {
    this.platformSpawn = Math.min(1, this.platformSpawn + 0.035);
    const eased = easeOutBack(this.platformSpawn);
    this.platformGroup.scale.setScalar(0.92 + 0.08 * Math.min(eased, 1));

    const factor = this.platformMode === 'preview' ? 0.6 : 1;
    this.platformFades.forEach(f => {
      const target = f.max * factor * this.platformSpawn;
      f.mat.opacity += (target - f.mat.opacity) * 0.12;
    });
  }

  private updatePulses(): void {
    this.pulses.forEach(p => {
      p.progress += p.speed;
      if (p.progress > 1) p.progress = 0;
      p.curve.getPoint(p.progress, this.tmpPoint);
      p.mesh.position.copy(this.tmpPoint);
    });
  }

  private updateParticles(): void {
    const attr = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let y = attr.getY(i) + this.particleSpeeds[i];
      if (y > 14) y = 0;
      attr.setY(i, y);
    }
    attr.needsUpdate = true;
  }

  /* ───────────── Limpieza ───────────── */

  private disposeObject(object: THREE.Object3D): void {
    object.traverse(child => {
      const item = child as THREE.Object3D & {
        geometry?: THREE.BufferGeometry;
        material?: THREE.Material | THREE.Material[];
      };
      item.geometry?.dispose();

      const materials = Array.isArray(item.material) ? item.material : item.material ? [item.material] : [];
      materials.forEach(mat => {
        (mat as THREE.SpriteMaterial).map?.dispose();
        mat.dispose();
      });
    });
  }
}