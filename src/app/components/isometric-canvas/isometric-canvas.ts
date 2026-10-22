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
  stepUnlock: number;
  mesh?: THREE.Mesh;
}

@Component({
  selector: 'app-isometric-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-full min-h-[450px] bg-transparent overflow-hidden">
      <div #canvasContainer class="w-full h-full cursor-grab active:cursor-grabbing"></div>
    </div>
  `
})
export class IsometricCanvasComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('canvasContainer', { static: true }) container!: ElementRef;
  @Input() architecture: ArchitectureSelection | null = null;
  @Input() currentStep: number = 0;
  @Input() isFinalView: boolean = false;

  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;

  private nodesGroup = new THREE.Group();
  private cablesGroup = new THREE.Group();
  private pulses: { mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3; progress: number; speed: number }[] = [];

  private targetCameraPos = new THREE.Vector3(20, 20, 20);

  ngOnInit(): void {
    this.initThree();
    this.createGrid();
    this.buildArchitecture3D();
    this.animate();
    window.addEventListener('resize', this.onWindowResize);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['architecture'] || changes['currentStep'] || changes['isFinalView']) && this.scene) {
      this.buildArchitecture3D();
      this.updateCameraTargetForStep();
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  private onWindowResize = (): void => {
    if (!this.container || !this.renderer) return;
    const width = this.container.nativeElement.clientWidth;
    const height = this.container.nativeElement.clientHeight;
    const aspect = width / height;
    const d = 12;
    this.camera.left = -d * aspect;
    this.camera.right = d * aspect;
    this.camera.top = d;
    this.camera.bottom = -d;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private initThree(): void {
    const width = this.container.nativeElement.clientWidth;
    const height = this.container.nativeElement.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = null; // Transparente para unirse al fondo general

    const aspect = width / height;
    const d = 12;
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);
    this.camera.position.set(20, 20, 20);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.nativeElement.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x10b981, 2.0);
    dirLight1.position.set(15, 25, 15);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x22d3ee, 1.5);
    dirLight2.position.set(-15, 15, -15);
    this.scene.add(dirLight2);

    this.scene.add(this.nodesGroup);
    this.scene.add(this.cablesGroup);
  }

  private createGrid(): void {
    const gridHelper = new THREE.GridHelper(28, 28, 0x10b981, 0x064e3b);
    gridHelper.position.y = -0.01;
    this.scene.add(gridHelper);
  }

  private updateCameraTargetForStep(): void {
    if (this.isFinalView) {
      this.targetCameraPos.set(18, 22, 18);
      return;
    }

    switch (this.currentStep) {
      case 0: this.targetCameraPos.set(14, 18, 16); break;
      case 1: this.targetCameraPos.set(6, 15, 22); break; // Frontend
      case 2: this.targetCameraPos.set(16, 20, 16); break; // Backend
      case 3: this.targetCameraPos.set(24, 16, 12); break; // Database
      case 4: this.targetCameraPos.set(10, 22, 24); break; // Auth
      case 5: this.targetCameraPos.set(18, 24, 18); break; // DevOps
      default: this.targetCameraPos.set(20, 20, 20);
    }
  }

  private buildArchitecture3D(): void {
    this.nodesGroup.clear();
    this.cablesGroup.clear();
    this.pulses = [];

    if (!this.architecture) return;

    const allNodes: Node3D[] = [
      { id: 'frontend', role: 'CLIENTE', label: (this.architecture.frontend || 'ANGULAR').toUpperCase(), color: 0xef4444, position: new THREE.Vector3(-6, 0, 0), stepUnlock: 1 },
      { id: 'backend', role: 'BACKEND', label: (this.architecture.backend || 'NESTJS').toUpperCase(), color: 0xf43f5e, position: new THREE.Vector3(1, 0, 0), stepUnlock: 2 },
      { id: 'database', role: 'DATABASE', label: (this.architecture.database || 'SUPABASE').toUpperCase(), color: 0x10b981, position: new THREE.Vector3(5, 0, 0), stepUnlock: 3 },
      { id: 'auth', role: 'SEGURIDAD', label: (this.architecture.auth || 'AWS').toUpperCase(), color: 0xf97316, position: new THREE.Vector3(-2, 0, -3.5), stepUnlock: 4 },
      { id: 'devops', role: 'DEVOPS', label: (this.architecture.devops || 'DOCKER').toUpperCase(), color: 0x0ea5e9, position: new THREE.Vector3(1, 0, 4.5), stepUnlock: 5 }
    ];

    const visibleNodes = allNodes.filter(node => this.isFinalView || this.currentStep >= node.stepUnlock);

    visibleNodes.forEach(node => {
      const geometry = new THREE.BoxGeometry(2.2, 1.4, 2.2);
      const material = new THREE.MeshStandardMaterial({
        color: node.color,
        roughness: 0.2,
        metalness: 0.85
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(node.position);
      mesh.position.y = 0.7;
      node.mesh = mesh;

      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x34d399, linewidth: 2 });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      mesh.add(wireframe);

      this.nodesGroup.add(mesh);
    });

    const hasNode = (id: string) => visibleNodes.some(n => n.id === id);

    if (hasNode('frontend') && hasNode('auth')) {
      this.connectNodes(visibleNodes.find(n => n.id === 'frontend')!, visibleNodes.find(n => n.id === 'auth')!);
    }
    if (hasNode('frontend') && hasNode('backend')) {
      this.connectNodes(visibleNodes.find(n => n.id === 'frontend')!, visibleNodes.find(n => n.id === 'backend')!);
    }
    if (hasNode('auth') && hasNode('backend')) {
      this.connectNodes(visibleNodes.find(n => n.id === 'auth')!, visibleNodes.find(n => n.id === 'backend')!);
    }
    if (hasNode('backend') && hasNode('database')) {
      this.connectNodes(visibleNodes.find(n => n.id === 'backend')!, visibleNodes.find(n => n.id === 'database')!);
    }
    if (hasNode('backend') && hasNode('devops')) {
      this.connectNodes(visibleNodes.find(n => n.id === 'backend')!, visibleNodes.find(n => n.id === 'devops')!);
    }
  }

  private connectNodes(nodeA: Node3D, nodeB: Node3D): void {
    const start = nodeA.position.clone().add(new THREE.Vector3(0, 0.7, 0));
    const end = nodeB.position.clone().add(new THREE.Vector3(0, 0.7, 0));

    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y += 2.0;

    const curve = new THREE.CatmullRomCurve3([start, mid, end]);

    const tubeGeometry = new THREE.TubeGeometry(curve, 32, 0.05, 8, false);
    const tubeMaterial = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    this.cablesGroup.add(tube);

    const pulseGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
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

    this.camera.position.lerp(this.targetCameraPos, 0.06);
    this.camera.lookAt(0, 0, 0);

    this.nodesGroup.children.forEach((child, index) => {
      child.position.y = 0.7 + Math.sin(Date.now() * 0.0025 + index * 1.5) * 0.12;
      child.rotation.y += 0.005;
    });

    this.pulses.forEach(p => {
      p.progress += p.speed;
      if (p.progress > 1) p.progress = 0;
      const point = p.curve.getPoint(p.progress);
      p.mesh.position.copy(point);
    });

    this.renderer.render(this.scene, this.camera);
  };
}