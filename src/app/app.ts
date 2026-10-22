import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IsometricCanvasComponent } from './components/isometric-canvas/isometric-canvas';
import { ArchitectureWizardComponent, ArchitectureSelection } from './components/architecture-wizard/architecture-wizard';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, IsometricCanvasComponent, ArchitectureWizardComponent],
  template: `
    <main class="min-h-screen bg-[#010b06] text-slate-100 flex flex-col items-center justify-start p-6 relative overflow-hidden font-sans gap-8">
      
      <!-- MATRIZ 3D DE FONDO: Construcción progresiva en tiempo real -->
      <div class="absolute inset-0 z-0 opacity-35 pointer-events-none transition-all duration-1000">
        <app-isometric-canvas 
          [architecture]="currentSelection" 
          [currentStep]="activeWizardStep"
          [isFinalView]="isBuilt">
        </app-isometric-canvas>
      </div>

      <!-- Efectos de luz ambiental -->
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

      <!-- Header principal -->
      <div class="relative z-10 max-w-5xl w-full bg-slate-950/85 backdrop-blur-xl border border-emerald-500/40 rounded-2xl p-6 shadow-2xl shadow-emerald-950/50 transition-all duration-500">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full bg-emerald-400 animate-ping shadow-[0_0_10px_#10b981]"></div>
            <span class="text-xs uppercase tracking-widest text-emerald-400 font-mono">System Status: Live Matrix Construction</span>
          </div>
          <span class="text-xs text-slate-400 font-mono">Xbox-Engine v3.0</span>
        </div>

        <h1 class="text-2xl font-extrabold tracking-tight text-white mb-2">
          CYBER ARCHITECTURE <span class="text-emerald-400">BUILDER</span>
        </h1>
        
        <p class="text-slate-400 text-sm leading-relaxed">
          Diseña tu infraestructura paso a paso. Observa cómo la matriz 3D en el fondo se va armando y conectando en tiempo real.
        </p>
      </div>

      <!-- WIZARD -->
      <div *ngIf="!isBuilt" class="relative z-10 max-w-5xl w-full transition-all duration-700 transform">
        <app-architecture-wizard 
          (stepChange)="onStepChange($event)"
          (selectionChange)="onSelectionUpdate($event)" 
          (architectureComplete)="onArchitectureSelected($event)">
        </app-architecture-wizard>
      </div>

      <!-- PANTALLA TÁCTICA FINAL (Zoom completo + HUDs) -->
      <div *ngIf="isBuilt" class="relative z-10 max-w-6xl w-full flex flex-col gap-6 transition-all duration-1000 ease-in-out transform scale-100 opacity-100 animate-fade-in">
        
        <div class="bg-slate-950/95 border border-emerald-500/50 p-4 rounded-xl flex flex-wrap items-center justify-between font-mono text-xs shadow-xl backdrop-blur-md">
          <div class="flex items-center gap-3">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="text-emerald-400 font-bold">MATRIZ DESPLEGADA: {{ selectedArchitecture?.architectureType?.toUpperCase() }}</span>
          </div>
          <button (click)="resetBuilder()" class="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 rounded-lg transition-all text-[11px] cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            ⚙️ RECONFIGURAR STACK
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div class="flex flex-col gap-4">
            <div class="bg-slate-950/90 backdrop-blur-md border border-emerald-500/30 p-4 rounded-xl shadow-lg">
              <span class="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">01. Capa Cliente</span>
              <h3 class="font-bold text-white text-sm mt-1">{{ selectedArchitecture?.frontend | uppercase }}</h3>
              <p class="text-xs text-slate-400 mt-2 leading-relaxed">Interfaz modular de alto rendimiento con renderizado acelerado por GPU.</p>
            </div>

            <div class="bg-slate-950/90 backdrop-blur-md border border-orange-500/30 p-4 rounded-xl shadow-lg">
              <span class="text-[10px] font-mono text-orange-400 uppercase tracking-widest">02. Seguridad & Auth</span>
              <h3 class="font-bold text-white text-sm mt-1">{{ selectedArchitecture?.auth | uppercase }}</h3>
              <p class="text-xs text-slate-400 mt-2 leading-relaxed">Gestión de identidad cifrada con tokens JWT y sesiones seguras.</p>
            </div>
          </div>

          <div class="lg:col-span-2">
            <app-isometric-canvas 
              [architecture]="selectedArchitecture" 
              [currentStep]="activeWizardStep"
              [isFinalView]="isBuilt">
            </app-isometric-canvas>
          </div>

          <div class="flex flex-col gap-4">
            <div class="bg-slate-950/90 backdrop-blur-md border border-rose-500/30 p-4 rounded-xl shadow-lg">
              <span class="text-[10px] font-mono text-rose-400 uppercase tracking-widest">03. Backend Core</span>
              <h3 class="font-bold text-white text-sm mt-1">{{ selectedArchitecture?.backend | uppercase }}</h3>
              <p class="text-xs text-slate-400 mt-2 leading-relaxed">Servidor modular basado en TypeScript con inyección de dependencias.</p>
            </div>

            <div class="bg-slate-950/90 backdrop-blur-md border border-emerald-500/30 p-4 rounded-xl shadow-lg">
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