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
        class="flex max-h-full flex-col gap-3 overflow-y-auto overscroll-contain rounded-t-2xl border border-cyan-400/25 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-xl lg:rounded-2xl"
        aria-labelledby="piece-detail-title"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-semibold" [style.color]="v.color">{{ v.layerLabel }}</p>
            <h2 id="piece-detail-title" class="mt-0.5 text-lg font-bold text-white">{{ v.option.name }}</h2>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-lg border border-slate-700 px-2.5 py-1 text-sm text-slate-300 transition-colors hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
            aria-label="Cerrar detalle"
            (click)="detail.close()"
          >
            ✕
          </button>
        </div>

        <p class="text-sm leading-relaxed text-slate-300">{{ v.option.description }}</p>

        <ul class="flex flex-wrap gap-1.5" aria-label="Características">
          @for (tag of v.option.tags; track tag) {
            <li class="rounded-md border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-[11px] text-slate-300">{{ tag }}</li>
          }
        </ul>

        @if (v.reason) {
          <section>
            <h3 class="text-xs font-semibold uppercase tracking-wide text-cyan-300">Por qué encaja</h3>
            <p class="mt-1 text-sm leading-relaxed text-slate-300">{{ v.reason }}</p>
          </section>
        }

        @if (v.alternatives.length) {
          <section>
            <h3 class="text-xs font-semibold uppercase tracking-wide text-cyan-300">Otras opciones de este paso</h3>
            <ul class="mt-1.5 flex flex-wrap gap-1.5">
              @for (name of v.alternatives; track name) {
                <li class="rounded-full border border-slate-700 px-2.5 py-0.5 text-xs text-slate-400">{{ name }}</li>
              }
            </ul>
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

  /** La regla de mayor puntaje que se cumple con el tipo de proyecto y lo elegido hasta ahora. */
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