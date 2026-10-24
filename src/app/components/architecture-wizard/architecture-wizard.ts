import { ChangeDetectionStrategy, Component, ElementRef, effect, inject } from '@angular/core';
import { Affinity, StepOption, layerColor } from '../../models/architecture.models';
import { ArchitectureStateService } from '../../services/architecture-state.service';

@Component({
  selector: 'app-architecture-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './architecture-wizard.html',
  styleUrl: './architecture-wizard.css'
})
export class ArchitectureWizardComponent {
  protected readonly state = inject(ArchitectureStateService);
  protected readonly layerColor = layerColor;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    effect(() => {
      this.state.step();
      requestAnimationFrame(() => this.revealCurrentStep());
    });
  }

  onRadioKeydown(event: KeyboardEvent): void {
    const options = this.state.activeStep().options;
    const current = Math.max(0, options.findIndex((o: StepOption) => o.id === this.state.selectedId()));
    let next = current;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight': next = (current + 1) % options.length; break;
      case 'ArrowUp':
      case 'ArrowLeft': next = (current - 1 + options.length) % options.length; break;
      case 'Home': next = 0; break;
      case 'End': next = options.length - 1; break;
      default: return;
    }

    event.preventDefault();
    this.state.select(options[next].id);
    this.host.nativeElement.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
  }

  onIconError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

    next(): void {
    // Si estamos en el último paso, marcamos la arquitectura como construida
    if (this.state.step() === this.state.steps().length - 1) {
      this.state.isBuilt.set(true);
    } else {
      this.state.step.set(this.state.step() + 1);
    }
  }

  prev(): void {
    this.state.step.set(this.state.step() - 1);
  }

  getSelected(): StepOption | undefined {
    return this.state.activeStep().options.find((o: StepOption) => o.id === this.state.selectedId());
  }

  // NUEVO: Calcula el "Por qué encaja" para mostrarlo en el wizard
  getSelectedReason(option: StepOption): string {
    const context: Record<string, string> = { route: this.state.routeId(), ...this.state.selection() };
    let best: Affinity | null = null;

    for (const affinity of option.affinities ?? []) {
      const matches = Object.entries(affinity.when).every(([key, allowed]) => allowed.includes(context[key]));
      if (matches && (!best || affinity.score > best.score)) best = affinity;
    }
    return best?.reason ?? '';
  }

  private revealCurrentStep(): void {
    const nav = this.host.nativeElement.querySelector<HTMLElement>('.sb-steps');
    const current = nav?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!nav || !current) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    nav.scrollTo({
      left: current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2,
      behavior: reduceMotion ? 'auto' : 'smooth'
    });
  }
}