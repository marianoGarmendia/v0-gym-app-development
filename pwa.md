Archivos nuevos:                                                                              
  - public/sw.js — Service Worker con Workbox                                                 
  - public/icon-192.png, public/icon-512.png, public/apple-touch-icon.png                       
  - lib/pwa/register-sw.ts, lib/pwa/offline-db.ts, lib/pwa/mutation-queue.ts, lib/pwa/push.ts   
  - components/providers/pwa-provider.tsx
  - components/pwa/install-banner.tsx, offline-indicator.tsx, update-prompt.tsx
  - app/api/push/subscribe/route.ts, app/api/push/send/route.ts
  - scripts/008_push_subscriptions.sql

  Archivos modificados:
  - app/layout.tsx — PWAProvider + meta tags iOS
  - app/dashboard/layout.tsx — InstallBanner, OfflineIndicator, UpdatePrompt
  - app/api/manifest/route.ts — campos extras (id, scope, orientation, etc.)
  - components/routines/exercise-card.tsx — soporte offline
  - components/routines/routine-viewer.tsx — cache en IndexedDB
  - lib/types.ts — tipo PushSubscriptionRecord

  Dependencias instaladas: idb, web-push, @types/web-push

  Para activar push notifications necesitás:
  1. npx web-push generate-vapid-keys
  2. Agregar a .env.local: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL
  3. Ejecutar scripts/008_push_subscriptions.sql en Supabase

  **

  VAPID keys (Voluntary Application Server Identification) son un par de claves pública/privada 
  que identifican a tu servidor como el emisor legítimo de push notifications.                
                                                                                                
  Cómo funciona:                                                                              
  1. El browser del alumno se suscribe a push usando tu clave pública (la ve el cliente)        
  2. Cuando tu servidor envía una notificación, firma el mensaje con tu clave privada (secreta, 
  solo en el server)
  3. El push service (Google/Apple/Mozilla) verifica que la firma coincide → entrega la
  notificación

  npx web-push generate-vapid-keys simplemente genera ese par de claves. Imprime algo así:

  Public Key:  BNbxGY...largo...base64
  Private Key: 3KzvK...largo...base64


  Esas las ponés en .env.local:

  NEXT_PUBLIC_VAPID_PUBLIC_KEY=BNbxGY...
  VAPID_PRIVATE_KEY=3KzvK...
  VAPID_EMAIL=tu@email.com


  Se generan una sola vez y se reusan siempre. Si las cambiás, todos los alumnos tienen que
  re-suscribirse.

  **