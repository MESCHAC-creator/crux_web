import { AuthService, MeetingService } from './services/LocalStorageService';
import React, { useState, useEffect, useRef } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';

// ============================================
// COULEURS & THÈME
// ============================================
const THEME = {
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
};

// ============================================
// APP PRINCIPALE
// ============================================
export default function CruxApp() {
    const [currentPage, setCurrentPage] = useState('landing');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentMeeting, setCurrentMeeting] = useState(null);

    useEffect(() => {
        const unsubscribe = AuthService.onAuthStateChanged((authUser) => {
            setUser(authUser);
            setCurrentPage(authUser ? 'dashboard' : 'landing');
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    if (loading) {
        return (
            <div style={styles.app}>
                <div style={{ ...styles.authPage, alignItems: 'center', justifyContent: 'center' }}>
                    <h2 style={{ color: THEME.text }}>Chargement...</h2>
                </div>
            </div>
        );
    }

    const handleLogout = async () => {
        try {
            await AuthService.logout();
            setUser(null);
            setCurrentMeeting(null);
            setCurrentPage('landing');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <div style={styles.app}>
            {user && !currentMeeting && <Navigation user={user} onLogout={handleLogout} />}

            {!user ? (
                <>
                    {currentPage === 'landing' && (
                        <LandingPage onLoginClick={() => setCurrentPage('login')} />
                    )}
                    {currentPage === 'login' && (
                        <LoginPage
                            onSuccess={(userData) => {
                                setUser(userData);
                                setCurrentPage('dashboard');
                            }}
                            onRegisterClick={() => setCurrentPage('register')}
                        />
                    )}
                    {currentPage === 'register' && (
                        <RegisterPage
                            onSuccess={(userData) => {
                                setUser(userData);
                                setCurrentPage('dashboard');
                            }}
                            onLoginClick={() => setCurrentPage('login')}
                        />
                    )}
                </>
            ) : (
                <>
                    {!currentMeeting && (
                        <Dashboard
                            user={user}
                            onJoinMeeting={(meeting) => setCurrentMeeting(meeting)}
                        />
                    )}
                    {currentMeeting && (
                        <MeetingRoom
                            meeting={currentMeeting}
                            user={user}
                            onExit={() => setCurrentMeeting(null)}
                        />
                    )}
                </>
            )}
        </div>
    );
}

// ============================================
// LANDING PAGE
// ============================================
function LandingPage({ onLoginClick }) {
    return (
        <div style={styles.page}>
            {/* HERO */}
            <section style={styles.hero}>
                <div style={styles.heroContent}>
                    <h1 style={styles.heroTitle}>
                        CRUX
                        <span style={styles.subtitle}>Connectez-vous, collaborez, créez</span>
                    </h1>
                    <p style={styles.heroDescription}>
                        Plateforme de vidéoconférence moderne avec réunions en temps réel, partage d'écran, chat intégré et enregistrement
                    </p>
                    <button style={styles.primaryButton} onClick={onLoginClick}>
                        Commencer maintenant
                    </button>
                </div>

                <div style={styles.heroBackground}>
                    <div style={styles.blob1}></div>
                    <div style={styles.blob2}></div>
                    <div style={styles.blob3}></div>
                </div>
            </section>

            {/* FEATURES */}
            <section style={styles.features}>
                <h2 style={styles.sectionTitle}>Fonctionnalités Premium</h2>
                <div style={styles.featureGrid}>
                    <FeatureCard icon="🎥" title="Vidéo HD" description="Qualité vidéo cristalline avec compression intelligente" />
                    <FeatureCard icon="🎤" title="Audio Crystal Clear" description="Technologie audio avancée avec suppression de bruit" />
                    <FeatureCard icon="🖥️" title="Partage d'écran" description="Partagez votre écran en haute définition" />
                    <FeatureCard icon="💬" title="Chat Intégré" description="Communiquez via le chat en temps réel" />
                    <FeatureCard icon="📹" title="Enregistrement" description="Enregistrez vos réunions pour les consulter plus tard" />
                    <FeatureCard icon="✏️" title="Whiteboard" description="Tableau blanc collaboratif pour brainstorming" />
                </div>
            </section>

            {/* CTA */}
            <section style={styles.ctaSection}>
                <h2 style={{ fontSize: '36px', marginBottom: '24px', color: THEME.text }}>Prêt à collaborer ?</h2>
                <button style={styles.primaryButton} onClick={onLoginClick}>
                    S'inscrire Gratuitement
                </button>
            </section>
        </div>
    );
}

// ============================================
// LOGIN PAGE
// ============================================
function LoginPage({ onSuccess, onRegisterClick }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const user = await AuthService.login(email, password);
            onSuccess(user);
        } catch (err) {
            setError(err.message || 'Erreur de connexion');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.authPage}>
            <div style={styles.authContainer}>
                <h1 style={styles.authTitle}>CRUX</h1>
                <p style={styles.authSubtitle}>Connexion</p>

                <form onSubmit={handleLogin} style={styles.form}>
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required />
                    <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} required />
                    {error && <div style={styles.error}>{error}</div>}
                    <button type="submit" disabled={loading} style={{ ...styles.primaryButton, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                        {loading ? 'Connexion...' : 'Se connecter'}
                    </button>
                </form>

                <p style={styles.authToggle}>
                    Pas encore inscrit ?{' '}
                    <span onClick={onRegisterClick} style={{ color: THEME.primary, cursor: 'pointer', fontWeight: 'bold' }}>
                        S'inscrire
                    </span>
                </p>
            </div>
        </div>
    );
}

// ============================================
// REGISTER PAGE
// ============================================
function RegisterPage({ onSuccess, onLoginClick }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (!name || !email || !password || password.length < 6) {
                setError('Tous les champs sont requis (6 caractères minimum pour le mot de passe)');
                setLoading(false);
                return;
            }
            const user = await AuthService.register(email, password, name);
            onSuccess(user);
        } catch (err) {
            setError(err.message || "Erreur d'inscription");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.authPage}>
            <div style={styles.authContainer}>
                <h1 style={styles.authTitle}>CRUX</h1>
                <p style={styles.authSubtitle}>Inscription</p>

                <form onSubmit={handleRegister} style={styles.form}>
                    <input type="text" placeholder="Nom complet" value={name} onChange={e => setName(e.target.value)} style={styles.input} required />
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required />
                    <input type="password" placeholder="Mot de passe (6+ caractères)" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} required />
                    {error && <div style={styles.error}>{error}</div>}
                    <button type="submit" disabled={loading} style={{ ...styles.primaryButton, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                        {loading ? 'Inscription...' : "S'inscrire"}
                    </button>
                </form>

                <p style={styles.authToggle}>
                    Déjà inscrit ?{' '}
                    <span onClick={onLoginClick} style={{ color: THEME.primary, cursor: 'pointer', fontWeight: 'bold' }}>
                        Se connecter
                    </span>
                </p>
            </div>
        </div>
    );
}

// ============================================
// DASHBOARD
// ============================================
function Dashboard({ user, onJoinMeeting }) {
    const [newMeetingTitle, setNewMeetingTitle] = useState('');
    const [roomType, setRoomType] = useState('temporary');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [localMeetings, setLocalMeetings] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadMeetings = async () => {
            try {
                setLoading(true);
                const userMeetings = await MeetingService.getUserMeetings(user.uid);
                setLocalMeetings(userMeetings);
            } catch (error) {
                console.error('Error loading meetings:', error);
            } finally {
                setLoading(false);
            }
        };
        loadMeetings();
    }, [user.uid]);

    const createMeeting = async () => {
        if (!newMeetingTitle.trim()) return;
        try {
            setLoading(true);
            const meeting = await MeetingService.createMeeting(newMeetingTitle, user.uid, user.name, roomType);
            setLocalMeetings([meeting, ...localMeetings]);
            setNewMeetingTitle('');
            setShowCreateModal(false);
        } catch (error) {
            console.error('Error creating meeting:', error);
            alert('Erreur lors de la création de la réunion');
        } finally {
            setLoading(false);
        }
    };

    const joinMeeting = async (meeting) => {
        try {
            setLoading(true);
            await MeetingService.joinMeeting(meeting.id, user.uid);
            onJoinMeeting(meeting);
        } catch (error) {
            console.error('Error joining meeting:', error);
            alert('Erreur lors de la connexion à la réunion');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.dashboard}>
            <h2 style={styles.pageTitle}>Tableau de bord</h2>
            <p style={styles.pageSubtitle}>Bienvenue, {user.name} 👋</p>

            <div style={styles.actionButtons}>
                <button style={styles.primaryButton} onClick={() => setShowCreateModal(true)} disabled={loading}>
                    + Créer une réunion
                </button>
            </div>

            {showCreateModal && (
                <div style={styles.modal}>
                    <div style={styles.modalContent}>
                        <h3 style={{ color: THEME.text, marginBottom: '20px' }}>Créer une nouvelle réunion</h3>
                        <input
                            type="text"
                            placeholder="Titre de la réunion"
                            value={newMeetingTitle}
                            onChange={e => setNewMeetingTitle(e.target.value)}
                            style={styles.input}
                            autoFocus
                        />
                        <select value={roomType} onChange={e => setRoomType(e.target.value)} style={{ ...styles.input, marginTop: '12px' }}>
                            <option value="temporary">Temporaire</option>
                            <option value="persistent">Persistante</option>
                        </select>
                        <div style={styles.modalButtons}>
                            <button style={styles.primaryButton} onClick={createMeeting} disabled={loading || !newMeetingTitle.trim()}>
                                {loading ? 'Création...' : 'Créer'}
                            </button>
                            <button style={styles.secondaryButton} onClick={() => setShowCreateModal(false)}>
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={styles.meetingsSection}>
                <h3 style={styles.sectionSubtitle}>
                    {loading ? 'Chargement...' : `Mes réunions (${localMeetings.length})`}
                </h3>
                {localMeetings.length === 0 && !loading ? (
                    <div style={styles.emptyState}>
                        <p style={{ fontSize: '48px', marginBottom: '16px' }}>📅</p>
                        <p style={{ color: THEME.textSecondary }}>Aucune réunion. Créez votre première réunion !</p>
                    </div>
                ) : (
                    <div style={styles.meetingGrid}>
                        {localMeetings.map(meeting => (
                            <MeetingCard key={meeting.id} meeting={meeting} onJoin={joinMeeting} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// MEETING ROOM (ZegoUIKit)
// ============================================
function MeetingRoom({ meeting, user, onExit }) {
    const containerRef = useRef(null);
    const zpRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const appID = parseInt(process.env.REACT_APP_ZEGO_APP_ID);
        const serverSecret = process.env.REACT_APP_ZEGO_SERVER_SECRET;

        if (!appID || !serverSecret) {
            console.error('Missing Zego credentials in .env');
            return;
        }

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
            appID,
            serverSecret,
            meeting.roomId,
            user.uid,
            user.name
        );

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        zp.joinRoom({
            container: containerRef.current,
            scenario: {
                mode: ZegoUIKitPrebuilt.VideoConference,
            },
            showScreenSharingButton: true,
            showPreJoinView: false,
            onLeaveRoom: async () => {
                try {
                    await MeetingService.endMeeting(meeting.id, meeting.type);
                } catch (_) {}
                onExit();
            },
        });

        return () => {
            if (zpRef.current) {
                try { zpRef.current.destroy(); } catch (_) {}
                zpRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [meeting.roomId, user.uid]);

    return (
        <div style={{ width: '100vw', height: '100vh', background: THEME.background }}>
            <div
                ref={containerRef}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
}

// ============================================
// COMPONENTS
// ============================================
function Navigation({ user, onLogout }) {
    return (
        <nav style={styles.navbar}>
            <div style={styles.navBrand}>CRUX</div>
            <div style={styles.navRight}>
                <span style={styles.navUser}>{user.name}</span>
                <button style={styles.navLogout} onClick={onLogout}>
                    Déconnexion
                </button>
            </div>
        </nav>
    );
}

function FeatureCard({ icon, title, description }) {
    return (
        <div style={styles.featureCard}>
            <div style={styles.featureIcon}>{icon}</div>
            <h3 style={styles.featureTitle}>{title}</h3>
            <p style={styles.featureDescription}>{description}</p>
        </div>
    );
}

function MeetingCard({ meeting, onJoin }) {
    const timeAgo = Math.floor((Date.now() - meeting.createdAt) / 60000);
    return (
        <div style={styles.meetingCard}>
            <h4 style={{ color: THEME.text, marginBottom: '8px' }}>{meeting.title}</h4>
            <p style={styles.meetingType}>
                {meeting.type === 'persistent' ? '📌 Persistante' : '⏱️ Temporaire'}
            </p>
            <p style={styles.meetingInfo}>
                {timeAgo > 0 ? `${timeAgo} min` : "À l'instant"} • {meeting.participantCount || 1} participant{meeting.participantCount !== 1 ? 's' : ''}
            </p>
            <button style={styles.primaryButton} onClick={() => onJoin(meeting)}>
                Rejoindre
            </button>
        </div>
    );
}

// ============================================
// STYLES
// ============================================
const styles = {
    app: {
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        background: THEME.background,
        color: THEME.text,
        minHeight: '100vh',
    },
    page: {
        paddingTop: '0',
    },
    navbar: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: THEME.surface,
        borderBottom: `1px solid ${THEME.primary}20`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 40px',
        zIndex: 1000,
        backdropFilter: 'blur(10px)',
    },
    navBrand: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: THEME.primary,
        letterSpacing: '2px',
    },
    navRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
    },
    navUser: {
        fontSize: '14px',
        color: THEME.textSecondary,
    },
    navLogout: {
        padding: '8px 16px',
        background: THEME.primary,
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
    },
    hero: {
        position: 'relative',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${THEME.background} 0%, ${THEME.surface} 100%)`,
    },
    heroContent: {
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        maxWidth: '600px',
        padding: '0 20px',
    },
    heroTitle: {
        fontSize: '72px',
        fontWeight: '900',
        margin: '0 0 20px 0',
        background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.accent})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        letterSpacing: '-1px',
    },
    subtitle: {
        display: 'block',
        fontSize: '24px',
        fontWeight: '400',
        color: THEME.textSecondary,
        marginTop: '20px',
        letterSpacing: '0.5px',
        WebkitTextFillColor: THEME.textSecondary,
    },
    heroDescription: {
        fontSize: '18px',
        color: THEME.textSecondary,
        marginBottom: '40px',
        lineHeight: '1.6',
    },
    heroBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
    },
    blob1: {
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: `radial-gradient(circle, ${THEME.primary}20 0%, transparent 70%)`,
        borderRadius: '50%',
        top: '-100px',
        right: '-100px',
        animation: 'blob 8s infinite',
    },
    blob2: {
        position: 'absolute',
        width: '300px',
        height: '300px',
        background: `radial-gradient(circle, ${THEME.accent}15 0%, transparent 70%)`,
        borderRadius: '50%',
        bottom: '-50px',
        left: '-50px',
        animation: 'blob 10s infinite 2s',
    },
    blob3: {
        position: 'absolute',
        width: '250px',
        height: '250px',
        background: `radial-gradient(circle, ${THEME.primary}10 0%, transparent 70%)`,
        borderRadius: '50%',
        top: '50%',
        left: '20%',
        animation: 'blob 12s infinite 4s',
    },
    features: {
        padding: '120px 40px',
        background: THEME.secondary,
    },
    sectionTitle: {
        fontSize: '48px',
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: '60px',
        color: THEME.text,
    },
    featureGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '30px',
        maxWidth: '1200px',
        margin: '0 auto',
    },
    featureCard: {
        background: THEME.surface,
        padding: '40px 30px',
        borderRadius: '12px',
        border: `1px solid ${THEME.primary}20`,
        textAlign: 'center',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
    },
    featureIcon: {
        fontSize: '48px',
        marginBottom: '20px',
    },
    featureTitle: {
        fontSize: '20px',
        fontWeight: '700',
        marginBottom: '12px',
        color: THEME.text,
    },
    featureDescription: {
        fontSize: '14px',
        color: THEME.textSecondary,
        lineHeight: '1.6',
    },
    ctaSection: {
        padding: '80px 40px',
        textAlign: 'center',
        background: `linear-gradient(135deg, ${THEME.primary}15 0%, ${THEME.accent}10 100%)`,
    },
    authPage: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${THEME.background} 0%, ${THEME.surface} 100%)`,
    },
    authContainer: {
        background: THEME.surface,
        padding: '60px 40px',
        borderRadius: '12px',
        border: `1px solid ${THEME.primary}20`,
        width: '100%',
        maxWidth: '400px',
        boxShadow: `0 20px 60px ${THEME.primary}10`,
    },
    authTitle: {
        fontSize: '36px',
        fontWeight: '900',
        color: THEME.primary,
        textAlign: 'center',
        margin: '0 0 10px 0',
        letterSpacing: '2px',
    },
    authSubtitle: {
        fontSize: '16px',
        color: THEME.textSecondary,
        textAlign: 'center',
        margin: '0 0 40px 0',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '20px',
    },
    input: {
        padding: '12px 16px',
        background: THEME.background,
        border: `1px solid ${THEME.primary}30`,
        borderRadius: '6px',
        color: THEME.text,
        fontSize: '14px',
        transition: 'all 0.3s ease',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
    },
    error: {
        color: THEME.danger,
        fontSize: '12px',
        padding: '8px',
        background: `${THEME.danger}15`,
        borderRadius: '4px',
    },
    authToggle: {
        textAlign: 'center',
        fontSize: '14px',
        color: THEME.textSecondary,
    },
    primaryButton: {
        padding: '12px 24px',
        background: THEME.primary,
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        width: '100%',
    },
    secondaryButton: {
        padding: '12px 24px',
        background: 'transparent',
        color: THEME.primary,
        border: `2px solid ${THEME.primary}`,
        borderRadius: '6px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        width: '100%',
    },
    dashboard: {
        padding: '100px 40px 40px',
        maxWidth: '1200px',
        margin: '0 auto',
    },
    pageTitle: {
        fontSize: '32px',
        fontWeight: '800',
        margin: '0 0 8px 0',
    },
    pageSubtitle: {
        fontSize: '16px',
        color: THEME.textSecondary,
        margin: '0 0 40px 0',
    },
    actionButtons: {
        display: 'flex',
        gap: '16px',
        marginBottom: '60px',
        maxWidth: '240px',
    },
    modal: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `${THEME.background}CC`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
    },
    modalContent: {
        background: THEME.surface,
        padding: '40px',
        borderRadius: '12px',
        maxWidth: '400px',
        width: '90%',
        border: `1px solid ${THEME.primary}30`,
    },
    modalButtons: {
        display: 'flex',
        gap: '12px',
        marginTop: '20px',
    },
    meetingsSection: {
        marginTop: '20px',
    },
    sectionSubtitle: {
        fontSize: '20px',
        fontWeight: '700',
        marginBottom: '20px',
        color: THEME.text,
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px 20px',
        background: THEME.surface,
        borderRadius: '12px',
        border: `1px dashed ${THEME.primary}30`,
    },
    meetingGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px',
    },
    meetingCard: {
        background: THEME.surface,
        padding: '24px',
        borderRadius: '12px',
        border: `1px solid ${THEME.primary}20`,
        transition: 'all 0.3s ease',
    },
    meetingType: {
        fontSize: '12px',
        color: THEME.textSecondary,
        margin: '8px 0',
    },
    meetingInfo: {
        fontSize: '12px',
        color: THEME.textSecondary,
        margin: '8px 0 16px 0',
    },
};

// ============================================
// ANIMATIONS GLOBALES
// ============================================
const globalStyles = `
  @keyframes blob {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(30px, -50px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  html, body {
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    background: ${THEME.background};
    color: ${THEME.text};
  }

  button:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  input:focus {
    border-color: ${THEME.primary} !important;
    box-shadow: 0 0 0 3px ${THEME.primary}20;
  }

  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: ${THEME.surface}; }
  ::-webkit-scrollbar-thumb { background: ${THEME.primary}60; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: ${THEME.primary}80; }
`;

if (typeof document !== 'undefined') {
    const styleEl = document.createElement('style');
    styleEl.textContent = globalStyles;
    document.head.appendChild(styleEl);
}
