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
    <div class="relative w-full bg-slate-900/90 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl p-6 shadow-2xl shadow-cyan-950/60 text-slate-100">
      
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
          class="relative cursor-pointer group p-4 rounded-xl border transition-all duration-200 bg-slate-950/70 hover:bg-slate-800/80 flex flex-col justify-between"
          [ngClass]="{
            'border-cyan-400 bg-cyan-950/40 shadow-[0_0_20px_rgba(34,211,238,0.3)]': isSelected(activeStep.category, option.id),
            'border-slate-800 hover:border-slate-600': !isSelected(activeStep.category, option.id)
          }">
          
          <div>
            <!-- Header con Icono Oficial CDN y Badge -->
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center p-1.5 shadow-inner group-hover:border-cyan-500/50 transition-colors overflow-hidden">
                  <img [src]="option.iconUrl" [alt]="option.name" class="w-full h-full object-contain filter drop-shadow">
                </div>
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
          class="px-4 py-2 rounded-lg font-mono text-xs font-semibold border transition-all cursor-pointer"
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
          class="px-5 py-2 rounded-lg font-mono text-xs font-bold border transition-all shadow-lg cursor-pointer"
          [ngClass]="{
            'border-slate-800 text-slate-600 bg-slate-900 cursor-not-allowed': !hasSelectedCurrent(),
            'border-cyan-400 text-slate-950 bg-cyan-400 hover:bg-cyan-300 shadow-cyan-500/20': hasSelectedCurrent()
          }">
          SIGUIENTE →
        </button>

        <button 
          *ngIf="currentStep === steps.length - 1"
          (click)="finishWizard()"
          [disabled]="!hasSelectedCurrent()"
          class="px-6 py-2 rounded-lg font-mono text-xs font-bold border transition-all shadow-lg cursor-pointer animate-pulse"
          [ngClass]="{
            'border-slate-800 text-slate-600 bg-slate-900 cursor-not-allowed': !hasSelectedCurrent(),
            'border-emerald-400 text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/30': hasSelectedCurrent()
          }">
          ⚡ CONSTRUIR ARQUITECTURA EN 3D
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
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.stepChange.emit(this.currentStep);
    }
  }

  prevStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.stepChange.emit(this.currentStep);
    }
  }

  finishWizard(): void {
    this.architectureComplete.emit(this.selection);
  }
}