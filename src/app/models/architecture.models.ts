/* ───────────────────────── Tipos ───────────────────────── */

export type LayerId = 'client' | 'frontend' | 'auth' | 'backend' | 'data' | 'infra' | 'workspace';

export type StepCategory =
  | 'project'
  | 'system'
  | 'frontend'
  | 'styling'
  | 'backend'
  | 'database'
  | 'auth'
  | 'devops'
  | 'domain'
  | 'cicd';

export type ProjectTypeId = 'frontend' | 'backend' | 'fullstack-simple' | 'fullstack-enterprise';

export type ArchitectureSelection = Record<string, string>;

/** @deprecated Temporal: el canvas viejo aún lo importa. Se elimina en la fase del canvas. */
export type NodeCategory = string;

/**
 * Regla de recomendación. Se cumple si, para CADA clave de `when`, el valor actual
 * está en la lista. Claves válidas: `route` (tipo de proyecto) o cualquier categoría ya elegida.
 */
export interface Affinity {
  when: Record<string, string[]>;
  score: number;
  reason: string;
}

export interface OptionMetrics {
  complexity: 'Baja' | 'Media' | 'Alta';
  scalability: string;
  cost: string;
}

export interface StepOption {
  id: string;
  name: string;
  description: string;
  tags: string[];
  iconUrl: string;
  affinities?: Affinity[];
  metrics?: OptionMetrics;
  bestPractices?: string[];
  analogy?: string; // <-- El campo que agregamos para la explicación simple
}

export interface StepDef {
  layer: LayerId;
  /** Nombre corto para el stepper. */
  menuTitle: string;
  title: string;
  subtitle: string;
}

/** Paso ya resuelto (con sus opciones) que consumen el wizard y el 3D. */
export interface WizardStep extends StepDef {
  category: StepCategory;
  options: StepOption[];
}

export interface RouteStep {
  category: Exclude<StepCategory, 'project'>;
  /** Ids del catálogo, en el orden en que se muestran. */
  options: string[];
}

export interface ProjectRoute extends StepOption {
  id: ProjectTypeId;
  steps: RouteStep[];
}

export interface LayerMeta {
  id: LayerId;
  label: string;
  color: number;
}

const icon = (name: string, variant = 'original'): string =>
  `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${name}/${name}-${variant}.svg`;

/* ───────────────────────── Pasos (títulos y capa) ───────────────────────── */

export const STEP_DEFS: Record<StepCategory, StepDef> = {
  project: {
    layer: 'workspace',
    menuTitle: 'Proyecto',
    title: 'Tipo de proyecto',
    subtitle: 'Define el alcance: cada tipo activa sus propios pasos.'
  },
  system: {
    layer: 'workspace',
    menuTitle: 'Estructura',
    title: 'Estructura del código',
    subtitle: 'Cómo se organizan repositorios, apps y librerías compartidas.'
  },
  frontend: {
    layer: 'frontend',
    menuTitle: 'Frontend',
    title: 'Frontend',
    subtitle: 'Framework cliente para construir la interfaz.'
  },
  styling: {
    layer: 'frontend',
    menuTitle: 'Estilos',
    title: 'Estilos y UI',
    subtitle: 'Cómo se construye y mantiene la capa visual.'
  },
  backend: {
    layer: 'backend',
    menuTitle: 'Backend',
    title: 'Backend',
    subtitle: 'Motor del servidor: endpoints, reglas de negocio y tiempo real.'
  },
  database: {
    layer: 'data',
    menuTitle: 'Datos',
    title: 'Base de datos',
    subtitle: 'Dónde viven los datos transaccionales y su modelo.'
  },
  auth: {
    layer: 'auth',
    menuTitle: 'Acceso',
    title: 'Autenticación',
    subtitle: 'Cómo se identifican usuarios y se protegen las APIs.'
  },
  devops: {
    layer: 'infra',
    menuTitle: 'Deploy',
    title: 'Despliegue e infraestructura',
    subtitle: 'Dónde y cómo corre tu proyecto en producción.'
  },
  domain: {
    layer: 'infra',
    menuTitle: 'Dominio',
    title: 'Dominio y DNS',
    subtitle: 'Dónde registras el dominio y quién gestiona el DNS.'
  },
  cicd: {
    layer: 'infra',
    menuTitle: 'CI/CD',
    title: 'Integración y entrega continua',
    subtitle: 'Cómo se prueba y publica cada cambio.'
  }
};

/* ───────────────────────── Catálogo de opciones ───────────────────────── */

