import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  viewChild
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  ArchitectureSelection,
  LAYERS,
  LayerId,
  OPTION_CATALOG,
  WizardStep,
  layerColor
} from '../../models/architecture.models';
import { ArchitectureStateService } from '../../services/architecture-state.service';
import { PieceModel, buildPiece, modelKindFor } from './piece-models';

/* ───────────────────────── Constantes ───────────────────────── */

const FRUSTUM = 12;
const BASE_OFFSET = new THREE.Vector3(18, 18, 18);
const NODE_BASE_Y = 0.95;
const SPACING_X = 5.4;
const SPACING_Z = 4.4;
const PLATFORM_MARGIN = 3.4;
const PILL_H = 34;
const PARTICLE_COUNT = 140;

/** Columnas de la línea de ensamble, de izquierda a derecha. Infra y workspace no son columnas. */
const COLUMN_ORDER: LayerId[] = ['client', 'frontend', 'auth', 'backend', 'data'];

const LAYER_LABEL: Record<string, string> = {
  ...Object.fromEntries(LAYERS.map(l => [l.id, l.label])),
  workspace: 'Estructura'
};

const PIECE_Y = 0.1; // base de cada pieza sobre la plataforma

/* ───────────────────────── Tipos internos ───────────────────────── */

interface ViewState {
  step: number;
  built: boolean;
  routeId: string;
  steps: WizardStep[];
  selection: ArchitectureSelection;
  selectedId: string;
}

interface SlotDef {
  key: string;
  layer: LayerId;
  x: number;
  z: number;
}

interface PillRefs {
  el: HTMLDivElement;
  icon: HTMLImageElement;
  name: HTMLElement;
  layer: HTMLElement;
  width: number;
  key: string;
}

interface NodeEntry {
  optionId: string;
  group: THREE.Group;
  body: THREE.Group;
  materials: THREE.Material[];
  spawn: number;
  phase: number;
  opacity: number;
  targetOpacity: number;
  glow: number;
  targetGlow: number;
}

interface Slot {
  key: string;
  layer: LayerId;
  position: THREE.Vector3;
  pad: THREE.Mesh;
  padMat: THREE.MeshBasicMaterial;
  pill: PillRefs;
  node: NodeEntry | null;
}

