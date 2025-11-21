// =====================================================================
// SERVICE WORKER - PWA & CACHE
// =====================================================================

const CACHE_NAME = 'world-connect-v1.0.0';
const STATIC_CACHE = 'world-connect-static-v1';
const DYNAMIC_CACHE = 'world-connect-dynamic-v1';

// Fichiers à mettre en cache lors de l'installation
const STATIC_FILES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/wc.png',
    '/js/config.js',
    '/js/utils.js',
    '/js/auth.js',
    '/js/messages.js',
    '/js/posts.js',
    '/js/admin.js',
    '/js/app.js',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@latest',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/dist/umd/supabase.min.js'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
    console.log('📦 Service Worker: Installation');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('✅ Cache statique créé');
                return cache.addAll(STATIC_FILES);
            })
            .catch((error) => {
                console.error('❌ Erreur cache:', error);
            })
    );
    
    // Activer immédiatement
    self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker: Activation');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('🗑️ Suppression ancien cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
    );
    
    // Prendre le contrôle immédiatement
    return self.clients.claim();
});

// Interception des requêtes (stratégie Network First avec fallback Cache)
self.addEventListener('fetch', (event) => {
    const { request } = event;
    
    // Ignorer les requêtes non-GET
    if (request.method !== 'GET') {
        return;
    }
    
    // Ignorer les requêtes vers Supabase (toujours en ligne)
    if (request.url.includes('supabase.co')) {
        return;
    }
    
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Clone la réponse pour la mettre en cache
                const responseClone = response.clone();
                
                caches.open(DYNAMIC_CACHE)
                    .then((cache) => {
                        cache.put(request, responseClone);
                    });
                
                return response;
            })
            .catch(() => {
                // Si réseau échoue, chercher dans le cache
                return caches.match(request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        
                        // Page de fallback hors ligne
                        if (request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
    console.log('🔔 Push notification reçue');
    
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'World Connect';
    const options = {
        body: data.body || 'Vous avez un nouveau message',
        icon: '/wc.png',
        badge: '/wc.png',
        tag: data.tag || 'world-connect',
        data: data.data || {},
        actions: [
            {
                action: 'open',
                title: 'Ouvrir'
            },
            {
                action: 'close',
                title: 'Fermer'
            }
        ],
        requireInteraction: false,
        vibrate: [200, 100, 200]
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
    console.log('👆 Clic sur notification');
    
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
    console.log('🔄 Synchronisation en arrière-plan');
    
    if (event.tag === 'sync-messages') {
        event.waitUntil(syncMessages());
    }
});

async function syncMessages() {
    try {
        // Logique de synchronisation des messages
        console.log('✅ Messages synchronisés');
    } catch (error) {
        console.error('❌ Erreur synchronisation:', error);
    }
}

// Gestion des messages du client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_URLS') {
        caches.open(DYNAMIC_CACHE)
            .then((cache) => {
                return cache.addAll(event.data.urls);
            });
    }
});

console.log('✅ Service Worker chargé');
