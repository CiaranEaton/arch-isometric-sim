export interface ArchitectureSelection {
  architectureType: string;
  frontend: string;
  backend: string;
  database: string;
  auth: string;
  devops: string;
}

/** Categorías que se dibujan como cubos/figuras en el 3D (todas menos el tipo de sistema). */
export type NodeCategory = Exclude<keyof ArchitectureSelection, 'architectureType'>;

export interface StepOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
  recommendation?: string;
  tags: string[];
  iconUrl: string;
}

export interface WizardStep {
  id: number;
  /** Título corto estilo menú Xbox. */
  menuTitle: string;
  title: string;
  subtitle: string;
  category: keyof ArchitectureSelection;
  options: StepOption[];
}

export type ShapeKind = 'box' | 'octa' | 'tetra' | 'icosa' | 'dodeca' | 'cylinder' | 'cone' | 'torus';

/** Cómo se ve cada opción dentro del 3D. */
export interface OptionVisual {
  color: number;
  shape: ShapeKind;
  /** Texto corto que flota sobre la figura. */
  short: string;
}

export const DEFAULT_SELECTION: ArchitectureSelection = {
  architectureType: 'monorepo',
  frontend: 'angular',
  backend: 'nestjs',
  database: 'supabase_postgres',
  auth: 'aws_cognito',
  devops: 'docker_k8s'
};

export const OPTION_VISUALS: Record<string, OptionVisual> = {
  monorepo: { color: 0x10b981, shape: 'box', short: 'MONOREPO' },
  microservices: { color: 0xa78bfa, shape: 'box', short: 'MICROSERVICIOS' },

  angular: { color: 0xdd0031, shape: 'box', short: 'ANGULAR' },
  vue: { color: 0x42b883, shape: 'tetra', short: 'VUE' },
  react: { color: 0x61dafb, shape: 'icosa', short: 'REACT' },

  nestjs: { color: 0xe0234e, shape: 'dodeca', short: 'NESTJS' },
  nodejs_express: { color: 0x84cc16, shape: 'octa', short: 'EXPRESS' },

  supabase_postgres: { color: 0x3ecf8e, shape: 'cylinder', short: 'POSTGRES' },
  mongodb: { color: 0x47a248, shape: 'cone', short: 'MONGODB' },

  aws_cognito: { color: 0xff9900, shape: 'torus', short: 'COGNITO' },
  supabase_auth: { color: 0x22d3ee, shape: 'octa', short: 'SUPABASE AUTH' },

  docker_k8s: { color: 0x2496ed, shape: 'box', short: 'DOCKER + K8S' }
};

export const ARCHITECTURE_STEPS: WizardStep[] = [
  {
    id: 0,
    menuTitle: 'Sistema',
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
    menuTitle: 'Frontend',
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
    menuTitle: 'Backend',
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
    menuTitle: 'Datos',
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
    menuTitle: 'Seguridad',
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
    menuTitle: 'Deploy',
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