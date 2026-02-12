Dockerfile - Build multi-etapa                                                 
  Etapa: deps                                                                  
  Qué hace: Instala dependencias con pnpm                                        
  Por qué: Se cachea si no cambia package.json                                   
  ────────────────────────────────────────
  Etapa: builder
  Qué hace: Copia código y ejecuta pnpm build
  Por qué: Genera el standalone build
  ────────────────────────────────────────
  Etapa: runner
  Qué hace: Copia solo lo necesario para producción
  Por qué: Imagen final liviana (~150MB vs ~1GB)
  docker-compose.yml - Para correrlo fácil

  Lee las variables de tu .env.local automáticamente.

  .dockerignore - Excluye archivos innecesarios del build

  next.config.mjs - Se agregó output: "standalone"

  Esto le dice a Next.js que genere un build autocontenido con solo los archivos
  necesarios (no necesita node_modules completo en producción).

  Cómo usarlo

  # Buildear y correr
  docker compose up --build

  # O sin compose
  docker build \
    --build-arg NEXT_PUBLIC_SUPABASE_URL=tu_url \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key \
    -t gym-app .

  docker run -p 3000:3000 --env-file .env.local gym-app

  Las variables NEXT_PUBLIC_* se pasan como build args porque Next.js las
  necesita en tiempo de build (se embeben en el JS del cliente). Las demás
  (SUPABASE_SERVICE_ROLE_KEY, ADMIN_SECRET_KEY) se pasan en runtime via env_file.

  -- Explanation --

  Etapa base                                                                     
                         
  FROM node:22-alpine AS base                                                    
                                                                                 
  Descarga una imagen de Node.js 22 (versión liviana "alpine") y le pone el alias
   base. Es como decir "este es mi punto de partida".

  Etapa 1: deps

  FROM base AS deps              # Crea una nueva etapa llamada "deps" partiendo
  de "base"
  RUN corepack enable pnpm       # Activa pnpm (viene incluido en Node pero
  desactivado)
  WORKDIR /app                   # Crea y se posiciona en /app dentro del
  contenedor

  COPY package.json pnpm-lock.yaml ./    # Copia SOLO estos 2 archivos del
  proyecto al contenedor
  RUN pnpm install --frozen-lockfile     # Instala dependencias

  Se copian solo package.json y pnpm-lock.yaml primero (no todo el código) para
  que Docker cachee esta capa. Si no cambiaste dependencias, no reinstala nada en
   el próximo build.

  Etapa 2: builder

  FROM base AS builder           # Nueva etapa limpia desde "base"
  RUN corepack enable pnpm
  WORKDIR /app

  COPY --from=deps /app/node_modules ./node_modules   # Trae node_modules de la
  etapa "deps"
  COPY . .                                             # Copia TODO tu código al
  contenedor

  COPY --from=deps es la clave del multi-etapa: trae archivos de otra etapa, no
  de tu máquina. Así reutiliza los node_modules ya instalados.

  COPY . . copia todo tu proyecto (menos lo que está en .dockerignore) al /app
  del contenedor.

  ARG NEXT_PUBLIC_SUPABASE_URL                        # Declara que acepta este
  argumento
  ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

  ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL       # Lo convierte en
  variable de entorno
  ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

  RUN pnpm build                                      # Compila Next.js (necesita
   las ENV de arriba)

  Acá es donde entran los args. El flujo es:

  docker-compose.yml (args: NEXT_PUBLIC_SUPABASE_URL: ${...})
    → ARG en Dockerfile (los recibe)
      → ENV en Dockerfile (los convierte en variables de entorno)
        → pnpm build (Next.js los lee y los embebe en el JS del cliente)

  Las variables NEXT_PUBLIC_* se necesitan en build time porque Next.js las
  hardcodea en el bundle del frontend. Por eso son ARG → ENV → build, no solo en
  runtime.

  Etapa 3: runner (producción)

  FROM base AS runner             # Etapa final limpia (sin node_modules, sin
  código fuente)
  WORKDIR /app

  ENV NODE_ENV=production
  ENV PORT=3000
  ENV HOSTNAME="0.0.0.0"          # Escucha en todas las interfaces de red

  RUN addgroup --system --gid 1001 nodejs    # Crea grupo "nodejs"
  RUN adduser --system --uid 1001 nextjs     # Crea usuario "nextjs" (seguridad:
  no correr como root)

  COPY --from=builder /app/public ./public                              #
  Archivos estáticos
  COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./    # El
  server de Next.js
  COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static  #
  CSS, JS compilado

  USER nextjs                     # Cambia al usuario sin privilegios

  EXPOSE 3000                     # Documenta qué puerto usa (informativo)

  CMD ["node", "server.js"]       # Comando que arranca la app

  --chown=nextjs:nodejs hace que los archivos copiados pertenezcan al usuario
  nextjs, no a root.

  Esta etapa solo tiene lo mínimo necesario: el server standalone de Next.js +
  archivos estáticos. No tiene node_modules completo ni código fuente. Por eso la
   imagen final es liviana.

  Resumen visual

  deps (instala node_modules)
    │
    ▼
  builder (copia código + node_modules → pnpm build)
    │
    ▼
  runner (copia SOLO el build final → node server.js)

  Cada FROM ... AS ... es una etapa aislada. La imagen final solo contiene lo de
  la última etapa (runner). Las demás se descartan.

  Alpine Linux es una distribución de Linux extremadamente liviana (~5MB). Se usa
   en Docker porque las imágenes son mucho más pequeñas:                       
  ┌────────────────────────────┬───────────────┐                                 
  │           Imagen           │ Tamaño aprox. │                               
  ├────────────────────────────┼───────────────┤                                 
  │ node:22 (basada en Debian) │ ~1GB          │                                 
  ├────────────────────────────┼───────────────┤
  │ node:22-alpine             │ ~130MB        │
  └────────────────────────────┴───────────────┘
  Misma funcionalidad de Node.js, pero con un sistema operativo base mínimo. Esto
   significa:

  - Builds más rápidos (menos para descargar)
  - Menos espacio en disco (importante si tenés muchos contenedores)
  - Menor superficie de ataque (menos paquetes instalados = menos
  vulnerabilidades)

  La desventaja es que Alpine usa musl en vez de glibc (la librería estándar de
  C), lo que puede causar incompatibilidades con algunos paquetes nativos de npm.
   Pero para una app Next.js como la tuya no hay problema.
