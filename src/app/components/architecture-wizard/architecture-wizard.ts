import { ChangeDetectionStrategy, Component, ElementRef, effect, inject } from '@angular/core';
import { layerColor } from '../../models/architecture.models';
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
    // Mantiene visible el paso activo cuando el stepper desborda (rutas con muchos pasos).
    effect(() => {
      this.state.step();
      requestAnimationFrame(() => this.revealCurrentStep());
    });
  }

  /** Flechas / Home / End dentro de la lista de opciones (patrón estándar de radiogroup). */
  onRadioKeydown(event: KeyboardEvent): void {
    const options = this.state.activeStep().options;
    const current = Math.max(0, options.findIndex(o => o.id === this.state.selectedId()));
    let next = current;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        next = (current + 1) % options.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        next = (current - 1 + options.length) % options.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = options.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.state.select(options[next].id);
    this.host.nativeElement.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
  }

  /** Si el ícono del CDN no carga, se oculta y queda el recuadro vacío (sin romper el layout). */
  onIconError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
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