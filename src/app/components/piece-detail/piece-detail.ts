import { ChangeDetectionStrategy, Component, HostListener, computed, inject } from '@angular/core';
import { Affinity, LAYERS, StepOption, layerColor } from '../../models/architecture.models';
import { ArchitectureStateService } from '../../services/architecture-state.service';
import { PieceDetailService } from '../../services/piece-detail.service';

@Component({
  selector: 'app-piece-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (view(); as v) {
      <aside
        class="flex max-h-full flex-col gap-4 overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-300 lg:w-[380px]"
        aria-labelledby="piece-detail-title"
      >
        <!-- Header -->
        <div class="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div class="min-w-0">
            <span 
              class="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider mb-2"
              [style.backgroundColor]="v.color + '20'"
              [style.color]="v.color"
              [style.border]="'1px solid ' + v.color + '40'"
            >
              {{ v.layerLabel }}
            </span>
            <h2 id="piece-detail-title" class="text-xl font-bold text-white leading-tight">{{ v.option.name }}</h2>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
            aria-label="Cerrar detalle"
            (click)="detail.close()"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Descripción -->
        <p class="text-sm leading-relaxed text-slate-300">{{ v.option.description }}</p>

        <!-- Tags -->
        <ul class="flex flex-wrap gap-1.5" aria-label="Características">
          @for (tag of v.option.tags; track tag) {
            <li class="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300">{{ tag }}</li>
          }
        </ul>

        <!-- Métricas (NUEVO) -->
        @if (v.option.metrics; as metrics) {
          <div class="grid grid-cols-3 gap-2 rounded-xl border border-white/5 bg-black/20 p-3">
            <div class="flex flex-col gap-1">
              <span class="text-[10px] uppercase text-slate-500 font-semibold">Complejidad</span>
              <span class="text-xs font-medium" [class.text-amber-400]="metrics.complexity === 'Alta'" [class.text-emerald-400]="metrics.complexity === 'Baja'" [class.text-cyan-400]="metrics.complexity === 'Media'">{{ metrics.complexity }}</span>
            </div>
            <div class="flex flex-col gap-1 border-x border-white/5 px-2">
              <span class="text-[10px] uppercase text-slate-500 font-semibold">Escalabilidad</span>
              <span class="text-xs font-medium text-slate-300">{{ metrics.scalability }}</span>
            </div>
            <div class="flex flex-col gap-1 pl-1">
              <span class="text-[10px] uppercase text-slate-500 font-semibold">Costo</span>
              <span class="text-xs font-medium text-slate-300">{{ metrics.cost }}</span>
            </div>
          </div>
        }

        <!-- Por qué encaja -->
        @if (v.reason) {
          <section class="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
            <h3 class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-400">
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Por qué encaja
            </h3>
            <p class="mt-1.5 text-sm leading-relaxed text-slate-300">{{ v.reason }}</p>
          </section>
        }

        <!-- Mejores Prácticas (NUEVO) -->
        @if (v.option.bestPractices?.length) {
          <section>
            <h3 class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-400 mb-2">
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Pro-Tips
            </h3>
            <ul class="flex flex-col gap-2">
              @for (tip of v.option.bestPractices; track tip) {
                <li class="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                  <span class="text-emerald-500 mt-0.5">▹</span>
                  <span>{{ tip }}</span>
                </li>
              }
            </ul>
          </section>
        }

        <!-- Alternativas -->
        @if (v.alternatives.length) {
          <section class="mt-auto pt-2">
            <h3 class="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Otras opciones</h3>
            <div class="flex flex-wrap gap-1.5">
              @for (name of v.alternatives; track name) {
                <span class="rounded-md border border-white/5 bg-white/5 px-2 py-1 text-[10px] text-slate-400">{{ name }}</span>
              }
            </div>
          </section>
        }
      </aside>
    }
  `
})
export class PieceDetailComponent {
  private readonly state = inject(ArchitectureStateService);
  protected readonly detail = inject(PieceDetailService);

  protected readonly view = computed(() => {
    const category = this.detail.selected();
    const item = category ? this.state.chosen().find(c => c.step.category === category) : undefined;
    if (!item) return null;

    return {
      option: item.option,
      color: layerColor(item.step.layer),
      layerLabel: item.step.layer === 'workspace' ? 'Estructura' : (LAYERS.find(l => l.id === item.step.layer)?.label ?? ''),
      reason: this.reasonFor(item.option),
      alternatives: item.step.options.filter(o => o.id !== item.option.id).map(o => o.name)
    };
  });

  @HostListener('window:keydown.escape')
  protected onEscape(): void {
    this.detail.close();
  }

  private reasonFor(option: StepOption): string {
    const context: Record<string, string> = { route: this.state.routeId(), ...this.state.selection() };
    let best: Affinity | null = null;

    for (const affinity of option.affinities ?? []) {
      const matches = Object.entries(affinity.when).every(([key, allowed]) => allowed.includes(context[key]));
      if (matches && (!best || affinity.score > best.score)) best = affinity;
    }
    return best?.reason ?? '';
  }
}