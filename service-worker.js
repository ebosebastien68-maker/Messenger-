// =====================================================================
// SERVICE WORKER - PWA avec Push Notifications
// =====================================================================
// Fichier: service-worker.js
// Version: 1.0.0
// =====================================================================

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `admin-chat-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Fichiers à mettre en cache immédiatement
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/wc.png',
  '/offline.html',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/dist/umd/supabase.min.js'
];

// =====================================================================
// 1) INSTALLATION - Mise en cache des ressources
// =====================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installation en cours...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Mise en cache des ressources');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Installation terminée');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Erreur lors de l\'installation:', error);
      })
  );
});

// =====================================================================
// 2) ACTIVATION - Nettoyage des anciens caches
// =====================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activation en cours...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation terminée');
        return self.clients.claim();
      })
  );
});

// =====================================================================
// 3) FETCH - Stratégie de cache (Network First, fallback Cache)
// =====================================================================

self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;

  // Ignorer les requêtes vers Supabase (toujours réseau)
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cloner la réponse pour le cache
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });
        
        return response;
      })
      .catch(() => {
        // Si le réseau échoue, utiliser le cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Si pas en cache, retourner page offline pour navigation
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            
            // Sinon retourner une réponse vide
            return new Response('Ressource non disponible hors ligne', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// =====================================================================
// 4) PUSH - Réception des notifications push
// =====================================================================

self.addEventListener('push', (event) => {
  console.log('[SW] Notification push reçue');

  let notificationData = {
    title: 'Nouvelle notification',
    body: 'Vous avez reçu un message',
    icon: '/wc.png',
    badge: '/wc.png',
    tag: 'default',
    requireInteraction: false,
    data: {}
  };

  // Parser les données reçues
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        tag: payload.tag || notificationData.tag,
        requireInteraction: payload.requireInteraction || false,
        data: payload.data || {},
        vibrate: [200, 100, 200],
        actions: payload.data?.type === 'new_message' ? [
          {
            action: 'reply',
            title: '💬 Répondre',
            icon: '/wc.png'
          },
          {
            action: 'view',
            title: '👁️ Voir',
            icon: '/wc.png'
          }
        ] : [
          {
            action: 'view',
            title: '👁️ Voir',
            icon: '/wc.png'
          }
        ]
      };
    } catch (error) {
      console.error('[SW] Erreur parsing notification:', error);
      notificationData.body = event.data.text();
    }
  }

  // Afficher la notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      vibrate: notificationData.vibrate,
      actions: notificationData.actions,
      timestamp: Date.now()
    })
  );
});

// =====================================================================
// 5) NOTIFICATION CLICK - Action au clic sur notification
// =====================================================================

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Clic sur notification:', event.action);
  
  event.notification.close();

  const notificationData = event.notification.data || {};
  let urlToOpen = '/';

  // Déterminer l'URL selon le type de notification
  if (notificationData.type === 'new_message') {
    urlToOpen = `/?view=conversation&id=${notificationData.conversation_id}`;
  } else if (notificationData.type === 'new_post') {
    urlToOpen = `/?view=post&id=${notificationData.post_id}`;
  }

  // Gestion des actions
  if (event.action === 'reply') {
    urlToOpen = `/?view=conversation&id=${notificationData.conversation_id}&action=reply`;
  } else if (event.action === 'view') {
    // URL déjà définie ci-dessus
  }

  // Ouvrir ou focus la fenêtre
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then((clientList) => {
      // Chercher si l'app est déjà ouverte
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => {
            return client.navigate(urlToOpen);
          });
        }
      }
      
      // Sinon, ouvrir nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// =====================================================================
// 6) NOTIFICATION CLOSE - Tracking fermeture notification
// =====================================================================

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification fermée:', event.notification.tag);
  
  // Optionnel: envoyer analytics
  const notificationData = event.notification.data || {};
  
  if (notificationData.conversation_id) {
    // Tracker que l'utilisateur a fermé sans cliquer
    console.log('[SW] Notification fermée sans action');
  }
});

// =====================================================================
// 7) MESSAGE - Communication avec le client
// =====================================================================

self.addEventListener('message', (event) => {
  console.log('[SW] Message reçu du client:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => {
          return cache.addAll(event.data.urls);
        })
    );
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => caches.delete(cacheName))
          );
        })
    );
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_VERSION
    });
  }
});

// =====================================================================
// 8) SYNC - Background Sync (optionnel, pour messages hors ligne)
// =====================================================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  try {
    // Récupérer les messages en attente depuis IndexedDB
    // et les envoyer au serveur
    console.log('[SW] Synchronisation des messages...');
    
    // TODO: Implémenter la logique de sync
    // 1. Ouvrir IndexedDB
    // 2. Récupérer messages pending
    // 3. Envoyer via API
    // 4. Marquer comme envoyés
    
    return Promise.resolve();
  } catch (error) {
    console.error('[SW] Erreur sync:', error);
    return Promise.reject(error);
  }
}

// =====================================================================
// 9) PERIODIC SYNC - Synchronisation périodique (optionnel)
// =====================================================================

self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);

  if (event.tag === 'check-new-messages') {
    event.waitUntil(checkNewMessages());
  }
});

async function checkNewMessages() {
  try {
    console.log('[SW] Vérification nouveaux messages...');
    
    // TODO: Implémenter vérification périodique
    // 1. Appeler API pour nouveaux messages
    // 2. Afficher notifications si nécessaire
    
    return Promise.resolve();
  } catch (error) {
    console.error('[SW] Erreur periodic sync:', error);
    return Promise.reject(error);
  }
}

// =====================================================================
// 10) PUSH SUBSCRIPTION CHANGE - Gestion changement subscription
// =====================================================================

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changée');

  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        'BIKf2Qo-ab-baBmT5yRVZEr2TwiWItFOrDXlX-xPfjVf0zBE2A3fHdd5xxftxrV_BNh95f2vShNriJX9-8nxdm8'
      )
    })
    .then((subscription) => {
      console.log('[SW] Nouvelle subscription créée');
      
      // Envoyer la nouvelle subscription au serveur
      return fetch('/api/update-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          oldSubscription: event.oldSubscription,
          newSubscription: subscription
        })
      });
    })
  );
});

// =====================================================================
// 11) UTILITAIRES
// =====================================================================

// Convertir VAPID key base64 en Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Logger avec timestamp
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[SW ${timestamp}] ${message}`, data || '');
}

// =====================================================================
// 12) ERROR HANDLER GLOBAL
// =====================================================================

self.addEventListener('error', (event) => {
  console.error('[SW] Erreur globale:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Promise rejetée non gérée:', event.reason);
});

// =====================================================================
// FIN DU SERVICE WORKER
// =====================================================================

console.log('[SW] Service Worker chargé - Version:', CACHE_VERSION);
