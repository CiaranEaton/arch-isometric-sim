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
    <main class="relative h-[100dvh] w-full overflow-hidden font-sans text-slate-100">
      <!-- 3D Canvas -->
      <div class="absolute inset-0 z-0">
        <app-isometric-canvas />
      </div>

      <!-- Viñeta -->
      <div class="pointer-events-none absolute inset-0 z-[1]" style="background: radial-gradient(ellipse at 60% 50%, transparent 35%, rgba(2, 4, 10, 0.75) 100%);"></div>

      <!-- Header -->
      <header data-avoid class="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 px-4 py-3 lg:px-6 lg:py-4">
        <div class="min-w-0">
          <h1 class="text-xl font-black tracking-wide text-white lg:text-2xl drop-shadow-md">Stack Builder</h1>
          <p class="mt-0.5 hidden text-sm text-slate-400 sm:block drop-shadow-sm">Elige cada pieza de tu stack y mira cómo se arma la arquitectura en 3D.</p>
        </div>
      </header>

      @if (!state.isBuilt()) {
        <!-- Wizard inicial (igual que antes) -->
        <div data-avoid class="absolute inset-x-0 bottom-0 z-20 max-h-[58dvh] overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)] lg:inset-x-auto lg:bottom-6 lg:left-6 lg:top-[84px] lg:max-h-none lg:w-[480px] lg:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <app-architecture-wizard />
        </div>
      } @else {
        <!-- NUEVO: Wizard Vertical (Izquierda) -->
        <nav data-avoid aria-label="Flujo de tu arquitectura" class="pointer-events-none absolute left-6 top-[100px] bottom-6 z-20 flex w-[280px] flex-col">
          <!-- Botón Reconfigurar arriba -->
          <div class="pointer-events-auto mb-6">
            <button type="button" class="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/40 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-cyan-300 backdrop-blur-md transition-all hover:bg-cyan-900/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" (click)="reconfigure()">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Reconfigurar
            </button>
          </div>

          <!-- Lista Vertical de Pasos -->
          <div class="pointer-events-auto relative flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <!-- Línea conectora vertical -->
            <div class="absolute left-[19px] top-4 bottom-4 w-px bg-slate-700/50" aria-hidden="true"></div>
            
            <ol class="flex flex-col gap-4">
              @for (item of flow(); track item.step.category) {
                <li class="relative flex items-center gap-3">
                  <!-- Círculo indicador -->
                  <button
                    type="button"
                    class="group relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-slate-900/90 backdrop-blur-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                    [style.border-color]="layerColor(item.step.layer)"
                    [style.box-shadow]="detail.selected() === item.step.category ? '0 0 15px ' + layerColor(item.step.layer) + '80' : 'none'"
                    [attr.aria-pressed]="detail.selected() === item.step.category"
                    (click)="detail.toggle(item.step.category)"
                  >
                    <img [src]="item.option.iconUrl" class="h-5 w-5 object-contain" alt="" />
                  </button>

                  <!-- Info del paso (SIN card, solo texto flotante) -->
                  <button
                    type="button"
                    class="flex flex-col items-start text-left transition-all hover:translate-x-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                    (click)="detail.toggle(item.step.category)"
                  >
                    <span class="text-[10px] font-bold uppercase tracking-widest" [style.color]="layerColor(item.step.layer)">{{ item.step.menuTitle }}</span>
                    <span class="text-sm font-semibold text-slate-200 leading-tight">{{ item.option.name }}</span>
                  </button>
                </li>
              }
            </ol>
          </div>
        </nav>

        <!-- NUEVO: Tarjeta de detalle con animación (NO SALTA) -->
        <!-- Mantenemos el div en el DOM y controlamos su opacidad con las clases de Tailwind -->
        <div
          data-avoid
          class="absolute inset-x-0 bottom-0 z-30 flex max-h-[55dvh] pb-[env(safe-area-inset-bottom)] lg:inset-x-auto lg:bottom-auto lg:right-6 lg:top-1/2 lg:-translate-y-1/2 lg:h-fit lg:max-h-[85vh] lg:w-[380px] lg:pb-0 transition-all duration-500 ease-in-out pointer-events-none"
          [class.opacity-0]="!detail.selected()"
          [class.translate-x-10]="!detail.selected()"
          [class.opacity-100]="detail.selected()"
          [class.translate-x-0]="detail.selected()"
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