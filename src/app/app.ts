import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IsometricCanvasComponent } from './components/isometric-canvas/isometric-canvas';
import { ArchitectureWizardComponent } from './components/architecture-wizard/architecture-wizard';
import { PieceDetailComponent } from './components/piece-detail/piece-detail';
import { LayerId, layerColor } from './models/architecture.models';
import { ArchitectureStateService } from './services/architecture-state.service';
import { PieceDetailService } from './services/piece-detail.service';

const FLOW_ORDER: LayerId[] = ['workspace', 'frontend', 'auth', 'backend', 'data', 'infra'];

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IsometricCanvasComponent, ArchitectureWizardComponent, PieceDetailComponent],
  template: `
    <main class="relative h-[100dvh] w-full overflow-hidden font-sans text-slate-100 flex flex-col lg:block">
      
      <!-- 3D Canvas (Ocupa todo el fondo siempre) -->
      <div class="absolute inset-0 z-0">
        <app-isometric-canvas />
      </div>

      <!-- Viñeta suave -->
      <div class="pointer-events-none absolute inset-0 z-[1]" style="background: radial-gradient(ellipse at 60% 50%, transparent 35%, rgba(2, 4, 10, 0.6) 100%);"></div>

      <!-- Header -->
      <header data-avoid class="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 px-4 py-3 lg:px-6 lg:py-4">
        <div class="min-w-0">
          <h1 class="text-xl font-black tracking-wide text-white lg:text-2xl drop-shadow-md">Stack Builder</h1>
          <p class="mt-0.5 hidden text-sm text-slate-400 sm:block drop-shadow-sm">Elige cada pieza y mira cómo se arma la arquitectura en 3D.</p>
        </div>
      </header>

      @if (!state.isBuilt()) {
        <!-- VISTA WIZARD (Configuración) -->
        <div
          data-avoid
          class="absolute inset-x-0 bottom-0 z-20 h-[65dvh] overflow-y-auto overscroll-contain rounded-t-3xl border-t border-white/10 bg-slate-900/50 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl lg:inset-x-auto lg:bottom-6 lg:left-6 lg:top-[84px] lg:h-auto lg:max-h-none lg:w-[480px] lg:rounded-none lg:border-none lg:bg-transparent lg:pb-0 lg:backdrop-blur-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          <app-architecture-wizard />
        </div>
      } @else {
        <!-- VISTA FINAL (Resultado) -->
        
        <!-- Móvil: Barra horizontal abajo. Escritorio: Menú vertical izquierdo. -->
        <nav 
          data-avoid 
          aria-label="Flujo de tu arquitectura" 
          class="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center pb-[env(safe-area-inset-bottom)] lg:inset-x-auto lg:bottom-auto lg:left-6 lg:top-[100px] lg:w-[280px] lg:items-start"
        >
          <!-- Botón Reconfigurar -->
          <div class="pointer-events-auto w-full max-w-md px-4 pb-2 lg:px-0 lg:pb-6">
            <button type="button" class="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/40 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-cyan-300 backdrop-blur-md transition-all hover:bg-cyan-900/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" (click)="reconfigure()">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Reconfigurar
            </button>
          </div>

          <!-- Lista de Pasos (Cristal) -->
          <div class="pointer-events-auto w-full rounded-t-3xl border-t border-white/10 bg-slate-900/50 px-4 pt-4 pb-6 backdrop-blur-2xl lg:rounded-none lg:border-none lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <!-- En móvil es un scroll horizontal, en escritorio vertical -->
            <div class="relative flex w-full flex-row gap-3 overflow-x-auto lg:flex-col lg:gap-4 lg:overflow-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              
              <!-- Línea conectora (solo escritorio) -->
              <div class="hidden lg:block absolute left-[19px] top-4 bottom-4 w-px bg-slate-700/50" aria-hidden="true"></div>
              
              @for (item of flow(); track item.step.category) {
                <div class="relative flex shrink-0 items-center gap-3 lg:w-full">
                  <button
                    type="button"
                    class="group relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-slate-900/90 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                    [style.border-color]="layerColor(item.step.layer)"
                    [style.box-shadow]="detail.selected() === item.step.category ? '0 0 15px ' + layerColor(item.step.layer) + '80' : 'none'"
                    (click)="detail.toggle(item.step.category)"
                  >
                    <img [src]="item.option.iconUrl" class="h-5 w-5 object-contain" alt="" />
                  </button>

                  <button
                    type="button"
                    class="hidden lg:flex flex-col items-start text-left transition-all hover:translate-x-1"
                    (click)="detail.toggle(item.step.category)"
                  >
                    <span class="text-[10px] font-bold uppercase tracking-widest" [style.color]="layerColor(item.step.layer)">{{ item.step.menuTitle }}</span>
                    <span class="text-sm font-semibold text-slate-200 leading-tight">{{ item.option.name }}</span>
                  </button>
                </div>
              }
            </div>
          </div>
        </nav>

        <!-- Tarjeta de Detalle (Cristal) -->
        <div
          data-avoid
          class="absolute inset-x-0 bottom-0 z-30 flex max-h-[60dvh] pb-[env(safe-area-inset-bottom)] lg:inset-x-auto lg:bottom-auto lg:right-6 lg:top-1/2 lg:-translate-y-1/2 lg:h-fit lg:max-h-[85vh] lg:w-[380px] lg:pb-0 transition-all duration-300 ease-in-out pointer-events-none"
          [class.opacity-0]="!detail.selected()"
          [class.translate-y-10]="!detail.selected()"
          [class.lg:translate-y-0]="!detail.selected()"
          [class.lg:translate-x-10]="!detail.selected()"
          [class.opacity-100]="detail.selected()"
          [class.translate-y-0]="detail.selected()"
          [class.lg:translate-x-0]="detail.selected()"
          [class.!pointer-events-auto]="detail.selected()"
        >
          <app-piece-detail class="flex min-h-0 w-full" />
        </div>
      }
    </main>
  `
})
export class App {
  protected readonly state = inject(ArchitectureStateService);
  protected readonly detail = inject(PieceDetailService);
  protected readonly layerColor = layerColor;

  protected readonly flow = computed(() =>
    [...this.state.chosen()].sort((a, b) => FLOW_ORDER.indexOf(a.step.layer) - FLOW_ORDER.indexOf(b.step.layer))
  );

  protected reconfigure(): void {
    this.detail.close();
    this.state.reset();
  }
}