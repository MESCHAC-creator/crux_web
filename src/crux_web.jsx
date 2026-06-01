import { AuthService, MeetingService } from './services/LocalStorageService';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';

// ============================================
// THÈME & LANGUES
// ============================================
const THEMES = {
    dark: {
        primary: '#2D8CFF',
        primaryDark: '#1E5FA8',
        secondary: '#0F1419',
        background: '#0A0E17',
        surface: '#141B28',
        accent: '#00D9FF',
        text: '#FFFFFF',
        textSecondary: '#B0B8C1',
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        card: '#1A2235',
        border: 'rgba(45,140,255,0.15)',
    },
    light: {
        primary: '#2D8CFF',
        primaryDark: '#1E5FA8',
        secondary: '#F3F4F6',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        accent: '#0EA5E9',
        text: '#111827',
        textSecondary: '#6B7280',
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        card: '#FFFFFF',
        border: 'rgba(45,140,255,0.2)',
    },
};

const TRANSLATIONS = {
    fr: {
        welcome: 'Bienvenue',
        signIn: 'Se connecter',
        signUp: "S'inscrire",
        email: 'Email',
        password: 'Mot de passe',
        fullName: 'Nom complet',
        dashboard: 'Tableau de bord',
        instantMeeting: 'Réunion instant',
        scheduleMeeting: 'Planifier',
        joinByCode: 'Rejoindre',
        dialIn: 'Dial In',
        recentMeetings: 'Réunions récentes',
        noMeetings: 'Aucune réunion',
        settings: 'Paramètres',
        logout: 'Déconnexion',
        notifications: 'Notifications',
        darkMode: 'Mode sombre',
        language: 'Langue',
        videoQuality: 'Qualité vidéo',
        defaultMic: 'Micro activé par défaut',
        defaultCam: 'Caméra activée par défaut',
        about: 'À propos',
        support: 'Support',
        version: 'Version',
        waitingRoom: "Salle d'attente",
        waitingMessage: "En attente de l'hôte...",
        prepareDevices: 'Préparez vos appareils',
        leaveWaiting: "Quitter la salle d'attente",
        joinMeeting: 'Rejoindre la réunion',
        endMeeting: 'Terminer la réunion',
        confirmExit: 'Quitter la réunion ?',
        confirmExitMsg: 'Êtes-vous sûr de vouloir quitter cette réunion ?',
        cancel: 'Annuler',
        confirm: 'Confirmer',
        participants: 'Participants',
        enterCode: 'Entrer le code de réunion',
        create: 'Créer',
        meetingTitle: 'Titre de la réunion',
        meetingDesc: 'Description (optionnel)',
        low: 'Basse',
        medium: 'Moyenne',
        high: 'Haute',
        veryHigh: 'Très haute',
        tagline: 'Visioconférence Premium',
        continueGoogle: 'Continuer avec Google',
        showPassword: 'Afficher',
        hidePassword: 'Masquer',
        terms: 'En continuant, vous acceptez nos Conditions et Politique de confidentialité',
    },
    en: {
        welcome: 'Welcome',
        signIn: 'Sign In',
        signUp: 'Sign Up',
        email: 'Email',
        password: 'Password',
        fullName: 'Full Name',
        dashboard: 'Dashboard',
        instantMeeting: 'Instant Meeting',
        scheduleMeeting: 'Schedule',
        joinByCode: 'Join by Code',
        dialIn: 'Dial In',
        recentMeetings: 'Recent Meetings',
        noMeetings: 'No meetings yet',
        settings: 'Settings',
        logout: 'Logout',
        notifications: 'Notifications',
        darkMode: 'Dark Mode',
        language: 'Language',
        videoQuality: 'Video Quality',
        defaultMic: 'Microphone on by default',
        defaultCam: 'Camera on by default',
        about: 'About',
        support: 'Support',
        version: 'Version',
        waitingRoom: 'Waiting Room',
        waitingMessage: 'Waiting for host to admit you...',
        prepareDevices: 'Prepare Your Devices',
        leaveWaiting: 'Leave Waiting Room',
        joinMeeting: 'Join Meeting',
        endMeeting: 'End Meeting',
        confirmExit: 'Leave Meeting?',
        confirmExitMsg: 'Are you sure you want to leave this meeting?',
        cancel: 'Cancel',
        confirm: 'Confirm',
        participants: 'Participants',
        enterCode: 'Enter meeting code',
        create: 'Create',
        meetingTitle: 'Meeting Title',
        meetingDesc: 'Description (optional)',
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        veryHigh: 'Very High',
        tagline: 'Premium Video Conferencing',
        continueGoogle: 'Continue with Google',
        showPassword: 'Show',
        hidePassword: 'Hide',
        terms: 'By continuing, you agree to our Terms and Privacy Policy',
    },
    es: {
        welcome: 'Bienvenido',
        signIn: 'Iniciar sesión',
        signUp: 'Registrarse',
        email: 'Correo',
        password: 'Contraseña',
        fullName: 'Nombre completo',
        dashboard: 'Panel',
        instantMeeting: 'Reunión instantánea',
        scheduleMeeting: 'Programar',
        joinByCode: 'Unirse',
        dialIn: 'Llamar',
        recentMeetings: 'Reuniones recientes',
        noMeetings: 'Sin reuniones',
        settings: 'Configuración',
        logout: 'Cerrar sesión',
        notifications: 'Notificaciones',
        darkMode: 'Modo oscuro',
        language: 'Idioma',
        videoQuality: 'Calidad de video',
        defaultMic: 'Micrófono activo por defecto',
        defaultCam: 'Cámara activa por defecto',
        about: 'Acerca de',
        support: 'Soporte',
        version: 'Versión',
        waitingRoom: 'Sala de espera',
        waitingMessage: 'Esperando al anfitrión...',
        prepareDevices: 'Prepare sus dispositivos',
        leaveWaiting: 'Salir de sala de espera',
        joinMeeting: 'Unirse a reunión',
        endMeeting: 'Terminar reunión',
        confirmExit: '¿Salir de la reunión?',
        confirmExitMsg: '¿Seguro que quieres salir de esta reunión?',
        cancel: 'Cancelar',
        confirm: 'Confirmar',
        participants: 'Participantes',
        enterCode: 'Código de reunión',
        create: 'Crear',
        meetingTitle: 'Título de reunión',
        meetingDesc: 'Descripción (opcional)',
        low: 'Baja',
        medium: 'Media',
        high: 'Alta',
        veryHigh: 'Muy alta',
        tagline: 'Videoconferencia Premium',
        continueGoogle: 'Continuar con Google',
        showPassword: 'Mostrar',
        hidePassword: 'Ocultar',
        terms: 'Al continuar, aceptas nuestros Términos y Política de privacidad',
    },
    de: {
        welcome: 'Willkommen',
        signIn: 'Anmelden',
        signUp: 'Registrieren',
        email: 'E-Mail',
        password: 'Passwort',
        fullName: 'Vollständiger Name',
        dashboard: 'Dashboard',
        instantMeeting: 'Sofort-Meeting',
        scheduleMeeting: 'Planen',
        joinByCode: 'Beitreten',
        dialIn: 'Einwählen',
        recentMeetings: 'Letzte Meetings',
        noMeetings: 'Keine Meetings',
        settings: 'Einstellungen',
        logout: 'Abmelden',
        notifications: 'Benachrichtigungen',
        darkMode: 'Dunkelmodus',
        language: 'Sprache',
        videoQuality: 'Videoqualität',
        defaultMic: 'Mikrofon standardmäßig an',
        defaultCam: 'Kamera standardmäßig an',
        about: 'Über',
        support: 'Support',
        version: 'Version',
        waitingRoom: 'Warteraum',
        waitingMessage: 'Warte auf den Gastgeber...',
        prepareDevices: 'Geräte vorbereiten',
        leaveWaiting: 'Warteraum verlassen',
        joinMeeting: 'Meeting beitreten',
        endMeeting: 'Meeting beenden',
        confirmExit: 'Meeting verlassen?',
        confirmExitMsg: 'Möchtest du das Meeting wirklich verlassen?',
        cancel: 'Abbrechen',
        confirm: 'Bestätigen',
        participants: 'Teilnehmer',
        enterCode: 'Meeting-Code eingeben',
        create: 'Erstellen',
        meetingTitle: 'Meeting-Titel',
        meetingDesc: 'Beschreibung (optional)',
        low: 'Niedrig',
        medium: 'Mittel',
        high: 'Hoch',
        veryHigh: 'Sehr hoch',
        tagline: 'Premium-Videokonferenz',
        continueGoogle: 'Mit Google fortfahren',
        showPassword: 'Zeigen',
        hidePassword: 'Verbergen',
        terms: 'Durch Fortfahren akzeptierst du unsere Nutzungsbedingungen und Datenschutzrichtlinie',
    },
};

