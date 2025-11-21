// =====================================================================
// CONFIGURATION GLOBALE
// =====================================================================

const CONFIG = {
    SUPABASE_URL: 'https://kqctjqnsqbgdafbnjyvb.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxY3RqcW5zcWJnZGFmYm5qeXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MzcwNzMsImV4cCI6MjA3OTExMzA3M30.ML-jw1d9LzSvhCSRE3N4uPQFC2Vvwo8LykmIU-JmH2E',
    VAPID_PUBLIC_KEY: 'BIKf2Qo-ab-baBmT5yRVZEr2TwiWItFOrDXlX-xPfjVf0zBE2A3fHdd5xxftxrV_BNh95f2vShNriJX9-8nxdm8'
};

// Variables globales
let supabase;
let currentUser = null;
let currentConversation = null;
let messagesSubscription = null;
let conversationsSubscription = null;
let postsSubscription = null;
let isSignupMode = false;
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let recordingTimer = null;
