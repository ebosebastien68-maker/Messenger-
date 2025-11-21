// =====================================================================
// PANEL ADMIN - PUBLICATION D'ACTUALITÉS
// =====================================================================

function loadAdminPanel() {
    if (currentUser?.role !== 'admin') {
        showAlert('Accès réservé aux administrateurs', 'error');
        return;
    }

    const container = document.getElementById('admin-container');
    
    container.innerHTML = `
        <div class="h-full overflow-y-auto p-6">
            <div class="max-w-6xl mx-auto">
                <!-- Header -->
                <div class="mb-8">
                    <h2 class="text-3xl font-bold text-gray-900 mb-2">✍️ Publier une actualité</h2>
                    <p class="text-gray-600">Créez et partagez du contenu avec tous les utilisateurs de la plateforme</p>
                </div>

                <div class="grid lg:grid-cols-3 gap-6">
                    <!-- Formulaire -->
                    <form id="admin-publish-form" class="lg:col-span-2 space-y-6">
                        <div class="bg-white rounded-2xl shadow-sm p-6 space-y-6">
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">
                                    📝 Titre de l'actualité
                                </label>
                                <input
                                    type="text"
                                    id="admin-post-title"
                                    placeholder="Un titre accrocheur qui attire l'attention..."
                                    required
                                    maxlength="100"
                                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:outline-none transition-all input-focus text-lg"
                                    oninput="updatePreview()"
                                />
                                <p class="text-xs text-gray-500 mt-1">
                                    <span id="title-counter">0</span>/100 caractères
                                </p>
                            </div>

                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">
                                    📄 Contenu
                                </label>
                                <textarea
                                    id="admin-post-content"
                                    rows="10"
                                    placeholder="Rédigez votre actualité ici...&#10;&#10;Vous pouvez écrire plusieurs paragraphes pour détailler votre message.&#10;&#10;Soyez clair et concis pour que votre message soit bien compris."
                                    required
                                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:outline-none transition-all input-focus resize-none"
                                    oninput="updatePreview()"
                                ></textarea>
                                <p class="text-xs text-gray-500 mt-1">
                                    <span id="content-counter">0</span> caractères
                                </p>
                            </div>

                            <div class="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                                        🎯 Type de contenu
                                    </label>
                                    <select
                                        id="admin-post-type"
                                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:outline-none transition-all input-focus"
                                        onchange="updateMediaUpload()"
                                    >
                                        <option value="text">📝 Texte uniquement</option>
                                        <option value="audio">🎵 Audio</option>
                                        <option value="video">🎥 Vidéo</option>
                                        <option value="file">📎 Fichier</option>
                                    </select>
                                </div>

                                <div>
                                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                                        📅 Publication
                                    </label>
                                    <select
                                        id="admin-post-status"
                                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:outline-none transition-all input-focus"
                                    >
                                        <option value="published">✅ Publier immédiatement</option>
                                        <option value="draft">📋 Enregistrer comme brouillon</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Media Upload -->
                            <div id="media-upload-section" class="hidden">
                                <label class="block text-sm font-semibold text-gray-700 mb-2" id="media-upload-label">
                                    📎 Fichier média
                                </label>
                                <div class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-600 transition-all cursor-pointer bg-gray-50 hover:bg-indigo-50">
                                    <input
                                        type="file"
                                        id="admin-media-file"
                                        class="hidden"
                                        accept="*/*"
                                        onchange="previewMediaFile(event)"
                                    />
                                    <label for="admin-media-file" class="cursor-pointer">
                                        <i data-lucide="upload-cloud" class="w-12 h-12 mx-auto mb-3 text-gray-400"></i>
                                        <p class="text-gray-600 font-medium mb-1">Cliquez pour sélectionner un fichier</p>
                                        <p class="text-sm text-gray-500">Audio, Vidéo, PDF, Images acceptés</p>
                                    </label>
                                    <div id="file-preview" class="hidden mt-4"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="flex justify-between items-center gap-4">
                            <button
                                type="button"
                                onclick="resetPublishForm()"
                                class="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                            >
                                <i data-lucide="rotate-ccw" class="w-5 h-5 inline mr-2"></i>
                                Réinitialiser
                            </button>
                            <button
                                type="submit"
                                class="flex-1 max-w-md px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                            >
                                <i data-lucide="send" class="w-5 h-5 inline mr-2"></i>
                                Publier l'actualité
                            </button>
                        </div>
                    </form>

                    <!-- Aperçu -->
                    <div class="lg:sticky lg:top-24 space-y-4">
                        <div class="bg-white rounded-2xl shadow-sm p-6">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <i data-lucide="eye" class="w-5 h-5"></i>
                                Aperçu en temps réel
                            </h3>
                            <div class="border-2 border-yellow-200 bg-yellow-50 rounded-xl p-6 relative">
                                <div class="absolute top-3 right-3 px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold">
                                    APERÇU
                                </div>
                                
                                <h4 id="preview-title" class="text-xl font-bold text-gray-900 mb-3 min-h-[2rem]">
                                    <span class="text-gray-400">Votre titre ici...</span>
                                </h4>
                                
                                <div class="flex items-center gap-3 text-sm text-gray-600 mb-4">
                                    <div class="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                        ${getInitials(currentUser?.firstname, currentUser?.lastname)}
                                    </div>
                                    <div>
                                        <p class="font-semibold">${currentUser?.firstname} ${currentUser?.lastname}</p>
                                        <p class="text-xs">${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                </div>
                                
                                <div id="preview-content" class="text-gray-700 whitespace-pre-wrap min-h-[6rem]">
                                    <span class="text-gray-400 italic">Votre contenu apparaîtra ici au fur et à mesure que vous tapez...</span>
                                </div>

                                <div id="preview-media" class="hidden mt-4"></div>
                            </div>
                        </div>

                        <!-- Statistiques -->
                        <div class="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
                            <h3 class="text-lg font-semibold mb-4">📊 Statistiques</h3>
                            <div class="space-y-3">
                                <div class="flex justify-between items-center">
                                    <span class="text-indigo-100">Publications totales</span>
                                    <span class="text-2xl font-bold" id="total-posts">0</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-indigo-100">Vues totales</span>
                                    <span class="text-2xl font-bold" id="total-views">0</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-indigo-100">Utilisateurs</span>
                                    <span class="text-2xl font-bold" id="total-users">0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Attacher event listener
    document.getElementById('admin-publish-form').addEventListener('submit', handlePublishSubmit);
    
    // Charger stats
    loadAdminStats();

    // Init Lucide
    lucide.createIcons();
}

function updatePreview() {
    const title = document.getElementById('admin-post-title').value;
    const content = document.getElementById('admin-post-content').value;
    
    const previewTitle = document.getElementById('preview-title');
    const previewContent = document.getElementById('preview-content');
    const titleCounter = document.getElementById('title-counter');
    const contentCounter = document.getElementById('content-counter');

    if (title) {
        previewTitle.innerHTML = escapeHtml(title);
    } else {
        previewTitle.innerHTML = '<span class="text-gray-400">Votre titre ici...</span>';
    }

    if (content) {
        previewContent.textContent = content;
    } else {
        previewContent.innerHTML = '<span class="text-gray-400 italic">Votre contenu apparaîtra ici au fur et à mesure que vous tapez...</span>';
    }

    titleCounter.textContent = title.length;
    contentCounter.textContent = content.length;
}

function updateMediaUpload() {
    const type = document.getElementById('admin-post-type').value;
    const mediaSection = document.getElementById('media-upload-section');
    const mediaLabel = document.getElementById('media-upload-label');

    if (type === 'text') {
        mediaSection.classList.add('hidden');
    } else {
        mediaSection.classList.remove('hidden');
        const labels = {
            audio: '🎵 Fichier audio',
            video: '🎥 Fichier vidéo',
            file: '📎 Fichier (PDF, doc, etc.)'
        };
        mediaLabel.innerHTML = labels[type] || '📎 Fichier média';
    }
}

function previewMediaFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const preview = document.getElementById('file-preview');
    const previewMedia = document.getElementById('preview-media');
    
    preview.innerHTML = `
        <div class="flex items-center gap-3 p-3 bg-white rounded-lg">
            <i data-lucide="file" class="w-8 h-8 text-indigo-600"></i>
            <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900 truncate">${file.name}</p>
                <p class="text-sm text-gray-600">${(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button type="button" onclick="clearMediaFile()" class="text-red-600 hover:text-red-700">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>
    `;
    preview.classList.remove('hidden');

    // Preview dans l'aperçu
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewMedia.innerHTML = `<img src="${e.target.result}" class="w-full rounded-lg" alt="Preview">`;
            previewMedia.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    } else {
        previewMedia.innerHTML = `
            <div class="p-4 bg-gray-100 rounded-lg text-center">
                <i data-lucide="file" class="w-12 h-12 mx-auto text-gray-400 mb-2"></i>
                <p class="text-sm text-gray-600">${file.name}</p>
            </div>
        `;
        previewMedia.classList.remove('hidden');
    }

    lucide.createIcons();
}

function clearMediaFile() {
    document.getElementById('admin-media-file').value = '';
    document.getElementById('file-preview').classList.add('hidden');
    document.getElementById('preview-media').classList.add('hidden');
}

async function handlePublishSubmit(e) {
    e.preventDefault();

    if (currentUser?.role !== 'admin') {
        showAlert('Seuls les administrateurs peuvent publier', 'error');
        return;
    }

    const title = document.getElementById('admin-post-title').value.trim();
    const content = document.getElementById('admin-post-content').value.trim();
    const type = document.getElementById('admin-post-type').value;
    const status = document.getElementById('admin-post-status').value;

    if (!title || !content) {
        showAlert('Veuillez remplir tous les champs', 'error');
        return;
    }

    try {
        const { error } = await supabase
            .from('admin_posts')
            .insert({
                admin_id: currentUser.id,
                title: title,
                content: content,
                type: type,
                is_published: status === 'published',
                published_at: status === 'published' ? new Date().toISOString() : null
            });

        if (error) throw error;

        showAlert('✅ Actualité publiée avec succès !', 'success');
        resetPublishForm();
        await loadPosts();
        await loadAdminStats();

        // Basculer vers l'onglet posts après 1s
        setTimeout(() => switchTab('posts'), 1000);

    } catch (error) {
        console.error('Erreur publication:', error);
        showAlert('Erreur lors de la publication', 'error');
    }
}

function resetPublishForm() {
    document.getElementById('admin-post-title').value = '';
    document.getElementById('admin-post-content').value = '';
    document.getElementById('admin-post-type').value = 'text';
    document.getElementById('admin-post-status').value = 'published';
    clearMediaFile();
    updatePreview();
    updateMediaUpload();
}

async function loadAdminStats() {
    try {
        const { data, error } = await supabase.rpc('fn_get_admin_statistics');

        if (error) throw error;

        if (data) {
            document.getElementById('total-posts').textContent = data.total_posts || 0;
            document.getElementById('total-views').textContent = data.total_posts ? 
                (data.total_posts * 15) : 0; // Approximation
            document.getElementById('total-users').textContent = data.total_users || 0;
        }
    } catch (error) {
        console.error('Erreur chargement stats:', error);
    }
                                          }