const CATALOG_DATA: Record<string, Omit<StepOption, 'id'>> = {
  /* — Estructura — */
  nx_monorepo: {
    name: 'Monorepo con Nx',
    description: 'Apps y librerías en un solo repositorio, con grafo de dependencias, caché de builds y ejecución solo de lo afectado.',
    tags: ['Nx', 'Libs compartidas', 'Affected builds'],
    iconUrl: icon('nx'),
    analogy: 'El plano maestro de la fábrica. Todo (tuberías, cables, áreas) está en un solo lugar, conectado y optimizado para no repetir trabajo.',
    affinities: [
      { when: { route: ['fullstack-enterprise'] }, score: 2, reason: 'Comparte tipos y contratos entre frontend y backend sin duplicarlos.' }
    ]
  },
  turborepo: {
    name: 'Monorepo con Turborepo + pnpm',
    description: 'Workspaces de pnpm con pipelines cacheados; más ligero y con menos convención que Nx.',
    tags: ['pnpm', 'Turborepo', 'Remote cache'],
    iconUrl: icon('typescript'),
    analogy: 'Un plano de fábrica más sencillo y ligero. Comparte lo necesario sin tanta estructura, ideal si el equipo ya usa pnpm.',
    affinities: [
      { when: { route: ['fullstack-enterprise'] }, score: 1, reason: 'Más ligero que Nx si tu equipo ya usa pnpm workspaces.' }
    ]
  },
  polyrepo: {
    name: 'Repos independientes',
    description: 'Un repositorio por servicio o app, con versionado y despliegue propios para cada equipo.',
    tags: ['Multi-repo', 'Contratos versionados', 'Equipos autónomos'],
    iconUrl: icon('git'),
    analogy: 'Edificios separados. Cada departamento (front, back, db) tiene su propio local, su propia llave y su propio horario.'
  },

  /* — Frontend — */
  angular: {
    name: 'Angular',
    description: 'Framework completo con TypeScript estricto, inyección de dependencias y estructura opinada.',
    tags: ['TypeScript', 'RxJS', 'Signals'],
    iconUrl: icon('angular'),
    analogy: 'La recepción de la fábrica. El mostrador donde el cliente interactúa, pero con reglas súper estrictas y un manual de procedimientos gigante.',
    metrics: { complexity: 'Alta', scalability: 'Excelente', cost: 'Gratis' },
    bestPractices: ['Usa OnPush para rendimiento.', 'Modulariza por funcionalidad.', 'Aprovecha los Signals.'],
    affinities: [
      { when: { route: ['fullstack-enterprise'] }, score: 2, reason: 'Estructura opinada y tipado estricto que escalan bien en equipos grandes.' },
      { when: { system: ['nx_monorepo'] }, score: 1, reason: 'Nx tiene soporte de primera clase para Angular.' }
    ]
  },
  react: {
    name: 'React / Next.js',
    description: 'Biblioteca de componentes con el ecosistema más grande; Next.js añade routing y SSR.',
    tags: ['React', 'Next.js', 'JSX'],
    iconUrl: icon('react'),
    analogy: 'La recepción de la fábrica. Muy flexible, llena de accesorios y la más popular, para que el cliente pida lo que sea.',
    metrics: { complexity: 'Media', scalability: 'Excelente', cost: 'Gratis' },
    bestPractices: ['Mantén los componentes pequeños.', 'Usa hooks con cuidado.', 'Aprovecha el SSR de Next.'],
    affinities: [
      { when: { route: ['frontend', 'fullstack-simple'] }, score: 2, reason: 'Ecosistema más amplio y la mayor cantidad de documentación y librerías.' },
      { when: { system: ['turborepo'] }, score: 1, reason: 'Encaja con Turborepo, muy usado en proyectos React/Next.' }
    ]
  },
  vue: {
    name: 'Vue / Nuxt',
    description: 'Sintaxis clara y curva de aprendizaje suave; Nuxt aporta routing y SSR.',
    tags: ['Vue 3', 'Vite', 'Pinia'],
    iconUrl: icon('vuejs'),
    analogy: 'La recepción de la fábrica. Fácil de aprender, ordenada y perfecta si quieres arrancar rápido sin tanta configuración.',
    metrics: { complexity: 'Baja', scalability: 'Buena', cost: 'Gratis' },
    affinities: [{ when: { route: ['frontend'] }, score: 1, reason: 'Curva de aprendizaje suave y poca configuración inicial.' }]
  },

  /* — Estilos — */
  tailwind: {
    name: 'Tailwind CSS',
    description: 'Utilidades atómicas: estilos junto al marcado, sin CSS muerto y con un sistema de diseño consistente.',
    tags: ['Utility-first', 'JIT', 'Design tokens'],
    iconUrl: icon('tailwindcss'),
    analogy: 'La pintura y los acabados de la recepción. Tienes atomizadores de colores listos para usar en el mismo lugar.',
    metrics: { complexity: 'Baja', scalability: 'Alta', cost: 'Gratis' },
    affinities: [
      { when: { route: ['frontend'] }, score: 2, reason: 'Estilos consistentes sin CSS muerto y sin depender de un kit de componentes.' }
    ]
  },
  component_lib: {
    name: 'Librería de componentes',
    description: 'Material, PrimeNG o shadcn/ui: componentes accesibles y probados, listos para usar.',
    tags: ['Accesibilidad', 'Theming', 'Componentes listos'],
    iconUrl: icon('materialui'),
    analogy: 'Comprar los muebles ya armados para la recepción. Son funcionales, se ven bien, pero no son 100% a tu medida.',
    metrics: { complexity: 'Baja', scalability: 'Media', cost: 'Gratis / Pago' },
    affinities: [
      { when: { frontend: ['angular'] }, score: 3, reason: 'Angular Material o PrimeNG dan componentes accesibles listos para usar.' }
    ]
  },
  css_scss: {
    name: 'SCSS / CSS Modules',
    description: 'Hojas de estilo propias con variables y módulos: máximo control, más trabajo de base.',
    tags: ['SCSS', 'CSS Modules', 'Sin dependencias'],
    iconUrl: icon('sass'),
    analogy: 'Fabricar a mano los acabados. Tienes control absoluto de la pintura, pero te tomará más tiempo hacerlo todo.',
    metrics: { complexity: 'Media', scalability: 'Media', cost: 'Gratis' }
  },

  /* — Backend — */
  nestjs: {
    name: 'NestJS',
    description: 'Framework Node con TypeScript, módulos, decoradores e inyección de dependencias.',
    tags: ['TypeScript', 'Módulos + DI', 'OpenAPI'],
    iconUrl: icon('nestjs'),
    analogy: 'La línea de ensamblaje. Recibe el pedido, lo procesa con reglas claras y decide a qué departamento enviarlo.',
    metrics: { complexity: 'Media', scalability: 'Alta', cost: 'Gratis' },
    bestPractices: [
      'Mantén los controladores ligeros.',
      'Usa DTOs para validar datos.',
      'Implementa interceptores para errores.'
    ],
    affinities: [
      { when: { frontend: ['angular'] }, score: 3, reason: 'Comparte filosofía con Angular (módulos, DI, decoradores): menos cambio de contexto.' },
      { when: { route: ['fullstack-enterprise', 'backend'] }, score: 2, reason: 'Estructura modular y testeable para APIs que van a crecer.' }
    ]
  },
  express: {
    name: 'Node.js + Express / Fastify',
    description: 'Servidor HTTP minimalista y flexible; tú decides estructura y librerías.',
    tags: ['Node.js', 'Express', 'Fastify'],
    iconUrl: icon('express'),
    analogy: 'La línea de ensamblaje, pero sin manuales de instrucciones. Tú decides qué herramientas usar y cómo armar el flujo.',
    metrics: { complexity: 'Baja', scalability: 'Media', cost: 'Gratis' },
    affinities: [
      { when: { route: ['fullstack-simple'] }, score: 2, reason: 'Poca ceremonia y TypeScript de punta a punta para arrancar rápido.' }
    ]
  },
  fastapi: {
    name: 'Python + FastAPI',
    description: 'API asíncrona con validación por tipos y documentación OpenAPI automática.',
    tags: ['Python', 'Pydantic', 'OpenAPI'],
    iconUrl: icon('fastapi'),
    analogy: 'Una línea de ensamblaje diferente (Python), especializada en Inteligencia Artificial y Ciencia de Datos.',
    metrics: { complexity: 'Media', scalability: 'Alta', cost: 'Gratis' },
    affinities: [
      { when: { route: ['backend'] }, score: 1, reason: 'Validación y documentación OpenAPI automáticas con muy poco código.' }
    ]
  },

  /* — Datos — */
  supabase_postgres: {
    name: 'Supabase (PostgreSQL)',
    description: 'Postgres gestionado con API REST, realtime, storage y Row Level Security.',
    tags: ['PostgreSQL', 'Realtime', 'RLS'],
    iconUrl: icon('supabase'),
    analogy: 'El almacén principal, pero manejado por un conserje. Él te da acceso rápido a las cajas y te avisa si algo cambia.',
    metrics: { complexity: 'Baja', scalability: 'Alta', cost: 'Freemium' },
    bestPractices: ['Configura bien las políticas RLS.', 'Usa la API autogenerada con cuidado.'],
    affinities: [
      { when: { route: ['fullstack-simple'] }, score: 3, reason: 'Base, auth, storage y realtime incluidos: lo más rápido para arrancar.' }
    ]
  },
  postgres_managed: {
    name: 'PostgreSQL gestionado',
    description: 'Postgres en RDS, Cloud SQL o similar: SQL estándar, réplicas y backups bajo tu control.',
    tags: ['PostgreSQL', 'Prisma / TypeORM', 'Réplicas'],
    iconUrl: icon('postgresql'),
    analogy: 'El almacén en un edificio externo gigante. Tienes que manejar tus propios camiones y llaves, pero tienes almacenamiento infinito.',
    metrics: { complexity: 'Alta', scalability: 'Muy Alta', cost: 'Pago por uso' },
    bestPractices: ['Realiza backups automáticos.', 'Usa migraciones controladas.', 'Indexa las consultas lentas.'],
    affinities: [
      { when: { route: ['fullstack-enterprise'] }, score: 3, reason: 'Control de backups, réplicas y red sin depender de un BaaS.' },
      { when: { route: ['backend'] }, score: 2, reason: 'Modelo relacional con SQL estándar y migraciones versionadas.' }
    ]
  },
  mongodb: {
    name: 'MongoDB (+ Redis)',
    description: 'Documentos flexibles sin esquema fijo, con Redis opcional como caché.',
    tags: ['NoSQL', 'Mongoose', 'Redis'],
    iconUrl: icon('mongodb'),
    analogy: 'Un almacén donde guardas todo en cajas de diferentes tamaños. Es flexibles, pero buscar cosas específicas puede ser un caos.',
    metrics: { complexity: 'Media', scalability: 'Alta', cost: 'Pago por uso' },
    affinities: [{ when: { backend: ['express'] }, score: 1, reason: 'Esquema flexible para prototipar sin migraciones.' }]
  },

  /* — Auth — */
  supabase_auth: {
    name: 'Supabase Auth',
    description: 'Usuarios, sesiones y OAuth integrados con la base de datos y sus políticas RLS.',
    tags: ['JWT', 'OAuth', 'RLS'],
    iconUrl: icon('supabase'),
    analogy: 'El guardia de seguridad que ya viene contratado en el edificio. Revisa el carnet y abre las puertas de las salas.',
    metrics: { complexity: 'Baja', scalability: 'Alta', cost: 'Freemium' },
    affinities: [
      { when: { database: ['supabase_postgres'] }, score: 3, reason: 'Ya viene con tu proyecto de Supabase y se integra con sus políticas RLS.' }
    ]
  },
  cognito: {
    name: 'AWS Cognito',
    description: 'Servicio gestionado con OAuth2, MFA y federación SAML/OIDC.',
    tags: ['AWS', 'OAuth2', 'MFA'],
    iconUrl: icon('amazonwebservices', 'original-wordmark'),
    analogy: 'Una empresa de seguridad externa (AWS). Muy profesional, con verificación en dos pasos y radares.',
    metrics: { complexity: 'Alta', scalability: 'Muy Alta', cost: 'Pago por uso' },
    bestPractices: ['Habilita MFA obligatorio.', 'Usa grupos para permisos.'],
    affinities: [
      { when: { route: ['fullstack-enterprise'] }, score: 2, reason: 'Gestionado, con MFA y federación empresarial (SAML/OIDC).' }
    ]
  },
  auth0: {
    name: 'Auth0 / Clerk',
    description: 'Identidad como servicio: login social, MFA y gestión de usuarios sin construir nada.',
    tags: ['OIDC', 'Login social', 'MFA'],
    iconUrl: 'https://cdn.simpleicons.org/auth0/FFFFFF', // <-- URL ARREGLADA
    analogy: 'Un servicio de valet parking. Ellos manejan las llaves (login social) y la seguridad de los autos, tú solo te preocupas por la fiesta.',
    metrics: { complexity: 'Baja', scalability: 'Muy Alta', cost: 'Pago por uso' },
    affinities: [{ when: { route: ['fullstack-simple'] }, score: 1, reason: 'Login social y MFA listos si no usas Supabase.' }]
  },
  jwt_custom: {
    name: 'JWT propio',
    description: 'Login y tokens implementados en tu API (Passport o jose): control total, más responsabilidad.',
    tags: ['JWT', 'Passport', 'Refresh tokens'],
    iconUrl: icon('nodejs'),
    analogy: 'Fabricar las cerraduras tú mismo. Tienes control total del sistema, pero si te equivocas en el diseño, cualquiera puede abrir la puerta.',
    metrics: { complexity: 'Alta', scalability: 'Depende de ti', cost: 'Gratis' },
    bestPractices: [
      'Nunca guardes contraseñas en texto plano, usa bcrypt o argon2.',
      'Usa refresh tokens con rotación para mayor seguridad.',
      'Establece tiempos de expiración cortos para el access token (ej. 15 min).'
    ],
    affinities: [
      { when: { route: ['backend'] }, score: 2, reason: 'Una API aislada no necesita proveedor externo: control total del flujo.' }
    ]
  },

  /* — Deploy — */
  vercel: {
    name: 'Vercel',
    description: 'Deploy desde Git con CDN global, previews por rama y funciones serverless.',
    tags: ['Edge CDN', 'Preview deploys', 'Serverless'],
    iconUrl: icon('vercel'),
    analogy: 'El concesionario con entrega inmediata. Conectas el repo de Git y en segundos tienes tu app volando por todo el mundo.',
    metrics: { complexity: 'Baja', scalability: 'Muy Alta', cost: 'Freemium' },
    affinities: [
      { when: { route: ['frontend'] }, score: 3, reason: 'Deploy desde Git y CDN global sin servidores que mantener.' },
      { when: { route: ['fullstack-simple'] }, score: 2, reason: 'Frontend en edge y API como funciones serverless, con previews por rama.' }
    ]
  },
  static_pages: {
    name: 'GitHub Pages',
    description: 'Hosting estático gratuito y simple para sitios sin lógica de servidor.',
    tags: ['Estático', 'CDN', 'Gratis'],
    iconUrl: icon('github'),
    analogy: 'El taller básico de reparaciones. No tiene todas las herramientas avanzadas, pero es gratis y hace el trabajo para cosas simples.',
    metrics: { complexity: 'Baja', scalability: 'Media', cost: 'Gratis' },
    affinities: [{ when: { route: ['frontend'] }, score: 1, reason: 'Gratis y suficiente si tu sitio no necesita funciones de servidor.' }]
  },
  railway: {
    name: 'Railway / Render',
    description: 'PaaS: despliega el backend desde Git, con base de datos y variables en un panel.',
    tags: ['PaaS', 'Deploy desde Git', 'Escala simple'],
    iconUrl: icon('nodejs'),
    analogy: 'Un servicio de grúa para tu línea de ensamblaje. Les pasas el código y ellos lo levantan en un servidor sin que toques cables.',
    metrics: { complexity: 'Baja', scalability: 'Alta', cost: 'Pago por uso' },
    affinities: [
      { when: { route: ['fullstack-simple'] }, score: 1, reason: 'Backend como servicio persistente con variables y base de datos en un panel.' },
      { when: { route: ['fullstack-simple'], backend: ['nestjs'] }, score: 2, reason: 'NestJS corre mejor como servicio persistente que como función serverless.' },
      { when: { route: ['backend'] }, score: 2, reason: 'Despliega tu API desde Git sin administrar servidores.' }
    ]
  },
  docker_compose: {
    name: 'Docker Compose en VPS',
    description: 'Contenedores orquestados en un servidor propio: barato y reproducible.',
    tags: ['Docker', 'Compose', 'Reverse proxy'],
    iconUrl: icon('docker'),
    analogy: 'Tener tus propios contenedores de carga en un patio trasero. Barato y ordenado, pero tú tienes que mantener el patio.',
    metrics: { complexity: 'Media', scalability: 'Media', cost: 'Costo VPS' },
    affinities: [
      { when: { route: ['backend'] }, score: 1, reason: 'Reproducible y barato en un VPS cuando aún no necesitas orquestación.' }
    ]
  },
    docker_k8s: {
    name: 'Docker + Kubernetes',
    description: 'Contenedores con escalado por servicio, despliegues graduales y entornos aislados.',
    tags: ['Docker', 'Kubernetes', 'Helm'],
    iconUrl: icon('kubernetes'),
    analogy: 'Una flota de grúas automatizadas (Kubernetes). Si un camión se rompe, otra entra en su lugar inmediatamente sin que el cliente note nada.',
    metrics: { complexity: 'Alta', scalability: 'Infinita', cost: 'Alto' }, // <-- Corregido aquí
    bestPractices: ['Configura límites de CPU y memoria.', 'Usa Helm para los despliegues.'],
    affinities: [
      { when: { route: ['fullstack-enterprise'] }, score: 3, reason: 'Escala por servicio, con despliegues graduales y entornos aislados.' }
    ]
  },
  netlify: {
    name: 'Netlify',
    description: 'Deploy desde Git con previews por rama, formularios y funciones integradas.',
    tags: ['Preview deploys', 'Forms', 'Functions'],
    iconUrl: icon('netlify'),
    analogy: 'Muy similar a Vercel, pero con algunos servicios extra como recepcionista de formularios incluidos.',
    metrics: { complexity: 'Baja', scalability: 'Alta', cost: 'Freemium' },
    affinities: [
      { when: { route: ['frontend'] }, score: 2, reason: 'Alternativa directa a Vercel, con formularios y funciones ya integrados.' },
      { when: { route: ['fullstack-simple'] }, score: 1, reason: 'Frontend con previews por rama y funciones para lógica ligera.' }
    ]
  },
  cloudflare_pages: {
    name: 'Cloudflare Pages / Workers',
    description: 'Sitios estáticos y funciones en el edge de Cloudflare, con CDN global y un plan gratuito generoso.',
    tags: ['Edge', 'Workers', 'CDN'],
    iconUrl: icon('cloudflare'),
    analogy: 'Distribuir tus piezas a nivel global instantáneamente. El almacén más cercano al cliente siempre tendrá lo que busca.',
    metrics: { complexity: 'Media', scalability: 'Muy Alta', cost: 'Freemium' },
    affinities: [
      { when: { route: ['frontend'] }, score: 2, reason: 'CDN global y plan gratuito generoso; cómodo si también gestionas el DNS en Cloudflare.' },
      { when: { route: ['fullstack-simple'] }, score: 1, reason: 'Frontend en el edge y lógica ligera en Workers, sin servidores que mantener.' }
    ]
  },
  coolify: {
    name: 'Coolify (autoalojado)',
    description: 'PaaS de código abierto que instalas en tu propio VPS: despliega apps, bases de datos y servicios desde Git.',
    tags: ['Self-hosted', 'Deploy desde Git', 'Docker'],
    iconUrl: icon('docker'),
    analogy: 'Construir tu propio taller de mecánica. Compras el equipo (VPS) e instalas tus herramientas (Coolify) para no pagar alquiler.',
    metrics: { complexity: 'Media', scalability: 'Media', cost: 'Costo VPS' },
    affinities: [
      { when: { route: ['backend', 'fullstack-simple'] }, score: 1, reason: 'Un PaaS propio en un VPS: sin pagar por servicio y con deploy desde Git.' }
    ]
  },
  hostinger_vps: {
    name: 'Hostinger VPS',
    description: 'Servidor virtual económico donde corres Docker o Coolify con control total.',
    tags: ['VPS', 'Docker', 'Control total'],
    iconUrl: icon('linux'),
    analogy: 'Un terreno barato en las afueras. Tienes espacio para construir, pero tú pones el asfalto y la seguridad.',
    metrics: { complexity: 'Alta', scalability: 'Media', cost: 'Bajo' },
    affinities: [
      { when: { route: ['backend', 'fullstack-simple'] }, score: 1, reason: 'VPS económico para correr tus contenedores con control total del servidor.' }
    ]
  },
  aws_ecs: {
    name: 'AWS ECS / Fargate',
    description: 'Contenedores gestionados en AWS sin operar un clúster de Kubernetes.',
    tags: ['AWS', 'Fargate', 'Contenedores'],
    iconUrl: icon('amazonwebservices', 'original-wordmark'),
    analogy: 'Tus contenedores de carga en una flota logística enorme (AWS). No manejas el barco, pero usas sus puertos.',
    metrics: { complexity: 'Alta', scalability: 'Muy Alta', cost: 'Pago por uso' },
    affinities: [
      { when: { route: ['fullstack-enterprise'] }, score: 1, reason: 'Contenedores gestionados sin operar un clúster propio de Kubernetes.' },
      { when: { auth: ['cognito'] }, score: 1, reason: 'Se integra con Cognito e IAM dentro del mismo ecosistema AWS.' }
    ]
  },

  /* — Dominio y DNS — */
  cloudflare_dns: {
    name: 'Cloudflare (DNS y dominio)',
    description: 'DNS rápido con SSL y protección básica contra DDoS; también permite registrar el dominio.',
    tags: ['DNS', 'SSL', 'CDN'],
    iconUrl: icon('cloudflare'),
    analogy: 'El cartel de la entrada y el guardia de la puerta principal. Dirige a los clientes a la puerta correcta y bloquea a los malos.',
    metrics: { complexity: 'Baja', scalability: 'Muy Alta', cost: 'Freemium' },
    affinities: [
      { when: { route: ['frontend', 'backend', 'fullstack-simple'] }, score: 2, reason: 'DNS rápido, SSL y protección básica sin costo extra.' },
      { when: { route: ['fullstack-enterprise'] }, score: 2, reason: 'DNS rápido y reglas de seguridad en el borde, delante de tu infraestructura.' },
      { when: { devops: ['cloudflare_pages'] }, score: 3, reason: 'Ya usas Cloudflare: dominio, DNS y deploy en el mismo panel.' }
    ]
  },
  hostinger_domains: {
    name: 'Hostinger (dominio)',
    description: 'Registro de dominio y DNS en el mismo proveedor que tu hosting o VPS.',
    tags: ['Registro', 'DNS', 'Un solo proveedor'],
    iconUrl: icon('linux'),
    analogy: 'Comprar el terreno y el cartel al mismo vendedor. Te ahorras trámites con otros proveedores.',
    metrics: { complexity: 'Baja', scalability: 'Media', cost: 'Bajo' },
    affinities: [
      { when: { devops: ['hostinger_vps'] }, score: 3, reason: 'Dominio y VPS en el mismo proveedor: menos paneles que gestionar.' }
    ]
  },
  route53: {
    name: 'AWS Route 53',
    description: 'DNS gestionado de AWS con health checks y enrutamiento por latencia o región.',
    tags: ['AWS', 'DNS', 'Health checks'],
    iconUrl: icon('amazonwebservices', 'original-wordmark'),
    analogy: 'Un semáforo inteligente de AWS. Si una calle (servidor) se bloquea, envía todo el tráfico por otra ruta al instante.',
    metrics: { complexity: 'Media', scalability: 'Muy Alta', cost: 'Pago por uso' },
    affinities: [
      { when: { route: ['fullstack-enterprise'] }, score: 1, reason: 'DNS con health checks y failover si tu infraestructura vive en AWS.' },
      { when: { devops: ['aws_ecs'] }, score: 2, reason: 'Se integra con ECS y el resto de tu infraestructura en AWS.' }
    ]
  },
  registrar: {
    name: 'Registrador (Namecheap / Porkbun)',
    description: 'Registro de dominio independiente del hosting; apuntas el DNS donde prefieras.',
    tags: ['Registro', 'Sin atarte al hosting', 'DNS externo'],
    iconUrl: icon('namecheap'),
    analogy: 'Comprar solo las escrituras de la tierra. Luego decides tú quién construye y quién vigila.',
    metrics: { complexity: 'Baja', scalability: 'Media', cost: 'Bajo' }
  },

  /* — CI/CD — */
  github_actions: {
    name: 'GitHub Actions',
    description: 'Pipelines versionados con el código: tests, build de imágenes y deploy en cada PR.',
    tags: ['CI/CD', 'Matrix builds', 'Caché'],
    iconUrl: icon('githubactions'),
    analogy: 'El inspector de calidad automático. Cada vez que un mecánico (programador) termina un auto, el robot lo prueba y lo saca a la venta.',
    metrics: { complexity: 'Media', scalability: 'Alta', cost: 'Freemium' },
    bestPractices: ['Usa caché para dependencias.', 'Separa los jobs de test y deploy.'],
    affinities: [
      { when: { route: ['fullstack-enterprise'] }, score: 2, reason: 'Pipelines versionados junto al código, con caché y builds solo de lo afectado.' }
    ]
  },
  gitlab_ci: {
    name: 'GitLab CI/CD',
    description: 'Pipelines y registro de contenedores integrados en GitLab.',
    tags: ['CI/CD', 'Runners', 'Container Registry'],
    iconUrl: icon('gitlab'),
    analogy: 'El inspector de calidad, pero dentro de la misma fábrica de GitLab. Todo está en un mismo edificio.',
    metrics: { complexity: 'Media', scalability: 'Alta', cost: 'Freemium' },
    affinities: [{ when: { route: ['fullstack-enterprise'] }, score: 1, reason: 'Ideal si tu equipo ya aloja el código en GitLab.' }]
  }
};