const easeOutBack = (x: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/* ───────────────────────── Componente ───────────────────────── */

@Component({
  selector: 'app-isometric-canvas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None, // las etiquetas se crean por código: necesitan estilos globales al componente
  styles: [
    `
      app-isometric-canvas { display: block; position: relative; width: 100%; height: 100%; }
      .sb3d-labels { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
      .sb3d-pill {
        position: absolute; left: 0; top: 0; display: flex; align-items: center; gap: 0.45rem;
        height: 34px; padding: 0 0.8rem 0 0.5rem; white-space: nowrap; opacity: 0;
        color: #e2e8f0; font-family: 'Inter', system-ui, sans-serif;
        background: rgba(3, 9, 14, 0.88);
        border: 1px solid color-mix(in srgb, var(--layer) 70%, transparent);
        border-radius: 999px;
        box-shadow: 0 0 16px color-mix(in srgb, var(--layer) 28%, transparent);
        will-change: transform, opacity;
      }
      .sb3d-pill-icon { width: 18px; height: 18px; object-fit: contain; }
      .sb3d-pill-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; max-width: 170px; }
      .sb3d-pill-text strong { overflow: hidden; font-size: 12px; font-weight: 650; line-height: 1.1; text-overflow: ellipsis; }
      .sb3d-pill-text small { font-size: 10px; line-height: 1.1; color: var(--layer); }
      .sb3d-pill.is-ghost { background: rgba(3, 9, 14, 0.55); border-style: dashed; box-shadow: none; color: #94a3b8; }
      .sb3d-pill.is-preview { box-shadow: 0 0 0 1px var(--layer), 0 0 20px color-mix(in srgb, var(--layer) 40%, transparent); }
    `
  ],
  template: `
    <div #host class="absolute inset-0"></div>
    <div #labelsHost class="sb3d-labels" aria-hidden="true"></div>
  `
})
export class IsometricCanvasComponent implements AfterViewInit, OnDestroy {
  private readonly state = inject(ArchitectureStateService);
  private readonly ngZone = inject(NgZone);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly labelsHost = viewChild.required<ElementRef<HTMLElement>>('labelsHost');

  private readonly viewState = computed<ViewState>(() => ({
    step: this.state.step(),
    built: this.state.isBuilt(),
    routeId: this.state.routeId(),
    steps: this.state.steps(),
    selection: this.state.selection(),
    selectedId: this.state.selectedId()
  }));

  // three.js
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private rafId: number | null = null;
  private resizeObserver?: ResizeObserver;
  private ready = false;
  private width = 1;
  private height = 1;

  // grupos
  private readonly platformGroup = new THREE.Group();
  private readonly padsGroup = new THREE.Group();
  private readonly nodesGroup = new THREE.Group();
  private readonly linksGroup = new THREE.Group();
  private particles!: THREE.Points;
  private readonly particleSpeeds = new Float32Array(PARTICLE_COUNT);

  // layout
  private slots: Slot[] = [];
  private layoutRoute = '';
  private readonly fitBox = new THREE.Box3();
  private platformSpawn = 1;
  private linksKey = '';

  // estado de vista
  private built = false;
  private activeKey: string | null = null;

  // cámara
  private autoFit = true;
  private readonly shift = new THREE.Vector2(0, 0);
  private readonly tmp = new THREE.Vector3();
  private readonly tmpCenter = new THREE.Vector3();

  constructor() {
    effect(() => {
      const s = this.viewState(); // se lee siempre para que el effect quede suscrito
      if (!this.ready) return;
      this.applyState(s);
    });
  }

  /* ───────────── Ciclo de vida ───────────── */

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initThree();
      this.createGrid();
      this.createParticles();

      this.ready = true;
      this.applyState(this.viewState());

      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(this.host().nativeElement);

      this.animate();
    });
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    this.controls?.dispose();

    this.slots.forEach(slot => this.destroySlot(slot));
    this.slots = [];
    [this.platformGroup, this.linksGroup].forEach(group => this.disposeObject(group));
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

    this.camera = new THREE.OrthographicCamera(-FRUSTUM * aspect, FRUSTUM * aspect, FRUSTUM, -FRUSTUM, 0.1, 1000);
    this.camera.zoom = 0.7; // intro: arranca lejos y se encuadra solo
    this.camera.position.copy(BASE_OFFSET);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width, this.height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    el.appendChild(this.renderer.domElement);

    // Órbita: se habilita en la vista final (en el wizard el panel ocupa la izquierda)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minZoom = 0.3;
    this.controls.maxZoom = 4;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = Math.PI / 2.15; // no deja ver por debajo del piso
    this.controls.enabled = false;
    this.controls.target.set(0, 0, 0);
    this.controls.addEventListener('start', () => (this.autoFit = false)); // el usuario toma el control
    this.camera.lookAt(this.controls.target);
    this.controls.update();

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.DirectionalLight(0xe6fff5, 1.3);
    key.position.set(15, 25, 15);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0005;
    Object.assign(key.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 80 });
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x22d3ee, 0.7);
    rim.position.set(-15, 15, -15);
    this.scene.add(rim);

    this.scene.add(this.platformGroup, this.padsGroup, this.nodesGroup, this.linksGroup);
  }

  private createGrid(): void {
    const grid = new THREE.GridHelper(60, 60, 0x10b981, 0x064e3b);
    grid.position.y = -0.4;
    const mat = grid.material as THREE.LineBasicMaterial;
    mat.transparent = true;
    mat.opacity = 0.35;
    this.scene.add(grid);
  }

  private createParticles(): void {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = Math.random() * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      this.particleSpeeds[i] = 0.004 + Math.random() * 0.008;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particles = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0x34d399,
        size: 3,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.45,
        depthWrite: false
      })
    );
    this.scene.add(this.particles);
  }

  /* ───────────── Layout lineal por capas ───────────── */

  /** Posiciones de cada slot según los pasos de la ruta: columnas por capa, infra al frente, estructura atrás. */
  private computeSlotDefs(steps: WizardStep[]): SlotDef[] {
    const body = steps.slice(1); // sin el paso "Proyecto"
    const columns = COLUMN_ORDER.filter(l => l === 'client' || body.some(s => s.layer === l));
    const colX = (layer: LayerId): number => (columns.indexOf(layer) - (columns.length - 1) / 2) * SPACING_X;

    const defs: SlotDef[] = [{ key: 'client', layer: 'client', x: colX('client'), z: 0 }];
    const stacked = new Map<LayerId, number>();

    body.forEach(step => {
      if (step.layer === 'infra' || step.layer === 'workspace') return;
      const n = stacked.get(step.layer) ?? 0;
      stacked.set(step.layer, n + 1);
      defs.push({ key: step.category, layer: step.layer, x: colX(step.layer), z: -n * SPACING_Z });
    });

    const infra = body.filter(s => s.layer === 'infra');
    infra.forEach((step, i) =>
      defs.push({ key: step.category, layer: 'infra', x: (i - (infra.length - 1) / 2) * SPACING_X, z: SPACING_Z * 1.3 })
    );

    body
      .filter(s => s.layer === 'workspace')
      .forEach(step => defs.push({ key: step.category, layer: 'workspace', x: colX('client'), z: -SPACING_Z }));

    return defs;
  }

  private rebuildLayout(routeId: string, steps: WizardStep[]): void {
    this.slots.forEach(slot => this.destroySlot(slot));
    this.slots = [];

    const defs = this.computeSlotDefs(steps);
    const box = new THREE.Box3();

    for (const def of defs) {
      const position = new THREE.Vector3(def.x, 0, def.z);
      const color = LAYERS.find(l => l.id === def.layer)?.color ?? 0x34d399;

      const padGeometry = new THREE.BoxGeometry(3.6, 0.06, 3.6);
      const padMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false });
      const pad = new THREE.Mesh(padGeometry, padMat);
      pad.position.set(def.x, 0.03, def.z);
      pad.add(new THREE.LineSegments(new THREE.EdgesGeometry(padGeometry), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 })));
      this.padsGroup.add(pad);

      this.slots.push({ key: def.key, layer: def.layer, position, pad, padMat, pill: this.createPill(def.layer), node: null });
      box.expandByPoint(position);
    }

    // Caja de encuadre: todos los slots + margen de plataforma + altura de piezas y etiquetas
    box.min.set(box.min.x - PLATFORM_MARGIN, 0, box.min.z - PLATFORM_MARGIN);
    box.max.set(box.max.x + PLATFORM_MARGIN, NODE_BASE_Y + 3.4, box.max.z + PLATFORM_MARGIN);
    this.fitBox.copy(box);

    this.buildPlatform();
    this.layoutRoute = routeId;
    this.linksKey = '';
  }

  /** La infraestructura es la plataforma base que envuelve toda la cadena. */
  private buildPlatform(): void {
    this.platformGroup.children.slice().forEach(child => {
      this.platformGroup.remove(child);
      this.disposeObject(child);
    });

    const size = this.fitBox.getSize(new THREE.Vector3());
    const center = this.fitBox.getCenter(new THREE.Vector3());
    const geometry = new THREE.BoxGeometry(size.x, 0.35, size.z);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x03120d,
      emissive: 0x10b981,
      emissiveIntensity: 0.18,
      roughness: 0.6,
      metalness: 0.2,
      transparent: true,
      opacity: 0.9
    });
    const slab = new THREE.Mesh(geometry, mat);
    slab.position.y = -0.2;
    slab.receiveShadow = true;
    slab.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.9 })));

    this.platformGroup.add(slab);
    this.platformGroup.position.set(center.x, 0, center.z);
    this.platformSpawn = 0;
  }

  /* ───────────── Estado → escena ───────────── */

  private applyState(s: ViewState): void {
    this.built = s.built;
    this.controls.enabled = s.built;
    this.autoFit = true; // cada cambio de paso reencuadra toda la cadena

    if (s.routeId !== this.layoutRoute) this.rebuildLayout(s.routeId, s.steps);

    for (const slot of this.slots) {
      let optionId: string | null = null;
      let mode: 'preview' | 'confirmed' = 'confirmed';

      if (slot.key === 'client') {
        optionId = 'client';
      } else {
        const index = s.steps.findIndex(step => step.category === slot.key);
        if (s.built || index < s.step) {
          optionId = s.selection[slot.key] ?? null;
        } else if (index === s.step) {
          optionId = s.selectedId || null;
          mode = 'preview';
        }
      }
      this.setSlotPiece(slot, optionId, mode);
    }

    this.activeKey = s.built ? null : (s.steps[s.step]?.category ?? null);

    // Enlaces provisionales entre piezas de la cadena (el paso de conectores los reemplaza)
    const chain = this.chainSlots();
    const key = chain.map(slot => slot.key).join('>');
    if (key !== this.linksKey) {
      this.linksKey = key;
      this.rebuildLinks(chain);
    }
  }

  private setSlotPiece(slot: Slot, optionId: string | null, mode: 'preview' | 'confirmed'): void {
    if (!optionId) {
      this.removeNode(slot);
      this.refreshPill(slot, null, mode);
      return;
    }

    if (!slot.node || slot.node.optionId !== optionId) {
      this.removeNode(slot);
      slot.node = this.createNode(slot, optionId);
    }
    slot.node.targetOpacity = mode === 'preview' ? 0.8 : 1;
    slot.node.targetGlow = mode === 'preview' ? 2.6 : 1;
    this.refreshPill(slot, optionId, mode);
  }

  private chainSlots(): Slot[] {
    return COLUMN_ORDER.map(layer => this.slots.find(slot => slot.layer === layer)).filter(
      (slot): slot is Slot => !!slot && !!slot.node
    );
  }

  private rebuildLinks(chain: Slot[]): void {
    this.linksGroup.children.slice().forEach(child => {
      this.linksGroup.remove(child);
      this.disposeObject(child);
    });

    for (let i = 0; i < chain.length - 1; i++) {
      const a = chain[i].position.clone().setY(NODE_BASE_Y);
      const b = chain[i + 1].position.clone().setY(NODE_BASE_Y);
      const geometry = new THREE.BufferGeometry().setFromPoints([a, b]);
      this.linksGroup.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.7 })));
    }
  }

  /* ───────────── Piezas (modelos low-poly en piece-models.ts) ───────────── */

  private createNode(slot: Slot, optionId: string): NodeEntry {
    const option = OPTION_CATALOG[optionId];
    const color = LAYERS.find(l => l.id === slot.layer)?.color ?? 0x34d399; // color por capa
    const piece: PieceModel = buildPiece(modelKindFor(slot.key, optionId), color, option?.iconUrl);

    piece.group.rotation.y = Math.PI / 4; // de frente a la cámara isométrica
    const group = new THREE.Group();
    group.add(piece.group);
    group.position.set(slot.position.x, PIECE_Y + 4.5, slot.position.z); // cae desde arriba hasta su slot
    group.scale.setScalar(0.0001);
    this.nodesGroup.add(group);

    return {
      optionId,
      group,
      body: piece.group,
      materials: piece.materials,
      spawn: 0,
      phase: Math.random() * Math.PI * 2,
      opacity: 0,
      targetOpacity: 1,
      glow: 1,
      targetGlow: 1
    };
  }

  private removeNode(slot: Slot): void {
    if (!slot.node) return;
    this.nodesGroup.remove(slot.node.group);
    this.disposeObject(slot.node.group);
    slot.node = null;
  }

  private destroySlot(slot: Slot): void {
    this.removeNode(slot);
    this.padsGroup.remove(slot.pad);
    this.disposeObject(slot.pad);
    slot.pill.el.remove();
  }

  /* ───────────── Etiquetas (DOM sobre el canvas) ───────────── */

  private createPill(layer: LayerId): PillRefs {
    const el = document.createElement('div');
    el.className = 'sb3d-pill';
    el.style.setProperty('--layer', layerColor(layer));

    const icon = document.createElement('img');
    icon.className = 'sb3d-pill-icon';
    icon.alt = '';
    icon.width = 18;
    icon.height = 18;
    icon.addEventListener('error', () => (icon.style.display = 'none'));

    const text = document.createElement('span');
    text.className = 'sb3d-pill-text';
    const name = document.createElement('strong');
    const small = document.createElement('small');
    text.append(name, small);

    el.append(icon, text);
    this.labelsHost().nativeElement.appendChild(el);
    return { el, icon, name, layer: small, width: 120, key: '' };
  }

  private refreshPill(slot: Slot, optionId: string | null, mode: 'preview' | 'confirmed'): void {
    const pill = slot.pill;
    const key = `${optionId ?? ''}|${mode}`;
    if (pill.key === key) return;
    pill.key = key;

    const layerName = LAYER_LABEL[slot.layer] ?? '';
    const ghost = !optionId;
    pill.el.classList.toggle('is-ghost', ghost);
    pill.el.classList.toggle('is-preview', !ghost && mode === 'preview');
    pill.layer.hidden = ghost;

    if (ghost) {
      pill.name.textContent = layerName; // slot vacío: solo el nombre de la capa
      pill.icon.style.display = 'none';
    } else if (slot.key === 'client') {
      pill.name.textContent = 'Usuario';
      pill.layer.textContent = 'Cliente';
      pill.icon.style.display = 'none';
    } else {
      const option = OPTION_CATALOG[optionId];
      pill.name.textContent = option?.name ?? optionId;
      pill.layer.textContent = layerName;
      if (option?.iconUrl) {
        pill.icon.style.display = '';
        pill.icon.src = option.iconUrl;
      } else {
        pill.icon.style.display = 'none';
      }
    }

    pill.width = Math.ceil(pill.el.getBoundingClientRect().width);
  }

  /** Zona libre para etiquetas y encuadre: deja fuera el header y el panel del wizard. */
  private insets(): { left: number; top: number; right: number; bottom: number } {
    const wizardOnLeft = !this.built && this.width >= 900;
    return { left: wizardOnLeft ? 568 : 24, top: 96, right: 24, bottom: 24 };
  }

  private updatePills(): void {
    const ins = this.insets();
    const items: { slot: Slot; x: number; y: number; w: number }[] = [];

    for (const slot of this.slots) {
      this.tmp.copy(slot.position).setY(PIECE_Y + 3.7).project(this.camera);
      const x = (this.tmp.x * 0.5 + 0.5) * this.width;
      const y = (-this.tmp.y * 0.5 + 0.5) * this.height;
      const inside =
        x > ins.left - 30 && x < this.width - ins.right + 30 && y > ins.top - 30 && y < this.height - ins.bottom + 30;

      if (inside) {
        items.push({ slot, x, y, w: slot.pill.width });
      } else {
        slot.pill.el.style.opacity = '0';
      }
    }

    // Colisión: de arriba hacia abajo, cada etiqueta baja si choca con una ya colocada
    items.sort((a, b) => a.y - b.y);
    const placed: typeof items = [];
    for (const item of items) {
      for (const other of placed) {
        const overlapX = Math.abs(item.x - other.x) < (item.w + other.w) / 2 + 6;
        const overlapY = Math.abs(item.y - other.y) < PILL_H + 4;
        if (overlapX && overlapY) item.y = other.y + PILL_H + 4;
      }
      placed.push(item);
    }

    for (const item of items) {
      const x = clamp(item.x, ins.left + item.w / 2, this.width - ins.right - item.w / 2);
      const y = clamp(item.y, ins.top + PILL_H / 2, this.height - ins.bottom - PILL_H / 2);
      const el = item.slot.pill.el;
      el.style.transform = `translate3d(${Math.round(x - item.w / 2)}px, ${Math.round(y - PILL_H / 2)}px, 0)`;
      const node = item.slot.node;
      el.style.opacity = node ? String(Math.min(1, node.opacity * 1.25)) : '0.85';
    }
  }

  /* ───────────── Loop de animación ───────────── */

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
    this.autoFit = true;
  }

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);
    const t = performance.now();

    this.updateCamera();
    this.updateSlots(t);
    this.updatePlatform();
    this.updateParticles();

    this.renderer.render(this.scene, this.camera);
    this.updatePills();
  };

  /** Encuadra toda la caja de la cadena dentro de la zona libre, sin recortar. */
  private updateCamera(): void {
    if (this.autoFit && this.slots.length) {
      const k = 0.08;
      const ins = this.insets();
      const freeW = Math.max(this.width - ins.left - ins.right, 120);
      const freeH = Math.max(this.height - ins.top - ins.bottom, 120);

      // Extensión de la caja en el espacio de la cámara (derecha / arriba)
      this.camera.updateMatrixWorld();
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const x of [this.fitBox.min.x, this.fitBox.max.x]) {
        for (const y of [this.fitBox.min.y, this.fitBox.max.y]) {
          for (const z of [this.fitBox.min.z, this.fitBox.max.z]) {
            this.tmp.set(x, y, z).applyMatrix4(this.camera.matrixWorldInverse);
            minX = Math.min(minX, this.tmp.x);
            maxX = Math.max(maxX, this.tmp.x);
            minY = Math.min(minY, this.tmp.y);
            maxY = Math.max(maxY, this.tmp.y);
          }
        }
      }

      const aspect = this.width / this.height;
      const zoomW = (2 * FRUSTUM * aspect * (freeW / this.width)) / (maxX - minX);
      const zoomH = (2 * FRUSTUM * (freeH / this.height)) / (maxY - minY);
      const zoom = clamp(Math.min(zoomW, zoomH) * 0.96, 0.3, 3);

      // El foco se mueve al centro de la caja; la cámara se traslada igual para no cambiar el ángulo
      this.fitBox.getCenter(this.tmpCenter);
      this.tmp.copy(this.tmpCenter).sub(this.controls.target).multiplyScalar(k);
      this.controls.target.add(this.tmp);
      this.camera.position.add(this.tmp);

      this.camera.zoom += (zoom - this.camera.zoom) * k;
      this.shift.x += (ins.left + freeW / 2 - this.width / 2 - this.shift.x) * k;
      this.shift.y += (ins.top + freeH / 2 - this.height / 2 - this.shift.y) * k;
    }

    this.controls.update();
    this.camera.setViewOffset(this.width, this.height, -this.shift.x, -this.shift.y, this.width, this.height);
  }

  private updateSlots(t: number): void {
    for (const slot of this.slots) {
      const padTarget = slot.key === this.activeKey ? 0.5 : 0.18;
      slot.padMat.opacity += (padTarget - slot.padMat.opacity) * 0.12;

      const node = slot.node;
      if (!node) continue;

      node.spawn = Math.min(1, node.spawn + 0.035);
      node.group.scale.setScalar(Math.max(easeOutBack(node.spawn), 0.0001));
      node.group.position.y = PIECE_Y + (1 - node.spawn) ** 2 * 4.5 + Math.sin(t * 0.002 + node.phase) * 0.06 * node.spawn;
      node.body.rotation.y = Math.PI / 4 + Math.sin(t * 0.0008 + node.phase) * 0.2; // vaivén suave, sin dar la espalda

      node.opacity += (node.targetOpacity - node.opacity) * 0.12;
      node.glow += (node.targetGlow - node.glow) * 0.12;
      for (const mat of node.materials) {
        mat.opacity = node.opacity;
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.emissiveIntensity = ((mat.userData['base'] as number | undefined) ?? 0.1) * node.glow;
        }
      }
    }
  }

  private updatePlatform(): void {
    this.platformSpawn = Math.min(1, this.platformSpawn + 0.035);
    this.platformGroup.scale.setScalar(0.92 + 0.08 * Math.min(easeOutBack(this.platformSpawn), 1));
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
      materials.forEach(mat => mat.dispose());
    });
  }
}