// ============================================
// PREFERENCES (localStorage)
// ============================================
function loadPrefs() {
    try {
        return JSON.parse(localStorage.getItem('crux_prefs') || '{}');
    } catch { return {}; }
}
function savePrefs(prefs) {
    localStorage.setItem('crux_prefs', JSON.stringify(prefs));
}

// ============================================
// APP PRINCIPALE
// ============================================
export default function CruxApp() {
    const [prefs, setPrefs] = useState(() => ({
        darkMode: true,
        language: 'fr',
        notifications: true,
        defaultMic: true,
        defaultCam: true,
        videoQuality: 'high',
        ...loadPrefs(),
    }));
    const T = TRANSLATIONS[prefs.language] || TRANSLATIONS.fr;
    const THEME = THEMES[prefs.darkMode ? 'dark' : 'light'];

    const updatePref = useCallback((key, value) => {
        setPrefs(prev => {
            const next = { ...prev, [key]: value };
            savePrefs(next);
            return next;
        });
    }, []);

    const [currentPage, setCurrentPage] = useState('landing');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentMeeting, setCurrentMeeting] = useState(null);
    const [waitingFor, setWaitingFor] = useState(null);

    useEffect(() => {
        const unsub = AuthService.onAuthStateChanged((authUser) => {
            setUser(authUser);
            setCurrentPage(authUser ? 'dashboard' : 'landing');
            setLoading(false);
        });
        return unsub;
    }, []);

    // Inject global styles
    useEffect(() => {
        const id = 'crux-global-styles';
        let el = document.getElementById(id);
        if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el); }
        el.textContent = getGlobalStyles(THEME);
    }, [THEME]);

    if (loading) {
        return (
            <div style={{ ...getAppStyle(THEME), display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎥</div>
                    <h2 style={{ color: THEME.primary }}>CRUX</h2>
                    <p style={{ color: THEME.textSecondary, marginTop: '8px' }}>Chargement...</p>
                </div>
            </div>
        );
    }

    const handleLogout = async () => {
        await AuthService.logout().catch(() => {});
        setUser(null);
        setCurrentMeeting(null);
        setWaitingFor(null);
        setCurrentPage('landing');
    };

    const goToMeeting = (meeting) => {
        setWaitingFor(meeting);
    };

    const enterMeeting = (meeting) => {
        setWaitingFor(null);
        setCurrentMeeting(meeting);
    };

    const exitMeeting = () => {
        setCurrentMeeting(null);
        setCurrentPage('dashboard');
    };

    return (
        <div style={getAppStyle(THEME)}>
            {/* Navbar — masquée en réunion ou salle d'attente */}
            {user && !currentMeeting && !waitingFor && (
                <Navigation
                    user={user}
                    onLogout={handleLogout}
                    onSettings={() => setCurrentPage('settings')}
                    onDashboard={() => setCurrentPage('dashboard')}
                    THEME={THEME}
                    T={T}
                    prefs={prefs}
                />
            )}

            {/* PAGES NON AUTHENTIFIÉES */}
            {!user && (
                <>
                    {currentPage === 'landing' && (
                        <LandingPage
                            onLoginClick={() => setCurrentPage('auth')}
                            THEME={THEME}
                            T={T}
                        />
                    )}
                    {currentPage === 'auth' && (
                        <AuthPage
                            onSuccess={(userData) => { setUser(userData); setCurrentPage('dashboard'); }}
                            THEME={THEME}
                            T={T}
                        />
                    )}
                </>
            )}

            {/* PAGES AUTHENTIFIÉES */}
            {user && !currentMeeting && !waitingFor && (
                <>
                    {currentPage === 'dashboard' && (
                        <Dashboard
                            user={user}
                            onJoinMeeting={goToMeeting}
                            THEME={THEME}
                            T={T}
                        />
                    )}
                    {currentPage === 'settings' && (
                        <SettingsPage
                            prefs={prefs}
                            onUpdatePref={updatePref}
                            onBack={() => setCurrentPage('dashboard')}
                            THEME={THEME}
                            T={T}
                        />
                    )}
                </>
            )}

            {/* SALLE D'ATTENTE */}
            {user && waitingFor && !currentMeeting && (
                <WaitingRoom
                    meeting={waitingFor}
                    user={user}
                    prefs={prefs}
                    onEnter={() => enterMeeting(waitingFor)}
                    onLeave={() => setWaitingFor(null)}
                    THEME={THEME}
                    T={T}
                />
            )}

            {/* RÉUNION */}
            {user && currentMeeting && (
                <MeetingRoom
                    meeting={currentMeeting}
                    user={user}
                    onExit={exitMeeting}
                    THEME={THEME}
                    T={T}
                />
            )}
        </div>
    );
}

// ============================================
// NAVIGATION
// ============================================
function Navigation({ user, onLogout, onSettings, onDashboard, THEME, T, prefs }) {
    const [showNotif, setShowNotif] = useState(false);

    return (
        <nav style={{
            position: 'fixed', top: 0, left: 0, right: 0, height: '60px',
            background: THEME.surface, borderBottom: `1px solid ${THEME.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0 32px', zIndex: 1000, backdropFilter: 'blur(10px)',
        }}>
            <div
                onClick={onDashboard}
                style={{ fontSize: '22px', fontWeight: '900', color: THEME.primary, letterSpacing: '2px', cursor: 'pointer' }}
            >
                CRUX
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: THEME.textSecondary, marginRight: '8px' }}>{user.name}</span>

                {/* Notifications */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowNotif(!showNotif)}
                        style={iconBtnStyle(THEME)}
                        title={T.notifications}
                    >
                        🔔
                        {prefs.notifications && (
                            <span style={{
                                position: 'absolute', top: '4px', right: '4px',
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: THEME.danger, border: `2px solid ${THEME.surface}`,
                            }} />
                        )}
                    </button>
                    {showNotif && (
                        <div style={{
                            position: 'absolute', top: '44px', right: 0,
                            background: THEME.surface, border: `1px solid ${THEME.border}`,
                            borderRadius: '12px', padding: '16px', width: '280px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 200,
                        }}>
                            <p style={{ fontSize: '13px', fontWeight: '700', color: THEME.text, marginBottom: '12px' }}>
                                {T.notifications}
                            </p>
                            <p style={{ fontSize: '12px', color: THEME.textSecondary, textAlign: 'center', padding: '20px 0' }}>
                                📭 Aucune nouvelle notification
                            </p>
                        </div>
                    )}
                </div>

                {/* Settings */}
                <button onClick={onSettings} style={iconBtnStyle(THEME)} title={T.settings}>⚙️</button>

                {/* Logout */}
                <button
                    onClick={onLogout}
                    style={{
                        padding: '7px 16px', background: THEME.primary, color: 'white',
                        border: 'none', borderRadius: '8px', cursor: 'pointer',
                        fontSize: '13px', fontWeight: '600',
                    }}
                >
                    {T.logout}
                </button>
            </div>
        </nav>
    );
}

// ============================================
// LANDING PAGE
// ============================================
function LandingPage({ onLoginClick, THEME, T }) {
    return (
        <div>
            <section style={{
                position: 'relative', height: '100vh', display: 'flex',
                alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                background: `linear-gradient(135deg, ${THEME.background} 0%, ${THEME.surface} 100%)`,
            }}>
                <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: '640px', padding: '0 24px' }}>
                    <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎥</div>
                    <h1 style={{
                        fontSize: '80px', fontWeight: '900', margin: '0 0 8px 0',
                        background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.accent})`,
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    }}>
                        CRUX
                    </h1>
                    <p style={{ fontSize: '20px', color: THEME.primary, fontWeight: '600', marginBottom: '16px' }}>
                        {T.tagline}
                    </p>
                    <p style={{ fontSize: '16px', color: THEME.textSecondary, marginBottom: '48px', lineHeight: '1.7' }}>
                        Connectez-vous, collaborez et créez avec des réunions en temps réel,<br />
                        partage d'écran, chat intégré et bien plus encore.
                    </p>
                    <button
                        onClick={onLoginClick}
                        style={{
                            padding: '16px 48px', background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.accent})`,
                            color: 'white', border: 'none', borderRadius: '50px', fontSize: '18px',
                            fontWeight: '700', cursor: 'pointer', boxShadow: `0 8px 32px ${THEME.primary}40`,
                        }}
                    >
                        Commencer gratuitement →
                    </button>
                </div>

                {/* Blobs animés */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
                    {[
                        { w: 400, h: 400, top: '-100px', right: '-100px', color: THEME.primary, dur: '8s' },
                        { w: 300, h: 300, bottom: '-50px', left: '-50px', color: THEME.accent, dur: '10s', delay: '2s' },
                        { w: 250, h: 250, top: '40%', left: '20%', color: THEME.primary, dur: '12s', delay: '4s' },
                    ].map((b, i) => (
                        <div key={i} style={{
                            position: 'absolute', width: b.w, height: b.h, borderRadius: '50%',
                            background: `radial-gradient(circle, ${b.color}20 0%, transparent 70%)`,
                            top: b.top, bottom: b.bottom, left: b.left, right: b.right,
                            animation: `blob ${b.dur} infinite ${b.delay || ''}`,
                        }} />
                    ))}
                </div>
            </section>

            {/* Features */}
            <section style={{ padding: '100px 40px', background: THEME.secondary }}>
                <h2 style={{ fontSize: '42px', fontWeight: '800', textAlign: 'center', color: THEME.text, marginBottom: '60px' }}>
                    Fonctionnalités Premium
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
                    {[
                        { icon: '🎥', title: 'Vidéo HD', desc: 'Qualité cristalline avec compression intelligente' },
                        { icon: '🎤', title: 'Audio Clair', desc: 'Suppression de bruit avancée' },
                        { icon: '🖥️', title: 'Partage écran', desc: 'Partagez votre écran en HD' },
                        { icon: '💬', title: 'Chat temps réel', desc: 'Communiquez pendant la réunion' },
                        { icon: '⏱️', title: 'Salle d\'attente', desc: 'Contrôlez les accès à vos réunions' },
                        { icon: '🌍', title: 'Multilingue', desc: 'FR, EN, ES, DE disponibles' },
                    ].map((f, i) => (
                        <div key={i} style={{
                            background: THEME.surface, padding: '36px 28px', borderRadius: '16px',
                            border: `1px solid ${THEME.border}`, textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '44px', marginBottom: '16px' }}>{f.icon}</div>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: THEME.text, marginBottom: '8px' }}>{f.title}</h3>
                            <p style={{ fontSize: '14px', color: THEME.textSecondary, lineHeight: '1.6' }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section style={{ padding: '80px 40px', textAlign: 'center', background: `linear-gradient(135deg, ${THEME.primary}15, ${THEME.accent}10)` }}>
                <h2 style={{ fontSize: '36px', fontWeight: '800', color: THEME.text, marginBottom: '24px' }}>Prêt à collaborer ?</h2>
                <button
                    onClick={onLoginClick}
                    style={{
                        padding: '14px 40px', background: THEME.primary, color: 'white',
                        border: 'none', borderRadius: '50px', fontSize: '16px', fontWeight: '700', cursor: 'pointer',
                    }}
                >
                    S'inscrire gratuitement
                </button>
            </section>
        </div>
    );
}

// ============================================
// AUTH PAGE (Sign In / Sign Up unifié)
// ============================================
function AuthPage({ onSuccess, THEME, T }) {
    const [mode, setMode] = useState('signIn');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            let user;
            if (mode === 'signUp') {
                if (!name) { setError('Le nom est requis'); setLoading(false); return; }
                if (password.length < 6) { setError('6 caractères minimum'); setLoading(false); return; }
                user = await AuthService.register(email, password, name);
            } else {
                user = await AuthService.login(email, password);
            }
            onSuccess(user);
        } catch (err) {
            setError(err.message || 'Erreur');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '100vh', background: `linear-gradient(135deg, ${THEME.background}, ${THEME.surface})`,
            padding: '24px',
        }}>
            <div style={{
                background: THEME.surface, padding: '48px 40px', borderRadius: '20px',
                border: `1px solid ${THEME.border}`, width: '100%', maxWidth: '420px',
                boxShadow: `0 24px 64px rgba(0,0,0,0.2)`,
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '8px' }}>🎥</div>
                    <h1 style={{ fontSize: '32px', fontWeight: '900', color: THEME.primary, letterSpacing: '2px', margin: 0 }}>CRUX</h1>
                    <p style={{ color: THEME.textSecondary, fontSize: '14px', marginTop: '4px' }}>{T.tagline}</p>
                </div>

                {/* Toggle Sign In / Sign Up */}
                <div style={{
                    display: 'flex', background: THEME.background, borderRadius: '12px',
                    padding: '4px', marginBottom: '28px',
                }}>
                    {['signIn', 'signUp'].map(m => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); setError(''); }}
                            style={{
                                flex: 1, padding: '10px', border: 'none', borderRadius: '10px', cursor: 'pointer',
                                fontWeight: '600', fontSize: '14px', transition: 'all 0.2s',
                                background: mode === m ? THEME.primary : 'transparent',
                                color: mode === m ? 'white' : THEME.textSecondary,
                            }}
                        >
                            {m === 'signIn' ? T.signIn : T.signUp}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {mode === 'signUp' && (
                        <div style={{ position: 'relative' }}>
                            <span style={inputIconStyle}>👤</span>
                            <input
                                type="text" placeholder={T.fullName} value={name}
                                onChange={e => setName(e.target.value)} required
                                style={inputStyle(THEME)}
                            />
                        </div>
                    )}
                    <div style={{ position: 'relative' }}>
                        <span style={inputIconStyle}>✉️</span>
                        <input
                            type="email" placeholder={T.email} value={email}
                            onChange={e => setEmail(e.target.value)} required
                            style={inputStyle(THEME)}
                        />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <span style={inputIconStyle}>🔒</span>
                        <input
                            type={showPass ? 'text' : 'password'} placeholder={T.password} value={password}
                            onChange={e => setPassword(e.target.value)} required
                            style={{ ...inputStyle(THEME), paddingRight: '70px' }}
                        />
                        <button
                            type="button" onClick={() => setShowPass(!showPass)}
                            style={{
                                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', color: THEME.primary, cursor: 'pointer',
                                fontSize: '12px', fontWeight: '600',
                            }}
                        >
                            {showPass ? T.hidePassword : T.showPassword}
                        </button>
                    </div>

                    {error && (
                        <div style={{
                            background: `${THEME.danger}15`, border: `1px solid ${THEME.danger}40`,
                            color: THEME.danger, borderRadius: '8px', padding: '10px 14px', fontSize: '13px',
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        type="submit" disabled={loading}
                        style={{
                            padding: '14px', background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.accent})`,
                            color: 'white', border: 'none', borderRadius: '12px',
                            fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1, marginTop: '4px',
                        }}
                    >
                        {loading ? '...' : (mode === 'signIn' ? T.signIn : T.signUp)}
                    </button>
                </form>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: THEME.border }} />
                    <span style={{ fontSize: '12px', color: THEME.textSecondary }}>ou</span>
                    <div style={{ flex: 1, height: '1px', background: THEME.border }} />
                </div>

                {/* Google Button */}
                <button
                    onClick={() => setError("Google Sign-In non configuré dans cette démo")}
                    style={{
                        width: '100%', padding: '12px', background: THEME.background,
                        color: THEME.text, border: `1px solid ${THEME.border}`, borderRadius: '12px',
                        fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', gap: '10px',
                    }}
                >
                    <span style={{ fontSize: '18px' }}>G</span>
                    {T.continueGoogle}
                </button>

                {/* Terms */}
                <p style={{ fontSize: '11px', color: THEME.textSecondary, textAlign: 'center', marginTop: '20px', lineHeight: '1.5' }}>
                    {T.terms}
                </p>
            </div>
        </div>
    );
}