export const OPTION_CATALOG: Record<string, StepOption> = Object.fromEntries(
  Object.entries(CATALOG_DATA).map(([id, option]) => [id, { id, ...option }])
);

/* ───────────────────────── Rutas: tipo de proyecto → pasos → opciones ───────────────────────── */

export const ROUTES: ProjectRoute[] = [
  {
    id: 'frontend',
    name: 'Solo Frontend',
    description: 'Interfaz web o SPA que consume APIs de terceros o contenido estático. Sin backend ni base de datos propios.',
    tags: ['SPA / sitio', 'Hosting estático', 'Sin backend'],
    iconUrl: icon('html5'),
    steps: [
      { category: 'frontend', options: ['react', 'vue', 'angular'] },
      { category: 'styling', options: ['tailwind', 'component_lib', 'css_scss'] },
      { category: 'devops', options: ['vercel', 'netlify', 'cloudflare_pages', 'static_pages'] },
      { category: 'domain', options: ['cloudflare_dns', 'hostinger_domains', 'registrar'] }
    ]
  },
  {
    id: 'backend',
    name: 'Solo Backend',
    description: 'API o servicio sin interfaz: endpoints, datos y autenticación listos para que otros clientes los consuman.',
    tags: ['API REST', 'Datos', 'Auth'],
    iconUrl: icon('nodejs'),
    steps: [
      { category: 'backend', options: ['nestjs', 'express', 'fastapi'] },
      { category: 'database', options: ['postgres_managed', 'supabase_postgres', 'mongodb'] },
      { category: 'auth', options: ['jwt_custom', 'auth0', 'cognito', 'supabase_auth'] },
      { category: 'devops', options: ['railway', 'coolify', 'hostinger_vps', 'docker_compose', 'docker_k8s'] },
      { category: 'domain', options: ['cloudflare_dns', 'route53', 'hostinger_domains', 'registrar'] }
    ]
  },
  {
    id: 'fullstack-simple',
    name: 'Full Stack simple',
    description: 'Cliente + API + base de datos con el mínimo de piezas (ej. TypeScript + Node + Supabase). Ideal para MVPs.',
    tags: ['MVP', 'TypeScript', 'Pocas piezas'],
    iconUrl: icon('typescript'),
    steps: [
      { category: 'frontend', options: ['react', 'vue', 'angular'] },
      { category: 'backend', options: ['express', 'nestjs'] },
      { category: 'database', options: ['supabase_postgres', 'mongodb', 'postgres_managed'] },
      { category: 'auth', options: ['supabase_auth', 'auth0', 'jwt_custom'] },
      { category: 'devops', options: ['vercel', 'railway', 'cloudflare_pages', 'coolify', 'hostinger_vps'] },
      { category: 'domain', options: ['cloudflare_dns', 'hostinger_domains', 'registrar'] }
    ]
  },
  {
    id: 'fullstack-enterprise',
    name: 'Full Stack Enterprise',
    description: 'Monorepo, múltiples equipos y despliegue en contenedores: Nx, Angular + NestJS, Docker/Kubernetes y CI/CD.',
    tags: ['Monorepo', 'Docker / K8s', 'CI/CD'],
    iconUrl: icon('kubernetes'),
    steps: [
      { category: 'system', options: ['nx_monorepo', 'turborepo', 'polyrepo'] },
      { category: 'frontend', options: ['angular', 'react'] },
      { category: 'backend', options: ['nestjs', 'express', 'fastapi'] },
      { category: 'database', options: ['postgres_managed', 'supabase_postgres', 'mongodb'] },
      { category: 'auth', options: ['cognito', 'auth0', 'supabase_auth'] },
      { category: 'devops', options: ['docker_k8s', 'aws_ecs', 'docker_compose', 'coolify'] },
      { category: 'domain', options: ['cloudflare_dns', 'route53', 'registrar'] },
      { category: 'cicd', options: ['github_actions', 'gitlab_ci'] }
    ]
  }
];

