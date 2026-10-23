import { Injectable, computed, signal } from '@angular/core';
import {
  Affinity,
  ArchitectureSelection,
  DEFAULT_ROUTE_ID,
  OPTION_CATALOG,
  PROJECT_STEP,
  ProjectTypeId,
  ROUTES,
  STEP_DEFS,
  StepOption,
  WizardStep
} from '../models/architecture.models';

/** Qué tan bien encaja una opción con el contexto actual (tipo de proyecto + elecciones previas). */
export interface OptionFit {
  score: number;
  reason: string;
}

export interface ChosenItem {
  step: WizardStep;
  option: StepOption;
}

function evaluateFit(option: StepOption, context: Record<string, string>): OptionFit {
  let score = 0;
  let strongest: Affinity | null = null;

  for (const affinity of option.affinities ?? []) {
    const matches = Object.entries(affinity.when).every(([key, allowed]) => allowed.includes(context[key]));
    if (!matches) continue;
    score += affinity.score;
    if (!strongest || affinity.score > strongest.score) strongest = affinity;
  }

  return { score, reason: strongest?.reason ?? '' };
}

/**
 * Fuente única de verdad: el wizard escribe aquí y el canvas 3D lee de aquí.
 *
 * - Paso 0 = tipo de proyecto (`routeId`). Los pasos siguientes salen de la ruta elegida.
 * - `selection`: categoría → id de opción. Al entrar a un paso sin elección previa se
 *   preselecciona la recomendada (o la primera), así "Continuar" siempre tiene algo válido.
 * - `reached`: paso más lejano alcanzado; el stepper solo permite saltar hasta ahí.
 */
@Injectable({ providedIn: 'root' })
export class ArchitectureStateService {
  readonly routes = ROUTES;

  readonly routeId = signal<ProjectTypeId>(DEFAULT_ROUTE_ID);
  readonly selection = signal<ArchitectureSelection>({});
  readonly step = signal(0);
  readonly reached = signal(0);
  readonly direction = signal<1 | -1>(1);
  readonly isBuilt = signal(false);

  readonly route = computed(() => ROUTES.find(r => r.id === this.routeId()) ?? ROUTES[0]);

  readonly steps = computed<WizardStep[]>(() => [
    PROJECT_STEP,
    ...this.route().steps.map(({ category, options }) => ({
      ...STEP_DEFS[category],
      category,
      options: options.map(id => OPTION_CATALOG[id])
    }))
  ]);

  readonly activeStep = computed(() => this.steps()[this.step()]);
  readonly isLastStep = computed(() => this.step() === this.steps().length - 1);

  /** Opción elegida en el paso activo (en el paso 0, el tipo de proyecto). */
  readonly selectedId = computed(() => {
    const step = this.activeStep();
    return step.category === 'project' ? this.routeId() : (this.selection()[step.category] ?? '');
  });

  /** Alias para el canvas 3D, que lo usa como "preview" del paso activo. */
  readonly highlightedId = computed(() => this.selectedId());

  readonly selectedOption = computed<StepOption>(() => {
    const options = this.activeStep().options;
    return options.find(o => o.id === this.selectedId()) ?? options[0];
  });

  /* ───────────── Recomendaciones dinámicas ───────────── */

  private readonly context = computed<Record<string, string>>(() => ({
    route: this.routeId(),
    ...this.selection()
  }));

  /** Encaje de cada opción del paso activo, calculado con las `affinities` del catálogo. */
  readonly fits = computed<Record<string, OptionFit>>(() => {
    const context = this.context();
    const result: Record<string, OptionFit> = {};
    for (const option of this.activeStep().options) {
      result[option.id] = evaluateFit(option, context);
    }
    return result;
  });

  /** Solo hay recomendada si una opción supera claramente a las demás (el paso 0 nunca recomienda). */
  readonly recommendedId = computed<string | null>(() => {
    if (this.activeStep().category === 'project') return null;
    const [top, second] = Object.entries(this.fits()).sort((a, b) => b[1].score - a[1].score);
    return top && top[1].score > 0 && top[1].score > (second?.[1].score ?? 0) ? top[0] : null;
  });

  /* ───────────── Resumen ───────────── */

  /** Elecciones confirmadas, en el orden del flujo (sin el paso 0). */
  readonly chosen = computed<ChosenItem[]>(() => {
    const selection = this.selection();
    return this.steps()
      .slice(1)
      .flatMap(step => {
        const option = step.options.find(o => o.id === selection[step.category]);
        return option ? [{ step, option }] : [];
      });
  });

  chosenOption(category: string): StepOption | undefined {
    return this.chosen().find(c => c.step.category === category)?.option;
  }

  /* ───────────── Acciones ───────────── */

  select(id: string): void {
    const step = this.activeStep();
    if (this.isBuilt() || !step.options.some(o => o.id === id)) return;

    if (step.category === 'project') {
      if (id === this.routeId()) return;
      // Otra ruta = otros pasos y opciones: se descarta lo anterior.
      this.routeId.set(id as ProjectTypeId);
      this.selection.set({});
      this.reached.set(0);
    } else {
      this.selection.update(s => ({ ...s, [step.category]: id }));
    }
  }

  /** Avanza al siguiente paso; en el último, muestra el resultado final. */
  next(): void {
    if (this.isBuilt()) return;
    this.direction.set(1);

    if (this.isLastStep()) {
      this.isBuilt.set(true);
    } else {
      this.enterStep(this.step() + 1);
    }
  }

  back(): void {
    if (this.isBuilt() || this.step() === 0) return;
    this.direction.set(-1);
    this.enterStep(this.step() - 1);
  }

  /** Salto desde el stepper (o desde la vista final): solo hasta el paso más lejano alcanzado. */
  goToStep(index: number): void {
    if (index < 0 || index >= this.steps().length || index > this.reached()) return;
    if (index === this.step() && !this.isBuilt()) return;

    this.direction.set(index > this.step() ? 1 : -1);
    this.isBuilt.set(false);
    this.enterStep(index);
  }

  /** Vuelve al inicio conservando lo elegido. */
  reset(): void {
    this.direction.set(-1);
    this.isBuilt.set(false);
    this.enterStep(0);
  }

  private enterStep(index: number): void {
    this.step.set(index);
    this.reached.update(r => Math.max(r, index));

    const step = this.steps()[index];
    if (step.category !== 'project' && !this.selection()[step.category]) {
      const pick = this.recommendedId() ?? step.options[0].id;
      this.selection.update(s => ({ ...s, [step.category]: pick }));
    }
  }
}