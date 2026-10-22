import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IsometricCanvasComponent } from './components/isometric-canvas/isometric-canvas';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, IsometricCanvasComponent],
  template: `
    <main class="min-h-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-start p-6 relative overflow-hidden font-sans gap-8">
      
      <!-- Efecto de brillo neón de fondo -->
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Tarjeta Principal / Header -->
      <div class="relative z-10 max-w-4xl w-full bg-slate-900/85 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 shadow-2xl shadow-cyan-950/50">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]"></div>
            <span class="text-xs uppercase tracking-widest text-cyan-400 font-mono">System Status: Active (Three.js Loaded)</span>
          </div>
          <span class="text-xs text-slate-400 font-mono">Fase 2: Cuadrícula Isométrica</span>
        </div>

        <h1 class="text-2xl font-extrabold tracking-tight text-white mb-2">
          CYBER ARCHITECTURE <span class="text-cyan-400">SIMULATOR</span>
        </h1>
        
        <p class="text-slate-400 text-sm leading-relaxed">
          Motor interactivo 3D con perspectiva isométrica ortográfica y estética industrial cyberpunk.
        </p>
      </div>

      <!-- Contenedor del Canvas 3D (Three.js) -->
      <div class="relative z-10 max-w-4xl w-full">
        <app-isometric-canvas></app-isometric-canvas>
      </div>

    </main>
  `
})
export class App {
  title = 'arch-isometric-sim';
}