export const DEFAULT_ROUTE_ID: ProjectTypeId = 'fullstack-simple';

/** Paso 0: las rutas son sus propias opciones. */
export const PROJECT_STEP: WizardStep = {
  ...STEP_DEFS.project,
  category: 'project',
  options: ROUTES.map(route => ({
    id: route.id,
    name: route.name,
    description: route.description,
    tags: route.tags,
    iconUrl: route.iconUrl,
    analogy: route.id === 'frontend' ? 'Solo construir la recepción, sin almacén ni línea de ensamblaje.' 
           : route.id === 'backend' ? 'Solo el motor y el almacén, sin recepción al público.' 
           : route.id === 'fullstack-simple' ? 'Una fábrica pequeña: recepción, ensamblaje y almacén básico.'
           : 'Una fábrica corporativa completa con departamentos, robots y logística.'
  }))
};

/* ───────────────────────── Capas (orden de la línea de ensamble) ───────────────────────── */

export const LAYERS: LayerMeta[] = [
  { id: 'client', label: 'Usuario', color: 0x94a3b8 },
  { id: 'frontend', label: 'Frontend', color: 0x38bdf8 },
  { id: 'auth', label: 'Auth / Gateway', color: 0xf59e0b },
  { id: 'backend', label: 'Backend', color: 0xa78bfa },
  { id: 'data', label: 'Datos', color: 0x34d399 },
  { id: 'infra', label: 'Infra / Deploy', color: 0x64748b }
];

