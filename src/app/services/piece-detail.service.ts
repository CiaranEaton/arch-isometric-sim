import { Injectable, signal } from '@angular/core';

/** Pieza (categoría del paso, ej. 'backend') cuyo detalle está abierto en la vista final. */
@Injectable({ providedIn: 'root' })
export class PieceDetailService {
  readonly selected = signal<string | null>(null);

  open(category: string): void {
    this.selected.set(category);
  }

  /** Clic repetido sobre la misma pieza = cerrar. */
  toggle(category: string): void {
    this.selected.update(current => (current === category ? null : category));
  }

  close(): void {
    this.selected.set(null);
  }
}