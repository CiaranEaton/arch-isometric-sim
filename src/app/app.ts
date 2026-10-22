import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="min-h-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      
      <!-- Efecto de brillo neón de fondo -->
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Tarjeta Principal -->
      <div class="relative z-10 max-w-xl w-full bg-slate-900/85 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-8 shadow-2xl shadow-cyan-950/50">
        
        <div class="flex items-center gap-3 mb-6">
          <div class="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]"></div>
          <span class="text-xs uppercase tracking-widest text-cyan-400 font-mono">System Status: Initializing</span>
        </div>

        <h1 class="text-3xl font-extrabold tracking-tight text-white mb-3">
          CYBER ARCHITECTURE <span class="text-cyan-400">SIMULATOR</span>
        </h1>
        
        <p class="text-slate-400 text-sm leading-relaxed mb-6">
          Motor interactivo de arquitectura de software. Fase 1: Entorno base configurado con Angular y Tailwind.
        </p>

        <div class="border-t border-slate-800 pt-6 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>STACK: Angular + Tailwind</span>
          <span class="text-cyan-400">Vercel Ready</span>
        </div>

      </div>

    </main>
  `
})
export class App {
  title = 'arch-isometric-sim';
}