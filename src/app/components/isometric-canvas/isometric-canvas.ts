import { Component, ElementRef, OnInit, ViewChild, OnDestroy, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { ArchitectureSelection } from '../architecture-wizard/architecture-wizard';

interface Node3D {
  id: string;
  label: string;
  color: number;
  position: THREE.Vector3;
  mesh?: THREE.Mesh;
}

@Component({
  selector: 'app-isometric-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-[650px] bg-slate-950 border border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl">
      <div #canvasContainer class="w-full h-full cursor-grab active:cursor-grabbing"></div>
      
      <!-- Overlay de Estado Cyberpunk -->
      <div class="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 px-3 py-2 rounded-lg font-mono text-[11px] text-cyan-400 flex items-center gap-2 pointer-events-none">
        <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
        <span>ENGINE 3D: ONLINE | NODES: {{ activeNodesCount }} | FLOW: ACTIVE</span>
      </div>
    </div>
  `
})
export class IsometricCanvasComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('canvasContainer', { static: true }) container!: ElementRef;
  @Input() architecture: ArchitectureSelection | null = null;

  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;

  private nodesGroup = new THREE.Group();
  private cablesGroup = new THREE.Group();
  private pulses: { mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3; progress: number; speed: number }[] = [];

  activeNodesCount = 0;

  ngOnInit(): void {
    this.initThree();
    this.createGrid();
    if (this.architecture) {
      this.buildArchitecture3D();
    }
    this.animate();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['architecture'] && this.scene) {
      this.buildArchitecture3D();
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  private initThree(): void {
    const width = this.container.nativeElement.clientWidth;
    const height = this.container.nativeElement.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#020617');

    const aspect = width / height;
    const d = 12;
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);
    this.camera.position.set(20, 20, 20);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.nativeElement.appendChild(this.renderer.domElement);

    // Iluminación
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x22d3ee, 1.2);
    dirLight1.position.set(15, 25, 15);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa855f7, 0.8);
    dirLight2.position.set(-15, 15, -15);
    this.scene.add(dirLight2);

    this.scene.add(this.nodesGroup);
    this.scene.add(this.cablesGroup);
  }

  private createGrid(): void {
    const gridHelper = new THREE.GridHelper(24, 24, 0x22d3ee, 0x1e293b);
    gridHelper.position.y = -0.01;
    this.scene.add(gridHelper);
  }

  private buildArchitecture3D(): void {
    // Limpiar nodos y cables anteriores
    this.nodesGroup.clear();
    this.cablesGroup.clear();
    this.pulses = [];

    if (!this.architecture) return;

    // Mapeo de Nodos con posiciones en la cuadrícula isométrica
    const nodesMap: Node3D[] = [
      { id: 'frontend', label: this.architecture.frontend.toUpperCase(), color: 0xef4444, position: new THREE.Vector3(-6, 0, 4) },
      { id: 'backend', label: this.architecture.backend.toUpperCase(), color: 0xf43f5e, position: new THREE.Vector3(0, 0, 0) },
      { id: 'database', label: this.architecture.database.toUpperCase(), color: 0x10b981, position: new THREE.Vector3(6, 0, -4) },
      { id: 'auth', label: this.architecture.auth.toUpperCase(), color: 0xf97316, position: new THREE.Vector3(-3, 0, -5) },
      { id: 'devops', label: this.architecture.devops.toUpperCase(), color: 0x0ea5e9, position: new THREE.Vector3(5, 0, 4) }
    ];

    this.activeNodesCount = nodesMap.length;

    // Crear Bloques 3D de Servidores
    nodesMap.forEach(node => {
      const geometry = new THREE.BoxGeometry(2.2, 1.8, 2.2);
      const material = new THREE.MeshStandardMaterial({
        color: node.color,
        roughness: 0.2,
        metalness: 0.8,
        wireframe: false
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(node.position);
      mesh.position.y = 0.9; // Elevar sobre la cuadrícula
      node.mesh = mesh;

      // Bordes brillantes neón
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      mesh.add(wireframe);

      this.nodesGroup.add(mesh);
    });

    // Crear Conexiones / Cables de Datos Animados entre los componentes
    this.connectNodes(nodesMap[0], nodesMap[1]); // Frontend -> Backend
    this.connectNodes(nodesMap[1], nodesMap[2]); // Backend -> Database
    this.connectNodes(nodesMap[1], nodesMap[3]); // Backend -> Auth
    this.connectNodes(nodesMap[0], nodesMap[4]); // Frontend -> DevOps/Vercel
  }

  private connectNodes(nodeA: Node3D, nodeB: Node3D): void {
    const start = nodeA.position.clone().add(new THREE.Vector3(0, 0.9, 0));
    const end = nodeB.position.clone().add(new THREE.Vector3(0, 0.9, 0));

    // Curva parábola para el cable estilo fibra óptica
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y += 2.5; // Elevación del cable

    const curve = new THREE.CatmullRomCurve3([start, mid, end]);

    // Renderizar Tubo 3D
    const tubeGeometry = new THREE.TubeGeometry(curve, 32, 0.08, 8, false);
    const tubeMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    this.cablesGroup.add(tube);

    // Crear pulso luminoso flotante que viaja por el cable
    const pulseGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);

    this.cablesGroup.add(pulseMesh);

    this.pulses.push({
      mesh: pulseMesh,
      curve: curve,
      progress: Math.random(),
      speed: 0.008 + Math.random() * 0.005
    });
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    // Animación de los pulsos de datos sobre los cables
    this.pulses.forEach(p => {
      p.progress += p.speed;
      if (p.progress > 1) p.progress = 0;
      const point = p.curve.getPoint(p.progress);
      p.mesh.position.copy(point);
    });

    // Rotación sutil de la escena para dinamismo 3D
    this.nodesGroup.children.forEach((child, index) => {
      child.position.y = 0.9 + Math.sin(Date.now() * 0.003 + index) * 0.08;
    });

    this.renderer.render(this.scene, this.camera);
  };
}