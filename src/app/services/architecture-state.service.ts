import { Injectable, computed, signal } from '@angular/core';
import {
  ARCHITECTURE_STEPS,
  ArchitectureSelection,
  DEFAULT_SELECTION,
  StepOption
} from '../models/architecture.models';

/** Duración de la salida del menú antes de cambiar de paso (ms). */
const STEP_TRANSITION_MS = 240;
/** Tiempo que tarda el wizard en desvanecerse antes de mostrar la vista final (ms). */
const FINISH_TRANSITION_MS = 450;

/**
 * Fuente única de verdad: el wizard escribe aquí y el canvas 3D lee de aquí.
 *
 * - `highlightedId`: opción sobre la que estás (hover / flechas). El 3D la muestra como "preview".
 * - `selection`: opciones ya confirmadas con Enter / click.
 */
@Injectable({ providedIn: 'root' })
export class ArchitectureStateService {
  readonly steps = ARCHITECTURE_STEPS;

  readonly step = signal(0);
  readonly direction = signal<1 | -1>(1);
  readonly leaving = signal(false);
  readonly isBuilt = signal(false);

  readonly selection = signal<ArchitectureSelection>({ ...DEFAULT_SELECTION });
  readonly highlightedId = signal<string>(DEFAULT_SELECTION.architectureType);

  readonly activeStep = computed(() => this.steps[this.step()]);
  readonly isLastStep = computed(() => this.step() === this.steps.length - 1);
  readonly highlightedOption = computed<StepOption>(() => {
    const options = this.activeStep().options;
    return options.find(o => o.id === this.highlightedId()) ?? options[0];
  });

  private timer: ReturnType<typeof setTimeout> | null = null;

  /** Opción ya elegida de una categoría (para la vista final). */
  chosenOption(category: keyof ArchitectureSelection): StepOption | undefined {
    const step = this.steps.find(s => s.category === category);
    return step?.options.find(o => o.id === this.selection()[category]);
  }

  highlight(id: string): void {
    if (this.isBuilt() || this.leaving()) return;
    if (this.activeStep().options.some(o => o.id === id)) {
      this.highlightedId.set(id);
    }
  }

  moveHighlight(delta: 1 | -1): void {
    if (this.isBuilt() || this.leaving()) return;
    const options = this.activeStep().options;
    const index = options.findIndex(o => o.id === this.highlightedId());
    const next = Math.min(options.length - 1, Math.max(0, index + delta));
    this.highlightedId.set(options[next].id);
  }

  /** Confirma la opción resaltada y avanza (o finaliza en el último paso). */
  confirm(): void {
    if (this.isBuilt() || this.leaving()) return;

    const category = this.activeStep().category;
    this.selection.update(s => ({ ...s, [category]: this.highlightedId() }));

    if (this.isLastStep()) {
      this.finish();
    } else {
      this.goTo(this.step() + 1, 1);
    }
  }

  back(): void {
    if (this.isBuilt() || this.leaving() || this.step() === 0) return;
    this.goTo(this.step() - 1, -1);
  }

  reset(): void {
    this.clearTimer();
    this.leaving.set(false);
    this.direction.set(-1);
    this.step.set(0);
    this.highlightedId.set(this.selection().architectureType);
    this.isBuilt.set(false);
  }

  private goTo(target: number, direction: 1 | -1): void {
    this.direction.set(direction);
    this.leaving.set(true);
    this.clearTimer();

    this.timer = setTimeout(() => {
      const category = this.steps[target].category;
      this.step.set(target);
      this.highlightedId.set(this.selection()[category]);
      this.leaving.set(false);
    }, STEP_TRANSITION_MS);
  }

  private finish(): void {
    this.direction.set(1);
    this.leaving.set(true);
    this.clearTimer();

    this.timer = setTimeout(() => {
      this.isBuilt.set(true);
      this.leaving.set(false);
    }, FINISH_TRANSITION_MS);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}