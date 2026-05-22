import { AuthService, MeetingService } from './services/FirebaseService';
import React, { useState, useEffect } from 'react';
import { useZegoMeeting } from './hooks/useZegoMeeting';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './services/FirebaseService';

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

    // Vérifier si l'utilisateur est connecté
    useEffect(() => {
        const unsubscribe = AuthService.onAuthStateChanged(async (authUser) => {
            try {
                if (authUser) {
                    // Récupérer les infos de l'utilisateur depuis Firestore
                    const q = query(
                        collection(db, 'users'),
                        where('uid', '==', authUser.uid)
                    );
                    const querySnapshot = await getDocs(q);
                    let userData = { uid: authUser.uid, email: authUser.email };

                    querySnapshot.forEach((doc) => {
                        userData = { ...userData, ...doc.data() };
                    });

                    setUser(userData);
                    setCurrentPage('dashboard');
                } else {
                    setUser(null);
                    setCurrentPage('landing');
                }
            } catch (error) {
                console.error('Error checking auth:', error);
            } finally {
                setLoading(false);
            }
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
            setCurrentPage('landing');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <div style={styles.app}>
            {/* NAVIGATION */}
            {user && <Navigation user={user} onLogout={handleLogout} />}

            {/* PAGES */}
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

                {/* ANIMATED BACKGROUND */}
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
                    <FeatureCard
                        icon="🎥"
                        title="Vidéo HD"
                        description="Qualité vidéo cristalline avec compression intelligente"
                    />
                    <FeatureCard
                        icon="🎤"
                        title="Audio Crystal Clear"
                        description="Technologie audio avancée avec suppression de bruit"
                    />
                    <FeatureCard
                        icon="🖥️"
                        title="Partage d'écran"
                        description="Partagez votre écran en haute définition"
                    />
                    <FeatureCard
                        icon="💬"
                        title="Chat Intégré"
                        description="Communiquez via le chat en temps réel"
                    />
                    <FeatureCard
                        icon="📹"
                        title="Enregistrement"
                        description="Enregistrez vos réunions pour les consulter plus tard"
                    />
                    <FeatureCard
                        icon="✏️"
                        title="Whiteboard"
                        description="Tableau blanc collaboratif pour brainstorming"
                    />
                </div>
            </section>

            {/* CTA FOOTER */}
            <section style={styles.ctaSection}>
                <h2>Prêt à collaborer ?</h2>
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
            console.error('Login error:', err);
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
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={styles.input}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Mot de passe"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={styles.input}
                        required
                    />

                    {error && <div style={styles.error}>{error}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            ...styles.primaryButton,
                            opacity: loading ? 0.6 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? 'Connexion...' : 'Se connecter'}
                    </button>
                </form>

                <p style={styles.authToggle}>
                    Pas encore inscrit ?{' '}
                    <span
                        onClick={onRegisterClick}
                        style={{ color: THEME.primary, cursor: 'pointer', fontWeight: 'bold' }}
                    >
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
                setError('Tous les champs sont requis (6 caractères minimum)');
                setLoading(false);
                return;
            }

            const user = await AuthService.register(email, password, name);
            onSuccess(user);
        } catch (err) {
            console.error('Register error:', err);
            setError(err.message || 'Erreur d\'inscription');
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
                    <input
                        type="text"
                        placeholder="Nom complet"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={styles.input}
                        required
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={styles.input}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Mot de passe (6+ caractères)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={styles.input}
                        required
                    />

                    {error && <div style={styles.error}>{error}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            ...styles.primaryButton,
                            opacity: loading ? 0.6 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? 'Inscription...' : 'S\'inscrire'}
                    </button>
                </form>

                <p style={styles.authToggle}>
                    Déjà inscrit ?{' '}
                    <span
                        onClick={onLoginClick}
                        style={{ color: THEME.primary, cursor: 'pointer', fontWeight: 'bold' }}
                    >
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

    // Charger les réunions au montage
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
        if (!newMeetingTitle) return;

        try {
            setLoading(true);
            const meeting = await MeetingService.createMeeting(
                newMeetingTitle,
                user.uid,
                user.name,
                roomType
            );
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
            <p style={styles.pageSubtitle}>Bienvenue, {user.name}</p>

            <div style={styles.actionButtons}>
                <button
                    style={styles.primaryButton}
                    onClick={() => setShowCreateModal(true)}
                    disabled={loading}
                >
                    + Créer une réunion
                </button>
            </div>

            {showCreateModal && (
                <div style={styles.modal}>
                    <div style={styles.modalContent}>
                        <h3>Créer une nouvelle réunion</h3>
                        <input
                            type="text"
                            placeholder="Titre de la réunion"
                            value={newMeetingTitle}
                            onChange={(e) => setNewMeetingTitle(e.target.value)}
                            style={styles.input}
                        />
                        <select
                            value={roomType}
                            onChange={(e) => setRoomType(e.target.value)}
                            style={styles.input}
                        >
                            <option value="temporary">Temporaire</option>
                            <option value="persistent">Persistante</option>
                        </select>
                        <div style={styles.modalButtons}>
                            <button
                                style={styles.primaryButton}
                                onClick={createMeeting}
                                disabled={loading}
                            >
                                Créer
                            </button>
                            <button
                                style={styles.secondaryButton}
                                onClick={() => setShowCreateModal(false)}
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={styles.meetingsSection}>
                <h3 style={styles.sectionSubtitle}>
                    {loading ? 'Chargement...' : 'Mes réunions'}
                </h3>
                {localMeetings.length === 0 ? (
                    <p style={{ color: THEME.textSecondary }}>Aucune réunion créée</p>
                ) : (
                    <div style={styles.meetingGrid}>
                        {localMeetings.map((meeting) => (
                            <MeetingCard
                                key={meeting.id}
                                meeting={meeting}
                                onJoin={joinMeeting}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// MEETING ROOM
// ============================================
function MeetingRoom({ meeting, user, onExit }) {
    const { isInitialized, isVideoOn, isAudioOn, toggleVideo, toggleAudio, error } =
        useZegoMeeting(user.uid, user.name, meeting.roomId);

    const [showChat, setShowChat] = useState(true);
    const [chatMessages, setChatMessages] = useState([
        { id: 1, author: 'Système', message: 'Réunion démarrée', timestamp: new Date() },
    ]);
    const [chatInput, setChatInput] = useState('');
    const [participants, setParticipants] = useState([
        { id: user.uid, name: user.name, isAudio: true, isVideo: true },
    ]);

    const sendMessage = async () => {
        if (chatInput.trim()) {
            try {
                await MeetingService.saveChatMessage(
                    meeting.id,
                    user.uid,
                    user.name,
                    chatInput
                );

                setChatMessages([
                    ...chatMessages,
                    {
                        id: chatMessages.length + 1,
                        author: user.name,
                        message: chatInput,
                        timestamp: new Date(),
                    },
                ]);
                setChatInput('');
            } catch (error) {
                console.error('Error sending message:', error);
            }
        }
    };

    const handleExit = async () => {
        try {
            await MeetingService.endMeeting(meeting.id, meeting.type);
            onExit();
        } catch (error) {
            console.error('Error ending meeting:', error);
            onExit();
        }
    };

    if (error && error !== 'Erreur lors de l\'initialisation') {
        return (
            <div style={{ ...styles.meetingRoom, alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: THEME.danger }}>
                    <h2>⚠️ {error}</h2>
                    <button style={styles.primaryButton} onClick={handleExit}>
                        Quitter
                    </button>
                </div>
            </div>
        );
    }

    if (!isInitialized) {
        return (
            <div style={{ ...styles.meetingRoom, alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <h2>⏳ Initialisation de la réunion...</h2>
                    <p style={{ color: THEME.textSecondary, marginTop: '10px' }}>
                        Veuillez autoriser l'accès à votre caméra et micro...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.meetingRoom}>
            {/* VIDEO GRID */}
            <div style={styles.videoGrid}>
                {/* LOCAL VIDEO */}
                <div style={styles.videoCard}>
                    <div
                        id="local-video"
                        style={{
                            ...styles.videoPlaceholder,
                            width: '100%',
                            height: '100%',
                            background: '#000',
                        }}
                    ></div>
                    <div style={styles.videoInfo}>
                        <p>{user.name} (Vous)</p>
                        <div style={styles.videoStatusIcons}>
                            {!isAudioOn && <span>🔇</span>}
                            {!isVideoOn && <span>🚫</span>}
                        </div>
                    </div>
                </div>

                {/* AUTRES PARTICIPANTS */}
                {participants.slice(1).map((participant) => (
                    <div key={participant.id} style={styles.videoCard}>
                        <div style={styles.videoPlaceholder}>
                            <span style={styles.videoInitials}>
                                {participant.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div style={styles.videoInfo}>
                            <p>{participant.name}</p>
                            <div style={styles.videoStatusIcons}>
                                {!participant.isAudio && <span>🔇</span>}
                                {!participant.isVideo && <span>🚫</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* CHAT PANEL */}
            {showChat && (
                <div style={styles.chatPanel}>
                    <div style={styles.chatHeader}>
                        <h4>Chat</h4>
                        <button
                            onClick={() => setShowChat(false)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: THEME.text,
                                cursor: 'pointer',
                                fontSize: '20px',
                            }}
                        >
                            ✕
                        </button>
                    </div>
                    <div style={styles.chatMessages}>
                        {chatMessages.map((msg) => (
                            <div key={msg.id} style={styles.chatMessage}>
                                <p style={styles.chatAuthor}>{msg.author}</p>
                                <p style={styles.chatText}>{msg.message}</p>
                            </div>
                        ))}
                    </div>
                    <div style={styles.chatInput}>
                        <input
                            type="text"
                            placeholder="Message..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '4px' }}
                        />
                        <button
                            onClick={sendMessage}
                            style={{
                                background: THEME.primary,
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                marginLeft: '8px',
                            }}
                        >
                            Envoyer
                        </button>
                    </div>
                </div>
            )}

            {/* CONTROLS */}
            <div style={styles.controls}>
                <button
                    style={{
                        ...styles.controlButton,
                        background: isVideoOn ? THEME.primary : THEME.danger,
                    }}
                    onClick={toggleVideo}
                    title={isVideoOn ? 'Désactiver la vidéo' : 'Activer la vidéo'}
                >
                    {isVideoOn ? '🎥' : '🚫'}
                </button>
                <button
                    style={{
                        ...styles.controlButton,
                        background: isAudioOn ? THEME.primary : THEME.danger,
                    }}
                    onClick={toggleAudio}
                    title={isAudioOn ? 'Couper le micro' : 'Activer le micro'}
                >
                    {isAudioOn ? '🎤' : '🔇'}
                </button>
                <button style={styles.controlButton} title="Partager l'écran">
                    🖥️
                </button>
                <button style={styles.controlButton} title="Whiteboard">
                    ✏️
                </button>
                <button
                    style={styles.controlButton}
                    title="Chat"
                    onClick={() => setShowChat(!showChat)}
                >
                    💬
                </button>
                <button style={styles.controlButton} title="Participants">
                    👥 ({participants.length})
                </button>
                <button
                    style={{ ...styles.controlButton, background: THEME.danger }}
                    onClick={handleExit}
                    title="Quitter la réunion"
                >
                    📞
                </button>
            </div>
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
            <h4>{meeting.title}</h4>
            <p style={styles.meetingType}>
                {meeting.type === 'persistent' ? '📌 Persistante' : '⏱️ Temporaire'}
            </p>
            <p style={styles.meetingInfo}>
                {timeAgo > 0 ? `${timeAgo} min` : 'À l\'instant'} • {meeting.participantCount || 1} participants
            </p>
            <button
                style={styles.primaryButton}
                onClick={() => onJoin(meeting)}
            >
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
        paddingTop: '60px',
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
        transition: 'all 0.3s ease',
    },

    // HERO
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

    // FEATURES
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
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

    // CTA
    ctaSection: {
        padding: '80px 40px',
        textAlign: 'center',
        background: `linear-gradient(135deg, ${THEME.primary}15 0%, ${THEME.accent}10 100%)`,
    },

    // AUTH
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

    // BUTTONS
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
    },

    // DASHBOARD
    dashboard: {
        padding: '40px',
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
    },
    modal: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `${THEME.background}90`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    modalContent: {
        background: THEME.surface,
        padding: '40px',
        borderRadius: '12px',
        maxWidth: '400px',
        width: '100%',
    },
    modalButtons: {
        display: 'flex',
        gap: '12px',
        marginTop: '20px',
    },
    meetingsSection: {
        marginTop: '60px',
    },
    sectionSubtitle: {
        fontSize: '20px',
        fontWeight: '700',
        marginBottom: '20px',
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

    // MEETING ROOM
    meetingRoom: {
        display: 'flex',
        height: '100vh',
        background: THEME.background,
        gap: '16px',
        padding: '16px',
    },
    videoGrid: {
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        alignContent: 'start',
    },
    videoCard: {
        position: 'relative',
        background: THEME.surface,
        borderRadius: '12px',
        overflow: 'hidden',
        aspectRatio: '16/9',
        border: `2px solid ${THEME.primary}30`,
    },
    videoPlaceholder: {
        width: '100%',
        height: '100%',
        background: `linear-gradient(135deg, ${THEME.surface} 0%, ${THEME.background} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '48px',
    },
    videoInitials: {
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: THEME.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '40px',
        fontWeight: 'bold',
    },
    videoInfo: {
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        background: `${THEME.background}90`,
        padding: '8px 12px',
        borderRadius: '6px',
        backdropFilter: 'blur(10px)',
        fontSize: '14px',
        fontWeight: '600',
    },
    videoStatusIcons: {
        marginTop: '4px',
        fontSize: '12px',
    },
    chatPanel: {
        width: '300px',
        background: THEME.surface,
        borderRadius: '12px',
        border: `1px solid ${THEME.primary}20`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    chatHeader: {
        padding: '16px',
        borderBottom: `1px solid ${THEME.primary}20`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chatMessages: {
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    chatMessage: {
        padding: '8px 12px',
        background: THEME.background,
        borderRadius: '6px',
        fontSize: '13px',
    },
    chatAuthor: {
        fontWeight: '600',
        color: THEME.primary,
        margin: '0 0 4px 0',
        fontSize: '12px',
    },
    chatText: {
        color: THEME.text,
        margin: 0,
        wordWrap: 'break-word',
    },
    chatInput: {
        padding: '12px',
        borderTop: `1px solid ${THEME.primary}20`,
        display: 'flex',
        gap: '8px',
    },
    controls: {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '12px',
        background: `${THEME.surface}95`,
        padding: '16px 20px',
        borderRadius: '50px',
        border: `1px solid ${THEME.primary}30`,
        backdropFilter: 'blur(10px)',
        zIndex: 100,
    },
    controlButton: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: THEME.primary,
        border: 'none',
        color: 'white',
        fontSize: '20px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body {
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    background: ${THEME.background};
    color: ${THEME.text};
  }

  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px ${THEME.primary}20;
  }

  input:focus {
    border-color: ${THEME.primary} !important;
    box-shadow: 0 0 0 3px ${THEME.primary}15;
  }

  .featureCard:hover {
    transform: translateY(-8px);
    border-color: ${THEME.primary}40;
    box-shadow: 0 12px 32px ${THEME.primary}15;
  }

  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${THEME.surface};
  }

  ::-webkit-scrollbar-thumb {
    background: ${THEME.primary}60;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${THEME.primary}80;
  }
`;

// Injecter les styles globaux
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('style');
    styleElement.textContent = globalStyles;
    document.head.appendChild(styleElement);
}