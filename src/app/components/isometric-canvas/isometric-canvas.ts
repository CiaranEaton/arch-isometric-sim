import { Component, ElementRef, OnInit, ViewChild, OnDestroy, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { ArchitectureSelection } from '../architecture-wizard/architecture-wizard';

interface Node3D {
  id: string;
  role: string;
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
    <div class="relative w-full h-[520px] bg-slate-950 border border-cyan-500/40 rounded-2xl overflow-hidden shadow-2xl shadow-cyan-950/60">
      <div #canvasContainer class="w-full h-full cursor-grab active:cursor-grabbing"></div>
      
      <!-- HUD Táctico en el Canvas -->
      <div class="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 px-3 py-1.5 rounded-lg font-mono text-[10px] text-cyan-400 flex items-center gap-2 pointer-events-none shadow-lg">
        <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
        <span>HOLO-GRID 3D ACTIVE | 6 NODES ONLINE</span>
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
    const d = 11;
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);
    this.camera.position.set(20, 20, 20);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.nativeElement.appendChild(this.renderer.domElement);

    // Iluminación neón inmersiva
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x22d3ee, 1.8);
    dirLight1.position.set(15, 25, 15);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa855f7, 1.2);
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
    this.nodesGroup.clear();
    this.cablesGroup.clear();
    this.pulses = [];

    if (!this.architecture) return;

    // Ruta secuencial precisa
    const nodesMap: Node3D[] = [
      { id: 'frontend', role: 'CLIENTE', label: this.architecture.frontend.toUpperCase(), color: 0xef4444, position: new THREE.Vector3(-6, 0, 0) },
      { id: 'auth', role: 'SEGURIDAD', label: this.architecture.auth.toUpperCase(), color: 0xf97316, position: new THREE.Vector3(-2, 0, -3.5) },
      { id: 'backend', role: 'BACKEND', label: this.architecture.backend.toUpperCase(), color: 0xf43f5e, position: new THREE.Vector3(1, 0, 0) },
      { id: 'database', role: 'DATABASE', label: this.architecture.database.toUpperCase(), color: 0x10b981, position: new THREE.Vector3(5, 0, 0) },
      { id: 'devops', role: 'DEVOPS', label: this.architecture.devops.toUpperCase(), color: 0x0ea5e9, position: new THREE.Vector3(1, 0, 4.5) }
    ];

    // Crear cubos 3D con estilo de ítem flotante
    nodesMap.forEach(node => {
      const geometry = new THREE.BoxGeometry(2.2, 1.4, 2.2);
      const material = new THREE.MeshStandardMaterial({
        color: node.color,
        roughness: 0.2,
        metalness: 0.9
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(node.position);
      mesh.position.y = 0.7;
      node.mesh = mesh;

      // Marco brillante
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      mesh.add(wireframe);

      this.nodesGroup.add(mesh);
    });

    // Conectar cables de datos fluidos
    this.connectNodes(nodesMap[0], nodesMap[1]);
    this.connectNodes(nodesMap[0], nodesMap[2]);
    this.connectNodes(nodesMap[1], nodesMap[2]);
    this.connectNodes(nodesMap[2], nodesMap[3]);
    this.connectNodes(nodesMap[2], nodesMap[4]);
  }

  private connectNodes(nodeA: Node3D, nodeB: Node3D): void {
    const start = nodeA.position.clone().add(new THREE.Vector3(0, 0.7, 0));
    const end = nodeB.position.clone().add(new THREE.Vector3(0, 0.7, 0));

    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y += 2.0;

    const curve = new THREE.CatmullRomCurve3([start, mid, end]);

    const tubeGeometry = new THREE.TubeGeometry(curve, 32, 0.05, 8, false);
    const tubeMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    this.cablesGroup.add(tube);

    // Pulso de energía viajero
    const pulseGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);

    this.cablesGroup.add(pulseMesh);

    this.pulses.push({
      mesh: pulseMesh,
      curve: curve,
      progress: Math.random(),
      speed: 0.008 + Math.random() * 0.004
    });
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    // Movimiento suave de flotación tipo ítem de videojuego
    this.nodesGroup.children.forEach((child, index) => {
      child.position.y = 0.7 + Math.sin(Date.now() * 0.0025 + index * 1.5) * 0.12;
      child.rotation.y += 0.005; // Rotación sutil sobre su eje
    });

    // Animar pulsos de datos
    this.pulses.forEach(p => {
      p.progress += p.speed;
      if (p.progress > 1) p.progress = 0;
      const point = p.curve.getPoint(p.progress);
      p.mesh.position.copy(point);
    });

    this.renderer.render(this.scene, this.camera);
  };
}