import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { ArchitectureStateService } from '../../services/architecture-state.service';

@Component({
  selector: 'app-architecture-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="xbox-shell"
      [class.menu-leaving]="state.leaving()"
      [attr.data-dir]="state.direction()"
    >
      @for (step of [state.activeStep()]; track step.id) {
        <div
          class="xbox-panel"
          [class.menu-enter-fwd]="state.direction() === 1"
          [class.menu-enter-back]="state.direction() === -1"
        >
          <!-- Encabezado -->
          <div class="relative z-10 flex items-end justify-between gap-4">
            <div>
              <p class="mb-2 font-mono text-[11px] tracking-widest text-emerald-400/80">
                Paso {{ step.id + 1 }} de {{ state.steps.length }}
              </p>
              <h2 class="xbox-title">{{ step.menuTitle }}</h2>
            </div>

            <div class="flex items-center gap-2 pb-1" aria-hidden="true">
              @for (s of state.steps; track s.id) {
                <span
                  class="h-2.5 w-2.5 rounded-full border border-emerald-400/50 transition-all duration-500"
                  [class]="s.id === step.id ? 'bg-lime-300 scale-125' : s.id < step.id ? 'bg-emerald-800' : 'bg-slate-900'"
                  [style.box-shadow]="s.id === step.id ? '0 0 12px #bef264' : 'none'"
                ></span>
              }
            </div>
          </div>

          <p class="relative z-10 mb-5 mt-3 text-xs leading-relaxed text-slate-400">
            {{ step.subtitle }}
          </p>

          <!-- Lista de opciones -->
          <ul class="xbox-list relative z-10" role="listbox" [attr.aria-label]="step.title">
            @for (option of step.options; track option.id; let i = $index) {
              <li
                class="xbox-item"
                role="option"
                [class.is-active]="state.highlightedId() === option.id"
                [attr.aria-selected]="state.highlightedId() === option.id"
                [style.animation-delay.ms]="i * 70"
                (pointerenter)="onPointerEnter($event, option.id)"
                (click)="onItemClick(option.id)"
              >
                <img class="xbox-icon" [src]="option.iconUrl" [alt]="option.name" />
                <span class="flex-1 text-sm font-extrabold tracking-wide">{{ option.name }}</span>

                @if (option.badge) {
                  <span
                    class="rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase"
                    [class]="state.highlightedId() === option.id ? 'bg-black/15' : 'bg-lime-900/60 text-lime-300'"
                  >
                    {{ option.badge }}
                  </span>
                }

                @if (state.selection()[step.category] === option.id) {
                  <span class="font-mono text-xs font-black" title="Elegida anteriormente">✓</span>
                }
              </li>
            }
          </ul>

          <!-- Tarjeta de detalle (como el recuadro "AUDIO CD" del Xbox) -->
          @for (option of [state.highlightedOption()]; track option.id) {
            <div class="xbox-info relative z-10">
              <p class="text-xs leading-relaxed text-slate-200">{{ option.description }}</p>

              @if (option.recommendation) {
                <p class="mt-3 flex gap-2 text-[11px] leading-snug text-lime-300">
                  <span aria-hidden="true">⚡</span>
                  <span>{{ option.recommendation }}</span>
                </p>
              }

              <div class="mt-3 flex flex-wrap gap-2">
                @for (tag of option.tags; track tag) {
                  <span
                    class="rounded-md border border-emerald-500/25 bg-slate-950/80 px-2 py-0.5 font-mono text-[10px] text-emerald-300"
                  >
                    {{ tag }}
                  </span>
                }
              </div>
            </div>
          }

          <!-- Controles -->
          <div class="relative z-10 mt-5 flex items-center justify-between font-mono text-[11px] tracking-wide">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300 disabled:cursor-not-allowed disabled:opacity-30"
              [class]="state.step() > 0 ? 'text-emerald-300 hover:text-lime-300' : 'text-slate-600'"
              [disabled]="state.step() === 0 || state.leaving()"
              (click)="state.back()"
            >
              <span class="xbox-key">B</span> Atrás
            </button>

            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 font-bold text-lime-300 transition-colors hover:text-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300 disabled:opacity-40"
              [disabled]="state.leaving()"
              (click)="state.confirm()"
            >
              {{ state.isLastStep() ? 'Desplegar matriz 3D' : 'Seleccionar' }}
              <span class="xbox-key">A</span>
            </button>
          </div>

          <p class="relative z-10 mt-3 hidden text-center font-mono text-[10px] text-slate-500 lg:block">
            ↑ ↓ navegar · Enter seleccionar · Esc atrás
          </p>
        </div>
      }
    </div>
  `
})
export class ArchitectureWizardComponent {
  protected readonly state = inject(ArchitectureStateService);

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.state.isBuilt() || event.altKey || event.ctrlKey || event.metaKey) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.state.moveHighlight(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.state.moveHighlight(-1);
        break;
      case 'Enter':
        // Si hay un botón enfocado, su propio click ya confirma
        if (event.target instanceof HTMLButtonElement) return;
        event.preventDefault();
        this.state.confirm();
        break;
      case 'Escape':
      case 'Backspace':
        event.preventDefault();
        this.state.back();
        break;
    }
  }

  /** Solo el mouse resalta al pasar por encima; en táctil el primer toque resalta y el segundo confirma. */
  onPointerEnter(event: PointerEvent, optionId: string): void {
    if (event.pointerType === 'mouse') {
      this.state.highlight(optionId);
    }
  }

  onItemClick(optionId: string): void {
    if (this.state.highlightedId() === optionId) {
      this.state.confirm();
    } else {
      this.state.highlight(optionId);
    }
  }
}