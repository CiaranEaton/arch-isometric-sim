import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  iconUrl: string;
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
    <div class="relative w-full bg-slate-950/90 backdrop-blur-2xl border border-emerald-500/40 rounded-3xl p-8 shadow-[0_0_50px_rgba(16,185,129,0.2)] text-slate-100 transition-all duration-700 transform-gpu" style="perspective: 1200px;">
      
      <!-- Stepper / Encabezado de Progreso -->
      <div class="flex items-center justify-between border-b border-emerald-500/20 pb-4 mb-8">
        <div>
          <span class="text-xs font-mono uppercase text-emerald-400 tracking-widest">SISTEMA // SECCIÓN {{ currentStep + 1 }} DE {{ steps.length }}</span>
          <h2 class="text-2xl font-black text-white tracking-wider mt-1 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">{{ activeStep.title }}</h2>
          <p class="text-xs text-slate-400 mt-1 font-mono">{{ activeStep.subtitle }}</p>
        </div>

        <div class="flex items-center gap-2">
          <div 
            *ngFor="let step of steps; let i = index"
            class="w-3.5 h-3.5 rounded-full transition-all duration-500 border border-emerald-500/40"
            [ngClass]="{
              'bg-emerald-400 shadow-[0_0_12px_#34d399] scale-125': i === currentStep,
              'bg-emerald-900/60': i < currentStep,
              'bg-slate-900': i > currentStep
            }">
          </div>
        </div>
      </div>

      <!-- Contenedor con Animación Suave de Deslizamiento (Fade / Slide) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 transition-all duration-500 transform-gpu" [ngClass]="animating ? 'opacity-0 translate-y-4 scale-98' : 'opacity-100 translate-y-0 scale-100'">
        <div 
          *ngFor="let option of activeStep.options"
          (click)="selectOption(activeStep.category, option.id)"
          class="relative cursor-pointer group p-5 rounded-2xl border transition-all duration-300 bg-slate-900/90 hover:bg-slate-900 flex flex-col justify-between shadow-2xl"
          [ngClass]="{
            'border-emerald-400 bg-emerald-950/40 shadow-[0_0_30px_rgba(16,185,129,0.3)] ring-2 ring-emerald-400/50': isSelected(activeStep.category, option.id),
            'border-emerald-900/40 hover:border-emerald-500/60': !isSelected(activeStep.category, option.id)
          }">
          
          <div>
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3.5">
                <div class="w-10 h-10 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-center p-2 shadow-inner group-hover:border-emerald-400 transition-colors overflow-hidden">
                  <img [src]="option.iconUrl" [alt]="option.name" class="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">
                </div>
                <h3 class="font-extrabold text-slate-100 group-hover:text-emerald-300 transition-colors text-sm tracking-wide">{{ option.name }}</h3>
              </div>
              <span *ngIf="option.badge" class="text-[10px] uppercase px-2.5 py-1 rounded-md font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                {{ option.badge }}
              </span>
            </div>

            <p class="text-xs text-slate-300 mb-4 leading-relaxed font-sans">{{ option.description }}</p>

            <div *ngIf="option.recommendation" class="mb-4 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-start gap-2 shadow-inner">
              <span class="text-emerald-400">⚡</span>
              <span class="leading-snug">{{ option.recommendation }}</span>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 pt-3 border-t border-emerald-900/30">
            <span *ngFor="let tag of option.tags" class="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-slate-950 text-emerald-400/90 border border-emerald-500/20 shadow-sm">
              {{ tag }}
            </span>
          </div>
        </div>
      </div>

      <!-- Botones de Navegación -->
      <div class="flex items-center justify-between border-t border-emerald-500/20 pt-6">
        <button 
          (click)="prevStep()"
          [disabled]="currentStep === 0 || animating"
          class="px-5 py-2.5 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer shadow-md"
          [ngClass]="{
            'border-slate-800 text-slate-600 cursor-not-allowed bg-slate-950/40': currentStep === 0,
            'border-emerald-500/40 text-emerald-400 hover:border-emerald-400 hover:bg-emerald-950/30': currentStep > 0
          }">
          ← ANTERIOR
        </button>

        <button 
          *ngIf="currentStep < steps.length - 1"
          (click)="nextStep()"
          [disabled]="!hasSelectedCurrent() || animating"
          class="px-6 py-2.5 rounded-xl font-mono text-xs font-extrabold border transition-all shadow-lg cursor-pointer tracking-wider"
          [ngClass]="{
            'border-slate-800 text-slate-600 bg-slate-950/40 cursor-not-allowed': !hasSelectedCurrent(),
            'border-emerald-400 text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.4)]': hasSelectedCurrent()
          }">
          SIGUIENTE →
        </button>

        <button 
          *ngIf="currentStep === steps.length - 1"
          (click)="finishWizard()"
          [disabled]="!hasSelectedCurrent() || animating"
          class="px-7 py-2.5 rounded-xl font-mono text-xs font-black border transition-all shadow-xl cursor-pointer animate-pulse tracking-wider"
          [ngClass]="{
            'border-slate-800 text-slate-600 bg-slate-950/40 cursor-not-allowed': !hasSelectedCurrent(),
            'border-emerald-400 text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.6)]': hasSelectedCurrent()
          }">
          ⚡ DESPLEGAR MATRIZ 3D
        </button>
      </div>

    </div>
  `
})
export class ArchitectureWizardComponent {
  @Output() stepChange = new EventEmitter<number>();
  @Output() selectionChange = new EventEmitter<ArchitectureSelection>();
  @Output() architectureComplete = new EventEmitter<ArchitectureSelection>();

  currentStep = 0;
  animating = false;

  selection: ArchitectureSelection = {
    architectureType: 'monorepo',
    frontend: 'angular',
    backend: 'nestjs',
    database: 'supabase_postgres',
    auth: 'aws_cognito',
    devops: 'docker_k8s'
  };

  steps: WizardStep[] = [
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
          iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg'
        },
        {
          id: 'microservices',
          name: 'Microservicios Desacoplados',
          description: 'Múltiples repositorios independientes o servicios aislados comunicados mediante mensajería o gRPC.',
          recommendation: 'Recomendado cuando diferentes equipos manejan servicios independientes con despliegues separados.',
          tags: ['Docker', 'Event-Driven', 'gRPC / REST'],
          iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg'
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
          iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angular/angular-original.svg'
        },
        {
          id: 'vue',
          name: 'Vue.js / Nuxt',
          description: 'Procesamiento de interfaz ultrarrápido y reactivo con sintaxis limpia.',
          recommendation: 'Excelente opción si buscas ligereza y curva de aprendizaje muy rápida.',
          tags: ['Vue 3', 'Vite', 'Pinia'],
          iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg'
        },
        {
          id: 'react',
          name: 'React.js / Next.js',
          description: 'Ecosistema masivo basado en componentes funcionales y JSX.',
          recommendation: 'Muy popular para ecosistemas masivos de librerías de terceros.',
          tags: ['React 19', 'Zustand', 'JSX'],
          iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg'
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
          iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nestjs/nestjs-original.svg'
        },
        {
          id: 'nodejs_express',
          name: 'Node.js + Express / Fastify',
          description: 'Servidor HTTP liviano, minimalista y totalmente personalizable.',
          recommendation: 'Ideal para microservicios pequeños o prototipado rápido.',
          tags: ['Node.js', 'Express', 'JavaScript/TS'],
          iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg'
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
          iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg'
        },
        {
          id: 'mongodb',
          name: 'MongoDB + Redis Cache',
          description: 'Base de datos NoSQL orientada a documentos flexibles, respaldada con caché en memoria ultrarrápida.',
          recommendation: 'Recomendada si la estructura de tus datos cambia constantemente sin esquemas fijos.',
          tags: ['NoSQL', 'Mongoose', 'Redis'],
          iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg'
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
          iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original-wordmark.svg'
        },
        {
          id: 'supabase_auth',
          name: 'Supabase Auth / Custom JWT',
          description: 'Manejo de usuarios integrado directamente con la base de datos o mediante tokens JWT propios.',
          recommendation: 'Rápido de configurar y muy amigable con proyectos Monorepo.',
          tags: ['JWT', 'OAuth', 'Row Level Security'],
          iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg'
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
          iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg'
        }
      ]
    }
  ];

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

  selectOption(category: keyof ArchitectureSelection, optionId: string): void {
    this.selection[category] = optionId;
    this.selectionChange.emit(this.selection);
  }

  nextStep(): void {
    if (this.currentStep < this.steps.length - 1 && !this.animating) {
      this.animating = true;
      setTimeout(() => {
        this.currentStep++;
        this.stepChange.emit(this.currentStep);
        this.animating = false;
      }, 250);
    }
  }

  prevStep(): void {
    if (this.currentStep > 0 && !this.animating) {
      this.animating = true;
      setTimeout(() => {
        this.currentStep--;
        this.stepChange.emit(this.currentStep);
        this.animating = false;
      }, 250);
    }
  }

  finishWizard(): void {
    this.architectureComplete.emit(this.selection);
  }
}