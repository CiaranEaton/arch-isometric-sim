import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IsometricCanvasComponent } from './components/isometric-canvas/isometric-canvas';
import { ArchitectureWizardComponent } from './components/architecture-wizard/architecture-wizard';
import { ArchitectureStateService } from './services/architecture-state.service';
import { ArchitectureSelection } from './models/architecture.models';

interface HudPanel {
  index: string;
  label: string;
  category: keyof ArchitectureSelection;
  /** Clases completas (estáticas) para que Tailwind las detecte. */
  border: string;
  glow: string;
  text: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IsometricCanvasComponent, ArchitectureWizardComponent],
  template: `
    <main class="relative min-h-screen overflow-x-hidden font-sans text-slate-100">
      <!-- Canvas 3D: capa de fondo real a pantalla completa (un único canvas en toda la app) -->
      <div class="pointer-events-none fixed inset-0 z-0">
        <app-isometric-canvas />
      </div>

      <!-- Viñeta para que los paneles se lean siempre sobre el 3D -->
      <div
        class="pointer-events-none fixed inset-0 z-[1]"
        style="background: radial-gradient(ellipse at 68% 50%, transparent 25%, rgba(2, 4, 10, 0.78) 100%);"
      ></div>

      <!-- Luces ambientales -->
      <div class="pointer-events-none fixed -left-40 -top-40 z-[1] h-96 w-96 animate-pulse rounded-full bg-emerald-500/15 blur-[120px]"></div>
      <div class="pointer-events-none fixed -bottom-40 -right-40 z-[1] h-96 w-96 animate-pulse rounded-full bg-cyan-600/15 blur-[120px]"></div>

      <!-- Header compacto -->
      <header class="relative z-10 mx-auto flex w-full max-w-7xl items-start justify-between gap-4 px-6 pt-6">
        <div>
          <div class="mb-2 flex items-center gap-3">
            <span class="h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]"></span>
            <span class="font-mono text-xs tracking-widest text-emerald-400">XBOX-DASH MATRIX // LIVE ENGINE</span>
          </div>
          <h1 class="text-2xl font-black tracking-wider text-white">
            CYBER ARCHITECTURE <span class="text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]">BUILDER</span>
          </h1>
          <p class="mt-1 max-w-md font-mono text-xs leading-relaxed text-slate-400">
            Elige cada pieza de tu stack y mira cómo se arma la arquitectura en 3D.
          </p>
        </div>
        <span class="font-mono text-[10px] tracking-wider text-slate-500">xbox-engine v3.0</span>
      </header>

      @if (!state.isBuilt()) {
        <!-- WIZARD: menú a la izquierda, el orbe 3D queda a la derecha -->
        <section class="relative z-10 mx-auto mt-6 w-full max-w-7xl px-6 pb-10">
          <div class="w-full lg:w-[520px]">
            <app-architecture-wizard />
          </div>
        </section>
      } @else {
        <!-- VISTA FINAL: paneles laterales y el centro libre para el 3D -->
        <section class="hud-enter relative z-10 mx-auto mt-6 flex w-full max-w-7xl flex-col gap-6 px-6 pb-10">
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/50 bg-slate-950/90 p-4 font-mono text-xs shadow-2xl backdrop-blur-xl">
            <div class="flex items-center gap-3">
              <span class="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400"></span>
              <span class="font-bold tracking-wider text-emerald-400">
                MATRIZ ESTABLECIDA: {{ state.chosenOption('architectureType')?.name }}
              </span>
            </div>
            <button
              type="button"
              class="cursor-pointer rounded-xl border border-emerald-500/40 bg-slate-900 px-4 py-1.5 text-xs font-bold text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-colors hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300"
              (click)="state.reset()"
            >
              ⚙️ RECONFIGURAR STACK
            </button>
          </div>

          <div class="grid grid-cols-1 items-start gap-8 pt-2 lg:grid-cols-3">
            <div class="flex flex-col gap-5">
              @for (panel of leftPanels; track panel.index) {
                @if (state.chosenOption(panel.category); as option) {
                  <article class="rounded-2xl border bg-slate-950/90 p-5 backdrop-blur-2xl" [class]="panel.border + ' ' + panel.glow">
                    <span class="font-mono text-[10px] font-bold uppercase tracking-widest" [class]="panel.text">
                      {{ panel.index }}. {{ panel.label }}
                    </span>
                    <h3 class="mt-1 text-base font-black tracking-wide text-white">{{ option.name }}</h3>
                    <p class="mt-2 text-xs leading-relaxed text-slate-300">{{ option.description }}</p>
                  </article>
                }
              }
            </div>

            <!-- Centro libre para ver el 3D -->
            <div class="pointer-events-none hidden lg:block"></div>

            <div class="flex flex-col gap-5">
              @for (panel of rightPanels; track panel.index) {
                @if (state.chosenOption(panel.category); as option) {
                  <article class="rounded-2xl border bg-slate-950/90 p-5 backdrop-blur-2xl" [class]="panel.border + ' ' + panel.glow">
                    <span class="font-mono text-[10px] font-bold uppercase tracking-widest" [class]="panel.text">
                      {{ panel.index }}. {{ panel.label }}
                    </span>
                    <h3 class="mt-1 text-base font-black tracking-wide text-white">{{ option.name }}</h3>
                    <p class="mt-2 text-xs leading-relaxed text-slate-300">{{ option.description }}</p>
                  </article>
                }
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

  protected readonly leftPanels: HudPanel[] = [
    {
      index: '01',
      label: 'Capa Cliente',
      category: 'frontend',
      border: 'border-emerald-500/40',
      glow: 'shadow-[0_0_25px_rgba(16,185,129,0.2)]',
      text: 'text-emerald-400'
    },
    {
      index: '02',
      label: 'Seguridad & Auth',
      category: 'auth',
      border: 'border-orange-500/40',
      glow: 'shadow-[0_0_25px_rgba(249,115,22,0.2)]',
      text: 'text-orange-400'
    }
  ];

  protected readonly rightPanels: HudPanel[] = [
    {
      index: '03',
      label: 'Backend Core',
      category: 'backend',
      border: 'border-rose-500/40',
      glow: 'shadow-[0_0_25px_rgba(244,63,94,0.2)]',
      text: 'text-rose-400'
    },
    {
      index: '04',
      label: 'Almacenamiento & Cloud',
      category: 'database',
      border: 'border-emerald-500/40',
      glow: 'shadow-[0_0_25px_rgba(16,185,129,0.2)]',
      text: 'text-emerald-400'
    },
    {
      index: '05',
      label: 'Contenedores & Deploy',
      category: 'devops',
      border: 'border-sky-500/40',
      glow: 'shadow-[0_0_25px_rgba(14,165,233,0.2)]',
      text: 'text-sky-400'
    }
  ];
}