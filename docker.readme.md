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