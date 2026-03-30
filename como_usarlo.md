 Acá tenés el resumen completo del proyecto y cómo usarlo:                                                                                   
                                                     
  ---                                                                                                                                         
  Arquitectura general                                                                                                                        
                                                                                                                                              
  Es una plataforma SaaS multi-tenant donde:                                                                                                  
  - Vos (superadmin) → accedés sin subdominio: lvh.me:3000/super-admin
  - Admin de gimnasio → accede con subdominio: nombredgimnasio.lvh.me:3000
  - Entrenadores y alumnos → mismo subdominio del gimnasio

  ---
  Cómo ingresar

  Como Superadmin

  1. Iniciá el servidor: npm run dev (o bun dev)
  2. Entrá a: http://lvh.me:3000/auth/login
  3. Logueate con tu cuenta
  4. Navegá a: http://lvh.me:3000/super-admin

                                                                                                                                              -- SuperAdmin example --
  1. Entrá a http://localhost:3000/auth/login                                                                                                    
  2. Email: superadmin@mail.com / Pass: admin#26!                                                                                             
  3. Navegá a http://lvh.me:3000/super-admin         

  Tu usuario debe tener role = 'superadmin' en la tabla profiles. Si no lo tiene, ejecutá en Supabase SQL Editor:
  UPDATE profiles SET role = 'superadmin' WHERE email = 'tu@email.com';

  Como Admin de un gimnasio

  1. Entrá a: http://[slug-del-gimnasio].lvh.me:3000/auth/login

  ---
  Rutas principales

  Panel Super Admin (lvh.me:3000)

  ┌────────────────────────┬───────────────────────────────────────────────────────┐
  │          Ruta          │                      Descripción                      │
  ├────────────────────────┼───────────────────────────────────────────────────────┤
  │ /super-admin           │ Dashboard con métricas globales                       │
  ├────────────────────────┼───────────────────────────────────────────────────────┤
  │ /super-admin/gyms      │ Lista de todos los gimnasios (búsqueda, filtros)      │
  ├────────────────────────┼───────────────────────────────────────────────────────┤
  │ /super-admin/gyms/new  │ Crear nuevo gimnasio + admin inicial                  │
  ├────────────────────────┼───────────────────────────────────────────────────────┤
  │ /super-admin/gyms/[id] │ Ver/editar gimnasio, usuarios, toggle activo/inactivo │
  └────────────────────────┴───────────────────────────────────────────────────────┘

  Dashboard del gimnasio ([slug].lvh.me:3000)

  ┌────────────────────────────┬───────────────────┬─────────────────────────────────────────────────┐
  │            Ruta            │        Rol        │                   Descripción                   │
  ├────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤
  │ /dashboard                 │ Todos             │ Dashboard principal                             │
  ├────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤
  │ /dashboard/routines        │ Alumno/Entrenador │ Rutinas                                         │
  ├────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤
  │ /dashboard/students        │ Entrenador        │ Ver sus alumnos                                 │
  ├────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤
  │ /dashboard/profile         │ Todos             │ Perfil personal                                 │
  ├────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤
  │ /dashboard/settings        │ Todos             │ Ajustes (admins ven configuración del gimnasio) │
  ├────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤
  │ /dashboard/admin/users     │ Admin             │ Gestión de usuarios                             │
  ├────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤
  │ /dashboard/admin/users/new │ Admin             │ Crear entrenador o alumno                       │
  ├────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤
  │ /dashboard/admin/trainers  │ Admin             │ Lista de entrenadores                           │
  ├────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤
  │ /dashboard/admin/students  │ Admin             │ Lista de alumnos                                │
  ├────────────────────────────┼───────────────────┼─────────────────────────────────────────────────┤
  │ /dashboard/admin/reports   │ Admin             │ Reportes                                        │
  └────────────────────────────┴───────────────────┴─────────────────────────────────────────────────┘

  Auth

  ┌──────────────────────┬───────────────────────────────────────┐
  │         Ruta         │              Descripción              │
  ├──────────────────────┼───────────────────────────────────────┤
  │ /auth/login          │ Login                                 │
  ├──────────────────────┼───────────────────────────────────────┤
  │ /auth/sign-up        │ Registro (requiere subdominio activo) │
  ├──────────────────────┼───────────────────────────────────────┤
  │ /auth/reset-password │ Recuperar contraseña                  │
  └──────────────────────┴───────────────────────────────────────┘

  ---
  Estado actual de las migraciones SQL

  Hay 8 scripts en /scripts/. Para verificar cuáles están aplicados en tu Supabase, revisá si existe la tabla tenant_memberships (script 007)
  — si existe, los anteriores también están. El script 008 es de push subscriptions (PWA).

  ---
  Flujo para crear un nuevo gimnasio

  1. Superadmin va a /super-admin/gyms/new
  2. Completa nombre, slug (ej: crossfit-norte), branding (colores, logo)
  3. Opcionalmente crea el admin del gimnasio en el mismo formulario
  4. El admin recibe credenciales y accede a crossfit-norte.lvh.me:3000
  5. El admin crea entrenadores y alumnos desde /dashboard/admin/users/new