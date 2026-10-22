import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IsometricCanvasComponent } from './components/isometric-canvas/isometric-canvas';
import { ArchitectureWizardComponent, ArchitectureSelection } from './components/architecture-wizard/architecture-wizard';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, IsometricCanvasComponent, ArchitectureWizardComponent],
  template: `
    <main class="min-h-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-start p-6 relative overflow-hidden font-sans gap-8">
      
      <!-- Efectos de luz cyberpunk de fondo -->
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

      <!-- Header principal -->
      <div class="relative z-10 max-w-5xl w-full bg-slate-900/85 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 shadow-2xl shadow-cyan-950/50 transition-all duration-500">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full bg-cyan-400 animate-ping shadow-[0_0_10px_#22d3ee]"></div>
            <span class="text-xs uppercase tracking-widest text-cyan-400 font-mono">System Status: Holographic Matrix Online</span>
          </div>
          <span class="text-xs text-slate-400 font-mono">Cyber Architecture Engine v2.5</span>
        </div>

        <h1 class="text-2xl font-extrabold tracking-tight text-white mb-2">
          CYBER ARCHITECTURE <span class="text-cyan-400">BUILDER</span>
        </h1>
        
        <p class="text-slate-400 text-sm leading-relaxed">
          Diseña tu infraestructura en tiempo real. Selecciona componentes y observa cómo la matriz 3D calcula la ruta de datos y compatibilidad táctica.
        </p>
      </div>

      <!-- FASE 1: Wizard Interactivo con Vista Previa -->
      <div *ngIf="!isBuilt" class="relative z-10 max-w-5xl w-full transition-all duration-700 transform">
        <app-architecture-wizard (architectureComplete)="onArchitectureSelected($event)"></app-architecture-wizard>
      </div>

      <!-- FASE 2: Pantalla de Zoom / Despliegue 3D Completo con HUD Laterales -->
      <div *ngIf="isBuilt" class="relative z-10 max-w-6xl w-full flex flex-col gap-6 animate-fade-in transition-all duration-700 transform scale-100">
        
        <!-- Barra de Estado Superior -->
        <div class="bg-slate-900/90 border border-emerald-500/40 p-4 rounded-xl flex flex-wrap items-center justify-between font-mono text-xs shadow-xl backdrop-blur-md">
          <div class="flex items-center gap-3">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="text-emerald-400 font-bold">MATRIZ DESPLEGADA: {{ selectedArchitecture?.architectureType?.toUpperCase() }}</span>
          </div>
          <button (click)="resetBuilder()" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded-lg transition-all text-[11px] cursor-pointer">
            ⚙️ RECONFIGURAR STACK
          </button>
        </div>

        <!-- Layout Principal: Canvas 3D + Paneles HUD Laterales -->
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          <!-- Panel Izquierdo: Resumen de Cliente y Seguridad -->
          <div class="flex flex-col gap-4">
            <div class="bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 p-4 rounded-xl shadow-lg">
              <span class="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">01. Capa Cliente</span>
              <h3 class="font-bold text-white text-sm mt-1">{{ selectedArchitecture?.frontend | uppercase }}</h3>
              <p class="text-xs text-slate-400 mt-2 leading-relaxed">Interfaz modular de alto rendimiento con renderizado acelerado por GPU.</p>
            </div>

            <div class="bg-slate-900/80 backdrop-blur-md border border-orange-500/30 p-4 rounded-xl shadow-lg">
              <span class="text-[10px] font-mono text-orange-400 uppercase tracking-widest">02. Seguridad & Auth</span>
              <h3 class="font-bold text-white text-sm mt-1">{{ selectedArchitecture?.auth | uppercase }}</h3>
              <p class="text-xs text-slate-400 mt-2 leading-relaxed">Gestión de identidad cifrada con tokens JWT y sesiones seguras.</p>
            </div>
          </div>

          <!-- Centro: El Motor 3D Isométrico (Ocupa 2 columnas) -->
          <div class="lg:col-span-2">
            <app-isometric-canvas [architecture]="selectedArchitecture"></app-isometric-canvas>
          </div>

          <!-- Panel Derecho: Backend, Base de Datos y DevOps -->
          <div class="flex flex-col gap-4">
            <div class="bg-slate-900/80 backdrop-blur-md border border-rose-500/30 p-4 rounded-xl shadow-lg">
              <span class="text-[10px] font-mono text-rose-400 uppercase tracking-widest">03. Backend Core</span>
              <h3 class="font-bold text-white text-sm mt-1">{{ selectedArchitecture?.backend | uppercase }}</h3>
              <p class="text-xs text-slate-400 mt-2 leading-relaxed">Servidor modular basado en TypeScript con inyección de dependencias.</p>
            </div>

            <div class="bg-slate-900/80 backdrop-blur-md border border-emerald-500/30 p-4 rounded-xl shadow-lg">
              <span class="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">04. Almacenamiento & Cloud</span>
              <h3 class="font-bold text-white text-sm mt-1">{{ selectedArchitecture?.database | uppercase }}</h3>
              <p class="text-xs text-slate-400 mt-2 leading-relaxed">Base de datos transaccional con sincronización de datos en tiempo real.</p>
            </div>
          </div>

        </div>

      </div>

    </main>
  `
})
export class App {
  title = 'arch-isometric-sim';
  selectedArchitecture: ArchitectureSelection | null = null;
  isBuilt = false;

  onArchitectureSelected(selection: ArchitectureSelection): void {
    this.selectedArchitecture = selection;
    this.isBuilt = true; // Activa el zoom/transición hacia el canvas completo
  }

  resetBuilder(): void {
    this.isBuilt = false;
  }
}