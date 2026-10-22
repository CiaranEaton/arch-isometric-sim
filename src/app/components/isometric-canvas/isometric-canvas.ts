import { Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';

@Component({
  selector: 'app-isometric-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #canvasContainer class="relative w-full h-[600px] bg-slate-950 border border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl">
      <!-- Aquí vivirá el canvas 3D -->
    </div>
  `
})
export class IsometricCanvasComponent implements OnInit, OnDestroy {
  @ViewChild('canvasContainer', { static: true }) container!: ElementRef;

  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;

  ngOnInit(): void {
    this.initThree();
    this.createGrid();
    this.animate();
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

    // 1. Escena
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#020617');

    // 2. Cámara Ortográfica (Clave para perspectiva isométrica pura sin deformación de perspectiva)
    const aspect = width / height;
    const d = 10;
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);
    
    // Posicionamiento diagonal clásico estilo estrategia/MOBA
    this.camera.position.set(20, 20, 20);
    this.camera.lookAt(0, 0, 0);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.nativeElement.appendChild(this.renderer.domElement);

    // Luz ambiental y direccional para dar relieve industrial
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x22d3ee, 1);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);
  }

  private createGrid(): void {
    // Cuadrícula base estilo cyberpunk
    const gridHelper = new THREE.GridHelper(20, 20, 0x22d3ee, 0x1e293b);
    this.scene.add(gridHelper);
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    this.renderer.render(this.scene, this.camera);
  };
}