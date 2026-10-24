/* ───────────────────────── Tipos ───────────────────────── */

/** Capas de la línea de ensamble 3D (izquierda → derecha). `workspace` no tiene slot: es la plataforma base. */
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

/** categoría → id de opción elegida. El tipo de proyecto vive aparte (`routeId` en el servicio). */
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

export interface StepOption {
  id: string;
  name: string;
  description: string;
  tags: string[];
  iconUrl: string;
  affinities?: Affinity[];
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

/* ───────────────────────── Catálogo de opciones ─────────────────────────
 * Cada opción se define UNA vez; las rutas la referencian por id.
 * Las `affinities` calculan la recomendación según el tipo de proyecto y las
 * elecciones previas: gana la opción con mayor puntaje (solo si es único).
 */

const CATALOG_DATA: Record<string, Omit<StepOption, 'id'>> = {
  /* — Estructura — */
  nx_monorepo: {
    name: 'Monorepo con Nx',
    description: 'Apps y librerías en un solo repositorio, con grafo de dependencias, caché de builds y ejecución solo de lo afectado.',
    tags: ['Nx', 'Libs compartidas', 'Affected builds'],
    iconUrl: icon('nx'),
    affinities: [
      { when: { route: ['fullstack-enterprise'] }, score: 2, reason: 'Comparte tipos y contratos entre frontend y backend sin duplicarlos.' }
    ]
  },
  turborepo: {
    name: 'Monorepo con Turborepo + pnpm',
    description: 'Workspaces de pnpm con pipelines cacheados; más ligero y con menos convención que Nx.',
    tags: ['pnpm', 'Turborepo', 'Remote cache'],
    iconUrl: icon('typescript'),
    affinities: [
      { when: { route: ['fullstack-enterprise'] }, score: 1, reason: 'Más ligero que Nx si tu equipo ya usa pnpm workspaces.' }
    ]
  },
  polyrepo: {
    name: 'Repos independientes',
    description: 'Un repositorio por servicio o app, con versionado y despliegue propios para cada equipo.',
    tags: ['Multi-repo', 'Contratos versionados', 'Equipos autónomos'],
    iconUrl: icon('git')
  },

  /* — Frontend — */
  angular: {
    name: 'Angular',
    description: 'Framework completo con TypeScript estricto, inyección de dependencias y estructura opinada.',
    tags: ['TypeScript', 'RxJS', 'Signals'],
    iconUrl: icon('angular'),
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
    affinities: [{ when: { route: ['frontend'] }, score: 1, reason: 'Curva de aprendizaje suave y poca configuración inicial.' }]
  },

  /* — Estilos — */
  tailwind: {
    name: 'Tailwind CSS',
    description: 'Utilidades atómicas: estilos junto al marcado, sin CSS muerto y con un sistema de diseño consistente.',
    tags: ['Utility-first', 'JIT', 'Design tokens'],
    iconUrl: icon('tailwindcss'),
    affinities: [
      { when: { route: ['frontend'] }, score: 2, reason: 'Estilos consistentes sin CSS muerto y sin depender de un kit de componentes.' }
    ]
  },
  component_lib: {
    name: 'Librería de componentes',
    description: 'Material, PrimeNG o shadcn/ui: componentes accesibles y probados, listos para usar.',
    tags: ['Accesibilidad', 'Theming', 'Componentes listos'],
    iconUrl: icon('materialui'),
    affinities: [
      { when: { frontend: ['angular'] }, score: 3, reason: 'Angular Material o PrimeNG dan componentes accesibles listos para usar.' }
    ]
  },
  css_scss: {
    name: 'SCSS / CSS Modules',
    description: 'Hojas de estilo propias con variables y módulos: máximo control, más trabajo de base.',
    tags: ['SCSS', 'CSS Modules', 'Sin dependencias'],
    iconUrl: icon('sass')
  },

  /* — Backend — */
  nestjs: {
    name: 'NestJS',
    description: 'Framework Node con TypeScript, módulos, decoradores e inyección de dependencias.',
    tags: ['TypeScript', 'Módulos + DI', 'OpenAPI'],
    iconUrl: icon('nestjs'),
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
    affinities: [
      { when: { route: ['fullstack-simple'] }, score: 2, reason: 'Poca ceremonia y TypeScript de punta a punta para arrancar rápido.' }
    ]
  },
  fastapi: {
    name: 'Python + FastAPI',
    description: 'API asíncrona con validación por tipos y documentación OpenAPI automática.',
    tags: ['Python', 'Pydantic', 'OpenAPI'],
    iconUrl: icon('fastapi'),
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
    affinities: [
      { when: { route: ['fullstack-simple'] }, score: 3, reason: 'Base, auth, storage y realtime incluidos: lo más rápido para arrancar.' }
    ]
  },
  postgres_managed: {
    name: 'PostgreSQL gestionado',
    description: 'Postgres en RDS, Cloud SQL o similar: SQL estándar, réplicas y backups bajo tu control.',
    tags: ['PostgreSQL', 'Prisma / TypeORM', 'Réplicas'],
    iconUrl: icon('postgresql'),
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
    affinities: [{ when: { backend: ['express'] }, score: 1, reason: 'Esquema flexible para prototipar sin migraciones.' }]
  },

  /* — Auth — */
  supabase_auth: {
    name: 'Supabase Auth',
    description: 'Usuarios, sesiones y OAuth integrados con la base de datos y sus políticas RLS.',
    tags: ['JWT', 'OAuth', 'RLS'],
    iconUrl: icon('supabase'),
    affinities: [
      { when: { database: ['supabase_postgres'] }, score: 3, reason: 'Ya viene con tu proyecto de Supabase y se integra con sus políticas RLS.' }
    ]
  },
  cognito: {
    name: 'AWS Cognito',
    description: 'Servicio gestionado con OAuth2, MFA y federación SAML/OIDC.',
    tags: ['AWS', 'OAuth2', 'MFA'],
    iconUrl: icon('amazonwebservices', 'original-wordmark'),
    affinities: [
      { when: { route: ['fullstack-enterprise'] }, score: 2, reason: 'Gestionado, con MFA y federación empresarial (SAML/OIDC).' }
    ]
  },
  auth0: {
    name: 'Auth0 / Clerk',
    description: 'Identidad como servicio: login social, MFA y gestión de usuarios sin construir nada.',
    tags: ['OIDC', 'Login social', 'MFA'],
    iconUrl: icon('auth0'),
    affinities: [{ when: { route: ['fullstack-simple'] }, score: 1, reason: 'Login social y MFA listos si no usas Supabase.' }]
  },
  jwt_custom: {
    name: 'JWT propio',
    description: 'Login y tokens implementados en tu API (Passport o jose): control total, más responsabilidad.',
    tags: ['JWT', 'Passport', 'Refresh tokens'],
    iconUrl: icon('nodejs'),
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
    affinities: [{ when: { route: ['frontend'] }, score: 1, reason: 'Gratis y suficiente si tu sitio no necesita funciones de servidor.' }]
  },
  railway: {
    name: 'Railway / Render',
    description: 'PaaS: despliega el backend desde Git, con base de datos y variables en un panel.',
    tags: ['PaaS', 'Deploy desde Git', 'Escala simple'],
    iconUrl: icon('nodejs'),
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
    affinities: [
      { when: { route: ['backend'] }, score: 1, reason: 'Reproducible y barato en un VPS cuando aún no necesitas orquestación.' }
    ]
  },
  docker_k8s: {
    name: 'Docker + Kubernetes',
    description: 'Contenedores con escalado por servicio, despliegues graduales y entornos aislados.',
    tags: ['Docker', 'Kubernetes', 'Helm'],
    iconUrl: icon('kubernetes'),
    affinities: [
      { when: { route: ['fullstack-enterprise'] }, score: 3, reason: 'Escala por servicio, con despliegues graduales y entornos aislados.' }
    ]
  },

  netlify: {
    name: 'Netlify',
    description: 'Deploy desde Git con previews por rama, formularios y funciones integradas.',
    tags: ['Preview deploys', 'Forms', 'Functions'],
    iconUrl: icon('netlify'),
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
    affinities: [
      { when: { route: ['backend', 'fullstack-simple'] }, score: 1, reason: 'Un PaaS propio en un VPS: sin pagar por servicio y con deploy desde Git.' }
    ]
  },
  hostinger_vps: {
    name: 'Hostinger VPS',
    description: 'Servidor virtual económico donde corres Docker o Coolify con control total.',
    tags: ['VPS', 'Docker', 'Control total'],
    iconUrl: icon('linux'),
    affinities: [
      { when: { route: ['backend', 'fullstack-simple'] }, score: 1, reason: 'VPS económico para correr tus contenedores con control total del servidor.' }
    ]
  },
  aws_ecs: {
    name: 'AWS ECS / Fargate',
    description: 'Contenedores gestionados en AWS sin operar un clúster de Kubernetes.',
    tags: ['AWS', 'Fargate', 'Contenedores'],
    iconUrl: icon('amazonwebservices', 'original-wordmark'),
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
    affinities: [
      { when: { devops: ['hostinger_vps'] }, score: 3, reason: 'Dominio y VPS en el mismo proveedor: menos paneles que gestionar.' }
    ]
  },
  route53: {
    name: 'AWS Route 53',
    description: 'DNS gestionado de AWS con health checks y enrutamiento por latencia o región.',
    tags: ['AWS', 'DNS', 'Health checks'],
    iconUrl: icon('amazonwebservices', 'original-wordmark'),
    affinities: [
      { when: { route: ['fullstack-enterprise'] }, score: 1, reason: 'DNS con health checks y failover si tu infraestructura vive en AWS.' },
      { when: { devops: ['aws_ecs'] }, score: 2, reason: 'Se integra con ECS y el resto de tu infraestructura en AWS.' }
    ]
  },
  registrar: {
    name: 'Registrador (Namecheap / Porkbun)',
    description: 'Registro de dominio independiente del hosting; apuntas el DNS donde prefieras.',
    tags: ['Registro', 'Sin atarte al hosting', 'DNS externo'],
    iconUrl: icon('namecheap')
  },

  /* — CI/CD — */
  github_actions: {
    name: 'GitHub Actions',
    description: 'Pipelines versionados con el código: tests, build de imágenes y deploy en cada PR.',
    tags: ['CI/CD', 'Matrix builds', 'Caché'],
    iconUrl: icon('githubactions'),
    affinities: [
      { when: { route: ['fullstack-enterprise'] }, score: 2, reason: 'Pipelines versionados junto al código, con caché y builds solo de lo afectado.' }
    ]
  },
  gitlab_ci: {
    name: 'GitLab CI/CD',
    description: 'Pipelines y registro de contenedores integrados en GitLab.',
    tags: ['CI/CD', 'Runners', 'Container Registry'],
    iconUrl: icon('gitlab'),
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
    iconUrl: route.iconUrl
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

/* ───────────────────────── Visuales 3D (TEMPORAL) ─────────────────────────
 * Se mantienen para que el canvas actual siga compilando; en la fase del canvas
 * se reemplazan por modelos low-poly reconocibles y color por capa.
 */

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