/** Color CSS (#rrggbb) de una capa; `workspace` usa el acento por defecto. */
export const layerColor = (layer: LayerId): string =>
  '#' + (LAYERS.find(l => l.id === layer)?.color ?? 0x34d399).toString(16).padStart(6, '0');

/* ───────────────────────── Visuales 3D (TEMPORAL) ───────────────────────── */

export type ShapeKind = 'box' | 'octa' | 'tetra' | 'icosa' | 'dodeca' | 'cylinder' | 'cone' | 'torus';

export interface OptionVisual {
  color: number;
  shape: ShapeKind;
  short: string;
}

export const OPTION_VISUALS: Record<string, OptionVisual> = {
  nx_monorepo: { color: 0x10b981, shape: 'box', short: 'NX' },
  turborepo: { color: 0x34d399, shape: 'box', short: 'TURBOREPO' },
  polyrepo: { color: 0xa78bfa, shape: 'box', short: 'POLYREPO' },
  angular: { color: 0xdd0031, shape: 'box', short: 'ANGULAR' },
  react: { color: 0x61dafb, shape: 'icosa', short: 'REACT' },
  vue: { color: 0x42b883, shape: 'tetra', short: 'VUE' },
  tailwind: { color: 0x38bdf8, shape: 'octa', short: 'TAILWIND' },
  component_lib: { color: 0x7c3aed, shape: 'octa', short: 'UI KIT' },
  css_scss: { color: 0xcd6799, shape: 'octa', short: 'SCSS' },
  nestjs: { color: 0xe0234e, shape: 'dodeca', short: 'NESTJS' },
  express: { color: 0x84cc16, shape: 'octa', short: 'EXPRESS' },
  fastapi: { color: 0x009688, shape: 'dodeca', short: 'FASTAPI' },
  supabase_postgres: { color: 0x3ecf8e, shape: 'cylinder', short: 'SUPABASE' },
  postgres_managed: { color: 0x336791, shape: 'cylinder', short: 'POSTGRES' },
  mongodb: { color: 0x47a248, shape: 'cone', short: 'MONGODB' },
  supabase_auth: { color: 0x22d3ee, shape: 'octa', short: 'SUPABASE AUTH' },
  cognito: { color: 0xff9900, shape: 'torus', short: 'COGNITO' },
  auth0: { color: 0xeb5424, shape: 'torus', short: 'AUTH0' },
  jwt_custom: { color: 0xfacc15, shape: 'torus', short: 'JWT' },
  vercel: { color: 0xe2e8f0, shape: 'box', short: 'VERCEL' },
  static_pages: { color: 0x94a3b8, shape: 'box', short: 'PAGES' },
  railway: { color: 0xa855f7, shape: 'box', short: 'RAILWAY' },
  docker_compose: { color: 0x2496ed, shape: 'box', short: 'COMPOSE' },
  docker_k8s: { color: 0x2496ed, shape: 'box', short: 'DOCKER + K8S' },
  netlify: { color: 0x00c7b7, shape: 'box', short: 'NETLIFY' },
  cloudflare_pages: { color: 0xf38020, shape: 'box', short: 'CLOUDFLARE' },
  coolify: { color: 0x8b5cf6, shape: 'box', short: 'COOLIFY' },
  hostinger_vps: { color: 0x673de6, shape: 'box', short: 'HOSTINGER VPS' },
  aws_ecs: { color: 0xff9900, shape: 'box', short: 'AWS ECS' },
  cloudflare_dns: { color: 0xf38020, shape: 'octa', short: 'CLOUDFLARE DNS' },
  hostinger_domains: { color: 0x673de6, shape: 'octa', short: 'HOSTINGER' },
  route53: { color: 0x8c4fff, shape: 'octa', short: 'ROUTE 53' },
  registrar: { color: 0x94a3b8, shape: 'octa', short: 'DOMINIO' },
  github_actions: { color: 0x2088ff, shape: 'box', short: 'ACTIONS' },
  gitlab_ci: { color: 0xfc6d26, shape: 'box', short: 'GITLAB CI' }
};