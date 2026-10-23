import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IsometricCanvasComponent } from './components/isometric-canvas/isometric-canvas';
import { ArchitectureWizardComponent } from './components/architecture-wizard/architecture-wizard';
import { ArchitectureStateService } from './services/architecture-state.service';
import { layerColor } from './models/architecture.models';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IsometricCanvasComponent, ArchitectureWizardComponent],
  template: `
    <main class="relative min-h-screen overflow-x-hidden font-sans text-slate-100">
      <!-- Canvas 3D: capa de fondo a pantalla completa (un único canvas en toda la app) -->
      <div class="pointer-events-none fixed inset-0 z-0">
        <app-isometric-canvas />
      </div>

      <!-- Viñeta para que los paneles se lean siempre sobre el 3D -->
      <div
        class="pointer-events-none fixed inset-0 z-[1]"
        style="background: radial-gradient(ellipse at 68% 50%, transparent 25%, rgba(2, 4, 10, 0.78) 100%);"
      ></div>

      <!-- Luces ambientales -->
      <div class="pointer-events-none fixed -left-40 -top-40 z-[1] h-96 w-96 rounded-full bg-emerald-500/15 blur-[120px]"></div>
      <div class="pointer-events-none fixed -bottom-40 -right-40 z-[1] h-96 w-96 rounded-full bg-cyan-600/15 blur-[120px]"></div>

      <header class="relative z-10 mx-auto flex w-full max-w-7xl items-start justify-between gap-4 px-6 pt-6">
        <div>
          <h1 class="text-2xl font-black tracking-wide text-white">
            Stack Builder
          </h1>
          <p class="mt-1 max-w-md text-sm leading-relaxed text-slate-400">
            Elige cada pieza de tu stack y mira cómo se arma la arquitectura en 3D.
          </p>
        </div>
      </header>

      @if (!state.isBuilt()) {
        <!-- WIZARD: panel a la izquierda, el 3D queda a la derecha -->
        <section class="relative z-10 mx-auto mt-6 w-full max-w-7xl px-6 pb-10">
          <div class="w-full lg:w-[520px]">
            <app-architecture-wizard />
          </div>
        </section>
      } @else {
        <!-- VISTA FINAL (provisional): tarjetas laterales y el centro libre para el 3D -->
        <section class="hud-enter relative z-10 mx-auto mt-6 flex w-full max-w-7xl flex-col gap-6 px-6 pb-10">
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/50 bg-slate-950/90 p-4 text-sm shadow-2xl backdrop-blur-xl">
            <div class="flex items-center gap-3">
              <span class="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true"></span>
              <span class="font-semibold text-emerald-400">Stack definido: {{ state.route().name }}</span>
            </div>
            <button
              type="button"
              class="cursor-pointer rounded-xl border border-emerald-500/40 bg-slate-900 px-4 py-1.5 text-sm font-semibold text-emerald-400 transition-colors hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300"
              (click)="state.reset()"
            >
              Reconfigurar
            </button>
          </div>

          <div class="grid grid-cols-1 items-start gap-8 pt-2 lg:grid-cols-3">
            <div class="flex flex-col gap-5">
              @for (item of leftCards(); track item.step.category) {
                <article
                  class="rounded-2xl border bg-slate-950/90 p-5 backdrop-blur-2xl"
                  [style.border-color]="layerColor(item.step.layer) + '66'"
                >
                  <span class="text-xs font-semibold" [style.color]="layerColor(item.step.layer)">{{ item.step.menuTitle }}</span>
                  <h3 class="mt-1 text-base font-bold text-white">{{ item.option.name }}</h3>
                  <p class="mt-2 text-xs leading-relaxed text-slate-300">{{ item.option.description }}</p>
                </article>
              }
            </div>

            <!-- Centro libre para ver el 3D -->
            <div class="pointer-events-none hidden lg:block"></div>

            <div class="flex flex-col gap-5">
              @for (item of rightCards(); track item.step.category) {
                <article
                  class="rounded-2xl border bg-slate-950/90 p-5 backdrop-blur-2xl"
                  [style.border-color]="layerColor(item.step.layer) + '66'"
                >
                  <span class="text-xs font-semibold" [style.color]="layerColor(item.step.layer)">{{ item.step.menuTitle }}</span>
                  <h3 class="mt-1 text-base font-bold text-white">{{ item.option.name }}</h3>
                  <p class="mt-2 text-xs leading-relaxed text-slate-300">{{ item.option.description }}</p>
                </article>
              }
            </div>
          </div>
        </section>
      }
    </main>
  `
})
export class App {
  protected readonly state = inject(ArchitectureStateService);
  protected readonly layerColor = layerColor;

  protected readonly leftCards = computed(() => this.state.chosen().filter((_, i) => i % 2 === 0));
  protected readonly rightCards = computed(() => this.state.chosen().filter((_, i) => i % 2 === 1));
}