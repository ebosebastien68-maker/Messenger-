
// =====================================================================
// APPLICATION PRINCIPALE - INITIALISATION ET TEMPS RÉEL
// =====================================================================

// Initialisation au chargement de la page
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialiser Supabase
        supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

        // Vérifier session existante
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            await loadUserData(session.user);
            showApp();
        } else {
            showAuthScreen();
        }

        // Enregistrer Service Worker pour PWA
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('✅ Service Worker enregistré:', registration.scope);
            } catch (error) {
                console.log('❌ Erreur Service Worker:', error);
            }
        }

        // Écouter les changements d'auth
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                window.location.reload();
            }
        });

    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        showAlert('Erreur de connexion au serveur', 'error');
    } finally {
        // Masquer l'écran de chargement
        document.getElementById('loading-screen').classList.add('hidden');
    }
});

// =====================================================================
// TEMPS RÉEL (REALTIME SUBSCRIPTIONS)
// =====================================================================

function subscribeToRealtime() {
    if (!currentUser) return;

    // Messages en temps réel
    messagesSubscription = supabase
        .channel('messages-channel')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${currentConversation}`
        }, (payload) => {
            console.log('✉️ Nouveau message:', payload.new);
            
            if (currentConversation === payload.new.conversation_id) {
                // Ajouter le message à la conversation actuelle
                const messagesContainer = document.getElementById('chat-messages');
                if (messagesContainer) {
                    displayMessages([payload.new]);
                    scrollToBottom('chat-messages');
                }
            }
            
            // Recharger la liste des conversations
            loadConversations();
        })
        .subscribe();

    // Conversations en temps réel
    conversationsSubscription = supabase
        .channel('conversations-channel')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'conversations'
        }, (payload) => {
            console.log('💬 Changement conversation:', payload);
            loadConversations();
        })
        .subscribe();

    // Posts en temps réel
    postsSubscription = supabase
        .channel('posts-channel')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'admin_posts'
        }, (payload) => {
            console.log('📢 Nouveau post:', payload.new);
            
            // Notification
            if (payload.new.is_published) {
                showNotification('📢 Nouvelle actualité', payload.new.title);
            }
            
            // Recharger les posts si on est sur l'onglet
            if (document.getElementById('posts-container').classList.contains('hidden') === false) {
                loadPosts();
            }
        })
        .subscribe();

    console.log('✅ Abonnements temps réel activés');
}

// Nettoyer les abonnements
function unsubscribeFromRealtime() {
    if (messagesSubscription) {
        supabase.removeChannel(messagesSubscription);
    }
    if (conversationsSubscription) {
        supabase.removeChannel(conversationsSubscription);
    }
    if (postsSubscription) {
        supabase.removeChannel(postsSubscription);
    }
    
    console.log('🔌 Abonnements temps réel désactivés');
}

// =====================================================================
// NOTIFICATIONS PUSH
// =====================================================================

function showNotification(title, body) {
    // Notification navigateur
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: '/wc.png',
            badge: '/wc.png',
            tag: 'world-connect',
            requireInteraction: false
        });
    }
    
    // Notification dans l'app
    showAlert(`${title}: ${body}`, 'info');
}

async function requestNotificationPermission() {
    try {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            showAlert('✅ Notifications activées !', 'success');
            
            // S'abonner aux push notifications
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                await subscribeUserToPush();
            }
        } else {
            showAlert('Notifications refusées', 'warning');
        }
    } catch (error) {
        console.error('Erreur permission notifications:', error);
    }
}

async function subscribeUserToPush() {
    try {
        const registration = await navigator.serviceWorker.ready;
        
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY)
        });

        // Envoyer au serveur
        const { error } = await supabase
            .from('user_devices')
            .upsert({
                user_id: currentUser.id,
                device_token: JSON.stringify(subscription),
                device_type: 'web'
            });

        if (error) throw error;
        
        console.log('✅ Push subscription enregistrée');
    } catch (error) {
        console.error('Erreur push subscription:', error);
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// =====================================================================
// GESTION HORS LIGNE / PWA
// =====================================================================

// Détecter le statut hors ligne
window.addEventListener('online', () => {
    showAlert('✅ Connexion rétablie', 'success');
    
    // Recharger les données
    if (currentUser) {
        loadConversations();
        loadPosts();
    }
});

window.addEventListener('offline', () => {
    showAlert('⚠️ Vous êtes hors ligne', 'warning');
});

// Détection d'installation PWA
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Afficher un bouton d'installation (optionnel)
    showAlert('💡 Installez World Connect pour une meilleure expérience', 'info');
});

window.addEventListener('appinstalled', () => {
    showAlert('✅ Application installée avec succès !', 'success');
    deferredPrompt = null;
});

// =====================================================================
// GESTION DES ERREURS GLOBALES
// =====================================================================

window.addEventListener('error', (event) => {
    console.error('❌ Erreur globale:', event.error);
    
    // Ne pas afficher les erreurs mineures
    if (event.error && event.error.message && 
        !event.error.message.includes('ResizeObserver')) {
        showAlert('Une erreur est survenue', 'error');
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promise rejetée:', event.reason);
});

// =====================================================================
// RACCOURCIS CLAVIER
// =====================================================================

document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K : Rechercher conversations
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('#conversations-list input');
        if (searchInput) searchInput.focus();
    }
    
    // Ctrl/Cmd + N : Nouvelle conversation
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showNewConversationModal();
    }
    
    // Escape : Fermer les modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            if (!modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
            }
        });
    }
});

// =====================================================================
// FONCTIONS UTILITAIRES GLOBALES
// =====================================================================

// Copier dans le presse-papier
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showAlert('✅ Copié dans le presse-papier', 'success');
    }).catch(() => {
        showAlert('❌ Erreur lors de la copie', 'error');
    });
}

// Partager (Web Share API)
async function shareContent(title, text, url) {
    if (navigator.share) {
        try {
            await navigator.share({ title, text, url });
            showAlert('✅ Partagé avec succès', 'success');
        } catch (error) {
            if (error.name !== 'AbortError') {
                showAlert('❌ Erreur lors du partage', 'error');
            }
        }
    } else {
        // Fallback: copier le lien
        copyToClipboard(url || text);
    }
}

// Formater les nombres
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// =====================================================================
// DEBUG (À RETIRER EN PRODUCTION)
// =====================================================================

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 Mode développement activé');
    
    // Exposer les variables globales pour le debug
    window.debug = {
        supabase,
        currentUser,
        currentConversation,
        CONFIG
    };
}

// =====================================================================
// LOG DE DÉMARRAGE
// =====================================================================

console.log(`
%c 🌍 World Connect 
%c Messagerie sécurisée v1.0.0 
`, 
'font-size: 20px; font-weight: bold; color: #4F46E5;',
'font-size: 12px; color: #6B7280;'
);

console.log('✅ Application initialisée');
console.log('📱 PWA:', 'serviceWorker' in navigator ? 'Supporté' : 'Non supporté');
console.log('🔔 Notifications:', 'Notification' in window ? 'Supportées' : 'Non supportées');
console.log('📡 Temps réel:', 'WebSocket supporté');
