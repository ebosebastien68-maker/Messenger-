// =====================================================================
// UTILITAIRES
// =====================================================================

function showAlert(message, type = 'info') {
    const container = document.getElementById('alert-container') || document.body;
    const colors = {
        success: 'bg-green-100 text-green-800 border-green-200',
        error: 'bg-red-100 text-red-800 border-red-200',
        info: 'bg-blue-100 text-blue-800 border-blue-200',
        warning: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    
    const alert = document.createElement('div');
    alert.className = `${colors[type]} px-4 py-3 rounded-xl border mb-4 animate-slide-in`;
    alert.textContent = message;
    
    container.appendChild(alert);
    
    setTimeout(() => {
        alert.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'À l\'instant';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) {
        const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        return days[date.getDay()];
    }
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000) return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    if (diff < 172800000) return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getInitials(firstname, lastname) {
    const first = firstname ? firstname.charAt(0).toUpperCase() : '';
    const last = lastname ? lastname.charAt(0).toUpperCase() : '';
    return first + last || '?';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.remove('border-transparent', 'text-gray-600');
            btn.classList.add('border-indigo-600', 'text-indigo-600');
        } else {
            btn.classList.remove('border-indigo-600', 'text-indigo-600');
            btn.classList.add('border-transparent', 'text-gray-600');
        }
    });

    // Show/hide containers
    const containers = ['messages-container', 'posts-container', 'admin-container'];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (id === `${tabName}-container`) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });

    // Load data if needed
    if (tabName === 'posts') {
        loadPosts();
    } else if (tabName === 'admin' && currentUser?.role === 'admin') {
        loadAdminPanel();
    }
}

function scrollToBottom(elementId = 'chat-messages', smooth = true) {
    setTimeout(() => {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollTop = element.scrollHeight;
            if (smooth) {
                element.scrollTo({
                    top: element.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }
    }, 100);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function searchConversations(query) {
    const items = document.querySelectorAll('#conversations-list > div');
    const lowerQuery = query.toLowerCase();
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(lowerQuery) ? '' : 'none';
    });
}
