// =====================================================================
// MESSAGERIE - CONVERSATIONS & MESSAGES
// =====================================================================

async function loadConversations() {
    if (!currentUser) return;
    
    try {
        const { data, error } = await supabase
            .from('view_user_conversations')
            .select('*')
            .or(`user_id.eq.${currentUser.id},admin_id.eq.${currentUser.id}`)
            .order('last_message_at', { ascending: false, nullsFirst: false });

        if (error) throw error;

        const listContainer = document.getElementById('conversations-list');
        
        if (!data || data.length === 0) {
            listContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                    <i data-lucide="message-square" class="w-12 h-12 mb-3 opacity-50"></i>
                    <p class="text-sm">Aucune conversation</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        listContainer.innerHTML = data.map(conv => {
            const otherUser = conv.user_id === currentUser.id 
                ? { 
                    firstname: conv.admin_firstname, 
                    lastname: conv.admin_lastname,
                    id: conv.admin_id
                }
                : { 
                    firstname: conv.user_firstname, 
                    lastname: conv.user_lastname,
                    id: conv.user_id
                };
            
            const initials = getInitials(otherUser.firstname, otherUser.lastname);
            const isActive = currentConversation === conv.conversation_id;
            
            return `
                <div
                    onclick="loadConversation('${conv.conversation_id}')"
                    class="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-all ${
                        isActive ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
                    }"
                    data-conversation-id="${conv.conversation_id}"
                >
                    <div class="flex items-center gap-3">
                        <div class="relative">
                            <div class="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                                ${initials}
                            </div>
                            <div class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex justify-between items-baseline mb-1">
                                <h3 class="font-semibold text-gray-900 truncate">
                                    ${otherUser.firstname} ${otherUser.lastname}
                                </h3>
                                <span class="text-xs text-gray-500 ml-2 flex-shrink-0">
                                    ${formatTime(conv.last_message_created_at)}
                                </span>
                            </div>
                            <p class="text-sm text-gray-600 truncate">
                                ${conv.last_message_type === 'audio' ? '🎤 Message vocal' : 
                                  conv.last_message_type === 'image' ? '📷 Image' :
                                  conv.last_message_type === 'video' ? '🎥 Vidéo' :
                                  escapeHtml(conv.last_message_content) || '💬 Nouveau message'}
                            </p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        lucide.createIcons();
    } catch (error) {
        console.error('Erreur chargement conversations:', error);
        showAlert('Erreur lors du chargement des conversations', 'error');
    }
}

async function loadConversation(conversationId) {
    currentConversation = conversationId;

    // Marquer comme active dans la liste
    document.querySelectorAll('[data-conversation-id]').forEach(item => {
        if (item.dataset.conversationId === conversationId) {
            item.classList.add('bg-indigo-50', 'border-l-4', 'border-l-indigo-600');
        } else {
            item.classList.remove('bg-indigo-50', 'border-l-4', 'border-l-indigo-600');
        }
    });

    try {
        // Récupérer info conversation
        const { data: conv, error: convError } = await supabase
            .from('conversations')
            .select('*, user:users!user_id(*), admin:users!admin_id(*)')
            .eq('id', conversationId)
            .single();

        if (convError) throw convError;

        const otherUser = conv.user_id === currentUser.id ? conv.admin : conv.user;

        // Mettre à jour header du chat
        document.getElementById('chat-avatar').textContent = getInitials(otherUser.firstname, otherUser.lastname);
        document.getElementById('chat-name').textContent = `${otherUser.firstname} ${otherUser.lastname}`;
        document.getElementById('chat-status').textContent = 'En ligne';

        // Charger les messages
        const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (msgError) throw msgError;

        // Afficher le chat
        document.getElementById('chat-empty-state').classList.add('hidden');
        document.getElementById('chat-content').classList.remove('hidden');

        // Afficher les messages
        displayMessages(messages);

        // Marquer comme lu
        await markMessagesAsSeen(conversationId);

        // Scroll vers le bas
        scrollToBottom('chat-messages');

    } catch (error) {
        console.error('Erreur chargement conversation:', error);
        showAlert('Erreur lors du chargement de la conversation', 'error');
    }
}

function displayMessages(messages) {
    const container = document.getElementById('chat-messages');
    
    if (!messages || messages.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <p>Aucun message</p>
                <p class="text-sm mt-2">Envoyez un message pour commencer la conversation</p>
            </div>
        `;
        return;
    }

    container.innerHTML = messages.map(msg => {
        const isSent = msg.sender_id === currentUser.id;
        const senderInitial = isSent ? getInitials(currentUser.firstname, currentUser.lastname) : 'A';
        
        let messageContent = '';
        
        if (msg.type === 'audio' && msg.media_url) {
            messageContent = `
                <div class="audio-message flex items-center gap-3 p-3 rounded-xl ${
                    isSent ? 'bg-white bg-opacity-20' : 'bg-gray-100'
                }">
                    <button 
                        onclick="toggleAudioPlayback('${msg.id}', '${msg.media_url}')"
                        class="w-10 h-10 rounded-full ${
                            isSent ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'
                        } flex items-center justify-center hover:scale-110 transition-transform"
                    >
                        <i data-lucide="play" class="w-5 h-5" id="audio-icon-${msg.id}"></i>
                    </button>
                    <div class="flex-1">
                        <div class="h-1 bg-gray-300 rounded-full overflow-hidden">
                            <div class="h-full bg-indigo-600 w-0" id="audio-progress-${msg.id}"></div>
                        </div>
                        <span class="text-xs mt-1 block ${isSent ? 'text-white' : 'text-gray-600'}" id="audio-duration-${msg.id}">0:00</span>
                    </div>
                </div>
            `;
        } else if (msg.type === 'image' && msg.media_url) {
            messageContent = `
                <img src="${msg.media_url}" alt="Image" class="max-w-xs rounded-xl hover:scale-105 transition-transform cursor-pointer" onclick="window.open('${msg.media_url}', '_blank')">
            `;
        } else if (msg.type === 'video' && msg.media_url) {
            messageContent = `
                <video controls class="max-w-xs rounded-xl">
                    <source src="${msg.media_url}">
                </video>
            `;
        } else {
            messageContent = `<p class="whitespace-pre-wrap break-words">${escapeHtml(msg.content) || '📎 Média'}</p>`;
        }
        
        return `
            <div class="flex gap-3 ${isSent ? 'flex-row-reverse' : ''} message-bubble" data-message-id="${msg.id}">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${
                    isSent ? 'bg-indigo-600' : 'bg-gray-400'
                }">
                    ${senderInitial}
                </div>
                <div class="max-w-md">
                    <div class="px-4 py-2 rounded-2xl ${
                        isSent
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-white text-gray-900 rounded-tl-none shadow-sm'
                    }">
                        ${messageContent}
                    </div>
                    <span class="text-xs mt-1 block px-2 ${
                        isSent ? 'text-right text-gray-500' : 'text-gray-500'
                    }">
                        ${formatTime(msg.created_at)}
                        ${isSent && msg.status === 'seen' ? '✓✓' : isSent && msg.status === 'delivered' ? '✓' : ''}
                    </span>
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();

    if (!content || !currentConversation) return;

    try {
        // Récupérer les infos de la conversation
        const { data: conversation } = await supabase
            .from('conversations')
            .select('user_id, admin_id')
            .eq('id', currentConversation)
            .single();

        const receiverId = conversation.user_id === currentUser.id 
            ? conversation.admin_id 
            : conversation.user_id;

        const { error } = await supabase
            .from('messages')
            .insert({
                conversation_id: currentConversation,
                sender_id: currentUser.id,
                receiver_id: receiverId,
                type: 'text',
                content: content
            });

        if (error) throw error;

        input.value = '';
        input.focus();
    } catch (error) {
        console.error('Erreur envoi message:', error);
        showAlert('Erreur lors de l\'envoi du message', 'error');
    }
}

async function markMessagesAsSeen(conversationId) {
    try {
        await supabase.rpc('fn_mark_messages_as_seen', {
            p_conversation_id: conversationId
        });
    } catch (error) {
        console.error('Erreur marquage messages lus:', error);
    }
}

// Nouvelle conversation
async function showNewConversationModal() {
    if (currentUser.role === 'admin') {
        await loadUsersList();
    } else {
        await loadAdminsList();
    }
    openModal('new-conversation-modal');
}

async function loadAdminsList() {
    try {
        const { data: admins, error } = await supabase
            .from('users')
            .select('id, firstname, lastname, email')
            .eq('role', 'admin')
            .order('created_at', { ascending: true });

        if (error) throw error;

        const container = document.getElementById('contacts-list');

        if (!admins || admins.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i data-lucide="user-x" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
                    <p>Aucun administrateur disponible</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        container.innerHTML = admins.map(admin => `
            <div
                onclick="createConversationWith('${admin.id}', true)"
                class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-all hover-lift"
            >
                <div class="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    ${getInitials(admin.firstname, admin.lastname)}
                </div>
                <div>
                    <h4 class="font-semibold text-gray-900">${admin.firstname} ${admin.lastname}</h4>
                    <p class="text-sm text-gray-600">${admin.email}</p>
                </div>
            </div>
        `).join('');

        lucide.createIcons();
    } catch (error) {
        console.error('Erreur chargement admins:', error);
    }
}

async function loadUsersList() {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, firstname, lastname, email')
            .neq('role', 'admin')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const container = document.getElementById('contacts-list');

        if (!users || users.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i data-lucide="users" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
                    <p>Aucun utilisateur inscrit</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        container.innerHTML = `
            <input
                type="text"
                placeholder="🔍 Rechercher..."
                class="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:outline-none mb-4"
                oninput="filterContacts(this.value)"
            />
            <div id="filtered-contacts">
                ${users.map(user => `
                    <div
                        onclick="createConversationWith('${user.id}', false)"
                        class="contact-item flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-all hover-lift"
                        data-name="${user.firstname} ${user.lastname} ${user.email}"
                    >
                        <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-semibold">
                            ${getInitials(user.firstname, user.lastname)}
                        </div>
                        <div>
                            <h4 class="font-semibold text-gray-900">${user.firstname} ${user.lastname}</h4>
                            <p class="text-sm text-gray-600">${user.email}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        lucide.createIcons();
    } catch (error) {
        console.error('Erreur chargement utilisateurs:', error);
    }
}

function filterContacts(query) {
    const items = document.querySelectorAll('.contact-item');
    const lowerQuery = query.toLowerCase();
    
    items.forEach(item => {
        const name = item.dataset.name.toLowerCase();
        item.style.display = name.includes(lowerQuery) ? '' : 'none';
    });
}

async function createConversationWith(userId, isAdmin) {
    try {
        const { data, error } = await supabase.rpc('fn_get_or_create_admin_conversation', {
            p_user_id: isAdmin ? currentUser.id : userId,
            p_admin_id: isAdmin ? userId : currentUser.id
        });

        if (error) throw error;

        closeModal('new-conversation-modal');
        await loadConversations();
        await loadConversation(data);
        
        showAlert('Conversation créée avec succès', 'success');
    } catch (error) {
        console.error('Erreur création conversation:', error);
        showAlert('Erreur lors de la création de la conversation', 'error');
    }
}

// Enregistrement vocal
let currentAudioPlayers = {};

async function toggleVoiceRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await sendVoiceMessage(audioBlob);
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        recordingStartTime = Date.now();

        // Changer l'icône du bouton
        const voiceBtn = document.getElementById('voice-btn');
        voiceBtn.innerHTML = '<i data-lucide="square" class="w-5 h-5 text-red-600"></i>';
        voiceBtn.classList.add('animate-pulse');
        lucide.createIcons();

        showAlert('🎤 Enregistrement en cours...', 'info');

    } catch (error) {
        console.error('Erreur accès micro:', error);
        showAlert('Impossible d\'accéder au microphone', 'error');
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        
        const voiceBtn = document.getElementById('voice-btn');
        voiceBtn.innerHTML = '<i data-lucide="mic" class="w-5 h-5 text-gray-600"></i>';
        voiceBtn.classList.remove('animate-pulse');
        lucide.createIcons();
    }
}

async function sendVoiceMessage(audioBlob) {
    if (!currentConversation) return;

    try {
        const fileName = `voice_${Date.now()}_${currentUser.id}.webm`;
        const filePath = `${currentConversation}/${fileName}`;

        // Upload
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('messages-media')
            .upload(filePath, audioBlob, {
                contentType: 'audio/webm',
                cacheControl: '3600'
            });

        if (uploadError) throw uploadError;

        // URL publique
        const { data: urlData } = supabase.storage
            .from('messages-media')
            .getPublicUrl(filePath);

        // Récupérer infos conversation
        const { data: conversation } = await supabase
            .from('conversations')
            .select('user_id, admin_id')
            .eq('id', currentConversation)
            .single();

        const receiverId = conversation.user_id === currentUser.id 
            ? conversation.admin_id 
            : conversation.user_id;

        // Créer message
        const { error: messageError } = await supabase
            .from('messages')
            .insert({
                conversation_id: currentConversation,
                sender_id: currentUser.id,
                receiver_id: receiverId,
                type: 'audio',
                content: '🎤 Message vocal',
                media_url: urlData.publicUrl,
                has_media: true
            });

        if (messageError) throw messageError;

        showAlert('Message vocal envoyé', 'success');

    } catch (error) {
        console.error('Erreur envoi vocal:', error);
        showAlert('Erreur lors de l\'envoi du message vocal', 'error');
    }
}

function toggleAudioPlayback(messageId, audioUrl) {
    const audio = currentAudioPlayers[messageId] || new Audio(audioUrl);
    const icon = document.getElementById(`audio-icon-${messageId}`);
    const progressBar = document.getElementById(`audio-progress-${messageId}`);
    const durationSpan = document.getElementById(`audio-duration-${messageId}`);

    if (!currentAudioPlayers[messageId]) {
        currentAudioPlayers[messageId] = audio;

        audio.addEventListener('loadedmetadata', () => {
            durationSpan.textContent = formatAudioTime(audio.duration);
        });

        audio.addEventListener('timeupdate', () => {
            const progress = (audio.currentTime / audio.duration) * 100;
            progressBar.style.width = `${progress}%`;
            durationSpan.textContent = formatAudioTime(audio.currentTime);
        });

        audio.addEventListener('ended', () => {
            icon.setAttribute('data-lucide', 'play');
            progressBar.style.width = '0%';
            lucide.createIcons();
        });
    }

    if (audio.paused) {
        Object.values(currentAudioPlayers).forEach(a => {
            if (a !== audio && !a.paused) a.pause();
        });
        audio.play();
        icon.setAttribute('data-lucide', 'pause');
    } else {
        audio.pause();
        icon.setAttribute('data-lucide', 'play');
    }
    
    lucide.createIcons();
}

function formatAudioTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
