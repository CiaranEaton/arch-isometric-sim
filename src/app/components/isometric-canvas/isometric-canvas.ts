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
import { PieceDetailService } from '../../services/piece-detail.service';
import { ConnectorLayer, LinkPlan, Protocol } from './connectors';
import { PieceModel, buildPiece, modelKindFor } from './piece-models';

/* ───────────────────────── Constantes ───────────────────────── */

const FRUSTUM = 12;
/** Isométrica clásica: mejor para zonas libres estrechas (móvil). */
const OFFSET_ISO = new THREE.Vector3(18, 18, 18);
/** Más de frente: la cadena queda casi horizontal, mejor para zonas libres anchas (escritorio). */
const OFFSET_WIDE = new THREE.Vector3(9, 17, 21);
const NODE_BASE_Y = 0.95;
const SPACING_X = 5.4;
const SPACING_Z = 4.4;
const PLATFORM_MARGIN = 3.4;
const PILL_H = 34;
const PARTICLE_COUNT = 140;
const INSET_CHECK_EVERY = 15; // frames entre mediciones de los paneles

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
  /** Brillo de reposo (preview > confirmada); hover y selección lo multiplican. */
  baseGlow: number;
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

interface Insets {
  left: number;
  top: number;
  right: number;
  bottom: number;
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

