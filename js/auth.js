// =====================================================================
// AUTHENTIFICATION - CORRECTION PROFIL UTILISATEUR
// =====================================================================

function toggleAuthMode() {
    isSignupMode = !isSignupMode;
    
    const signupFields = document.getElementById('signup-fields');
    const subtitle = document.getElementById('auth-subtitle');
    const btnText = document.getElementById('auth-btn-text');
    const switchText = document.getElementById('auth-switch-text');
    const switchLink = document.getElementById('auth-switch-link');
    
    if (isSignupMode) {
        signupFields.classList.remove('hidden');
        subtitle.textContent = 'Créez votre compte';
        btnText.textContent = 'S\'inscrire';
        switchText.textContent = 'Déjà un compte ?';
        switchLink.textContent = 'Se connecter';
    } else {
        signupFields.classList.add('hidden');
        subtitle.textContent = 'Bon retour parmi nous';
        btnText.textContent = 'Se connecter';
        switchText.textContent = 'Pas encore de compte ?';
        switchLink.textContent = 'S\'inscrire';
    }
}

document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const firstname = document.getElementById('firstname').value.trim();
    const lastname = document.getElementById('lastname').value.trim();

    if (!email || !password) {
        showAlert('Veuillez remplir tous les champs', 'error');
        return;
    }

    if (isSignupMode && (!firstname || !lastname)) {
        showAlert('Prénom et nom requis pour l\'inscription', 'error');
        return;
    }

    try {
        if (isSignupMode) {
            // Inscription
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        firstname,
                        lastname
                    }
                }
            });

            if (error) throw error;

            showAlert('Inscription réussie ! Vérifiez votre email pour confirmer votre compte.', 'success');
            
            // Basculer vers connexion après 2s
            setTimeout(() => toggleAuthMode(), 2000);
        } else {
            // Connexion
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            await loadUserData(data.user);
            showApp();
        }
    } catch (error) {
        console.error('Erreur auth:', error);
        showAlert(error.message || 'Erreur lors de l\'authentification', 'error');
    }
});

// CORRECTION: Charger ou créer profil utilisateur
async function loadUserData(authUser) {
    try {
        // Tentative de récupération du profil
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        // Si profil inexistant, le créer
        if (!data) {
            console.log('Profil inexistant, création...');
            
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                    id: authUser.id,
                    email: authUser.email,
                    firstname: authUser.user_metadata?.firstname || 'Utilisateur',
                    lastname: authUser.user_metadata?.lastname || '',
                    role: 'user',
                    activated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (createError) {
                console.error('Erreur création profil:', createError);
                throw createError;
            }

            currentUser = newUser;
            showAlert('Profil créé avec succès !', 'success');
        } else {
            currentUser = data;
        }

        // Mettre à jour l'interface
        updateUIWithUser();

        // Charger les données
        await loadConversations();
        await loadPosts();

        // Auto-charger première conversation pour users
        if (currentUser.role !== 'admin') {
            await autoLoadOrCreateConversation();
        }

        // S'abonner aux changements temps réel
        subscribeToRealtime();

    } catch (error) {
        console.error('Erreur chargement utilisateur:', error);
        showAlert('Erreur lors du chargement du profil', 'error');
        
        // En cas d'échec critique, déconnecter
        await supabase.auth.signOut();
    }
}

function updateUIWithUser() {
    if (!currentUser) return;

    // Afficher nom et initiales
    document.getElementById('user-display-name').textContent = 
        `${currentUser.firstname} ${currentUser.lastname}`;
    
    // Badge de rôle
    const badge = document.getElementById('user-badge');
    if (currentUser.role === 'admin') {
        badge.textContent = 'Admin';
        badge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700';
        document.getElementById('admin-tab-btn').classList.remove('hidden');
    } else {
        badge.textContent = 'Utilisateur';
        badge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700';
    }
}

async function logout() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        await supabase.auth.signOut();
        window.location.reload();
    }
}

function showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
}

function showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
}

// Auto-chargement conversation pour utilisateurs
async function autoLoadOrCreateConversation() {
    try {
        // Vérifier si conversation existe
        const { data: existingConv } = await supabase
            .from('conversations')
            .select('id')
            .eq('user_id', currentUser.id)
            .limit(1)
            .maybeSingle();

        if (existingConv) {
            await loadConversation(existingConv.id);
        } else {
            // Créer conversation avec premier admin
            const { data: firstAdmin } = await supabase
                .from('users')
                .select('id, firstname, lastname')
                .eq('role', 'admin')
                .limit(1)
                .maybeSingle();

            if (firstAdmin) {
                const { data: newConvId, error } = await supabase.rpc('fn_get_or_create_admin_conversation', {
                    p_user_id: currentUser.id,
                    p_admin_id: firstAdmin.id
                });

                if (!error && newConvId) {
                    await loadConversation(newConvId);
                    await loadConversations();
                }
            } else {
                console.log('Aucun admin disponible');
            }
        }
    } catch (error) {
        console.error('Erreur auto-load conversation:', error);
    }
      }
