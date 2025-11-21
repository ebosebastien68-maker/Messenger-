// =====================================================================
// ACTUALITÉS (POSTS)
// =====================================================================

async function loadPosts() {
    try {
        const { data, error } = await supabase
            .from('view_published_posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const grid = document.getElementById('posts-grid');

        if (!data || data.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-16 text-gray-500">
                    <i data-lucide="trending-up" class="w-20 h-20 mx-auto mb-4 opacity-30"></i>
                    <h3 class="text-2xl font-bold mb-2 text-gray-700">Aucune actualité</h3>
                    <p class="text-gray-500">Les actualités apparaîtront ici</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        grid.innerHTML = data.map(post => `
            <article class="bg-white rounded-2xl shadow-sm p-6 hover:shadow-lg transition-all hover-lift animate-slide-in">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                            ${getInitials(post.admin_firstname, post.admin_lastname)}
                        </div>
                        <div>
                            <h4 class="font-semibold text-gray-900">${post.admin_firstname} ${post.admin_lastname}</h4>
                            <p class="text-sm text-gray-500">${formatDate(post.created_at)}</p>
                        </div>
                    </div>
                    <span class="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                        ${getPostTypeLabel(post.type)}
                    </span>
                </div>

                <h3 class="text-xl font-bold text-gray-900 mb-3">${escapeHtml(post.title)}</h3>
                
                <p class="text-gray-700 whitespace-pre-wrap mb-4 line-clamp-6">${escapeHtml(post.content)}</p>

                ${post.media_files && post.media_files.length > 0 ? `
                    <div class="grid grid-cols-2 gap-2 mb-4">
                        ${post.media_files.slice(0, 4).map(media => `
                            <div class="relative rounded-xl overflow-hidden bg-gray-100 aspect-video">
                                ${media.file_type && media.file_type.startsWith('image') ? `
                                    <img src="${media.file_url}" alt="Media" class="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer" onclick="window.open('${media.file_url}', '_blank')">
                                ` : `
                                    <div class="w-full h-full flex items-center justify-center">
                                        <i data-lucide="file" class="w-8 h-8 text-gray-400"></i>
                                    </div>
                                `}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <div class="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div class="flex items-center gap-4 text-sm text-gray-600">
                        <span class="flex items-center gap-1">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                            ${post.views_count} vues
                        </span>
                    </div>
                    <button
                        onclick="viewPostDetails('${post.id}')"
                        class="text-indigo-600 hover:text-indigo-700 font-semibold text-sm flex items-center gap-1"
                    >
                        Lire plus
                        <i data-lucide="arrow-right" class="w-4 h-4"></i>
                    </button>
                </div>
            </article>
        `).join('');

        lucide.createIcons();

    } catch (error) {
        console.error('Erreur chargement posts:', error);
        showAlert('Erreur lors du chargement des actualités', 'error');
    }
}

function getPostTypeLabel(type) {
    const labels = {
        text: '📝 Texte',
        audio: '🎵 Audio',
        video: '🎥 Vidéo',
        file: '📎 Fichier'
    };
    return labels[type] || '📝 Texte';
}

async function viewPostDetails(postId) {
    try {
        // Incrémenter les vues
        await supabase.rpc('fn_increment_post_views', { p_post_id: postId });

        // Recharger les posts
        await loadPosts();

        // TODO: Afficher modal avec détails complets
        showAlert('Fonctionnalité en cours de développement', 'info');
    } catch (error) {
        console.error('Erreur vue post:', error);
    }
          }