      /* Conectores: tooltip al pasar el mouse y leyenda de protocolos (se aparta de los paneles) */
      .sb3d-tip {
        position: absolute; left: 0; top: 0; opacity: 0; padding: 4px 10px; white-space: nowrap;
        font-size: 12px; color: #e2e8f0; background: rgba(3, 9, 14, 0.92);
        border: 1px solid; border-radius: 8px; transition: opacity 0.12s;
      }
      .sb3d-legend {
        position: absolute; right: calc(var(--ins-right, 0px) + 16px); bottom: calc(var(--ins-bottom, 0px) + 10px);
        display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px 12px; max-width: 60%;
        font-size: 11px; color: #cbd5e1;
      }
      .sb3d-legend span { display: flex; align-items: center; gap: 6px; }
      .sb3d-legend i { display: inline-block; width: 14px; height: 4px; border-radius: 2px; }
    `
  ],
  template: `
    <div #host class="absolute inset-0"></div>
    <div #labelsHost class="sb3d-labels" aria-hidden="true"></div>
  `
})
export class IsometricCanvasComponent implements AfterViewInit, OnDestroy {
  private readonly state = inject(ArchitectureStateService);
  private readonly detail = inject(PieceDetailService);
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
  private particles!: THREE.Points;
  private readonly particleSpeeds = new Float32Array(PARTICLE_COUNT);

  // conectores (tubos, flechas, partículas, tooltip y leyenda)
  private connectors!: ConnectorLayer;
  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();

  // layout
  private slots: Slot[] = [];
  private layoutRoute = '';
  private readonly fitBox = new THREE.Box3();
  private platformSpawn = 1;

  // estado de vista
  private built = false;
  private activeKey: string | null = null;
  private hoverSlot: Slot | null = null;
  private readonly downPos = new THREE.Vector2();

  // cámara
  private autoFit = true; // reencuadra zoom, foco y desplazamiento
  private autoAngle = true; // elige el ángulo según la proporción de la zona libre
  private readonly shift = new THREE.Vector2(0, 0);
  private readonly tmp = new THREE.Vector3();
  private readonly tmpCenter = new THREE.Vector3();
  private readonly tmpOffset = new THREE.Vector3();

  // zonas ocupadas por paneles (header, wizard, barra inferior, detalle), medidas del DOM
  private measuredInsets: Insets = { left: 0, top: 0, right: 0, bottom: 0 };
  private insetTick = 0;

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

      this.connectors = new ConnectorLayer(this.labelsHost().nativeElement);
      this.scene.add(this.connectors.group);
      const dom = this.renderer.domElement;
      dom.addEventListener('pointermove', this.onPointerMove);
      dom.addEventListener('pointerleave', this.onPointerLeave);
      dom.addEventListener('pointerdown', this.onPointerDown);
      dom.addEventListener('pointerup', this.onPointerUp);

      this.createGrid();
      this.createParticles();

      this.measureInsets(); // primera medición antes de encuadrar
      this.applyInsetVars();

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

    if (this.renderer) {
      const dom = this.renderer.domElement;
      dom.removeEventListener('pointermove', this.onPointerMove);
      dom.removeEventListener('pointerleave', this.onPointerLeave);
      dom.removeEventListener('pointerdown', this.onPointerDown);
      dom.removeEventListener('pointerup', this.onPointerUp);
    }

    this.slots.forEach(slot => this.destroySlot(slot));
    this.slots = [];
    this.disposeObject(this.platformGroup);
    this.connectors?.dispose();
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
    this.camera.position.copy(OFFSET_ISO);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width, this.height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none'; // el gesto es del 3D, no del scroll de la página
    el.appendChild(this.renderer.domElement);

    // Órbita: se habilita en la vista final (en el wizard el panel ocupa la pantalla)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minZoom = 0.3;
    this.controls.maxZoom = 4;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = Math.PI / 2.15; // no deja ver por debajo del piso
    this.controls.enabled = false;
    this.controls.target.set(0, 0, 0);
    this.controls.addEventListener('start', () => {
      // el usuario toma el control: dejamos de pelear con su zoom y su ángulo
      this.autoFit = false;
      this.autoAngle = false;
    });
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

    this.scene.add(this.platformGroup, this.padsGroup, this.nodesGroup);
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

  /* ───────────── Zonas ocupadas por paneles ───────────── */

  /**
   * Lee del DOM los paneles marcados con `data-avoid` y calcula cuánto espacio ocupa cada borde.
   * Devuelve true si algo cambió (un panel se abrió, cerró o cambió de tamaño).
   */
  private measureInsets(): boolean {
    const canvas = this.host().nativeElement.getBoundingClientRect();
    const next: Insets = { left: 0, top: 0, right: 0, bottom: 0 };

    document.querySelectorAll<HTMLElement>('[data-avoid]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;

      if (r.width > canvas.width * 0.7) {
        // franja de lado a lado: header arriba o barra / hoja inferior abajo
        if (r.top - canvas.top < canvas.height / 2) next.top = Math.max(next.top, r.bottom - canvas.top);
        else next.bottom = Math.max(next.bottom, canvas.bottom - r.top);
      } else if (r.left - canvas.left + r.width / 2 < canvas.width / 2) {
        next.left = Math.max(next.left, r.right - canvas.left);
      } else {
        next.right = Math.max(next.right, canvas.right - r.left);
      }
    });

    const m = this.measuredInsets;
    const changed =
      Math.abs(next.left - m.left) > 2 ||
      Math.abs(next.top - m.top) > 2 ||
      Math.abs(next.right - m.right) > 2 ||
      Math.abs(next.bottom - m.bottom) > 2;
    if (changed) this.measuredInsets = next;
    return changed;
  }

  /** Expone los márgenes al CSS para que la leyenda no quede detrás de un panel. */
  private applyInsetVars(): void {
    const style = this.labelsHost().nativeElement.style;
    style.setProperty('--ins-right', `${this.measuredInsets.right}px`);
    style.setProperty('--ins-bottom', `${this.measuredInsets.bottom}px`);
  }

  /** Zona libre = pantalla menos paneles, con un respiro para que nada quede pegado al borde. */
  private insets(): Insets {
    const m = this.measuredInsets;
    return { left: m.left + 20, top: m.top + 44, right: m.right + 20, bottom: m.bottom + 20 };
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
    this.hoverSlot = null;

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
    this.autoAngle = true;

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

    // Conectores entre las piezas de la cadena: solo se reconstruyen si cambió la estructura
    this.connectors.set(this.planLinks(this.chainSlots()));
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
    slot.node.baseGlow = mode === 'preview' ? 2.6 : 1;
    this.refreshPill(slot, optionId, mode);
  }

  private chainSlots(): Slot[] {
    return COLUMN_ORDER.map(layer => this.slots.find(slot => slot.layer === layer)).filter(
      (slot): slot is Slot => !!slot && !!slot.node
    );
  }

  /** Un enlace por cada par de piezas consecutivas; el sentido es el del request (izquierda → derecha). */
  private planLinks(chain: Slot[]): LinkPlan[] {
    const end = (slot: Slot): LinkPlan['from'] => {
      const id = slot.node!.optionId;
      return {
        position: slot.position,
        name: slot.layer === 'client' ? 'Usuario' : (OPTION_CATALOG[id]?.name ?? id),
        optionId: id
      };
    };

    return chain.slice(1).map((to, i) => {
      const protocol: Protocol = to.layer === 'data' ? 'sql' : to.layer === 'auth' ? 'token' : 'http';
      return { from: end(chain[i]), to: end(to), protocol };
    });
  }

  /* ───────────── Mouse: conectores y piezas ───────────── */

  private updateRay(e: PointerEvent): { x: number; y: number } {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.ndc.set((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1);
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(this.ndc, this.camera);
    return { x, y };
  }

  /** Pieza bajo el puntero (el cliente no abre detalle). */
  private pickSlot(): Slot | null {
    const bySlot = new Map<THREE.Object3D, Slot>();
    for (const slot of this.slots) {
      if (slot.node && slot.key !== 'client') bySlot.set(slot.node.group, slot);
    }

    const hit = this.raycaster.intersectObjects([...bySlot.keys()], true)[0];
    let object: THREE.Object3D | null = hit?.object ?? null;
    while (object && !bySlot.has(object)) object = object.parent;
    return object ? (bySlot.get(object) ?? null) : null;
  }

  private onPointerMove = (e: PointerEvent): void => {
    const { x, y } = this.updateRay(e);
    const overLink = this.connectors.hover(this.raycaster, x, y);

    // El detalle de piezas solo existe en la vista final
    this.hoverSlot = !overLink && this.built ? this.pickSlot() : null;
    this.renderer.domElement.style.cursor = overLink ? 'help' : this.hoverSlot ? 'pointer' : '';
  };

  private onPointerLeave = (): void => {
    this.connectors.leave();
    this.hoverSlot = null;
    this.renderer.domElement.style.cursor = '';
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.downPos.set(e.clientX, e.clientY);
  };

  /** Un clic (sin arrastre, que es órbita) abre el detalle de la pieza; clic en el vacío lo cierra. */
  private onPointerUp = (e: PointerEvent): void => {
    if (!this.built || Math.hypot(e.clientX - this.downPos.x, e.clientY - this.downPos.y) > 5) return;

    this.updateRay(e);
    const slot = this.pickSlot();
    this.ngZone.run(() => (slot ? this.detail.toggle(slot.key) : this.detail.close()));
  };

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
      baseGlow: 1
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

    this.measureInsets();
    this.applyInsetVars();
    this.autoFit = true;
    this.autoAngle = true; // p. ej. al girar el teléfono cambia la proporción
  }

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);
    const t = performance.now();

    this.updateCamera();
    this.updateSlots(t);
    this.updatePlatform();
    this.updateParticles();
    this.connectors.update();

    this.renderer.render(this.scene, this.camera);
    this.updatePills();
  };

  /** Encuadra toda la caja de la cadena dentro de la zona libre (pantalla menos paneles), sin recortar. */
  private updateCamera(): void {
    // Los paneles se abren, cierran y cambian de alto: re-medimos cada tanto
    if (++this.insetTick % INSET_CHECK_EVERY === 0 && this.measureInsets()) {
      this.applyInsetVars();
      this.autoFit = true;
    }

    if (this.autoFit && this.slots.length) {
      const k = 0.08;
      const ins = this.insets();
      const freeW = Math.max(this.width - ins.left - ins.right, 120);
      const freeH = Math.max(this.height - ins.top - ins.bottom, 120);

      // Ángulo: zona ancha → casi de frente (cadena horizontal); estrecha → isométrica
      if (this.autoAngle) {
        const wide = freeW / freeH > 1.25;
        this.tmpOffset.copy(this.camera.position).sub(this.controls.target).lerp(wide ? OFFSET_WIDE : OFFSET_ISO, k);
        this.camera.position.copy(this.controls.target).add(this.tmpOffset);
      }
      this.controls.update(); // reorienta la cámara hacia el foco
      this.camera.updateMatrixWorld();

      // Extensión de la caja en el espacio de la cámara (derecha / arriba)
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
      const zoom = clamp(Math.min(zoomW, zoomH), 0.3, 3);

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
    const selected = this.detail.selected();

    for (const slot of this.slots) {
      const padTarget = slot.key === this.activeKey || slot.key === selected ? 0.5 : 0.18;
      slot.padMat.opacity += (padTarget - slot.padMat.opacity) * 0.12;

      const node = slot.node;
      if (!node) continue;

      node.spawn = Math.min(1, node.spawn + 0.035);
      node.group.scale.setScalar(Math.max(easeOutBack(node.spawn), 0.0001));
      node.group.position.y = PIECE_Y + (1 - node.spawn) ** 2 * 4.5 + Math.sin(t * 0.002 + node.phase) * 0.06 * node.spawn;
      node.body.rotation.y = Math.PI / 4 + Math.sin(t * 0.0008 + node.phase) * 0.2; // vaivén suave, sin dar la espalda

      // Brillo: reposo × (selección o hover)
      const boost = this.built && slot.key === selected ? 2.2 : slot.node && this.hoverSlot === slot ? 1.7 : 1;
      node.opacity += (node.targetOpacity - node.opacity) * 0.12;
      node.glow += (node.baseGlow * boost - node.glow) * 0.12;
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