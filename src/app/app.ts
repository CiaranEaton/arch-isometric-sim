import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IsometricCanvasComponent } from './components/isometric-canvas/isometric-canvas';
import { ArchitectureWizardComponent, ArchitectureSelection } from './components/architecture-wizard/architecture-wizard';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, IsometricCanvasComponent, ArchitectureWizardComponent],
  template: `
    <main class="min-h-screen bg-[#010b06] text-slate-100 flex flex-col items-center justify-start p-6 relative overflow-x-hidden font-sans gap-8">
      
      <!-- CANVAS 3D MAESTRO DE FONDO UNIFICADO -->
      <div class="fixed inset-0 z-0 pointer-events-none transition-all duration-1000" [ngClass]="{'opacity-40': !isBuilt, 'opacity-100': isBuilt}">
        <app-isometric-canvas 
          [architecture]="currentSelection" 
          [currentStep]="activeWizardStep"
          [isFinalView]="isBuilt">
        </app-isometric-canvas>
      </div>

      <!-- Efectos lumínicos ambientales Xbox Classic -->
      <div class="fixed -top-40 -left-40 w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div class="fixed -bottom-40 -right-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>

      <!-- Header principal -->
      <header class="relative z-10 max-w-5xl w-full bg-slate-950/85 backdrop-blur-2xl border border-emerald-500/40 rounded-2xl p-6 shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-all duration-500">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shadow-[0_0_10px_#10b981]"></div>
            <span class="text-xs uppercase tracking-widest text-emerald-400 font-mono">XBOX-DASH MATRIX // LIVE ENGINE</span>
          </div>
          <!-- Versión sutil y desatendida -->
          <span class="text-[10px] text-slate-500 font-mono opacity-50 tracking-wider">xbox-engine v3.0</span>
        </div>

        <h1 class="text-2xl font-black tracking-wider text-white mb-1">
          CYBER ARCHITECTURE <span class="text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]">BUILDER</span>
        </h1>
        
        <p class="text-slate-400 text-xs leading-relaxed font-mono">
          Sistema interactivo con perspectiva 3D y despliegue modular en tiempo real.
        </p>
      </header>

      <!-- MODO WIZARD CON PERSPECTIVA CURVADA -->
      <section *ngIf="!isBuilt" class="relative z-10 max-w-5xl w-full transition-all duration-700 transform">
        <app-architecture-wizard 
          (stepChange)="onStepChange($event)"
          (selectionChange)="onSelectionUpdate($event)" 
          (architectureComplete)="onArchitectureSelected($event)">
        </app-architecture-wizard>
      </section>

      <!-- MODO VISTA TÁCTICA FINAL (HUDs Laterales + Canvas Central) -->
      <section *ngIf="isBuilt" class="relative z-10 max-w-7xl w-full flex flex-col gap-6 transition-all duration-1000 ease-in-out transform scale-100 opacity-100 animate-fade-in">
        
        <div class="bg-slate-950/90 border border-emerald-500/50 p-4 rounded-2xl flex flex-wrap items-center justify-between font-mono text-xs shadow-2xl backdrop-blur-xl">
          <div class="flex items-center gap-3">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="text-emerald-400 font-bold tracking-wider">MATRIZ ESTABLECIDA: {{ selectedArchitecture?.architectureType?.toUpperCase() }}</span>
          </div>
          <button (click)="resetBuilder()" class="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 rounded-xl transition-all text-xs cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.25)] font-bold">
            ⚙️ RECONFIGURAR STACK
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
          
          <div class="flex flex-col gap-4">
            <div class="bg-slate-950/90 backdrop-blur-xl border border-emerald-500/30 p-4 rounded-2xl shadow-xl">
              <span class="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">01. Capa Cliente</span>
              <h3 class="font-black text-white text-sm mt-1 tracking-wide">{{ selectedArchitecture?.frontend | uppercase }}</h3>
              <p class="text-xs text-slate-300 mt-2 leading-relaxed">Interfaz modular de alto rendimiento con renderizado acelerado por GPU.</p>
            </div>

            <div class="bg-slate-950/90 backdrop-blur-xl border border-orange-500/30 p-4 rounded-2xl shadow-xl">
              <span class="text-[10px] font-mono text-orange-400 uppercase tracking-widest font-bold">02. Seguridad & Auth</span>
              <h3 class="font-black text-white text-sm mt-1 tracking-wide">{{ selectedArchitecture?.auth | uppercase }}</h3>
              <p class="text-xs text-slate-300 mt-2 leading-relaxed">Gestión de identidad cifrada con tokens JWT y sesiones seguras.</p>
            </div>
          </div>

          <div class="lg:col-span-2 h-[520px] bg-slate-950/40 backdrop-blur-md border border-emerald-500/30 rounded-3xl p-4 shadow-2xl">
            <!-- Espacio central optimizado para el canvas de fondo -->
          </div>

          <div class="flex flex-col gap-4">
            <div class="bg-slate-950/90 backdrop-blur-xl border border-rose-500/30 p-4 rounded-2xl shadow-xl">
              <span class="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold">03. Backend Core</span>
              <h3 class="font-black text-white text-sm mt-1 tracking-wide">{{ selectedArchitecture?.backend | uppercase }}</h3>
              <p class="text-xs text-slate-300 mt-2 leading-relaxed">Servidor modular basado en TypeScript con inyección de dependencias.</p>
            </div>

            <div class="bg-slate-950/90 backdrop-blur-xl border border-emerald-500/30 p-4 rounded-2xl shadow-xl">
              <span class="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">04. Almacenamiento & Cloud</span>
              <h3 class="font-black text-white text-sm mt-1 tracking-wide">{{ selectedArchitecture?.database | uppercase }}</h3>
              <p class="text-xs text-slate-300 mt-2 leading-relaxed">Base de datos transaccional con sincronización de datos en tiempo real.</p>
            </div>
          </div>

        </div>

      </section>

    </main>
  `
})
export class App {
  title = 'arch-isometric-sim';
  activeWizardStep = 0;

  currentSelection: ArchitectureSelection = {
    architectureType: 'monorepo',
    frontend: 'angular',
    backend: 'nestjs',
    database: 'supabase_postgres',
    auth: 'aws_cognito',
    devops: 'docker_k8s'
  };

  selectedArchitecture: ArchitectureSelection | null = null;
  isBuilt = false;

  onStepChange(step: number): void {
    this.activeWizardStep = step;
  }

  onSelectionUpdate(selection: ArchitectureSelection): void {
    this.currentSelection = { ...selection };
  }

  onArchitectureSelected(selection: ArchitectureSelection): void {
    this.selectedArchitecture = selection;
    this.isBuilt = true;
  }

  resetBuilder(): void {
    this.isBuilt = false;
    this.activeWizardStep = 0;
  }
}