// ============================================
// DASHBOARD
// ============================================
function Dashboard({ user, onJoinMeeting, THEME, T }) {
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSchedule, setShowSchedule] = useState(false);
    const [showJoinCode, setShowJoinCode] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadMeetings();
    }, [user.uid]);

    const loadMeetings = async () => {
        setLoading(true);
        try {
            const list = await MeetingService.getUserMeetings(user.uid);
            setMeetings(list);
        } catch { } finally { setLoading(false); }
    };

    const startInstant = async () => {
        setCreating(true);
        try {
            const meeting = await MeetingService.createMeeting(
                `Réunion de ${user.name}`, user.uid, user.name, 'temporary'
            );
            setMeetings(prev => [meeting, ...prev]);
            onJoinMeeting(meeting);
        } catch (e) { alert('Erreur: ' + e.message); }
        finally { setCreating(false); }
    };

    const createScheduled = async () => {
        if (!newTitle.trim()) return;
        setCreating(true);
        try {
            const meeting = await MeetingService.createMeeting(newTitle, user.uid, user.name, 'persistent', newDesc);
            setMeetings(prev => [meeting, ...prev]);
            setNewTitle(''); setNewDesc(''); setShowSchedule(false);
        } catch (e) { alert('Erreur: ' + e.message); }
        finally { setCreating(false); }
    };

    const joinByCode = async () => {
        if (!joinCode.trim()) return;
        try {
            const all = JSON.parse(localStorage.getItem('crux_meetings') || '[]');
            const found = all.find(m => m.id === joinCode.trim() || m.roomId === joinCode.trim());
            if (!found) { alert('Réunion introuvable avec ce code'); return; }
            await MeetingService.joinMeeting(found.id, user.uid);
            onJoinMeeting({ ...found, createdAt: new Date(found.createdAt) });
            setJoinCode(''); setShowJoinCode(false);
        } catch (e) { alert('Erreur: ' + e.message); }
    };

    const quickActions = [
        {
            icon: '⚡', label: T.instantMeeting, color: '#FF6B35',
            bg: 'linear-gradient(135deg, #FF6B3520, #FF6B3510)',
            border: '#FF6B3540',
            action: startInstant,
        },
        {
            icon: '📅', label: T.scheduleMeeting, color: THEME.primary,
            bg: `linear-gradient(135deg, ${THEME.primary}20, ${THEME.primary}10)`,
            border: `${THEME.primary}40`,
            action: () => setShowSchedule(true),
        },
        {
            icon: '🔗', label: T.joinByCode, color: '#F59E0B',
            bg: 'linear-gradient(135deg, #F59E0B20, #F59E0B10)',
            border: '#F59E0B40',
            action: () => setShowJoinCode(true),
        },
        {
            icon: '📞', label: T.dialIn, color: THEME.success,
            bg: `linear-gradient(135deg, ${THEME.success}20, ${THEME.success}10)`,
            border: `${THEME.success}40`,
            action: () => alert('Dial In — Prochainement disponible'),
        },
    ];

    return (
        <div style={{ paddingTop: '80px', minHeight: '100vh', background: THEME.background }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 40px' }}>

                {/* Header */}
                <div style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '28px', fontWeight: '800', color: THEME.text, margin: 0 }}>
                        {T.welcome}, {user.name} 👋
                    </h2>
                    <p style={{ color: THEME.textSecondary, marginTop: '6px', fontSize: '15px' }}>
                        {T.dashboard}
                    </p>
                </div>

                {/* 4 Quick Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '48px' }}>
                    {quickActions.map((a, i) => (
                        <button
                            key={i}
                            onClick={a.action}
                            disabled={creating}
                            style={{
                                background: a.bg, border: `1px solid ${a.border}`,
                                borderRadius: '16px', padding: '28px 20px', cursor: 'pointer',
                                textAlign: 'center', transition: 'all 0.2s', color: THEME.text,
                            }}
                        >
                            <div style={{ fontSize: '36px', marginBottom: '12px' }}>{a.icon}</div>
                            <div style={{ fontWeight: '700', fontSize: '14px', color: a.color }}>{a.label}</div>
                        </button>
                    ))}
                </div>

                {/* Recent meetings */}
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: THEME.text, marginBottom: '20px' }}>
                        {T.recentMeetings} ({meetings.length})
                    </h3>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: THEME.textSecondary }}>
                            ⏳ Chargement...
                        </div>
                    ) : meetings.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '60px 24px', background: THEME.surface,
                            borderRadius: '16px', border: `1px dashed ${THEME.border}`,
                        }}>
                            <div style={{ fontSize: '52px', marginBottom: '16px' }}>📅</div>
                            <p style={{ color: THEME.textSecondary }}>{T.noMeetings}</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                            {meetings.map(m => (
                                <MeetingCard
                                    key={m.id}
                                    meeting={m}
                                    onJoin={() => onJoinMeeting(m)}
                                    THEME={THEME}
                                    T={T}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Planifier */}
            {showSchedule && (
                <Modal onClose={() => setShowSchedule(false)} THEME={THEME}>
                    <h3 style={{ color: THEME.text, marginBottom: '20px' }}>📅 {T.scheduleMeeting}</h3>
                    <input
                        type="text" placeholder={T.meetingTitle} value={newTitle}
                        onChange={e => setNewTitle(e.target.value)} autoFocus
                        style={{ ...inputStyle(THEME), marginBottom: '12px' }}
                    />
                    <textarea
                        placeholder={T.meetingDesc} value={newDesc}
                        onChange={e => setNewDesc(e.target.value)}
                        rows={3}
                        style={{ ...inputStyle(THEME), resize: 'vertical', marginBottom: '20px' }}
                    />
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={createScheduled} disabled={creating || !newTitle.trim()} style={primaryBtn(THEME)}>
                            {creating ? '...' : T.create}
                        </button>
                        <button onClick={() => setShowSchedule(false)} style={secondaryBtn(THEME)}>
                            {T.cancel}
                        </button>
                    </div>
                </Modal>
            )}

            {/* Modal: Rejoindre par code */}
            {showJoinCode && (
                <Modal onClose={() => setShowJoinCode(false)} THEME={THEME}>
                    <h3 style={{ color: THEME.text, marginBottom: '20px' }}>🔗 {T.joinByCode}</h3>
                    <input
                        type="text" placeholder={T.enterCode} value={joinCode}
                        onChange={e => setJoinCode(e.target.value)} autoFocus
                        style={{ ...inputStyle(THEME), marginBottom: '20px' }}
                        onKeyDown={e => e.key === 'Enter' && joinByCode()}
                    />
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={joinByCode} disabled={!joinCode.trim()} style={primaryBtn(THEME)}>
                            {T.joinMeeting}
                        </button>
                        <button onClick={() => setShowJoinCode(false)} style={secondaryBtn(THEME)}>
                            {T.cancel}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ============================================
// MEETING CARD
// ============================================
function MeetingCard({ meeting, onJoin, THEME, T }) {
    const ago = Math.floor((Date.now() - meeting.createdAt) / 60000);
    return (
        <div style={{
            background: THEME.surface, padding: '20px', borderRadius: '16px',
            border: `1px solid ${THEME.border}`,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                <h4 style={{ color: THEME.text, margin: 0, fontSize: '15px', fontWeight: '700' }}>{meeting.title}</h4>
                <span style={{
                    fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px',
                    background: meeting.type === 'persistent' ? `${THEME.primary}20` : `${THEME.warning}20`,
                    color: meeting.type === 'persistent' ? THEME.primary : THEME.warning,
                }}>
                    {meeting.type === 'persistent' ? '📌' : '⏱️'} {meeting.type === 'persistent' ? 'Persistante' : 'Temporaire'}
                </span>
            </div>
            {meeting.description && (
                <p style={{ fontSize: '13px', color: THEME.textSecondary, margin: '0 0 10px', lineHeight: '1.4' }}>
                    {meeting.description}
                </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <span style={{ fontSize: '12px', color: THEME.textSecondary }}>
                    👥 {meeting.participantCount || 1} • {ago > 0 ? `${ago}min` : "À l'instant"}
                </span>
                <button onClick={onJoin} style={{
                    padding: '8px 16px', background: THEME.primary, color: 'white',
                    border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                }}>
                    {T.joinMeeting}
                </button>
            </div>
        </div>
    );
}

// ============================================
// SALLE D'ATTENTE
// ============================================
function WaitingRoom({ meeting, user, prefs, onEnter, onLeave, THEME, T }) {
    const [micOn, setMicOn] = useState(prefs.defaultMic);
    const [camOn, setCamOn] = useState(prefs.defaultCam);
    const [pulse, setPulse] = useState(1);

    useEffect(() => {
        const interval = setInterval(() => setPulse(p => p === 1 ? 1.08 : 1), 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{
            minHeight: '100vh', background: THEME.background,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
            <div style={{
                background: THEME.surface, borderRadius: '24px', padding: '48px 40px',
                maxWidth: '460px', width: '100%', border: `1px solid ${THEME.border}`,
                textAlign: 'center', boxShadow: `0 24px 64px rgba(0,0,0,0.3)`,
            }}>
                {/* Icône animée */}
                <div style={{
                    width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto 24px',
                    background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.accent})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '44px', transform: `scale(${pulse})`, transition: 'transform 1s ease',
                    boxShadow: `0 0 40px ${THEME.primary}40`,
                }}>
                    ⏳
                </div>

                <h2 style={{ fontSize: '24px', fontWeight: '800', color: THEME.text, margin: '0 0 8px' }}>
                    {T.waitingRoom}
                </h2>
                <p style={{ color: THEME.primary, fontWeight: '600', fontSize: '15px', marginBottom: '8px' }}>
                    {meeting.title}
                </p>
                <div style={{
                    background: `${THEME.primary}15`, border: `1px solid ${THEME.primary}30`,
                    borderRadius: '10px', padding: '12px 16px', marginBottom: '32px',
                }}>
                    <p style={{ color: THEME.textSecondary, fontSize: '14px', margin: 0 }}>
                        ℹ️ {T.waitingMessage}
                    </p>
                </div>

                {/* Contrôles appareils */}
                <div style={{
                    background: THEME.background, borderRadius: '16px', padding: '20px', marginBottom: '28px',
                    border: `1px solid ${THEME.border}`,
                }}>
                    <p style={{ fontWeight: '700', color: THEME.text, fontSize: '14px', marginBottom: '16px' }}>
                        {T.prepareDevices}
                    </p>
                    {[
                        { icon: '📹', label: 'Caméra', state: camOn, toggle: setCamOn },
                        { icon: '🎤', label: 'Microphone', state: micOn, toggle: setMicOn },
                    ].map((d, i) => (
                        <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px 0', borderTop: i > 0 ? `1px solid ${THEME.border}` : 'none',
                        }}>
                            <span style={{ color: THEME.text, fontSize: '14px' }}>{d.icon} {d.label}</span>
                            <ToggleSwitch on={d.state} onChange={d.toggle} color={THEME.success} />
                        </div>
                    ))}
                </div>

                <button
                    onClick={onEnter}
                    style={{
                        width: '100%', padding: '14px', background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.accent})`,
                        color: 'white', border: 'none', borderRadius: '12px',
                        fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginBottom: '12px',
                    }}
                >
                    {T.joinMeeting} →
                </button>
                <button
                    onClick={onLeave}
                    style={{
                        width: '100%', padding: '12px', background: 'transparent',
                        color: THEME.danger, border: `1px solid ${THEME.danger}40`,
                        borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                    }}
                >
                    {T.leaveWaiting}
                </button>
            </div>
        </div>
    );
}

// ============================================
// MEETING ROOM (ZegoUIKit)
// ============================================
function MeetingRoom({ meeting, user, onExit, THEME, T }) {
    const containerRef = useRef(null);
    const zpRef = useRef(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [participantCount, setParticipantCount] = useState(1);
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => setElapsed(e => e + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        const appID = parseInt(process.env.REACT_APP_ZEGO_APP_ID || '0');
        const serverSecret = process.env.REACT_APP_ZEGO_SERVER_SECRET || '';
        if (!appID || !serverSecret) return;

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
            appID, serverSecret, meeting.roomId, user.uid, user.name
        );
        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        zp.joinRoom({
            container: containerRef.current,
            scenario: { mode: ZegoUIKitPrebuilt.VideoConference },
            showScreenSharingButton: true,
            showPreJoinView: false,
            onUserCountOrListChanged: (list) => setParticipantCount(list.length + 1),
            onLeaveRoom: () => handleExit(),
        });

        return () => {
            if (zpRef.current) { try { zpRef.current.destroy(); } catch (_) {} zpRef.current = null; }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [meeting.roomId, user.uid]);

    const handleExit = async () => {
        try { await MeetingService.endMeeting(meeting.id, meeting.type); } catch (_) {}
        onExit();
    };

    const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
            {/* Header info */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
                padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: 'white', fontWeight: '700', fontSize: '15px' }}>
                        {meeting.title}
                    </span>
                    <span style={{
                        background: '#EF444490', color: 'white', fontSize: '11px',
                        fontWeight: '800', padding: '3px 8px', borderRadius: '6px', letterSpacing: '1px',
                    }}>
                        ⏺ REC
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: 'white', fontSize: '13px' }}>
                        👥 {participantCount} {T.participants}
                    </span>
                    <span style={{ color: '#B0B8C1', fontSize: '13px' }}>
                        🕐 {formatTime(elapsed)}
                    </span>
                    <button
                        onClick={() => setShowConfirm(true)}
                        style={{
                            padding: '7px 16px', background: '#EF4444', color: 'white',
                            border: 'none', borderRadius: '8px', fontSize: '13px',
                            fontWeight: '700', cursor: 'pointer',
                        }}
                    >
                        📞 {T.endMeeting}
                    </button>
                </div>
            </div>

            {/* Video container */}
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

            {/* Confirmation dialog */}
            {showConfirm && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
                }}>
                    <div style={{
                        background: THEME.surface, borderRadius: '20px', padding: '36px',
                        maxWidth: '380px', width: '90%', border: `1px solid ${THEME.border}`,
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📞</div>
                        <h3 style={{ color: THEME.text, marginBottom: '12px' }}>{T.confirmExit}</h3>
                        <p style={{ color: THEME.textSecondary, fontSize: '14px', marginBottom: '28px' }}>
                            {T.confirmExitMsg}
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setShowConfirm(false)} style={secondaryBtn(THEME)}>
                                {T.cancel}
                            </button>
                            <button
                                onClick={handleExit}
                                style={{ ...primaryBtn(THEME), background: '#EF4444' }}
                            >
                                {T.confirm}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// SETTINGS PAGE
// ============================================
function SettingsPage({ prefs, onUpdatePref, onBack, THEME, T }) {
    const qualities = ['low', 'medium', 'high', 'veryHigh'];
    const languages = [
        { code: 'fr', label: 'Français 🇫🇷' },
        { code: 'en', label: 'English 🇬🇧' },
        { code: 'es', label: 'Español 🇪🇸' },
        { code: 'de', label: 'Deutsch 🇩🇪' },
    ];

    return (
        <div style={{ paddingTop: '80px', minHeight: '100vh', background: THEME.background }}>
            <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 24px' }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '36px' }}>
                    <button onClick={onBack} style={{
                        background: THEME.surface, border: `1px solid ${THEME.border}`,
                        color: THEME.text, borderRadius: '10px', padding: '8px 14px',
                        cursor: 'pointer', fontSize: '14px',
                    }}>← Retour</button>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: THEME.text, margin: 0 }}>
                        ⚙️ {T.settings}
                    </h2>
                </div>

                {/* Réunion */}
                <SettingsSection title="🎥 Réunion" THEME={THEME}>
                    <SettingSelect
                        label={T.videoQuality} value={prefs.videoQuality}
                        options={qualities.map(q => ({ value: q, label: T[q] || q }))}
                        onChange={v => onUpdatePref('videoQuality', v)} THEME={THEME}
                    />
                    <SettingToggle label={T.defaultMic} value={prefs.defaultMic}
                        onChange={v => onUpdatePref('defaultMic', v)} THEME={THEME} />
                    <SettingToggle label={T.defaultCam} value={prefs.defaultCam}
                        onChange={v => onUpdatePref('defaultCam', v)} THEME={THEME} />
                </SettingsSection>

                {/* Général */}
                <SettingsSection title="🌐 Général" THEME={THEME}>
                    <SettingSelect
                        label={T.language} value={prefs.language}
                        options={languages.map(l => ({ value: l.code, label: l.label }))}
                        onChange={v => onUpdatePref('language', v)} THEME={THEME}
                    />
                    <SettingToggle label={T.notifications} value={prefs.notifications}
                        onChange={v => onUpdatePref('notifications', v)} THEME={THEME} />
                    <SettingToggle label={T.darkMode} value={prefs.darkMode}
                        onChange={v => onUpdatePref('darkMode', v)} THEME={THEME} />
                </SettingsSection>

                {/* À propos */}
                <SettingsSection title="ℹ️ À propos" THEME={THEME}>
                    <div style={settingRowStyle(THEME)}>
                        <span style={{ color: THEME.text }}>{T.version}</span>
                        <span style={{ color: THEME.textSecondary }}>1.0.0 (build 1)</span>
                    </div>
                    <div style={settingRowStyle(THEME)}>
                        <span style={{ color: THEME.text }}>Équipe</span>
                        <span style={{ color: THEME.textSecondary }}>CRUX Team</span>
                    </div>
                </SettingsSection>

                {/* Support */}
                <SettingsSection title="💬 Support" THEME={THEME}>
                    <button
                        onClick={() => alert('📧 Email: support@crux.app')}
                        style={{ ...primaryBtn(THEME), marginBottom: '8px' }}
                    >
                        📧 Contacter le support
                    </button>
                    <button
                        onClick={() => navigator.share?.({ title: 'CRUX', text: 'Essaie CRUX — Visioconférence Premium!' }).catch(() => alert('Partagez : https://cruxweb.netlify.app'))}
                        style={secondaryBtn(THEME)}
                    >
                        🔗 Partager CRUX
                    </button>
                </SettingsSection>
            </div>
        </div>
    );
}

// ============================================
// COMPOSANTS UTILITAIRES
// ============================================
function Modal({ children, onClose, THEME }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: '24px',
        }}
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div style={{
                background: THEME.surface, borderRadius: '20px', padding: '36px',
                maxWidth: '440px', width: '100%', border: `1px solid ${THEME.border}`,
            }}>
                {children}
            </div>
        </div>
    );
}

function ToggleSwitch({ on, onChange, color }) {
    return (
        <div
            onClick={() => onChange(!on)}
            style={{
                width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer',
                background: on ? color : '#4B5563', position: 'relative', transition: 'background 0.2s',
                flexShrink: 0,
            }}
        >
            <div style={{
                position: 'absolute', top: '3px', left: on ? '23px' : '3px',
                width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
        </div>
    );
}

function SettingsSection({ title, children, THEME }) {
    return (
        <div style={{
            background: THEME.surface, borderRadius: '16px', padding: '24px',
            border: `1px solid ${THEME.border}`, marginBottom: '16px',
        }}>
            <h4 style={{ color: THEME.text, fontWeight: '700', fontSize: '15px', marginBottom: '16px' }}>
                {title}
            </h4>
            {children}
        </div>
    );
}

function SettingToggle({ label, value, onChange, THEME }) {
    return (
        <div style={settingRowStyle(THEME)}>
            <span style={{ color: THEME.text, fontSize: '14px' }}>{label}</span>
            <ToggleSwitch on={value} onChange={onChange} color={THEME.primary} />
        </div>
    );
}

function SettingSelect({ label, value, options, onChange, THEME }) {
    return (
        <div style={{ ...settingRowStyle(THEME), flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ color: THEME.text, fontSize: '14px' }}>{label}</span>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{
                    background: THEME.background, color: THEME.text,
                    border: `1px solid ${THEME.border}`, borderRadius: '8px',
                    padding: '6px 12px', fontSize: '13px', cursor: 'pointer',
                }}
            >
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );
}

// ============================================
// STYLES HELPERS
// ============================================
const inputIconStyle = {
    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
    fontSize: '16px', pointerEvents: 'none',
};

const inputStyle = (THEME) => ({
    width: '100%', padding: '12px 14px 12px 42px', boxSizing: 'border-box',
    background: THEME.background, border: `1px solid ${THEME.border}`,
    borderRadius: '12px', color: THEME.text, fontSize: '14px', outline: 'none',
});

const primaryBtn = (THEME) => ({
    flex: 1, padding: '12px 20px', background: THEME.primary, color: 'white',
    border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700',
    cursor: 'pointer', width: '100%',
});

const secondaryBtn = (THEME) => ({
    flex: 1, padding: '12px 20px', background: 'transparent', color: THEME.primary,
    border: `2px solid ${THEME.primary}`, borderRadius: '12px', fontSize: '14px',
    fontWeight: '700', cursor: 'pointer', width: '100%',
});

const settingRowStyle = (THEME) => ({
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 0', borderTop: `1px solid ${THEME.border}`,
});

const iconBtnStyle = (THEME) => ({
    position: 'relative', width: '36px', height: '36px', borderRadius: '10px',
    background: THEME.background, border: `1px solid ${THEME.border}`,
    cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center',
    justifyContent: 'center',
});

const getAppStyle = (THEME) => ({
    fontFamily: '"Segoe UI", system-ui, sans-serif',
    background: THEME.background, color: THEME.text, minHeight: '100vh',
});

const getGlobalStyles = (THEME) => `
  @keyframes blob {
    0%, 100% { transform: scale(1) translate(0,0); }
    33% { transform: scale(1.1) translate(20px, -30px); }
    66% { transform: scale(0.9) translate(-15px, 15px); }
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { font-family: "Segoe UI", system-ui, sans-serif; background: ${THEME.background}; color: ${THEME.text}; }
  input, select, textarea { font-family: inherit; }
  button { font-family: inherit; }
  button:hover { opacity: 0.9; transform: translateY(-1px); transition: all 0.15s; }
  input:focus, select:focus, textarea:focus {
    border-color: ${THEME.primary} !important;
    box-shadow: 0 0 0 3px ${THEME.primary}20;
    outline: none;
  }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: ${THEME.surface}; }
  ::-webkit-scrollbar-thumb { background: ${THEME.primary}50; border-radius: 3px; }
`;
