import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface ArchitectureSelection {
  architectureType: string;
  frontend: string;
  backend: string;
  database: string;
  auth: string;
  devops: string;
}

interface StepOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
  recommendation?: string;
  tags: string[];
  iconSvg: SafeHtml;
}

interface WizardStep {
  id: number;
  title: string;
  subtitle: string;
  category: keyof ArchitectureSelection;
  options: StepOption[];
}

@Component({
  selector: 'app-architecture-wizard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full bg-slate-900/90 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 shadow-2xl shadow-cyan-950/40 text-slate-100">
      
      <!-- Stepper / Encabezado de Progreso -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div>
          <span class="text-xs font-mono uppercase text-cyan-400 tracking-wider">Paso {{ currentStep + 1 }} de {{ steps.length }}</span>
          <h2 class="text-xl font-bold text-white tracking-wide">{{ activeStep.title }}</h2>
          <p class="text-xs text-slate-400 mt-1">{{ activeStep.subtitle }}</p>
        </div>

        <div class="flex items-center gap-1.5">
          <div 
            *ngFor="let step of steps; let i = index"
            class="w-3 h-3 rounded-full transition-all duration-300"
            [ngClass]="{
              'bg-cyan-400 shadow-[0_0_8px_#22d3ee] scale-110': i === currentStep,
              'bg-emerald-500': i < currentStep,
              'bg-slate-700': i > currentStep
            }">
          </div>
        </div>
      </div>

      <!-- Opciones del Paso Actual -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div 
          *ngFor="let option of activeStep.options"
          (click)="selectOption(activeStep.category, option.id)"
          class="relative cursor-pointer group p-4 rounded-xl border transition-all duration-200 bg-slate-950/60 hover:bg-slate-800/80 flex flex-col justify-between"
          [ngClass]="{
            'border-cyan-400 bg-cyan-950/30 shadow-[0_0_15px_rgba(34,211,238,0.25)]': isSelected(activeStep.category, option.id),
            'border-slate-800 hover:border-slate-600': !isSelected(activeStep.category, option.id)
          }">
          
          <div>
            <!-- Header con Icono y Badge -->
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center p-1.5 shadow-inner group-hover:border-cyan-500/50 transition-colors" [innerHTML]="option.iconSvg"></div>
                <h3 class="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors text-sm">{{ option.name }}</h3>
              </div>
              <span *ngIf="option.badge" class="text-[10px] uppercase px-2 py-0.5 rounded font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {{ option.badge }}
              </span>
            </div>

            <p class="text-xs text-slate-400 mb-3 leading-relaxed">{{ option.description }}</p>

            <!-- Recomendación o Tip del sistema -->
            <div *ngIf="option.recommendation" class="mb-3 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-1.5">
              <span>💡</span>
              <span>{{ option.recommendation }}</span>
            </div>
          </div>

          <!-- Tags tecnicos -->
          <div class="flex flex-wrap gap-1.5 pt-2 border-t border-slate-900">
            <span *ngFor="let tag of option.tags" class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
              {{ tag }}
            </span>
          </div>
        </div>
      </div>

      <!-- Botones de Navegación -->
      <div class="flex items-center justify-between border-t border-slate-800 pt-4">
        <button 
          (click)="prevStep()"
          [disabled]="currentStep === 0"
          class="px-4 py-2 rounded-lg font-mono text-xs font-semibold border transition-all"
          [ngClass]="{
            'border-slate-800 text-slate-600 cursor-not-allowed': currentStep === 0,
            'border-slate-700 text-slate-300 hover:border-cyan-500 hover:text-cyan-400': currentStep > 0
          }">
          ← ANTERIOR
        </button>

        <button 
          *ngIf="currentStep < steps.length - 1"
          (click)="nextStep()"
          [disabled]="!hasSelectedCurrent()"
          class="px-5 py-2 rounded-lg font-mono text-xs font-bold border transition-all shadow-lg"
          [ngClass]="{
            'border-slate-800 text-slate-600 bg-slate-900 cursor-not-allowed': !hasSelectedCurrent(),
            'border-cyan-400 text-slate-950 bg-cyan-400 hover:bg-cyan-300 shadow-cyan-500/20 cursor-pointer': hasSelectedCurrent()
          }">
          SIGUIENTE →
        </button>

        <button 
          *ngIf="currentStep === steps.length - 1"
          (click)="finishWizard()"
          [disabled]="!hasSelectedCurrent()"
          class="px-6 py-2 rounded-lg font-mono text-xs font-bold border transition-all shadow-lg"
          [ngClass]="{
            'border-slate-800 text-slate-600 bg-slate-900 cursor-not-allowed': !hasSelectedCurrent(),
            'border-emerald-400 text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/20 cursor-pointer': hasSelectedCurrent()
          }">
          ⚡ CONSTRUIR ARQUITECTURA EN 3D
        </button>
      </div>

    </div>
  `
})
export class ArchitectureWizardComponent {
  @Output() architectureComplete = new EventEmitter<ArchitectureSelection>();

  currentStep = 0;

  selection: ArchitectureSelection = {
    architectureType: 'monorepo',
    frontend: 'angular',
    backend: 'nestjs',
    database: 'supabase_postgres',
    auth: 'aws_cognito',
    devops: 'docker_k8s'
  };

  steps: WizardStep[] = [];

  constructor(private sanitizer: DomSanitizer) {
    this.initSteps();
  }

  get activeStep(): WizardStep {
    return this.steps[this.currentStep];
  }

  isSelected(category: keyof ArchitectureSelection, optionId: string): boolean {
    return this.selection[category] === optionId;
  }

  hasSelectedCurrent(): boolean {
    const cat = this.activeStep.category;
    return !!this.selection[cat];
  }

  private svg(pathData: string, color: string = '#22d3ee'): SafeHtml {
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="${color}"><path d="${pathData}"/></svg>`;
    return this.sanitizer.bypassSecurityTrustHtml(svgString);
  }

  private initSteps(): void {
    this.steps = [
      {
        id: 0,
        title: '1. Tipo de Sistema (El Gabinete & Estructura)',
        subtitle: 'Selecciona cómo se organizará el código y los módulos de tu proyecto.',
        category: 'architectureType',
        options: [
          {
            id: 'monorepo',
            name: 'Monorepo Integrado (Nx / Turborepo)',
            badge: 'Recomendado',
            description: 'Frontend y Backend comparten tipos de TypeScript, DTOs y librerías comunes en un solo repositorio.',
            recommendation: 'Ideal para combinar Angular + NestJS compartiendo contratos API directamente sin duplicar interfaces.',
            tags: ['TypeScript', 'Nx Monorepo', 'Shared DTOs'],
            iconSvg: this.svg('M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z', '#38bdf8')
          },
          {
            id: 'microservices',
            name: 'Microservicios Desacoplados',
            description: 'Múltiples repositorios independientes o servicios aislados comunicados mediante mensajería o gRPC.',
            recommendation: 'Recomendado cuando diferentes equipos manejan servicios independientes con despliegues separados.',
            tags: ['Docker', 'Event-Driven', 'gRPC / REST'],
            iconSvg: this.svg('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z', '#a855f7')
          }
        ]
      },
      {
        id: 1,
        title: '2. Frontend & Capa Visual (La Placa Madre)',
        subtitle: 'Selecciona el framework cliente para construir la interfaz y lógica gráfica.',
        category: 'frontend',
        options: [
          {
            id: 'angular',
            name: 'Angular (Standalone Components)',
            badge: 'Core Match',
            description: 'Framework robusto, enfocado en TypeScript estricto, arquitectura modular e inyección de dependencias.',
            recommendation: 'Nuestra opción nativa para integrar Three.js con tipado estricto y excelente desempeño.',
            tags: ['Angular 19+', 'RxJS', 'Tailwind CSS'],
            iconSvg: this.svg('M12 2L2 5.8l2.9 11.9L12 22l7.1-4.3L22 5.8 12 2zm0 3.3l5.3 2.1-1.1 5.1L12 18.6 7.8 14.5l-1.1-5.1L12 5.3z', '#ef4444')
          },
          {
            id: 'vue',
            name: 'Vue.js / Nuxt',
            description: 'Procesamiento de interfaz ultrarrápido y reactivo con sintaxis limpia.',
            recommendation: 'Excelente opción si buscas ligereza y curva de aprendizaje muy rápida.',
            tags: ['Vue 3', 'Vite', 'Pinia'],
            iconSvg: this.svg('M2 3h4l6 10.4L18 3h4L12 21 2 3zm4.5 0L12 12.8 17.5 3H19L12 15.2 5 3h1.5z', '#10b981')
          },
          {
            id: 'react',
            name: 'React.js / Next.js',
            description: 'Ecosistema masivo basado en componentes funcionales y JSX.',
            recommendation: 'Muy popular para ecosistemas masivos de librerías de terceros.',
            tags: ['React 19', 'Zustand', 'JSX'],
            iconSvg: this.svg('M12 10.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5zm0-8C7 2.5 2.7 5.6 1 10c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5zm0 13c-3.03 0-5.5-2.47-5.5-5.5S8.97 7.5 12 7.5s5.5 2.47 5.5 5.5-2.47 5.5-5.5 5.5z', '#06b6d4')
          }
        ]
      },
      {
        id: 2,
        title: '3. Backend & Lógica (El Procesador)',
        subtitle: 'Selecciona el motor servidor para manejar endpoints, reglas de negocio y sockets.',
        category: 'backend',
        options: [
          {
            id: 'nestjs',
            name: 'NestJS (Node.js Enterprise Framework)',
            badge: 'Perfect Combo',
            description: 'Basado en TypeScript, decoradores e inyección de dependencias idéntica a la arquitectura de Angular.',
            recommendation: 'Al usar Angular en Frontend y NestJS en Backend, el cambio de contexto entre client/server es cero.',
            tags: ['TypeScript', 'Express/Fastify', 'TypeORM/Prisma'],
            iconSvg: this.svg('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z', '#f43f5e')
          },
          {
            id: 'nodejs_express',
            name: 'Node.js + Express / Fastify',
            description: 'Servidor HTTP liviano, minimalista y totalmente personalizable.',
            recommendation: 'Ideal para microservicios pequeños o prototipado rápido.',
            tags: ['Node.js', 'Express', 'JavaScript/TS'],
            iconSvg: this.svg('M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.2l7.5 3.8L12 11.8 4.5 8 12 4.2zM4 10.3l7 3.5v7.2l-7-3.5v-7.2zm9 10.7v-7.2l7-3.5v7.2l-7 3.5z', '#22c55e')
          }
        ]
      },
      {
        id: 3,
        title: '4. Almacenamiento & Estado (Memoria & ROM)',
        subtitle: 'Dónde residirán los datos transaccionales, relacionales o en tiempo real.',
        category: 'database',
        options: [
          {
            id: 'supabase_postgres',
            name: 'Supabase + PostgreSQL',
            badge: 'Top Performance',
            description: 'Base de datos relacional robusta con soporte nativo de SQL, Webhooks y llamadas en tiempo real.',
            recommendation: 'Te permite usar ORMs como Prisma o TypeORM para mantener tipado de datos con TypeScript.',
            tags: ['PostgreSQL', 'Prisma', 'Realtime Subscriptions'],
            iconSvg: this.svg('M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z', '#10b981')
          },
          {
            id: 'mongodb',
            name: 'MongoDB + Redis Cache',
            description: 'Base de datos NoSQL orientada a documentos flexibles, respaldada con caché en memoria ultrarrápida.',
            recommendation: 'Recomendada si la estructura de tus datos cambia constantemente sin esquemas fijos.',
            tags: ['NoSQL', 'Mongoose', 'Redis'],
            iconSvg: this.svg('M12 2c0 0-5 3.5-5 9 0 3.22 1.78 6.02 4.5 7.5V21h1v-2.5c2.72-1.48 4.5-4.28 4.5-7.5 0-5.5-5-9-5-9zm0 11.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z', '#22c55e')
          }
        ]
      },
      {
        id: 4,
        title: '5. Autenticación & Seguridad (Fuente de Poder)',
        subtitle: 'Cómo protegerás tus APIs, validarás tokens y gestionarás usuarios.',
        category: 'auth',
        options: [
          {
            id: 'aws_cognito',
            name: 'AWS Cognito',
            badge: 'Enterprise',
            description: 'Servicio gestionado por Amazon para Auth, OAuth2, MFA y gestión segura de sesiones a escala global.',
            recommendation: 'Ideal para arquitecturas de grado empresarial sin preocuparte por almacenar credenciales.',
            tags: ['AWS', 'OAuth2', 'JWT / MFA'],
            iconSvg: this.svg('M12 2L1 21h22L12 2zm0 3.8L19.4 19H4.6L12 5.8z', '#f97316')
          },
          {
            id: 'supabase_auth',
            name: 'Supabase Auth / Custom JWT',
            description: 'Manejo de usuarios integrado directamente con la base de datos o mediante tokens JWT propios.',
            recommendation: 'Rápido de configurar y muy amigable con proyectos Monorepo.',
            tags: ['JWT', 'OAuth', 'Row Level Security'],
            iconSvg: this.svg('M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z', '#3b82f6')
          }
        ]
      },
      {
        id: 5,
        title: '6. Contenedores & Deploy (Gabinete & Enfriamiento)',
        subtitle: 'Empaquetado, infraestructura y orquestación de servicios en producción.',
        category: 'devops',
        options: [
          {
            id: 'docker_k8s',
            name: 'Docker + Kubernetes + Vercel',
            badge: 'Full Cloud',
            description: 'Frontend desplegado en Vercel Edge; backend empaquetado en contenedores Docker orquestados.',
            recommendation: 'Sube tu app cliente a Vercel con CI/CD automático y mantén tus microservicios aislados en Docker.',
            tags: ['Docker Compose', 'Vercel CI/CD', 'Kubernetes'],
            iconSvg: this.svg('M20 13h-2.5v-2.5H20V13zM17 13h-2.5v-2.5H17V13zM14 13h-2.5v-2.5H14V13zM20 10h-2.5V7.5H20V10zM17 10h-2.5V7.5H17V10zM14 10h-2.5V7.5H14V10zM22 6.5C21.7 5.6 20.8 5 19.8 5H4.2C3.2 5 2.3 5.6 2 6.5L1 11.5c-.3 1.5.8 2.8 2.3 2.8h1.2v2.2c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-2.2h1.2c1.5 0 2.6-1.3 2.3-2.8L22 6.5z', '#0ea5e9')
          }
        ]
      }
    ];
  }

  selectOption(category: keyof ArchitectureSelection, optionId: string): void {
    this.selection[category] = optionId;
  }

  nextStep(): void {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
    }
  }

  prevStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  finishWizard(): void {
    this.architectureComplete.emit(this.selection);
  }
}