import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IsometricCanvasComponent } from './components/isometric-canvas/isometric-canvas';
import { ArchitectureWizardComponent } from './components/architecture-wizard/architecture-wizard';
import { PieceDetailComponent } from './components/piece-detail/piece-detail';
import { LayerId, layerColor } from './models/architecture.models';
import { ArchitectureStateService } from './services/architecture-state.service';
import { PieceDetailService } from './services/piece-detail.service';

/** Orden del flujo de izquierda a derecha en la escena 3D. */
const FLOW_ORDER: LayerId[] = ['workspace', 'frontend', 'auth', 'backend', 'data', 'infra'];

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IsometricCanvasComponent, ArchitectureWizardComponent, PieceDetailComponent],
  template: `
    <main class="relative h-[100dvh] w-full overflow-hidden font-sans text-slate-100">
      <!-- 3D: capa de fondo a pantalla completa. Recibe el mouse (órbita, hover y clic en piezas). -->
      <div class="absolute inset-0 z-0">
        <app-isometric-canvas />
      </div>

      <!-- Viñeta suave para que los paneles se lean sobre el 3D -->
      <div
        class="pointer-events-none absolute inset-0 z-[1]"
        style="background: radial-gradient(ellipse at 60% 50%, transparent 35%, rgba(2, 4, 10, 0.75) 100%);"
      ></div>

      <!-- Header -->
      <header data-avoid class="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 px-4 py-3 lg:px-6 lg:py-4">
        <div class="min-w-0">
          <h1 class="text-xl font-black tracking-wide text-white lg:text-2xl drop-shadow-md">Stack Builder</h1>
          <p class="mt-0.5 hidden text-sm text-slate-400 sm:block drop-shadow-sm">Elige cada pieza de tu stack y mira cómo se arma la arquitectura en 3D.</p>
        </div>
      </header>

      @if (!state.isBuilt()) {
        <!-- Escritorio: panel a la izquierda. Móvil: hoja inferior; el 3D queda arriba. -->
        <div
          data-avoid
          class="absolute inset-x-0 bottom-0 z-20 max-h-[58dvh] overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)] lg:inset-x-auto lg:bottom-6 lg:left-6 lg:top-[84px] lg:max-h-none lg:w-[480px] lg:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          <app-architecture-wizard />
        </div>
      } @else {
        <!-- Vista final: sin tarjetas fijas; el detalle de cada pieza aparece solo al hacer clic -->
        <nav
          data-avoid
          aria-label="Flujo de tu arquitectura"
          class="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:px-6 lg:pb-5"
        >
          <!-- Contenedor con efecto cristal -->
          <div class="pointer-events-auto mx-auto flex max-w-6xl items-center gap-3 rounded-2xl border border-cyan-400/20 bg-slate-950/80 p-2 shadow-2xl backdrop-blur-xl">
            
            <!-- Lista de pasos con scroll oculto y gradientes laterales -->
            <div class="relative flex min-w-0 flex-1 items-center">
              <!-- Gradiente izquierdo (indica que hay scroll) -->
              <div class="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-slate-950/90 to-transparent"></div>
              
              <ol class="flex w-full items-center gap-1.5 overflow-x-auto px-2 py-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x scroll-smooth">
                @for (item of flow(); track item.step.category; let last = $last) {
                  <li class="flex shrink-0 snap-start items-center gap-1.5">
                    <button
                      type="button"
                      class="flex items-center gap-2 rounded-full border bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all hover:bg-slate-800 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                      [style.border-color]="layerColor(item.step.layer) + '80'"
                      [style.box-shadow]="detail.selected() === item.step.category ? '0 0 12px ' + layerColor(item.step.layer) + '40' : 'none'"
                      [attr.aria-pressed]="detail.selected() === item.step.category"
                      [attr.aria-label]="item.step.menuTitle + ': ' + item.option.name + '. Ver detalle'"
                      (click)="detail.toggle(item.step.category)"
                    >
                      <span class="h-2 w-2 rounded-full" [style.background]="layerColor(item.step.layer)" aria-hidden="true"></span>
                      {{ item.option.name }}
                    </button>
                    @if (!last) {
                      <span class="text-slate-600 text-xs" aria-hidden="true">→</span>
                    }
                  </li>
                }
              </ol>

              <!-- Gradiente derecho -->
              <div class="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-slate-950/90 to-transparent"></div>
            </div>

            <!-- Botón Reconfigurar -->
            <button
              type="button"
              class="shrink-0 rounded-xl border border-cyan-400/40 bg-cyan-950/30 px-4 py-2 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-900/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
              (click)="reconfigure()"
            >
              Reconfigurar
            </button>
          </div>
        </nav>

        <!-- Tarjeta de detalle: Flotante, centrada verticalmente en escritorio -->
        @if (detail.selected()) {
          <div
            data-avoid
            class="absolute inset-x-0 bottom-0 z-30 flex max-h-[55dvh] pb-[env(safe-area-inset-bottom)] lg:inset-x-auto lg:bottom-auto lg:right-6 lg:top-1/2 lg:-translate-y-1/2 lg:h-fit lg:max-h-[85vh] lg:w-[380px] lg:pb-0 animate-in fade-in slide-in-from-right-4 duration-300"
          >
            <app-piece-detail class="flex min-h-0 w-full" />
          </div>
        }
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