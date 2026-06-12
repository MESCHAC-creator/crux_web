import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { AuthService, MeetingService } from './services/LocalStorageService';
import { PaymentService, MeetingService as FirebaseMeetingService } from './services/FirebaseService';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';

// ============================================================
// LOGO — caméra vidéo dans carré arrondi (identique crux_new_final)
// ============================================================
function CruxLogo({ size = 36, dark = false }) {
  const id = `clg${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF4081"/>
          <stop offset="100%" stopColor="#AA00FF"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill={dark ? 'rgba(255,255,255,0.12)' : `url(#${id})`}/>
      {/* Corps caméra */}
      <rect x="10" y="30" width="55" height="40" rx="8" fill="white"/>
      {/* Objectif */}
      <circle cx="37" cy="50" r="13" fill={`url(#${id})`}/>
      <circle cx="37" cy="50" r="7" fill="white"/>
      {/* Triangle viewfinder */}
      <polygon points="65,36 90,24 90,76 65,64" fill="white"/>
    </svg>
  );
}

// ============================================================
// COULEURS (light + dark, identiques à crux_new_final)
// ============================================================
const C = {
  // Primaire
  flamePrimary:  '#FF4F38',
  flameLight:    '#FF6B52',
  flameDark:     '#E63D28',
  primary:       '#E74C3C',
  primaryDark:   '#C0392B',
  primaryLight:  '#F8706E',
  // Violet/Purple
  violet:        '#8E44AD',
  violetDark:    '#6C3483',
  violetLight:   '#BB8FCE',
  accentViolet:  '#9B59B6',
  // Pink/Purple (crux_new_final splash)
  pink:          '#FF4081',
  pinkDark:      '#C51162',
  purpleBright:  '#AA00FF',
  purpleMid:     '#6200EA',
  // Accent
  accentOrange:  '#FF9800',
  accentGolden:  '#FFB74D',
  iceBlue:       '#1E88E5',
  iceLight:      '#42A5F5',
  // Light theme
  white:         '#FFFFFF',
  snowWhite:     '#FAFAFA',
  lightBg:       '#F8F9FA',
  mediumBg:      '#EFF0F4',
  surfaceGray:   '#F5F5F5',
  border:        '#DCDCDC',
  borderFocus:   '#8E44AD',
  textPrimary:   '#1A1A1A',
  textSecondary: '#555555',
  textTertiary:  '#999999',
  // Dark theme (crux_new_final)
  darkBg:        '#0D0020',
  darkBg2:       '#1A0035',
  darkBg3:       '#4A0050',
  darkSurface:   '#1E0040',
  darkBorder:    'rgba(255,255,255,0.12)',
  darkText:      '#FFFFFF',
  darkTextSub:   'rgba(255,255,255,0.7)',
  darkTextMuted: 'rgba(255,255,255,0.4)',
  // Status
  success:       '#27AE60',
  error:         '#E74C3C',
  warning:       '#F39C12',
  info:          '#3498DB',
  // Gradients
  fireGradient:    'linear-gradient(135deg, #FF4F38, #FF6B4A, #FF9800)',
  primaryGradient: 'linear-gradient(135deg, #E74C3C, #8E44AD)',
  pinkPurple:      'linear-gradient(135deg, #FF4081, #AA00FF)',
  darkSplash:      'linear-gradient(160deg, #0D0020 0%, #4A0050 50%, #220040 100%)',
  luxeGradient:    'linear-gradient(135deg, #FF4F38, #FF9800, #1E88E5)',
  // Glow
  fireGlow:    'rgba(255,79,56,0.18)',
  pinkGlow:    'rgba(255,64,129,0.25)',
  purpleGlow:  'rgba(170,0,255,0.2)',
  iceGlow:     'rgba(30,136,229,0.15)',
  violetGlow:  'rgba(142,68,173,0.15)',
  smokeWarm:   'rgba(255,79,56,0.08)',
};

// ── Theme helper (dark mode) ──────────────────────────────────
const DARK = {
  bgPage:    '#0D0020',
  bgCard:    '#1A0A2E',
  bgCard2:   '#210C40',
  bgInput:   '#1A0A2E',
  textPri:   '#F0EAF8',
  textSec:   '#C0A8E0',
  textMuted: '#7060A0',
  border:    'rgba(255,255,255,0.10)',
  shadow:    '0 2px 10px rgba(0,0,0,0.3)',
};
const LIGHT = {
  bgPage:    '#F5F3FF',
  bgCard:    '#FFFFFF',
  bgCard2:   '#F8F3FF',
  bgInput:   '#FFFFFF',
  textPri:   '#1A1A1A',
  textSec:   '#555555',
  textMuted: '#999999',
  border:    '#DCDCDC',
  shadow:    '0 2px 10px rgba(0,0,0,0.06)',
};
const th = (dark) => dark ? DARK : LIGHT;

// ============================================================
// GAMIFICATION SERVICE
// ============================================================
const GamService = {
  BADGES: {
    first_meeting: { icon: '🏆', label: 'Première réunion', xp: 50 },
    social:        { icon: '🤝', label: '5 réunions', xp: 100 },
    pro:           { icon: '⭐', label: '10 réunions', xp: 200 },
    century:       { icon: '💯', label: '100 XP', xp: 0 },
    reactor:       { icon: '🎉', label: '10 réactions', xp: 30 },
    speaker:       { icon: '🎤', label: 'Orateur actif', xp: 50 },
  },
  _key: uid => `crux_gam_${uid}`,
  getStats(uid) {
    try { return JSON.parse(localStorage.getItem(this._key(uid)) || '{"xp":0,"badges":[],"meetings":0,"reactions":0}'); }
    catch { return { xp: 0, badges: [], meetings: 0, reactions: 0 }; }
  },
  _save(uid, data) {
    const newBadges = [];
    const b = data.badges;
    if (data.meetings >= 1 && !b.includes('first_meeting')) { b.push('first_meeting'); newBadges.push('first_meeting'); }
    if (data.meetings >= 5 && !b.includes('social'))        { b.push('social'); newBadges.push('social'); }
    if (data.meetings >= 10 && !b.includes('pro'))          { b.push('pro'); newBadges.push('pro'); }
    if (data.xp >= 100 && !b.includes('century'))           { b.push('century'); newBadges.push('century'); }
    if (data.reactions >= 10 && !b.includes('reactor'))     { b.push('reactor'); newBadges.push('reactor'); }
    localStorage.setItem(this._key(uid), JSON.stringify(data));
    return newBadges;
  },
  joinMeeting(uid) {
    const d = this.getStats(uid);
    d.meetings += 1; d.xp += 50;
    return this._save(uid, d);
  },
  addReaction(uid) {
    const d = this.getStats(uid);
    d.reactions += 1; d.xp += 2;
    return this._save(uid, d);
  },
  addHandRaise(uid) {
    const d = this.getStats(uid);
    d.xp += 5;
    return this._save(uid, d);
  },
};

// ============================================================
// VALIDATORS
// ============================================================
const Validators = {
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
  password: v => v.length >= 6,
  name: v => v.trim().length >= 2,
};

// ============================================================
// LANGUES
// ============================================================
const T_MAP = {
  fr: {
    appTagline: 'Vidéoconférence Premium',
    signIn: 'Se connecter', signUp: "S'inscrire",
    email: 'Email', password: 'Mot de passe', fullName: 'Nom complet',
    show: 'Afficher', hide: 'Masquer',
    orContinue: 'ou continuer avec',
    googleBtn: 'Continuer avec Google',
    termsNote: "En continuant, vous acceptez nos Conditions d'utilisation.",
    welcome: 'Bonjour', dashboard: 'Tableau de bord',
    instantMeeting: 'Réunion instantanée', schedule: 'Planifier',
    joinCode: 'Rejoindre', dialIn: 'Dial In',
    recentMeetings: 'Réunions récentes', noMeetings: 'Aucune réunion',
    noMeetingsHint: 'Créez votre première réunion',
    participants: 'participant(s)',
    settings: 'Paramètres', logout: 'Déconnexion', notifications: 'Notifications',
    noNotif: 'Aucune nouvelle notification',
    darkMode: 'Mode sombre', language: 'Langue',
    videoQuality: 'Qualité vidéo', defaultMic: 'Micro activé par défaut',
    defaultCam: 'Caméra activée par défaut', notifToggle: 'Notifications',
    about: 'À propos', version: 'Version', team: 'Équipe', support: 'Support',
    share: 'Partager CRUX', shareMsg: 'Essayez CRUX — Visioconférence Premium!',
    meetingSettings: 'Réunion', generalSettings: 'Général',
    low: 'Basse', medium: 'Moyenne', high: 'Haute', veryHigh: 'Très haute',
    waitingRoom: "Salle d'attente", waitingFor: "En attente de l'hôte...",
    prepareDevices: 'Préparez vos appareils', camera: 'Caméra', mic: 'Microphone',
    joinMeeting: 'Rejoindre la réunion', leaveWaiting: "Quitter la salle d'attente",
    meetingTitle: 'Titre de la réunion', meetingDesc: 'Description (optionnel)',
    meetingType: 'Type', temporary: 'Temporaire', persistent: 'Persistante',
    create: 'Créer', cancel: 'Annuler', join: 'Rejoindre',
    enterCode: "Entrer l'ID ou code de réunion",
    endMeeting: 'Terminer', confirmExit: 'Quitter la réunion ?',
    confirmExitMsg: 'Êtes-vous sûr de vouloir quitter ?',
    confirm: 'Quitter', newMeeting: 'Nouvelle réunion',
    back: '← Retour', contactSupport: 'Contacter le support',
    loading: 'Chargement...', connecting: 'Connexion en cours...',
    // Gamification
    xpPoints: 'Points XP', badges: 'Badges', yourStats: 'Vos statistiques',
    meetingsHeld: 'Réunions', badgeEarned: 'Nouveau badge !',
    // Meeting tools
    reactions: 'Réactions', raiseHand: 'Lever la main', handRaised: 'Main levée !',
    notes: 'Notes', notesPlaceholder: 'Prenez vos notes ici...',
    polls: 'Sondages', createPoll: 'Créer un sondage', pollQuestion: 'Question du sondage',
    pollOption: 'Option', addOption: 'Ajouter option', launchPoll: 'Lancer',
    vote: 'Voter', pollResults: 'Résultats', closePoll: 'Clôturer',
    bgBlur: "Flou d'arrière-plan", audioLevel: 'Niveau audio',
    privacyMode: 'Mode vie privée', privacyModeOn: 'Flou vidéo — clic pour voir clairement',
    // Auth extras
    confirmPassword: 'Confirmer le mot de passe',
    passwordMismatch: 'Les mots de passe ne correspondent pas',
    passwordTooShort: 'Mot de passe trop court (min. 6 caractères)',
    nameRequired: 'Nom trop court (min. 2 caractères)',
    emailInvalid: 'Adresse email invalide',
    rememberMe: 'Se souvenir de moi',
    forgotPassword: 'Mot de passe oublié ?',
    resetPasswordTitle: 'Réinitialiser le mot de passe',
    resetPasswordDesc: 'Entrez votre email pour recevoir un lien de réinitialisation.',
    resetPasswordBtn: 'Envoyer le lien',
    resetSent: 'Lien envoyé !',
    resetSentMsg: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.',
    // Meeting status
    statusScheduled: 'Programmée', statusOngoing: 'En cours', statusEnded: 'Terminée',
    hostBadge: 'Hôte',
    // Host controls
    hostControls: 'Contrôles hôte',
    lockMeeting: 'Verrouiller la réunion',
    unlockMeeting: 'Déverrouiller',
    meetingLocked: 'Réunion verrouillée',
    muteAll: 'Couper tous les micros',
    muteAllDone: 'Signal envoyé aux participants',
    startRecording: 'Démarrer l\'enregistrement',
    stopRecording: 'Arrêter l\'enregistrement',
    recordingActive: 'Enregistrement en cours',
    endForAll: 'Terminer pour tous',
    // Legal & settings
    legal: 'Légal', privacyPolicy: 'Politique de confidentialité',
    termsOfService: 'Conditions d\'utilisation',
    securitySection: 'Sécurité', changePassword: 'Changer le mot de passe',
    // Toasts
    successCopied: 'Copié !', successSaved: 'Sauvegardé',
    meetingCreated: 'Réunion créée avec succès',
    chat: 'Chat',
    participants: 'Participants',
    inviteLink: 'Lien d\'invitation',
    linkCopied: 'Lien copié !',
    chatPlaceholder: 'Votre message...',
    noMessages: 'Aucun message',
    send: 'Envoyer',
    guestJoin: 'Rejoindre en tant qu\'invité',
    shareCode: 'Partager le code',
    admit: 'Admettre', reject: 'Rejeter', admitAll: 'Admettre tous',
    unmuteSelf: 'Activer mon son', screenShare: 'Partage d\'écran',
    waitingForHost: 'En attente de l\'hôte pour vous admettre',
    startInstantMeeting: 'Démarrer une réunion instantanée',
    scheduleMeeting: 'Planifier une réunion',
    joinViaCode: 'Rejoindre via un code',
    noRecentMeetings: 'Aucune réunion récente',
    message: 'Message',
  },
  en: {
    appTagline: 'Premium Video Conferencing',
    signIn: 'Sign In', signUp: 'Sign Up',
    email: 'Email', password: 'Password', fullName: 'Full Name',
    show: 'Show', hide: 'Hide',
    orContinue: 'or continue with',
    googleBtn: 'Continue with Google',
    termsNote: 'By continuing, you agree to our Terms of Service.',
    welcome: 'Hello', dashboard: 'Dashboard',
    instantMeeting: 'Instant Meeting', schedule: 'Schedule',
    joinCode: 'Join by Code', dialIn: 'Dial In',
    recentMeetings: 'Recent Meetings', noMeetings: 'No meetings yet',
    noMeetingsHint: 'Create your first meeting',
    participants: 'participant(s)',
    settings: 'Settings', logout: 'Logout', notifications: 'Notifications',
    noNotif: 'No new notifications',
    darkMode: 'Dark Mode', language: 'Language',
    videoQuality: 'Video Quality', defaultMic: 'Microphone on by default',
    defaultCam: 'Camera on by default', notifToggle: 'Notifications',
    about: 'About', version: 'Version', team: 'Team', support: 'Support',
    share: 'Share CRUX', shareMsg: 'Try CRUX — Premium Video Conferencing!',
    meetingSettings: 'Meeting', generalSettings: 'General',
    low: 'Low', medium: 'Medium', high: 'High', veryHigh: 'Very High',
    waitingRoom: 'Waiting Room', waitingFor: 'Waiting for host to admit you...',
    prepareDevices: 'Prepare Your Devices', camera: 'Camera', mic: 'Microphone',
    joinMeeting: 'Join Meeting', leaveWaiting: 'Leave Waiting Room',
    meetingTitle: 'Meeting Title', meetingDesc: 'Description (optional)',
    meetingType: 'Type', temporary: 'Temporary', persistent: 'Persistent',
    create: 'Create', cancel: 'Cancel', join: 'Join',
    enterCode: 'Enter meeting ID or code',
    endMeeting: 'End', confirmExit: 'Leave Meeting?',
    confirmExitMsg: 'Are you sure you want to leave?',
    confirm: 'Leave', newMeeting: 'New Meeting',
    back: '← Back', contactSupport: 'Contact Support',
    loading: 'Loading...', connecting: 'Connecting...',
    xpPoints: 'XP Points', badges: 'Badges', yourStats: 'Your Stats',
    meetingsHeld: 'Meetings', badgeEarned: 'New Badge!',
    reactions: 'Reactions', raiseHand: 'Raise Hand', handRaised: 'Hand Raised!',
    notes: 'Notes', notesPlaceholder: 'Take your notes here...',
    polls: 'Polls', createPoll: 'Create Poll', pollQuestion: 'Poll question',
    pollOption: 'Option', addOption: 'Add option', launchPoll: 'Launch',
    vote: 'Vote', pollResults: 'Results', closePoll: 'Close',
    bgBlur: 'Background Blur', audioLevel: 'Audio Level',
    privacyMode: 'Privacy Mode', privacyModeOn: 'Video blurred — click to see clearly',
    confirmPassword: 'Confirm Password',
    passwordMismatch: 'Passwords do not match',
    passwordTooShort: 'Password too short (min. 6 characters)',
    nameRequired: 'Name too short (min. 2 characters)',
    emailInvalid: 'Invalid email address',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    resetPasswordTitle: 'Reset Password',
    resetPasswordDesc: 'Enter your email to receive a reset link.',
    resetPasswordBtn: 'Send Reset Link',
    resetSent: 'Link sent!',
    resetSentMsg: 'If an account exists with this email, you will receive a reset link.',
    statusScheduled: 'Scheduled', statusOngoing: 'Ongoing', statusEnded: 'Ended',
    hostBadge: 'Host',
    hostControls: 'Host Controls',
    lockMeeting: 'Lock Meeting', unlockMeeting: 'Unlock',
    meetingLocked: 'Meeting Locked',
    muteAll: 'Mute All', muteAllDone: 'Signal sent to participants',
    startRecording: 'Start Recording', stopRecording: 'Stop Recording',
    recordingActive: 'Recording active',
    endForAll: 'End for All',
    legal: 'Legal', privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    securitySection: 'Security', changePassword: 'Change Password',
    successCopied: 'Copied!', successSaved: 'Saved',
    meetingCreated: 'Meeting created successfully',
    chat: 'Chat',
    participants: 'Participants',
    inviteLink: 'Invite Link',
    linkCopied: 'Link copied!',
    chatPlaceholder: 'Your message...',
    noMessages: 'No messages',
    send: 'Send',
    guestJoin: 'Join as guest',
    shareCode: 'Share code',
    admit: 'Admit', reject: 'Reject', admitAll: 'Admit All',
    unmuteSelf: 'Unmute Self', screenShare: 'Screen Share',
    waitingForHost: 'Waiting for host to admit you',
    startInstantMeeting: 'Start Instant Meeting',
    scheduleMeeting: 'Schedule Meeting',
    joinViaCode: 'Join via Code',
    noRecentMeetings: 'No recent meetings',
    message: 'Message',
  },
  es: {
    appTagline: 'Videoconferencia Premium',
    signIn: 'Iniciar sesión', signUp: 'Registrarse',
    email: 'Correo', password: 'Contraseña', fullName: 'Nombre completo',
    show: 'Mostrar', hide: 'Ocultar',
    orContinue: 'o continuar con',
    googleBtn: 'Continuar con Google',
    termsNote: 'Al continuar, aceptas nuestros Términos y Política de privacidad.',
    welcome: 'Hola', dashboard: 'Panel',
    instantMeeting: 'Reunión instantánea', schedule: 'Programar',
    joinCode: 'Unirse', dialIn: 'Llamar',
    recentMeetings: 'Reuniones recientes', noMeetings: 'Sin reuniones',
    noMeetingsHint: 'Crea tu primera reunión',
    participants: 'participante(s)',
    settings: 'Configuración', logout: 'Cerrar sesión', notifications: 'Notificaciones',
    noNotif: 'Sin notificaciones nuevas',
    darkMode: 'Modo oscuro', language: 'Idioma',
    videoQuality: 'Calidad de video', defaultMic: 'Micrófono activo por defecto',
    defaultCam: 'Cámara activa por defecto', notifToggle: 'Notificaciones',
    about: 'Acerca de', version: 'Versión', team: 'Equipo', support: 'Soporte',
    share: 'Compartir CRUX', shareMsg: '¡Prueba CRUX — Videoconferencia Premium!',
    meetingSettings: 'Reunión', generalSettings: 'General',
    low: 'Baja', medium: 'Media', high: 'Alta', veryHigh: 'Muy alta',
    waitingRoom: 'Sala de espera', waitingFor: 'Esperando al anfitrión...',
    prepareDevices: 'Prepara tus dispositivos', camera: 'Cámara', mic: 'Micrófono',
    joinMeeting: 'Unirse a reunión', leaveWaiting: 'Salir de sala de espera',
    meetingTitle: 'Título', meetingDesc: 'Descripción (opcional)',
    meetingType: 'Tipo', temporary: 'Temporal', persistent: 'Persistente',
    create: 'Crear', cancel: 'Cancelar', join: 'Unirse',
    enterCode: 'Código de reunión',
    endMeeting: 'Terminar', confirmExit: '¿Salir?',
    confirmExitMsg: '¿Seguro que quieres salir?',
    confirm: 'Salir', newMeeting: 'Nueva reunión',
    back: '← Volver', contactSupport: 'Contactar soporte',
    loading: 'Cargando...', connecting: 'Conectando...',
    xpPoints: 'Puntos XP', badges: 'Insignias', yourStats: 'Tus estadísticas',
    meetingsHeld: 'Reuniones', badgeEarned: '¡Nueva insignia!',
    reactions: 'Reacciones', raiseHand: 'Levantar mano', handRaised: '¡Mano levantada!',
    notes: 'Notas', notesPlaceholder: 'Toma tus notas aquí...',
    polls: 'Encuestas', createPoll: 'Crear encuesta', pollQuestion: 'Pregunta',
    pollOption: 'Opción', addOption: 'Agregar opción', launchPoll: 'Lanzar',
    vote: 'Votar', pollResults: 'Resultados', closePoll: 'Cerrar',
    bgBlur: 'Fondo desenfocado', audioLevel: 'Nivel de audio',
    privacyMode: 'Modo privacidad', privacyModeOn: 'Video borroso — clic para ver',
    confirmPassword: 'Confirmar contraseña',
    passwordMismatch: 'Las contraseñas no coinciden',
    passwordTooShort: 'Contraseña muy corta (mín. 6 caracteres)',
    nameRequired: 'Nombre muy corto (mín. 2 caracteres)',
    emailInvalid: 'Dirección de email inválida',
    rememberMe: 'Recordarme',
    forgotPassword: '¿Olvidaste tu contraseña?',
    resetPasswordTitle: 'Restablecer contraseña',
    resetPasswordDesc: 'Introduce tu email para recibir un enlace de restablecimiento.',
    resetPasswordBtn: 'Enviar enlace',
    resetSent: '¡Enlace enviado!',
    resetSentMsg: 'Si existe una cuenta con este email, recibirás un enlace de restablecimiento.',
    statusScheduled: 'Programada', statusOngoing: 'En curso', statusEnded: 'Finalizada',
    hostBadge: 'Anfitrión',
    hostControls: 'Controles del anfitrión',
    lockMeeting: 'Bloquear reunión', unlockMeeting: 'Desbloquear',
    meetingLocked: 'Reunión bloqueada',
    muteAll: 'Silenciar todos', muteAllDone: 'Señal enviada a los participantes',
    startRecording: 'Iniciar grabación', stopRecording: 'Detener grabación',
    recordingActive: 'Grabación activa',
    endForAll: 'Terminar para todos',
    legal: 'Legal', privacyPolicy: 'Política de privacidad',
    termsOfService: 'Términos de servicio',
    securitySection: 'Seguridad', changePassword: 'Cambiar contraseña',
    successCopied: '¡Copiado!', successSaved: 'Guardado',
    meetingCreated: 'Reunión creada con éxito',
    chat: 'Chat',
    participants: 'Participantes',
    inviteLink: 'Enlace de invitación',
    linkCopied: '¡Enlace copiado!',
    chatPlaceholder: 'Tu mensaje...',
    noMessages: 'Sin mensajes',
    send: 'Enviar',
    guestJoin: 'Unirse como invitado',
    shareCode: 'Compartir código',
    admit: 'Admitir', reject: 'Rechazar', admitAll: 'Admitir todos',
    unmuteSelf: 'Activar mi sonido', screenShare: 'Compartir pantalla',
    waitingForHost: 'Esperando que el anfitrión te admita',
    startInstantMeeting: 'Iniciar reunión instantánea',
    scheduleMeeting: 'Programar reunión',
    joinViaCode: 'Unirse mediante código',
    noRecentMeetings: 'Sin reuniones recientes',
    message: 'Mensaje',
  },
  ru: {
    appTagline: 'Премиум видеоконференции',
    signIn: 'Вход', signUp: 'Регистрация',
    email: 'Эл. почта', password: 'Пароль', fullName: 'Полное имя',
    show: 'Показать', hide: 'Скрыть',
    orContinue: 'или продолжить с',
    googleBtn: 'Продолжить с Google',
    termsNote: 'Продолжая, вы соглашаетесь с нашими Условиями.',
    welcome: 'Привет', dashboard: 'Главная',
    instantMeeting: 'Мгновенная встреча', schedule: 'Запланировать',
    joinCode: 'Войти по коду', dialIn: 'Позвонить',
    recentMeetings: 'Недавние встречи', noMeetings: 'Нет встреч',
    noMeetingsHint: 'Создайте первую встречу',
    participants: 'участник(ов)',
    settings: 'Настройки', logout: 'Выход', notifications: 'Уведомления',
    noNotif: 'Нет новых уведомлений',
    darkMode: 'Тёмный режим', language: 'Язык',
    videoQuality: 'Качество видео', defaultMic: 'Микрофон включён по умолчанию',
    defaultCam: 'Камера включена по умолчанию', notifToggle: 'Уведомления',
    about: 'О приложении', version: 'Версия', team: 'Команда', support: 'Поддержка',
    share: 'Поделиться CRUX', shareMsg: 'Попробуйте CRUX — Премиум видеоконференции!',
    meetingSettings: 'Встреча', generalSettings: 'Общие',
    low: 'Низкое', medium: 'Среднее', high: 'Высокое', veryHigh: 'Очень высокое',
    waitingRoom: 'Зал ожидания', waitingFor: 'Ожидание хоста...',
    prepareDevices: 'Подготовьте устройства', camera: 'Камера', mic: 'Микрофон',
    joinMeeting: 'Войти во встречу', leaveWaiting: 'Покинуть зал ожидания',
    meetingTitle: 'Название встречи', meetingDesc: 'Описание (необязательно)',
    meetingType: 'Тип', temporary: 'Временная', persistent: 'Постоянная',
    create: 'Создать', cancel: 'Отмена', join: 'Войти',
    enterCode: 'Введите код встречи',
    endMeeting: 'Завершить', confirmExit: 'Выйти из встречи?',
    confirmExitMsg: 'Вы уверены, что хотите выйти?',
    confirm: 'Выйти', newMeeting: 'Новая встреча',
    back: '← Назад', contactSupport: 'Связаться с поддержкой',
    loading: 'Загрузка...', connecting: 'Подключение...',
    xpPoints: 'Очки XP', badges: 'Значки', yourStats: 'Ваша статистика',
    meetingsHeld: 'Встречи', badgeEarned: 'Новый значок!',
    reactions: 'Реакции', raiseHand: 'Поднять руку', handRaised: 'Рука поднята!',
    notes: 'Заметки', notesPlaceholder: 'Ваши заметки...',
    polls: 'Опросы', createPoll: 'Создать опрос', pollQuestion: 'Вопрос',
    pollOption: 'Вариант', addOption: 'Добавить вариант', launchPoll: 'Запустить',
    vote: 'Голосовать', pollResults: 'Результаты', closePoll: 'Закрыть',
    bgBlur: 'Размытие фона', audioLevel: 'Уровень звука',
    privacyMode: 'Режим конфиденциальности', privacyModeOn: 'Видео размыто — нажмите для просмотра',
    confirmPassword: 'Подтвердить пароль',
    passwordMismatch: 'Пароли не совпадают',
    passwordTooShort: 'Пароль слишком короткий (мин. 6 символов)',
    nameRequired: 'Имя слишком короткое (мин. 2 символа)',
    emailInvalid: 'Неверный адрес эл. почты',
    rememberMe: 'Запомнить меня',
    forgotPassword: 'Забыли пароль?',
    resetPasswordTitle: 'Сброс пароля',
    resetPasswordDesc: 'Введите email для получения ссылки сброса.',
    resetPasswordBtn: 'Отправить ссылку',
    resetSent: 'Ссылка отправлена!',
    resetSentMsg: 'Если аккаунт с этим email существует, вы получите ссылку сброса.',
    statusScheduled: 'Запланирована', statusOngoing: 'Идёт', statusEnded: 'Завершена',
    hostBadge: 'Хост',
    hostControls: 'Управление хостом',
    lockMeeting: 'Заблокировать встречу', unlockMeeting: 'Разблокировать',
    meetingLocked: 'Встреча заблокирована',
    muteAll: 'Отключить всех', muteAllDone: 'Сигнал отправлен участникам',
    startRecording: 'Начать запись', stopRecording: 'Остановить запись',
    recordingActive: 'Запись активна',
    endForAll: 'Завершить для всех',
    legal: 'Правовая информация', privacyPolicy: 'Политика конфиденциальности',
    termsOfService: 'Условия использования',
    securitySection: 'Безопасность', changePassword: 'Изменить пароль',
    successCopied: 'Скопировано!', successSaved: 'Сохранено',
    meetingCreated: 'Встреча успешно создана',
    chat: 'Чат', inviteLink: 'Ссылка-приглашение',
    linkCopied: 'Ссылка скопирована!',
    chatPlaceholder: 'Ваше сообщение...',
    noMessages: 'Нет сообщений',
    send: 'Отправить',
    guestJoin: 'Войти как гость',
    shareCode: 'Поделиться кодом',
    admit: 'Допустить', reject: 'Отклонить', admitAll: 'Допустить всех',
    unmuteSelf: 'Включить свой звук',
    screenShare: 'Демонстрация экрана',
    waitingForHost: 'Ожидание хоста для приёма',
  },
  de: {
    appTagline: 'Premium-Videokonferenz',
    signIn: 'Anmelden', signUp: 'Registrieren',
    email: 'E-Mail', password: 'Passwort', fullName: 'Vollständiger Name',
    show: 'Zeigen', hide: 'Verbergen',
    orContinue: 'oder fortfahren mit',
    googleBtn: 'Mit Google fortfahren',
    termsNote: 'Durch Fortfahren akzeptierst du unsere Nutzungsbedingungen.',
    welcome: 'Hallo', dashboard: 'Dashboard',
    instantMeeting: 'Sofort-Meeting', schedule: 'Planen',
    joinCode: 'Beitreten', dialIn: 'Einwählen',
    recentMeetings: 'Letzte Meetings', noMeetings: 'Keine Meetings',
    noMeetingsHint: 'Erstelle dein erstes Meeting',
    participants: 'Teilnehmer',
    settings: 'Einstellungen', logout: 'Abmelden', notifications: 'Benachrichtigungen',
    noNotif: 'Keine neuen Benachrichtigungen',
    darkMode: 'Dunkelmodus', language: 'Sprache',
    videoQuality: 'Videoqualität', defaultMic: 'Mikrofon standardmäßig an',
    defaultCam: 'Kamera standardmäßig an', notifToggle: 'Benachrichtigungen',
    about: 'Über', version: 'Version', team: 'Team', support: 'Support',
    share: 'CRUX teilen', shareMsg: 'Probiere CRUX — Premium-Videokonferenz!',
    meetingSettings: 'Meeting', generalSettings: 'Allgemein',
    low: 'Niedrig', medium: 'Mittel', high: 'Hoch', veryHigh: 'Sehr hoch',
    waitingRoom: 'Warteraum', waitingFor: 'Warte auf den Gastgeber...',
    prepareDevices: 'Geräte vorbereiten', camera: 'Kamera', mic: 'Mikrofon',
    joinMeeting: 'Meeting beitreten', leaveWaiting: 'Warteraum verlassen',
    meetingTitle: 'Meeting-Titel', meetingDesc: 'Beschreibung (optional)',
    meetingType: 'Typ', temporary: 'Temporär', persistent: 'Dauerhaft',
    create: 'Erstellen', cancel: 'Abbrechen', join: 'Beitreten',
    enterCode: 'Meeting-Code eingeben',
    endMeeting: 'Beenden', confirmExit: 'Meeting verlassen?',
    confirmExitMsg: 'Möchtest du das Meeting wirklich verlassen?',
    confirm: 'Verlassen', newMeeting: 'Neues Meeting',
    back: '← Zurück', contactSupport: 'Support kontaktieren',
    loading: 'Wird geladen...', connecting: 'Verbinde...',
    xpPoints: 'XP-Punkte', badges: 'Abzeichen', yourStats: 'Deine Statistiken',
    meetingsHeld: 'Meetings', badgeEarned: 'Neues Abzeichen!',
    reactions: 'Reaktionen', raiseHand: 'Hand heben', handRaised: 'Hand gehoben!',
    notes: 'Notizen', notesPlaceholder: 'Notizen hier...',
    polls: 'Abstimmungen', createPoll: 'Abstimmung', pollQuestion: 'Frage',
    pollOption: 'Option', addOption: 'Option hinzufügen', launchPoll: 'Starten',
    vote: 'Abstimmen', pollResults: 'Ergebnisse', closePoll: 'Schließen',
    bgBlur: 'Hintergrundunschärfe', audioLevel: 'Audiopegel',
    privacyMode: 'Datenschutzmodus', privacyModeOn: 'Video unscharf — klicken zum Ansehen',
    confirmPassword: 'Passwort bestätigen',
    passwordMismatch: 'Passwörter stimmen nicht überein',
    passwordTooShort: 'Passwort zu kurz (min. 6 Zeichen)',
    nameRequired: 'Name zu kurz (min. 2 Zeichen)',
    emailInvalid: 'Ungültige E-Mail-Adresse',
    rememberMe: 'Angemeldet bleiben',
    forgotPassword: 'Passwort vergessen?',
    resetPasswordTitle: 'Passwort zurücksetzen',
    resetPasswordDesc: 'Gib deine E-Mail ein, um einen Reset-Link zu erhalten.',
    resetPasswordBtn: 'Link senden',
    resetSent: 'Link gesendet!',
    resetSentMsg: 'Falls ein Konto mit dieser E-Mail existiert, erhältst du einen Reset-Link.',
    statusScheduled: 'Geplant', statusOngoing: 'Laufend', statusEnded: 'Beendet',
    hostBadge: 'Gastgeber',
    hostControls: 'Gastgeber-Kontrollen',
    lockMeeting: 'Meeting sperren', unlockMeeting: 'Entsperren',
    meetingLocked: 'Meeting gesperrt',
    muteAll: 'Alle stummschalten', muteAllDone: 'Signal an Teilnehmer gesendet',
    startRecording: 'Aufnahme starten', stopRecording: 'Aufnahme stoppen',
    recordingActive: 'Aufnahme aktiv',
    endForAll: 'Für alle beenden',
    legal: 'Rechtliches', privacyPolicy: 'Datenschutzerklärung',
    termsOfService: 'Nutzungsbedingungen',
    securitySection: 'Sicherheit', changePassword: 'Passwort ändern',
    successCopied: 'Kopiert!', successSaved: 'Gespeichert',
    meetingCreated: 'Meeting erfolgreich erstellt',
    chat: 'Chat',
    participants: 'Teilnehmer',
    inviteLink: 'Einladungslink',
    linkCopied: 'Link kopiert!',
    chatPlaceholder: 'Ihre Nachricht...',
    noMessages: 'Keine Nachrichten',
    send: 'Senden',
    guestJoin: 'Als Gast beitreten',
    shareCode: 'Code teilen',
    admit: 'Zulassen', reject: 'Ablehnen', admitAll: 'Alle zulassen',
    unmuteSelf: 'Mein Ton aktivieren', screenShare: 'Bildschirmfreigabe',
    waitingForHost: 'Warten Sie auf den Gastgeber, um Sie zuzulassen',
    startInstantMeeting: 'Sofort-Sitzung starten',
    scheduleMeeting: 'Sitzung planen',
    joinViaCode: 'Per Code beitreten',
    noRecentMeetings: 'Keine letzten Sitzungen',
    message: 'Nachricht',
  },
};

// ============================================================
// PREFS
// ============================================================
const loadPrefs = () => { try { return JSON.parse(localStorage.getItem('crux_prefs') || '{}'); } catch { return {}; } };
const savePrefs = (p) => localStorage.setItem('crux_prefs', JSON.stringify(p));

// ============================================================
// COLOR PALETTE (10 gradient themes — matches crux_new_final)
// ============================================================
const COLOR_PALETTES = [
  { id: 'flame',   name: 'Flamme',    start: '#E74C3C', end: '#9B59B6' },
  { id: 'ocean',   name: 'Océan',     start: '#1565C0', end: '#00BCD4' },
  { id: 'forest',  name: 'Forêt',     start: '#2E7D32', end: '#66BB6A' },
  { id: 'sunset',  name: 'Coucher',   start: '#FF6F00', end: '#E91E63' },
  { id: 'candy',   name: 'Candy',     start: '#E91E63', end: '#FF9800' },
  { id: 'night',   name: 'Nuit',      start: '#1A237E', end: '#6A1B9A' },
  { id: 'gold',    name: 'Or',        start: '#F57F17', end: '#FF8F00' },
  { id: 'rose',    name: 'Rose',      start: '#AD1457', end: '#F06292' },
  { id: 'teal',    name: 'Teal',      start: '#00695C', end: '#26A69A' },
  { id: 'storm',   name: 'Orage',     start: '#37474F', end: '#546E7A' },
];
const getPalette = (id) => COLOR_PALETTES.find(p => p.id === id) || COLOR_PALETTES[0];

// ============================================================
// TOAST SYSTEM
// ============================================================
const toastListeners = [];
const showToast = (msg, type = 'success', duration = 3000) => {
  const id = Date.now() + Math.random();
  toastListeners.forEach(cb => cb({ id, msg, type, duration }));
};

function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const handler = (t) => {
      setToasts(p => [...p, t]);
      setTimeout(() => setToasts(p => p.filter(x => x.id !== t.id)), t.duration + 500);
    };
    toastListeners.push(handler);
    return () => { const i = toastListeners.indexOf(handler); if (i > -1) toastListeners.splice(i, 1); };
  }, []);

  const colors = { success: C.success, error: C.error, info: C.iceBlue, warning: C.warning };
  return (
    <div style={{ position: 'fixed', top: 80, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: 'rgba(20,20,20,0.95)', backdropFilter: 'blur(16px)',
          color: 'white', borderRadius: 14, padding: '12px 20px',
          fontSize: 13, fontWeight: 600, fontFamily: 'Poppins, sans-serif',
          borderLeft: `4px solid ${colors[t.type] || C.success}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          animation: 'slideInRight 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          minWidth: 220, maxWidth: 340,
        }}>{t.msg}</div>
      ))}
    </div>
  );
}

// ============================================================
// ADMIN PANEL — Firestore temps réel
// Accès : ?admin=crux2024
// ============================================================
function AdminPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    const unsub = PaymentService.listenAllRequests(reqs => {
      setRequests(reqs);
      setLoading(false);
    });
    return () => unsub?.();
  }, []);

  const handleApprove = async (req) => {
    setApproving(req.id);
    try {
      await PaymentService.approveRequest(req.id);
    } catch { alert('Erreur lors de l\'approbation.'); }
    setApproving('');
  };

  const handleReject = async (req) => {
    if (!window.confirm(`Rejeter la demande de ${req.userName} ?`)) return;
    await PaymentService.rejectRequest(req.id);
  };

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const pending = requests.filter(r => r.status === 'pending');
  const done = requests.filter(r => r.status !== 'pending');

  const statusBadge = (status) => ({
    pending: { bg: 'rgba(255,152,0,0.20)', color: '#FFB74D', label: '⏳ En attente' },
    approved: { bg: 'rgba(39,174,96,0.20)', color: '#27AE60', label: '✅ Approuvé' },
    rejected: { bg: 'rgba(231,76,60,0.20)', color: '#E74C3C', label: '❌ Rejeté' },
  }[status] || { bg: 'rgba(255,255,255,0.08)', color: 'white', label: status });

  const ReqCard = ({ req }) => {
    const s = statusBadge(req.status);
    return (
      <div style={{ background: 'rgba(255,255,255,0.05)', border: req.status === 'pending' ? '1px solid rgba(255,152,0,0.30)' : '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 20px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0 }}>{req.userName}</p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: '2px 0 0' }}>{req.userEmail || '—'}</p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: req.status === 'pending' ? 14 : 0 }}>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: req.plan === 'sub' ? 'rgba(255,64,129,0.20)' : 'rgba(255,152,0,0.15)', color: req.plan === 'sub' ? '#FF4081' : '#FFB74D' }}>{req.plan === 'sub' ? '💎 Mensuel' : '🎟️ Réunion unique'}</span>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.60)', fontFamily: 'monospace' }}>Réf: {req.txRef}</span>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.40)' }}>{req.createdAt?.toLocaleString?.('fr-FR') || '—'}</span>
        </div>
        {req.status === 'approved' && req.code && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#27AE60', flex: 1 }}>{req.code}</span>
            <button onClick={() => copyCode(req.code)} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: copiedCode === req.code ? '#27AE60' : 'rgba(39,174,96,0.20)', color: 'white', fontSize: 12, cursor: 'pointer' }}>{copiedCode === req.code ? '✓' : '📋'}</button>
          </div>
        )}
        {req.status === 'pending' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleApprove(req)} disabled={approving === req.id} style={{ flex: 1, padding: '11px', borderRadius: 12, background: approving === req.id ? 'rgba(39,174,96,0.4)' : 'linear-gradient(135deg,#27AE60,#2ECC71)', border: 'none', color: 'white', fontWeight: 700, fontSize: 13, cursor: approving === req.id ? 'not-allowed' : 'pointer' }}>
              {approving === req.id ? '⏳ Traitement...' : '✅ Approuver & envoyer le code'}
            </button>
            <button onClick={() => handleReject(req)} style={{ padding: '11px 16px', borderRadius: 12, background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.30)', color: '#E74C3C', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>✗</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0D0020', fontFamily: 'Poppins, sans-serif', padding: '28px 20px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#FF4081,#AA00FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💎</div>
          <div>
            <h1 style={{ color: 'white', fontWeight: 800, fontSize: 20, margin: 0 }}>CRUX Admin</h1>
            <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 12, margin: 0 }}>Paiements en temps réel — {pending.length} en attente</p>
          </div>
          {pending.length > 0 && <div style={{ marginLeft: 'auto', width: 24, height: 24, borderRadius: '50%', background: '#FF4081', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 13 }}>{pending.length}</div>}
        </div>

        {loading && <p style={{ color: 'rgba(255,255,255,0.40)', textAlign: 'center', padding: '40px 0' }}>⏳ Connexion à Firestore...</p>}

        {!loading && pending.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <p style={{ color: '#FFB74D', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>⚡ En attente de validation</p>
            {pending.map(r => <ReqCard key={r.id} req={r} />)}
          </div>
        )}

        {!loading && pending.length === 0 && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '32px', textAlign: 'center', marginBottom: 24 }}>
            <p style={{ fontSize: 32, margin: '0 0 8px' }}>✅</p>
            <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 13 }}>Aucune demande en attente</p>
          </div>
        )}

        {done.length > 0 && (
          <div>
            <p style={{ color: 'rgba(255,255,255,0.30)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Historique</p>
            {done.map(r => <ReqCard key={r.id} req={r} />)}
          </div>
        )}

        <p style={{ color: 'rgba(255,255,255,0.20)', fontSize: 11, textAlign: 'center', marginTop: 24 }}>Accès admin privé — ne partagez pas cette URL</p>
      </div>
    </div>
  );
}

// ============================================================
// APP ROOT
// ============================================================
export default function CruxApp() {
  const [prefs, setPrefs] = useState(() => ({
    language: 'fr', notifications: true,
    defaultMic: true, defaultCam: true, videoQuality: 'high', darkMode: false,
    ...loadPrefs(),
  }));
  const T = T_MAP[prefs.language] || T_MAP.fr;
  const updatePref = useCallback((k, v) => setPrefs(p => { const n = { ...p, [k]: v }; savePrefs(n); return n; }), []);

  // Apply dark mode via CSS class (cascades to all components)
  useEffect(() => {
    if (prefs.darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    return () => document.body.classList.remove('dark-mode');
  }, [prefs.darkMode]);

  // Admin panel via ?admin=crux2024
  const isAdminMode = new URLSearchParams(window.location.search).get('admin') === 'crux2024';
  if (isAdminMode) return <AdminPanel />;

  const [page, setPage] = useState('splash');
  const [user, setUser] = useState(null);
  const [meeting, setMeeting] = useState(null);
  const [waiting, setWaiting] = useState(null);
  const [newBadge, setNewBadge] = useState(null);
  const [pendingJoinCode, setPendingJoinCode] = useState(() => {
    return new URLSearchParams(window.location.search).get('join') || null;
  });
  const [showIOSBanner, setShowIOSBanner] = useState(() => {
    return isIOS() && !isInStandaloneMode() && !localStorage.getItem('crux_ios_banner_dismissed');
  });

  useEffect(() => {
    let el = document.getElementById('crux-gs');
    if (!el) { el = document.createElement('style'); el.id = 'crux-gs'; document.head.appendChild(el); }
    el.textContent = GLOBAL_CSS;
    if (!document.getElementById('crux-font')) {
      const link = document.createElement('link');
      link.id = 'crux-font'; link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const unsub = AuthService.onAuthStateChanged(u => {
        setUser(u); setPage(u ? 'dashboard' : 'auth');
      });
      return unsub;
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  // Auto-join from URL param after login
  useEffect(() => {
    if (user && pendingJoinCode && page === 'dashboard') {
      handleJoinByCode(pendingJoinCode, user);
      setPendingJoinCode(null);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user, pendingJoinCode, page]); // eslint-disable-line

  const handleJoinByCode = async (code, u) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    const all = JSON.parse(localStorage.getItem('crux_meetings') || '[]');
    let found = all.find(m => m.id === trimmed || m.roomId === trimmed);
    if (!found) {
      // Cross-device join: meeting exists on another device — join via Zego directly
      found = {
        id: trimmed, roomId: trimmed,
        title: 'Réunion CRUX',
        type: 'temporary', status: 'ongoing',
        isLocked: false, isRecording: false,
        creatorId: null, creatorName: 'Hôte',
        participants: [], participantCount: 1,
        createdAt: new Date().toISOString(),
        description: '',
      };
    } else {
      if (found.isLocked) { showToast('🔒 Cette réunion est verrouillée.', 'error'); return; }
      try { await MeetingService.joinMeeting(found.id, u.uid); } catch {}
    }
    goMeeting({ ...found, createdAt: new Date(found.createdAt) });
  };

  const logout = async () => {
    await AuthService.logout().catch(() => {});
    setUser(null); setMeeting(null); setWaiting(null); setPage('auth');
  };

  const goMeeting = (m) => setWaiting(m);
  const enterMeeting = (m) => {
    if (user) {
      const earned = GamService.joinMeeting(user.uid);
      if (earned.length > 0) setNewBadge(earned[0]);
    }
    setWaiting(null); setMeeting(m);
  };
  const exitMeeting = () => { setMeeting(null); setPage('dashboard'); };

  // Expose nav and user globally
  useEffect(() => { window._cruxGoProfile = () => setPage('profile'); return () => { delete window._cruxGoProfile; }; }, []);
  useEffect(() => { window._cruxGoNotes = () => setPage('notes'); return () => { delete window._cruxGoNotes; }; }, []);
  useEffect(() => { window._cruxUser = user; }, [user]);

  if (page === 'splash') return <><ToastContainer /><SplashScreen T={T} /></>;
  if (!user) return <><ToastContainer /><AuthPage T={T} onSuccess={u => { setUser(u); setPage('dashboard'); }} /></>;
  if (meeting) return <><ToastContainer /><MeetingErrorBoundary onExit={exitMeeting}><MeetingRoom meeting={meeting} user={user} T={T} prefs={prefs} onExit={exitMeeting} /></MeetingErrorBoundary></>;

  if (waiting) return (
    <><ToastContainer />
    <WaitingRoom meeting={waiting} user={user} T={T} prefs={prefs}
      onEnter={() => enterMeeting(waiting)} onLeave={() => setWaiting(null)} />
    </>
  );

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif', background: C.lightBg, minHeight: '100vh', minHeight: '-webkit-fill-available' }}>
      <ToastContainer />
      {newBadge && <BadgeToast badge={newBadge} T={T} onClose={() => setNewBadge(null)} />}
      {showIOSBanner && (
        <IOSInstallBanner onDismiss={() => {
          setShowIOSBanner(false);
          localStorage.setItem('crux_ios_banner_dismissed', '1');
        }} />
      )}
      <Navbar user={user} T={T} prefs={prefs} onLogout={logout}
        onSettings={() => setPage('settings')} onDashboard={() => setPage('dashboard')} />
      <div style={{ paddingTop: '64px' }}>
        {page === 'dashboard' && <Dashboard user={user} T={T} dark={prefs.darkMode} onJoin={goMeeting} onJoinByCode={(code) => handleJoinByCode(code, user)} />}
        {page === 'settings' && (
          <SettingsPage T={T} prefs={prefs} dark={prefs.darkMode} onUpdatePref={updatePref} onBack={() => setPage('dashboard')}
            onPrivacy={() => setPage('privacy')} onTerms={() => setPage('terms')} showToast={showToast} />
        )}
        {page === 'privacy' && <PrivacyPolicyPage T={T} dark={prefs.darkMode} onBack={() => setPage('settings')} />}
        {page === 'terms' && <TermsPage T={T} dark={prefs.darkMode} onBack={() => setPage('settings')} />}
        {page === 'profile' && <ProfilePage user={user} T={T} dark={prefs.darkMode} onBack={() => setPage('dashboard')} onUserUpdated={u => setUser(u)} />}
        {page === 'notes' && <NotesPage user={user} T={T} dark={prefs.darkMode} onBack={() => setPage('dashboard')} />}
      </div>
    </div>
  );
}

// ============================================================
// BADGE TOAST
// ============================================================
function BadgeToast({ badge, T, onClose }) {
  const def = GamService.BADGES[badge] || { icon: '🏅', label: badge };
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
      background: C.primaryGradient, color: 'white',
      borderRadius: 16, padding: '16px 24px',
      boxShadow: `0 16px 48px ${C.fireGlow}`,
      display: 'flex', alignItems: 'center', gap: 12,
      animation: 'slideInRight 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      fontFamily: 'Poppins, sans-serif',
    }}>
      <span style={{ fontSize: 36 }}>{def.icon}</span>
      <div>
        <p style={{ fontWeight: 800, fontSize: 14, margin: 0 }}>{T.badgeEarned}</p>
        <p style={{ fontSize: 12, margin: 0, opacity: 0.9 }}>{def.label}</p>
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18, padding: 4 }}>×</button>
    </div>
  );
}

// ============================================================
// SPLASH SCREEN — dark purple + particles (crux_new_final style)
// ============================================================
function SplashScreen({ T }) {
  const [phase, setPhase] = useState(0);
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setAngle(a => (a + 0.5) % 360), 40);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);
    const t2 = setTimeout(() => setPhase(2), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // 8 particles like Flutter _SplashParticle
  const particles = Array.from({ length: 8 }, (_, i) => {
    const rng = (seed) => { let x = Math.sin(seed) * 10000; return x - Math.floor(x); };
    return {
      x: rng(i * 17 + 3) * 100,
      y: rng(i * 17 + 7) * 100,
      size: 12 + rng(i * 17 + 11) * 50,
      phase: rng(i * 17 + 13),
      pink: i % 2 === 0,
    };
  });

  const rad = (angle * Math.PI) / 180;
  const bgStyle = {
    background: `linear-gradient(${angle}deg, #0D0020 0%, #4A0050 30%, #AA003B 70%, #220040 100%)`,
  };

  return (
    <div style={{
      minHeight: '100vh', height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative',
      fontFamily: 'Poppins, sans-serif', transition: 'background 0.1s', ...bgStyle,
    }}>
      {/* 3 ripple rings */}
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute', top: '50%', left: '50%',
          borderRadius: '50%', border: `2px solid rgba(255,64,129,${0.3 - i * 0.08})`,
          animation: `rippleGrow ${2.4 + i * 0.8}s ease-out infinite`,
          animationDelay: `${i * 0.6}s`,
          width: 120, height: 120,
          transform: 'translate(-50%,-50%)',
          pointerEvents: 'none',
        }} />
      ))}
      {/* 8 floating particles */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: '50%',
          background: p.pink ? '#FF4081' : '#AA00FF',
          opacity: 0.04 + (p.phase * 0.07),
          animation: `particleFloat ${5 + p.phase * 3}s ease-in-out infinite`,
          animationDelay: `${p.phase * 3}s`,
          pointerEvents: 'none',
        }} />
      ))}
      {/* Logo */}
      <div style={{
        transform: phase >= 1 ? 'scale(1) rotate(0deg)' : 'scale(0) rotate(-8deg)',
        opacity: phase >= 1 ? 1 : 0,
        transition: 'all 0.9s cubic-bezier(0.34,1.56,0.64,1)',
        textAlign: 'center', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          width: 150, height: 150, borderRadius: 42, marginBottom: 44,
          background: 'linear-gradient(135deg,#FF4081,#AA00FF)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 40px rgba(255,64,129,0.6), 0 0 60px rgba(170,0,255,0.4)',
          animation: 'pulse 2.5s ease-in-out infinite',
        }}>
          <svg width="76" height="76" viewBox="0 0 100 100">
            <rect x="8" y="28" width="55" height="44" rx="10" fill="white"/>
            <circle cx="35" cy="50" r="14" fill="url(#sg)"/>
            <circle cx="35" cy="50" r="7" fill="white"/>
            <polygon points="63,34 90,20 90,80 63,66" fill="white"/>
            <defs><linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#FF4081"/><stop offset="100%" stopColor="#AA00FF"/></linearGradient></defs>
          </svg>
        </div>
        {/* CRUX with gradient shimmer */}
        <div style={{
          fontSize: 72, fontWeight: 900, letterSpacing: 8, lineHeight: 1, margin: '0 0 10px',
          background: 'linear-gradient(90deg,#FF4081,#ffffff,#AA00FF)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.1s',
        }}>CRUX</div>
        <p style={{
          fontSize: 15, fontWeight: 400, color: 'rgba(255,255,255,0.6)',
          letterSpacing: 2, margin: '0 0 60px',
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.25s',
        }}>{T.appTagline}</p>
        {/* Spinner like Flutter CircularProgressIndicator */}
        <div style={{
          opacity: phase >= 2 ? 1 : 0, transition: 'opacity 0.5s 0.5s',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#FF4081',
            animation: 'spin 0.9s linear infinite',
          }} />
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', letterSpacing: 1.5, margin: 0 }}>
            {T.loading}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ANIMATED CIRCLES (crux_new_final auth background)
// ============================================================
function AnimatedCircles() {
  const circles = [
    { size: 320, top: '-80px', left: '-80px', color: C.pink, op: 0.12, dur: '8s' },
    { size: 260, bottom: '-60px', right: '-60px', color: C.purpleBright, op: 0.10, dur: '11s', delay: '2s' },
    { size: 180, top: '40%', right: '8%', color: C.primary, op: 0.09, dur: '14s', delay: '4s' },
    { size: 140, bottom: '25%', left: '6%', color: C.violetLight, op: 0.12, dur: '9s', delay: '1s' },
    { size: 90, top: '20%', left: '50%', color: C.pink, op: 0.08, dur: '16s', delay: '5s' },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {circles.map((b, i) => (
        <div key={i} style={{
          position: 'absolute', width: b.size, height: b.size, borderRadius: '50%',
          background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)`,
          opacity: b.op, top: b.top, bottom: b.bottom, left: b.left, right: b.right,
          filter: 'blur(50px)',
          animation: `blobFloat ${b.dur} ease-in-out infinite ${b.delay || ''}`,
        }} />
      ))}
    </div>
  );
}

function SmokeBlobs() { return <AnimatedCircles />; }

// ============================================================
// NAVBAR
// ============================================================
function Navbar({ user, T, prefs, onLogout, onSettings, onDashboard }) {
  const [showNotif, setShowNotif] = useState(false);
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 64, zIndex: 1000,
      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${C.border}`, boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', fontFamily: 'Poppins, sans-serif',
    }}>
      <div onClick={onDashboard} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
        <CruxLogo size={36} />
        <span style={{ fontSize: 20, fontWeight: 900, background: C.primaryGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>CRUX</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: C.textSecondary, marginRight: 4 }}>{user.name}</span>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowNotif(v => !v)} style={navIconBtn} title={T.notifications}>
            🔔
            {prefs.notifications && <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: C.flamePrimary, border: '2px solid white' }} />}
          </button>
          {showNotif && (
            <div style={notifPanel} onMouseLeave={() => setShowNotif(false)}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 12 }}>{T.notifications}</p>
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                <p style={{ fontSize: 13, color: C.textTertiary }}>{T.noNotif}</p>
              </div>
            </div>
          )}
        </div>
        <button onClick={onSettings} style={navIconBtn} title={T.settings}>⚙️</button>
        <button onClick={() => window._cruxGoProfile?.()} style={navIconBtn} title="Profil">👤</button>
        <button onClick={onLogout} style={{
          padding: '8px 18px', background: C.primaryGradient, color: 'white',
          border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13,
          cursor: 'pointer', fontFamily: 'Poppins, sans-serif', boxShadow: `0 4px 14px ${C.fireGlow}`,
        }}>{T.logout}</button>
      </div>
    </nav>
  );
}

// ============================================================
// FORGOT PASSWORD MODAL
// ============================================================
function ForgotPasswordModal({ T, onClose }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    setLoading(true); setError('');
    try {
      await AuthService.resetPassword(email);
      setSent(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <CruxModal onClose={onClose}>
      <ModalHeader icon="🔑" title={T.resetPasswordTitle} />
      {sent ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>📧</div>
          <h4 style={{ fontWeight: 700, color: C.success, margin: '0 0 8px' }}>{T.resetSent}</h4>
          <p style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.6 }}>{T.resetSentMsg}</p>
          <button onClick={onClose} style={{ ...primBtn, marginTop: 20 }}>{T.cancel}</button>
        </div>
      ) : (
        <>
          <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>{T.resetPasswordDesc}</p>
          <Field icon="✉️" type="email" placeholder={T.email} value={email} onChange={setEmail} />
          {error && <div style={{ background: '#FEF2F2', border: `1px solid ${C.error}30`, color: C.error, borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 500, marginTop: 10 }}>⚠️ {error}</div>}
          <ModalActions>
            <PrimaryBtn onClick={handleReset} disabled={loading || !email.trim()}>
              {loading ? '...' : T.resetPasswordBtn}
            </PrimaryBtn>
            <SecondaryBtn onClick={onClose}>{T.cancel}</SecondaryBtn>
          </ModalActions>
        </>
      )}
    </CruxModal>
  );
}

// ============================================================
// AUTH PAGE — réplique exacte Flutter (login_screen + signup_screen)
// ============================================================
function GlassTextField({ icon, type = 'text', placeholder, label, value, onChange, suffix, autoFocus }) {
  return (
    <div style={{ position: 'relative', marginBottom: 0 }}>
      {icon && <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, opacity: 0.7, pointerEvents: 'none', zIndex: 1 }}>{icon}</span>}
      <input
        type={type} placeholder={placeholder || label} value={value}
        onChange={e => onChange(e.target.value)} autoFocus={autoFocus}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '15px 14px', paddingLeft: icon ? 44 : 14, paddingRight: suffix ? 52 : 14,
          background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 14, color: 'white', fontSize: 15,
          outline: 'none', fontFamily: 'Poppins, sans-serif',
        }}
        onFocus={e => { e.target.style.border = '1.5px solid #FF4081'; }}
        onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.25)'; }}
      />
      {suffix && <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}>{suffix}</span>}
    </div>
  );
}

// Floating circle for auth background (Flutter _FloatingCircle)
function FloatingAuthCircle({ size, top, left, right, bottom, color, dur, delay }) {
  return (
    <div style={{
      position: 'absolute', width: size, height: size, borderRadius: '50%',
      background: color, opacity: 0.08, filter: 'blur(40px)',
      top, left, right, bottom,
      animation: `blobFloat ${dur} ease-in-out infinite`,
      animationDelay: delay || '0s',
      pointerEvents: 'none',
    }} />
  );
}

function AuthPage({ T, onSuccess }) {
  const [mode, setMode] = useState('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [angle, setAngle] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 80);
    const t = setInterval(() => setAngle(a => (a + 0.4) % 360), 40);
    return () => clearInterval(t);
  }, []);

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (mode === 'signUp') {
      if (!Validators.name(name)) { setError(T.nameRequired); return; }
      if (!Validators.email(email)) { setError(T.emailInvalid); return; }
      if (!Validators.password(pass)) { setError(T.passwordTooShort); return; }
      if (pass !== confirmPass) { setError(T.passwordMismatch); return; }
    } else {
      if (!Validators.email(email)) { setError(T.emailInvalid); return; }
    }
    setLoading(true);
    try {
      const u = mode === 'signUp'
        ? await AuthService.register(email, pass, name)
        : await AuthService.login(email, pass, rememberMe);
      onSuccess(u);
    } catch (err) { setError(err.message || 'Erreur'); }
    finally { setLoading(false); }
  };

  const switchMode = (m) => { setMode(m); setError(''); setName(''); setPass(''); setConfirmPass(''); };

  const bgGrad = `linear-gradient(${angle}deg, #1A0030, #6B003B, #CC0033, #3D0070)`;
  const isLogin = mode === 'signIn';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Poppins, sans-serif', background: bgGrad, position: 'relative', overflow: 'hidden' }}>
      {/* Floating circles — Flutter _FloatingCircle */}
      <FloatingAuthCircle size={300} top="-80px" left="-80px" color="#FF4081" dur="8s" />
      <FloatingAuthCircle size={250} bottom="-60px" right="-60px" color="#AA00FF" dur="11s" delay="2s" />
      <FloatingAuthCircle size={180} top="40%" right="5%" color="#E74C3C" dur="14s" delay="4s" />
      <FloatingAuthCircle size={140} bottom="25%" left="5%" color="#BB8FCE" dur="9s" delay="1s" />
      <FloatingAuthCircle size={90} top="20%" left="48%" color="#FF4081" dur="16s" delay="5s" />

      {showForgot && <ForgotPasswordModal T={T} onClose={() => setShowForgot(false)} />}

      <div style={{
        width: '100%', maxWidth: 480, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px', position: 'relative', zIndex: 1,
        minHeight: '100vh',
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.25)', borderRadius: 28, padding: '36px 28px',
          width: '100%', boxShadow: '0 30px 80px rgba(0,0,0,0.3)',
          transform: mounted ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(20px)',
          opacity: mounted ? 1 : 0, transition: 'all 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 22, margin: '0 auto 16px',
              background: 'linear-gradient(135deg,#FF4081,#AA00FF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 30px rgba(255,64,129,0.5), 0 0 0 4px rgba(255,64,129,0.15)',
              animation: 'pulse 2s ease-in-out infinite',
            }}>
              {isLogin
                ? <svg width="40" height="40" viewBox="0 0 100 100"><rect x="10" y="28" width="55" height="44" rx="10" fill="white"/><circle cx="37" cy="50" r="14" fill="url(#ag)"/><circle cx="37" cy="50" r="7" fill="white"/><polygon points="65,34 90,22 90,78 65,66" fill="white"/><defs><linearGradient id="ag" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#FF4081"/><stop offset="100%" stopColor="#AA00FF"/></linearGradient></defs></svg>
                : <span style={{ fontSize: 40 }}>🪪</span>
              }
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', color: 'white', letterSpacing: 0.5 }}>
              {isLogin ? 'Connexion' : 'Créer un compte'}
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              {isLogin ? 'Bienvenue sur CRUX' : 'Rejoignez CRUX dès maintenant'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!isLogin && (
              <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateX(0)' : 'translateX(-30px)', transition: 'all 0.5s 0.1s' }}>
                <GlassTextField icon="👤" placeholder="Nom complet" label={T.fullName} value={name} onChange={setName} />
              </div>
            )}
            <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateX(0)' : `translateX(${isLogin ? '-' : ''}30px)`, transition: 'all 0.5s 0.15s' }}>
              <GlassTextField icon="✉️" type="email" placeholder="email@exemple.com" label={T.email} value={email} onChange={setEmail} />
            </div>
            <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateX(0)' : 'translateX(-30px)', transition: 'all 0.5s 0.2s' }}>
              <GlassTextField icon="🔒" type={showPass ? 'text' : 'password'} placeholder="••••••••" label={T.password} value={pass} onChange={setPass}
                suffix={<button type="button" onClick={() => setShowPass(v => !v)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>{showPass ? '🙈' : '👁'}</button>}
              />
            </div>
            {!isLogin && (
              <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateX(0)' : 'translateX(30px)', transition: 'all 0.5s 0.25s' }}>
                <GlassTextField icon="🔒" type={showConfirmPass ? 'text' : 'password'} placeholder="••••••••" label={T.confirmPassword} value={confirmPass} onChange={setConfirmPass}
                  suffix={<button type="button" onClick={() => setShowConfirmPass(v => !v)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>{showConfirmPass ? '🙈' : '👁'}</button>}
                />
              </div>
            )}
            {isLogin && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ accentColor: '#FF4081' }} />
                  {T.rememberMe}
                </label>
                <button type="button" onClick={() => setShowForgot(true)} style={{ background: 'none', border: 'none', color: '#FF4081', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', textDecoration: 'underline' }}>
                  {T.forgotPassword}
                </button>
              </div>
            )}
            {error && (
              <div style={{ background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.4)', color: '#FF8A80', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>⚠️ {error}</div>
            )}
            {/* Main button */}
            <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.5s 0.3s' }}>
              <button type="submit" disabled={loading} style={{
                width: '100%', height: 56, border: 'none', borderRadius: 16,
                background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#FF4081,#AA00FF)',
                color: 'white', fontSize: 17, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Poppins, sans-serif', letterSpacing: 0.5,
                boxShadow: loading ? 'none' : '0 8px 28px rgba(255,64,129,0.5)',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {loading
                  ? <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.9s linear infinite' }} />
                  : (isLogin ? T.signIn : T.signUp)
                }
              </button>
            </div>
          </form>

          {/* Footer link */}
          <div style={{ textAlign: 'center', marginTop: 20, opacity: mounted ? 1 : 0, transition: 'opacity 0.5s 0.4s' }}>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
              {isLogin ? "Pas encore de compte ? " : "Déjà un compte ? "}
            </span>
            <button onClick={() => switchMode(isLogin ? 'signUp' : 'signIn')} style={{
              background: 'none', border: 'none', color: '#FF4081', fontWeight: 700,
              fontSize: 14, cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
              textDecoration: 'underline', textDecorationColor: '#FF4081',
            }}>
              {isLogin ? T.signUp : T.signIn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Legacy alias
function DarkField({ icon, type = 'text', placeholder, value, onChange, paddingRight, autoFocus }) {
  return <GlassTextField icon={icon} type={type} placeholder={placeholder} value={value} onChange={onChange} autoFocus={autoFocus} />;
}

// ============================================================
// DASHBOARD — réplique exacte Flutter home_screen.dart
// ============================================================
function ActionCard({ icon, title, subtitle, gradient, onTap }) {
  return (
    <div onClick={onTap} style={{
      background: 'white', borderRadius: 18, padding: '14px 14px',
      border: '1px solid rgba(0,0,0,0.06)',
      boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.06)'; }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1A1A' }}>{title}</div>
        <div style={{ fontSize: 11, color: '#999' }}>{subtitle}</div>
      </div>
    </div>
  );
}

function Dashboard({ user, T, dark, onJoin, onJoinByCode }) {
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [creating, setCreating] = useState(false);
  const [meetingName, setMeetingName] = useState('');
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState('temporary');

  useEffect(() => { loadMeetings(); }, [user.uid]); // eslint-disable-line

  const loadMeetings = async () => {
    setLoadingMeetings(true);
    try { setMeetings(await MeetingService.getUserMeetings(user.uid)); }
    catch { } finally { setLoadingMeetings(false); }
  };

  const createMeeting = async () => {
    const name = meetingName.trim() || `Réunion de ${user.name.split(' ')[0]}`;
    setCreating(true);
    try {
      const m = await MeetingService.createMeeting(name, user.uid, user.name, 'temporary');
      setMeetings(p => [m, ...p]);
      setMeetingName('');
      showToast(T.meetingCreated, 'success');
      onJoin(m);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setCreating(false); }
  };

  const createScheduled = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const m = await MeetingService.createMeeting(newTitle, user.uid, user.name, newType, newDesc);
      setMeetings(p => [m, ...p]);
      setNewTitle(''); setNewDesc(''); setShowSchedule(false);
      showToast(T.meetingCreated, 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { setCreating(false); }
  };

  const joinByCode = () => {
    const code = joinCode.trim(); if (!code) return;
    onJoinByCode(code); setJoinCode(''); setShowJoinDialog(false);
  };

  const bg = dark ? '#0D0020' : '#F8F8F8';
  const cardBg = dark ? '#1A0A2E' : '#FFFFFF';
  const textPri = dark ? '#F0EAF8' : '#1A1A1A';
  const textSec = dark ? '#C0A8E0' : '#555';
  const border = dark ? 'rgba(255,255,255,0.1)' : '#EBEBEB';

  const quickBtnStyle = (gradient, textColor = 'white') => ({
    flex: 1, padding: '16px 12px', background: gradient, border: 'none', borderRadius: 16,
    cursor: 'pointer', fontFamily: 'Poppins, sans-serif', color: textColor,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)', transition: 'transform 0.15s, box-shadow 0.15s',
    minWidth: 0,
  });

  return (
    <div className="crux-scroll" style={{ background: bg, minHeight: 'calc(100vh - 64px)', fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 48px' }}>

        {/* Greeting */}
        <p style={{ fontSize: 22, fontWeight: 700, color: textPri, margin: '0 0 4px' }}>
          Bonjour, {user.name.split(' ')[0]} 👋
        </p>
        <p style={{ fontSize: 14, color: textSec, margin: '0 0 28px' }}>Prêt pour votre prochaine réunion ?</p>

        {/* Primary action buttons — Zoom-style row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
          <button style={quickBtnStyle('linear-gradient(135deg,#E74C3C,#C0392B)')}
            onClick={createMeeting} disabled={creating}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 20px rgba(231,76,60,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.12)'; }}>
            <span style={{ fontSize: 28 }}>📹</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{creating ? '...' : 'Nouvelle réunion'}</span>
          </button>
          <button style={quickBtnStyle(dark ? '#2D1050' : 'white', dark ? '#F0EAF8' : '#1A1A1A')}
            onClick={() => setShowJoinDialog(true)}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform=''; }}>
            <span style={{ fontSize: 28 }}>🔗</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Rejoindre</span>
          </button>
          <button style={quickBtnStyle(dark ? '#2D1050' : 'white', dark ? '#F0EAF8' : '#1A1A1A')}
            onClick={() => setShowSchedule(true)}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform=''; }}>
            <span style={{ fontSize: 28 }}>📅</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Planifier</span>
          </button>
          <button style={quickBtnStyle(dark ? '#2D1050' : 'white', dark ? '#F0EAF8' : '#1A1A1A')}
            onClick={() => window._cruxGoProfile?.()}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform=''; }}>
            <span style={{ fontSize: 28 }}>👤</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Profil</span>
          </button>
          <button style={quickBtnStyle(dark ? '#2D1050' : 'white', dark ? '#F0EAF8' : '#1A1A1A')}
            onClick={() => window._cruxGoNotes?.()}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform=''; }}>
            <span style={{ fontSize: 28 }}>📝</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Mes notes</span>
          </button>
        </div>

        {/* Recent meetings */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: textPri, margin: 0 }}>
            Réunions récentes {!loadingMeetings && meetings.length > 0 && <span style={{ fontSize: 12, fontWeight: 400, color: textSec }}>({meetings.length})</span>}
          </p>
        </div>

        {loadingMeetings ? (
          <div style={{ textAlign: 'center', padding: 48, color: textSec }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${dark?'rgba(255,255,255,0.1)':'#EEE'}`, borderTopColor: '#E74C3C', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          </div>
        ) : meetings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: cardBg, borderRadius: 20, border: `1.5px dashed ${border}` }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📅</div>
            <p style={{ fontWeight: 600, color: textPri, margin: '0 0 6px' }}>{T.noMeetings}</p>
            <p style={{ color: textSec, fontSize: 13, margin: '0 0 20px' }}>{T.noMeetingsHint}</p>
            <button onClick={createMeeting} style={{ padding: '11px 28px', background: 'linear-gradient(135deg,#E74C3C,#8E44AD)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
              🚀 Démarrer une réunion
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {meetings.map(m => <MeetingCard key={m.id} meeting={m} T={T} dark={dark} onJoin={() => onJoin(m)} />)}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {showJoinDialog && (
        <CruxModal onClose={() => setShowJoinDialog(false)}>
          <ModalHeader icon="🔗" title="Rejoindre une réunion" />
          <p style={{ color: C.textSecondary, fontSize: 13, margin: '0 0 14px' }}>Entrez l'ID de la réunion partagé par l'hôte</p>
          <Field placeholder={T.enterCode} value={joinCode} onChange={setJoinCode} autoFocus onKeyDown={e => e.key === 'Enter' && joinByCode()} />
          <ModalActions>
            <PrimaryBtn onClick={joinByCode} disabled={!joinCode.trim()}>Rejoindre</PrimaryBtn>
            <SecondaryBtn onClick={() => setShowJoinDialog(false)}>{T.cancel}</SecondaryBtn>
          </ModalActions>
        </CruxModal>
      )}
      {showSchedule && (
        <CruxModal onClose={() => setShowSchedule(false)}>
          <ModalHeader icon="📅" title={T.schedule} />
          <Field placeholder={T.meetingTitle} value={newTitle} onChange={setNewTitle} autoFocus />
          <div style={{ marginTop: 12 }}><textarea placeholder={T.meetingDesc} value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} /></div>
          <div style={{ marginTop: 12 }}><select value={newType} onChange={e => setNewType(e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}><option value="temporary">{T.temporary}</option><option value="persistent">{T.persistent}</option></select></div>
          <ModalActions>
            <PrimaryBtn onClick={createScheduled} disabled={creating || !newTitle.trim()}>{creating ? '...' : T.create}</PrimaryBtn>
            <SecondaryBtn onClick={() => setShowSchedule(false)}>{T.cancel}</SecondaryBtn>
          </ModalActions>
        </CruxModal>
      )}
    </div>
  );
}

function StatChip({ icon, value, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>{icon} {value}</p>
      <p style={{ fontSize: 11, margin: 0, opacity: 0.8 }}>{label}</p>
    </div>
  );
}

// ============================================================
// MEETING CARD
// ============================================================
function MeetingCard({ meeting, T, dark, onJoin }) {
  const ago = Math.floor((Date.now() - meeting.createdAt) / 60000);
  const isPersistent = meeting.type === 'persistent';
  const status = meeting.status || 'scheduled';
  const statusColors = { scheduled: C.iceBlue, ongoing: C.success, ended: C.textTertiary };
  const statusLabels = { scheduled: T.statusScheduled, ongoing: T.statusOngoing, ended: T.statusEnded };
  const statusColor = statusColors[status] || C.textTertiary;
  const isEnded = status === 'ended';
  const cardBg = dark ? '#1A0A2E' : '#FFFFFF';
  const textPri = dark ? '#F0EAF8' : '#1A1A1A';
  const textSec = dark ? '#C0A8E0' : '#666';
  const border = dark ? 'rgba(255,255,255,0.08)' : '#F0F0F0';
  return (
    <div style={{ background: cardBg, borderRadius: 14, padding: '16px 18px', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'Poppins, sans-serif', opacity: isEnded ? 0.6 : 1, transition: 'background 0.15s' }}
      onMouseEnter={e => !isEnded && (e.currentTarget.style.background = dark ? '#210C40' : '#FAFAFA')}
      onMouseLeave={e => (e.currentTarget.style.background = cardBg)}
    >
      <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#E74C3C,#8E44AD)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📹</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: textPri, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {meeting.isLocked && '🔒 '}{meeting.title}
        </p>
        <p style={{ fontSize: 12, color: textSec, margin: 0 }}>
          <span style={{ color: statusColors[status] || textSec }}>● {statusLabels[status]}</span>
          <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
          {ago > 0 ? `Il y a ${ago} min` : "À l'instant"}
        </p>
      </div>
      {!isEnded && (
        <button onClick={onJoin} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#E74C3C,#8E44AD)', color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', flexShrink: 0 }}>
          Rejoindre
        </button>
      )}
    </div>
  );
}

// ============================================================
// WAITING ROOM
// ============================================================
function WaitingRoom({ meeting, user, T, prefs, onEnter, onLeave }) {
  const [copied, setCopied] = useState(false);
  const [glowPulse, setGlowPulse] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setGlowPulse(p => !p), 1800);
    return () => clearInterval(t);
  }, []);

  const isHost = meeting.hostId === user.id || meeting.host === user.name;

  const copyCode = () => {
    navigator.clipboard?.writeText(meeting.id).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="crux-fullscreen" style={{
      fontFamily: 'Poppins, sans-serif',
      background: 'linear-gradient(160deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px 20px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Back button */}
      <button onClick={onLeave} style={{
        position: 'absolute', top: 20, left: 20, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', background: 'rgba(255,255,255,0.10)',
        backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.20)',
        borderRadius: 12, color: 'white', fontWeight: 600, fontSize: 13,
        cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
      }}>← Retour</button>

      {/* Host badge */}
      {isHost && (
        <div style={{
          position: 'absolute', top: 20, right: 20, zIndex: 10,
          background: 'linear-gradient(135deg, #E74C3C, #8E44AD)',
          borderRadius: 20, padding: '6px 14px',
          color: 'white', fontWeight: 700, fontSize: 12, letterSpacing: 0.5,
        }}>HÔTE</div>
      )}

      {/* Meeting name title */}
      <p style={{
        color: 'rgba(255,255,255,0.60)', fontSize: 13, fontWeight: 500,
        marginBottom: 8, marginTop: 0, letterSpacing: 0.3,
      }}>{meeting.title}</p>

      {/* Center card */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 24, padding: '40px 32px',
        maxWidth: 400, width: '100%', textAlign: 'center',
        boxShadow: '0 24px 60px rgba(0,0,0,0.40)',
      }}>
        {/* Gradient video icon circle with glow */}
        <div style={{
          width: 90, height: 90, borderRadius: '50%',
          background: 'linear-gradient(135deg, #E74C3C, #8E44AD)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: glowPulse
            ? '0 0 0 16px rgba(231,76,60,0.12), 0 0 40px rgba(142,68,173,0.35)'
            : '0 0 0 8px rgba(231,76,60,0.08), 0 0 20px rgba(142,68,173,0.20)',
          transition: 'box-shadow 1.8s ease-in-out',
        }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="white">
            <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/>
          </svg>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'white', margin: '0 0 6px' }}>Réunion prête</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', margin: '0 0 28px' }}>
          Rejoignez dès maintenant
        </p>

        {/* Meeting ID chip */}
        <button onClick={copyCode} style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: copied ? 'rgba(39,174,96,0.15)' : 'rgba(255,255,255,0.08)',
          border: copied ? '1px solid rgba(39,174,96,0.40)' : '1px solid rgba(255,255,255,0.15)',
          borderRadius: 12, padding: '12px 20px',
          color: copied ? '#27AE60' : 'rgba(255,255,255,0.85)',
          fontSize: 15, fontWeight: 700, fontFamily: 'monospace',
          letterSpacing: 2, cursor: 'pointer', marginBottom: 28,
          transition: 'all 0.25s',
        }}>
          <span>{meeting.id}</span>
          <span style={{ fontSize: 14, fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: copied ? '#27AE60' : 'rgba(255,255,255,0.45)', letterSpacing: 0 }}>
            {copied ? '✓ Copié' : '📋'}
          </span>
        </button>

        {/* Join button */}
        <button onClick={onEnter} style={{
          width: '100%', height: 56,
          background: '#E74C3C',
          border: 'none', borderRadius: 16,
          color: 'white', fontSize: 16, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
          boxShadow: '0 8px 24px rgba(231,76,60,0.40)',
          marginBottom: 14, transition: 'transform 0.15s, box-shadow 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(231,76,60,0.50)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(231,76,60,0.40)'; }}
        >
          Rejoindre la réunion
        </button>

        {/* Quit text button */}
        <button onClick={onLeave} style={{
          background: 'none', border: 'none',
          color: 'rgba(255,255,255,0.45)', fontSize: 14,
          fontFamily: 'Poppins, sans-serif', cursor: 'pointer',
          textDecoration: 'underline', padding: '4px 0',
        }}>
          Quitter sans rejoindre
        </button>
      </div>

      {/* Copy invite link */}
      <button onClick={() => {
        const link = `${window.location.origin}${window.location.pathname}?join=${meeting.id}`;
        navigator.clipboard?.writeText(link).catch(() => {});
        showToast('🔗 Lien d\'invitation copié !', 'success');
      }} style={{
        marginTop: 20,
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 12, padding: '12px 24px',
        color: 'rgba(255,255,255,0.70)', fontSize: 13,
        fontFamily: 'Poppins, sans-serif', fontWeight: 600,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        🔗 Copier le lien d'invitation
      </button>
    </div>
  );
}

// ============================================================
// HOST CONTROLS PANEL
// ============================================================
function HostControlsPanel({ meeting, T, onClose, onEndForAll }) {
  const [isLocked, setIsLocked] = useState(meeting.isLocked || false);
  const [isRecording, setIsRecording] = useState(meeting.isRecording || false);
  const [muteMsg, setMuteMsg] = useState('');

  const toggleLock = async () => {
    const val = await MeetingService.toggleLock(meeting.id);
    setIsLocked(val);
  };
  const toggleRec = async () => {
    const val = await MeetingService.toggleRecording(meeting.id);
    setIsRecording(val);
  };
  const muteAll = async () => {
    await FirebaseMeetingService.muteAllParticipants(meeting.id);
    setMuteMsg(T.muteAllDone);
    setTimeout(() => setMuteMsg(''), 3000);
  };

  return (
    <div style={{
      position: 'absolute', left: 0, top: 0, bottom: 0, width: 280, zIndex: 250,
      background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)',
      boxShadow: '8px 0 32px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      borderRight: '1px solid rgba(255,255,255,0.1)',
    }}>
      <div style={{ padding: '60px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'white' }}>👑 {T.hostControls}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>×</button>
      </div>
      {/* Live badge + participant count */}
      <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ background: '#E74C3C', color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, letterSpacing: 1 }}>● LIVE</span>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>👥 {meeting.participantCount || 1} participant(s)</span>
      </div>
      <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <HostCtrlBtn icon={isLocked ? '🔓' : '🔒'} label={isLocked ? T.unlockMeeting : T.lockMeeting} color={isLocked ? C.warning : C.iceBlue} onClick={toggleLock} />
        <HostCtrlBtn icon="🔇" label={T.muteAll} color={C.accentOrange} onClick={muteAll} />
        {muteMsg && <p style={{ color: C.accentGolden, fontSize: 12, textAlign: 'center', margin: 0 }}>{muteMsg}</p>}
        <HostCtrlBtn icon={isRecording ? '⏹' : '⏺'} label={isRecording ? T.stopRecording : T.startRecording} color={isRecording ? C.error : C.success} onClick={toggleRec} active={isRecording} />
        {isRecording && <p style={{ color: C.error, fontSize: 12, textAlign: 'center', margin: 0, animation: 'recPulse 2s infinite' }}>● {T.recordingActive}</p>}
        <div style={{ flex: 1 }} />
        <HostCtrlBtn icon="📞" label={T.endForAll} color={C.error} onClick={onEndForAll} />
      </div>
    </div>
  );
}

function HostCtrlBtn({ icon, label, color, onClick, active }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '12px 16px', background: active ? `${color}25` : 'rgba(255,255,255,0.07)',
      border: `1px solid ${active ? color : 'rgba(255,255,255,0.1)'}`, borderRadius: 12,
      color: active ? color : 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
      fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', gap: 10,
      transition: 'all 0.2s',
    }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      {label}
    </button>
  );
}

// ============================================================
// PAYMENT WALL — Firestore-backed, real-time code delivery
// ============================================================
const FREE_MINUTES = 90;
const DJAMO_PAYMENT_URL = 'https://pay.djamo.com/qxmvj';

const ProService = {
  PRICE_XOF: 25000,
  FREE_MINUTES: 90,
  getStatus(userId) {
    try { return JSON.parse(localStorage.getItem(`crux_pro_${userId}`) || 'null'); } catch { return null; }
  },
  isActive(userId, meetingId) {
    const s = this.getStatus(userId);
    if (!s) return false;
    if (s.plan === 'sub' && Date.now() < s.expiresAt) return true;
    if (s.plan === 'single' && s.meetingId === meetingId && Date.now() < s.expiresAt) return true;
    return false;
  },
  activate(userId, plan, meetingId) {
    const expiresAt = plan === 'sub'
      ? Date.now() + 30 * 24 * 60 * 60 * 1000
      : Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(`crux_pro_${userId}`, JSON.stringify({ plan, meetingId, expiresAt }));
  },
  async isPro(uid) {
    if (this.isActive(uid, null)) return true;
    try {
      const { doc: fsDoc, getDoc, getFirestore } = await import('firebase/firestore');
      const snap = await getDoc(fsDoc(getFirestore(), 'users', uid));
      if (!snap.exists()) return false;
      const d = snap.data();
      if (!d.isPro) return false;
      if (d.proExpiry && d.proExpiry.toDate() < new Date()) return false;
      return true;
    } catch { return false; }
  },
  openPayment() { window.open(DJAMO_PAYMENT_URL, '_blank'); },
};

// steps: 'plans' | 'submitted' | 'waiting' | 'success'
function PaymentWall({ user, meeting, onPaid, onExit }) {
  const [step, setStep] = useState(() =>
    ProService.isActive(user.uid, meeting.id) ? 'success' : 'plans'
  );
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [txRef, setTxRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [requestId, setRequestId] = useState(null);
  const [approvedCode, setApprovedCode] = useState(null);
  const [copied, setCopied] = useState(false);

  // Auto-unlock if already pro
  useEffect(() => {
    if (ProService.isActive(user.uid, meeting.id)) onPaid();
  }, []); // eslint-disable-line

  // Écoute temps réel : dès que l'admin approuve → code apparaît automatiquement
  useEffect(() => {
    if (!requestId) return;
    const unsub = PaymentService.listenUserRequests(user.uid, (reqs) => {
      const req = reqs.find(r => r.id === requestId);
      if (req?.status === 'approved' && req.code) {
        setApprovedCode(req.code);
        setStep('success');
      }
    });
    return () => unsub?.();
  }, [requestId]); // eslint-disable-line

  const handlePay = (plan) => {
    setSelectedPlan(plan);
    window.open(DJAMO_PAYMENT_URL, '_blank');
    setStep('submitted');
  };

  const handleSubmitProof = async () => {
    if (!txRef.trim()) { setSubmitError('Entrez la référence de votre transaction Djamo.'); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      const id = await PaymentService.submitRequest({
        userId: user.uid,
        userName: user.name || user.email || 'Utilisateur',
        userEmail: user.email || '',
        txRef: txRef.trim(),
        plan: selectedPlan,
        meetingId: meeting.id,
      });
      setRequestId(id);
      setStep('waiting');
    } catch {
      setSubmitError('Erreur d\'envoi. Vérifiez votre connexion et réessayez.');
    }
    setSubmitting(false);
  };

  // ── Écran succès ────────────────────────────────────────────
  if (step === 'success') {
    // Activer Pro localement avec le code reçu
    if (approvedCode) ProService.activate(user.uid, selectedPlan || 'sub', meeting.id);
    const status = ProService.getStatus(user.uid);
    const expiry = status ? new Date(status.expiresAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(13,0,32,0.97)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Poppins, sans-serif', padding: 20 }}>
        <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 24, padding: '40px 32px', maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px', background: 'linear-gradient(135deg,#FF4081,#AA00FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, boxShadow: '0 0 0 12px rgba(255,64,129,0.15), 0 0 40px rgba(170,0,255,0.30)' }}>💎</div>
          <h2 style={{ color: 'white', fontWeight: 800, fontSize: 22, margin: '0 0 8px' }}>Bienvenue dans CRUX Pro !</h2>
          <p style={{ color: 'rgba(255,255,255,0.60)', fontSize: 14, margin: '0 0 4px' }}>Accès actif jusqu'au</p>
          <p style={{ color: '#FF4081', fontWeight: 700, fontSize: 15, margin: '0 0 24px' }}>{expiry}</p>
          {approvedCode && (
            <div style={{ background: 'rgba(39,174,96,0.12)', border: '1px solid rgba(39,174,96,0.30)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, margin: '0 0 6px' }}>VOTRE CODE D'ACTIVATION</p>
              <p style={{ color: 'white', fontFamily: 'monospace', fontSize: 18, fontWeight: 800, margin: '0 0 8px', letterSpacing: 2 }}>{approvedCode}</p>
              <button onClick={() => { navigator.clipboard?.writeText(approvedCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ background: copied ? '#27AE60' : 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, padding: '6px 14px', color: 'white', fontSize: 12, cursor: 'pointer' }}>{copied ? '✓ Copié' : '📋 Copier'}</button>
            </div>
          )}
          <div style={{ background: 'rgba(255,64,129,0.08)', border: '1px solid rgba(255,64,129,0.20)', borderRadius: 14, padding: '14px 18px', marginBottom: 24, textAlign: 'left' }}>
            {['✅ Réunions sans limite de durée', '✅ Qualité vidéo HD', '✅ Enregistrement activé', '✅ Contrôles hôte avancés'].map(f => (
              <p key={f} style={{ color: 'rgba(255,255,255,0.80)', fontSize: 13, margin: '4px 0' }}>{f}</p>
            ))}
          </div>
          <button onClick={onPaid} style={{ width: '100%', padding: '16px', borderRadius: 16, background: 'linear-gradient(135deg,#FF4081,#AA00FF)', border: 'none', color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', boxShadow: '0 8px 24px rgba(255,64,129,0.35)' }}>
            🚀 Continuer la réunion
          </button>
        </div>
      </div>
    );
  }

  // ── En attente de validation admin ─────────────────────────
  if (step === 'waiting') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(13,0,32,0.97)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Poppins, sans-serif', padding: 20 }}>
        <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 24, padding: '40px 32px', maxWidth: 400, width: '100%', textAlign: 'center' }}>
          {/* Spinner animé */}
          <div style={{ width: 64, height: 64, borderRadius: '50%', border: '4px solid rgba(255,64,129,0.15)', borderTop: '4px solid #FF4081', margin: '0 auto 24px', animation: 'cruxSpin 1s linear infinite' }} />
          <h2 style={{ color: 'white', fontWeight: 800, fontSize: 20, margin: '0 0 10px' }}>Demande envoyée ✅</h2>
          <p style={{ color: 'rgba(255,255,255,0.60)', fontSize: 13, margin: '0 0 20px', lineHeight: 1.7 }}>
            L'administrateur examine votre paiement.<br/>
            <strong style={{ color: 'white' }}>Votre code d'activation apparaîtra ici automatiquement</strong> dès validation — restez sur cette page.
          </p>
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '12px 16px', marginBottom: 24, textAlign: 'left' }}>
            <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 11, margin: '0 0 4px', textTransform: 'uppercase' }}>Référence soumise</p>
            <p style={{ color: 'rgba(255,255,255,0.80)', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, margin: 0 }}>{txRef}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'rgba(255,255,255,0.35)', fontSize: 12, marginBottom: 20 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF4081', animation: 'recPulse 2s infinite' }} />
            En attente de validation en temps réel...
          </div>
          <button onClick={onExit} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.30)', fontSize: 12, cursor: 'pointer' }}>Quitter la réunion</button>
        </div>
      </div>
    );
  }

  // ── Étape preuve de paiement ────────────────────────────────
  if (step === 'submitted') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(13,0,32,0.97)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Poppins, sans-serif', padding: 20 }}>
        <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 24, padding: '40px 32px', maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h2 style={{ color: 'white', fontWeight: 800, fontSize: 20, margin: '0 0 8px' }}>Confirmer le paiement</h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>
            Entrez la <strong style={{ color: 'white' }}>référence de transaction</strong> visible dans votre app Djamo après le paiement.
          </p>
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, textAlign: 'left' }}>
            <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 11, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.8 }}>Où trouver la référence ?</p>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, margin: 0, lineHeight: 1.6 }}>
              Djamo → <strong>Historique</strong> → votre transaction → copier la référence<br/>
              <span style={{ color: '#FF4081', fontFamily: 'monospace' }}>Ex: TXN-20241204-XXXXX</span>
            </p>
          </div>
          <input type="text" placeholder="Référence Djamo..." value={txRef} onChange={e => setTxRef(e.target.value)}
            style={{ width: '100%', padding: '14px 16px', boxSizing: 'border-box', background: 'rgba(255,255,255,0.10)', border: submitError ? '1.5px solid #FF4081' : '1.5px solid rgba(255,255,255,0.20)', borderRadius: 12, color: 'white', fontSize: 14, outline: 'none', marginBottom: 8, fontFamily: 'Poppins, sans-serif' }}
          />
          {submitError && <p style={{ color: '#FF4081', fontSize: 12, marginBottom: 10 }}>⚠️ {submitError}</p>}
          <button onClick={handleSubmitProof} disabled={submitting} style={{ width: '100%', padding: '15px', borderRadius: 14, marginBottom: 12, background: submitting ? 'rgba(255,64,129,0.5)' : 'linear-gradient(135deg,#FF4081,#AA00FF)', border: 'none', color: 'white', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'Poppins, sans-serif' }}>
            {submitting ? '⏳ Envoi en cours...' : '📤 Envoyer la demande'}
          </button>
          <button onClick={() => window.open(DJAMO_PAYMENT_URL, '_blank')} style={{ width: '100%', padding: '12px', borderRadius: 14, marginBottom: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
            🔄 Rouvrir Djamo
          </button>
          <button onClick={onExit} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.30)', fontSize: 12, cursor: 'pointer' }}>Quitter la réunion</button>
        </div>
      </div>
    );
  }

  // ── Choix du plan ───────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(13,0,32,0.96)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Poppins, sans-serif', padding: 20 }}>
      <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 24, padding: '40px 32px', maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>⏱️</div>
        <h2 style={{ color: 'white', fontWeight: 800, fontSize: 22, margin: '0 0 8px' }}>{FREE_MINUTES} minutes écoulées</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: '0 0 28px', lineHeight: 1.6 }}>
          La période gratuite est terminée. Choisissez un plan pour continuer <strong style={{ color: 'white' }}>{meeting.title}</strong>.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          <button onClick={() => handlePay('sub')} style={{ padding: '18px 24px', borderRadius: 16, background: 'linear-gradient(135deg,#FF4081,#AA00FF)', border: 'none', color: 'white', textAlign: 'left', cursor: 'pointer' }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>💎 Pro — Abonnement mensuel</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Réunions illimitées · 6 500 FCFA / mois</div>
            <div style={{ marginTop: 10, fontSize: 12, background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 12px', display: 'inline-block' }}>Payer via Djamo →</div>
          </button>
          <button onClick={() => handlePay('single')} style={{ padding: '18px 24px', borderRadius: 16, background: 'rgba(255,255,255,0.10)', border: '1.5px solid rgba(255,255,255,0.20)', color: 'white', textAlign: 'left', cursor: 'pointer' }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>🎟️ Paiement à la réunion</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Cette réunion uniquement · 1 300 FCFA</div>
            <div style={{ marginTop: 10, fontSize: 12, background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 12px', display: 'inline-block' }}>Payer via Djamo →</div>
          </button>
        </div>
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 8 }}>MOYENS DE PAIEMENT ACCEPTÉS</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            {['🟠 Orange Money', '💛 MTN MoMo', '🔵 Wave', '💳 Carte bancaire'].map(m => (
              <span key={m} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{m}</span>
            ))}
          </div>
        </div>
        <button onClick={onExit} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer' }}>Quitter la réunion</button>
      </div>
    </div>
  );
}

// ============================================================
// ERROR BOUNDARY
// ============================================================
class MeetingErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A', fontFamily: 'Poppins, sans-serif' }}>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: '40px 36px', maxWidth: 400, textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ color: 'white', fontWeight: 800, margin: '0 0 10px' }}>Erreur dans la réunion</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 24 }}>{String(this.state.error?.message || 'Une erreur inattendue s\'est produite.')}</p>
            <button onClick={this.props.onExit} style={{ padding: '12px 28px', background: 'linear-gradient(135deg,#E74C3C,#8E44AD)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
              ← Retour au tableau de bord
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================
// ============================================================
// MEETING ROOM  — Google Meet feature parity
// ============================================================

// Bottom-bar icon button
function SideBtn({ icon, label, onClick, active, badge, color = '#E74C3C' }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      {hover && (
        <div style={{ position: 'absolute', bottom: 52, background: 'rgba(0,0,0,0.85)', color: 'white', fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 10 }}>
          {label}
        </div>
      )}
      <button
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: 40, height: 40, borderRadius: 10, border: active ? `2px solid ${color}` : '2px solid transparent', cursor: 'pointer',
          background: active ? color + '30' : 'rgba(255,255,255,0.12)',
          color: 'white', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(10px)', transition: 'all 0.2s',
        }}
      >{icon}</button>
      <span style={{ color: active ? color : 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: active ? 700 : 500, lineHeight: 1 }}>{label.length > 8 ? label.slice(0, 7) + '…' : label}</span>
      {badge > 0 && (
        <div style={{ position: 'absolute', top: -3, right: -3, background: '#E74C3C', color: 'white', fontSize: 9, fontWeight: 800, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0A0A0A' }}>
          {badge > 9 ? '9+' : badge}
        </div>
      )}
    </div>
  );
}

// ── Canvas Whiteboard ─────────────────────────────────────────
function CruxWhiteboard({ meetingId, userId }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = React.useState('pen'); // pen|eraser|line|rect|circle|arrow|text|laser
  const [color, setColor] = React.useState('#FF4081');
  const [strokeWidth, setStrokeWidth] = React.useState(3);
  const [history, setHistory] = React.useState([]);
  const [redoStack, setRedoStack] = React.useState([]);
  const drawing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const snapshotRef = useRef(null);
  const laserTimerRef = useRef(null);

  const COLORS = ['#FF4081','#E74C3C','#FF9800','#F1C40F','#27AE60','#3498DB','#8E44AD','#FFFFFF','#000000'];
  const TOOLS = [
    { id: 'pen', icon: '✏️', label: 'Stylo' },
    { id: 'eraser', icon: '🧹', label: 'Gomme' },
    { id: 'line', icon: '📏', label: 'Ligne' },
    { id: 'rect', icon: '⬜', label: 'Rect' },
    { id: 'circle', icon: '⭕', label: 'Cercle' },
    { id: 'arrow', icon: '➡️', label: 'Flèche' },
    { id: 'laser', icon: '🔴', label: 'Laser' },
  ];

  const getCtx = () => canvasRef.current?.getContext('2d');

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * (canvas.width / rect.width), y: (clientY - rect.top) * (canvas.height / rect.height) };
  };

  const saveHistory = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    setHistory(h => [...h, canvas.toDataURL()]);
    setRedoStack([]);
  };

  const undo = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    setHistory(h => {
      if (h.length === 0) { getCtx().clearRect(0, 0, canvas.width, canvas.height); return h; }
      const newH = [...h]; const last = newH.pop();
      setRedoStack(r => [canvas.toDataURL(), ...r]);
      const img = new Image(); img.onload = () => { getCtx().clearRect(0, 0, canvas.width, canvas.height); getCtx().drawImage(img, 0, 0); };
      img.src = last;
      return newH;
    });
  };

  const redo = () => {
    setRedoStack(r => {
      if (r.length === 0) return r;
      const newR = [...r]; const next = newR.shift();
      const canvas = canvasRef.current;
      setHistory(h => [...h, canvas.toDataURL()]);
      const img = new Image(); img.onload = () => { getCtx().clearRect(0, 0, canvas.width, canvas.height); getCtx().drawImage(img, 0, 0); };
      img.src = next;
      return newR;
    });
  };

  const clearAll = () => { const canvas = canvasRef.current; if (!canvas) return; saveHistory(); getCtx().clearRect(0, 0, canvas.width, canvas.height); };

  const drawShape = (ctx, x0, y0, x1, y1) => {
    ctx.beginPath();
    if (tool === 'line') { ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); }
    else if (tool === 'rect') { ctx.rect(x0, y0, x1 - x0, y1 - y0); }
    else if (tool === 'circle') { ctx.ellipse((x0+x1)/2, (y0+y1)/2, Math.abs(x1-x0)/2, Math.abs(y1-y0)/2, 0, 0, 2*Math.PI); }
    else if (tool === 'arrow') {
      ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
      const angle = Math.atan2(y1-y0, x1-x0);
      const headLen = 16;
      ctx.moveTo(x1, y1); ctx.lineTo(x1 - headLen * Math.cos(angle - 0.4), y1 - headLen * Math.sin(angle - 0.4));
      ctx.moveTo(x1, y1); ctx.lineTo(x1 - headLen * Math.cos(angle + 0.4), y1 - headLen * Math.sin(angle + 0.4));
    }
    ctx.stroke();
  };

  const onStart = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    const pos = getPos(e, canvas);
    drawing.current = true;
    startPos.current = pos;
    snapshotRef.current = canvas.toDataURL();
    const ctx = getCtx();
    ctx.lineWidth = tool === 'eraser' ? strokeWidth * 4 : strokeWidth;
    ctx.strokeStyle = tool === 'laser' ? 'rgba(255,0,0,0.85)' : (tool === 'eraser' ? '#FFFFFF' : color);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (tool === 'pen' || tool === 'eraser' || tool === 'laser') {
      ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
    }
  };

  const onMove = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const pos = getPos(e, canvas);
    const ctx = getCtx();
    if (tool === 'pen' || tool === 'eraser' || tool === 'laser') {
      ctx.lineTo(pos.x, pos.y); ctx.stroke();
    } else {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        ctx.lineWidth = strokeWidth; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        drawShape(ctx, startPos.current.x, startPos.current.y, pos.x, pos.y);
      };
      img.src = snapshotRef.current;
    }
  };

  const onEnd = (e) => {
    if (!drawing.current) return;
    drawing.current = false;
    if (tool === 'laser') {
      clearTimeout(laserTimerRef.current);
      laserTimerRef.current = setTimeout(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const img = new Image(); img.onload = () => { getCtx().clearRect(0, 0, canvas.width, canvas.height); getCtx().drawImage(img, 0, 0); };
        img.src = snapshotRef.current;
      }, 1200);
    } else {
      saveHistory();
    }
  };

  const exportImage = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const a = document.createElement('a'); a.download = 'tableau-crux.png'; a.href = canvas.toDataURL(); a.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1A1A1A' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 4, padding: '6px 8px', background: '#111', borderBottom: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap', alignItems: 'center' }}>
        {TOOLS.map(t => (
          <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
            style={{ width: 32, height: 32, border: tool===t.id ? '2px solid #FF4081' : '1px solid transparent', borderRadius: 6, background: tool===t.id ? 'rgba(255,64,129,0.2)' : 'rgba(255,255,255,0.07)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {t.icon}
          </button>
        ))}
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />
        {COLORS.map(c => (
          <button key={c} onClick={() => setColor(c)}
            style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: color===c ? '2px solid white' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
        ))}
        <input type="color" value={color} onChange={e => setColor(e.target.value)}
          style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0, background: 'none' }} />
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />
        <input type="range" min={1} max={20} value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))}
          style={{ width: 56, accentColor: color }} />
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />
        <button onClick={undo} title="Annuler" style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'white', fontSize: 14 }}>↩</button>
        <button onClick={redo} title="Rétablir" style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'white', fontSize: 14 }}>↪</button>
        <button onClick={clearAll} title="Effacer tout" style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'white', fontSize: 14 }}>🗑</button>
        <button onClick={exportImage} title="Exporter" style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'white', fontSize: 14 }}>💾</button>
      </div>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={800} height={500}
        onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
        onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
        style={{ flex: 1, display: 'block', width: '100%', height: '100%', cursor: tool==='eraser'?'cell':tool==='laser'?'crosshair':'crosshair', background: 'white', touchAction: 'none' }}
      />
    </div>
  );
}

// Panel wrapper (slides from right)
function MeetPanel({ title, icon, onClose, children, dark = false }) {
  const bg = dark ? 'rgba(18,18,24,0.97)' : 'rgba(255,255,255,0.97)';
  const text = dark ? 'white' : C.textPrimary;
  const border = dark ? 'rgba(255,255,255,0.1)' : C.border;
  return (
    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 340, zIndex: 260, background: bg, backdropFilter: 'blur(20px)', boxShadow: '-8px 0 40px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${border}` }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, minHeight: 52 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: text, display: 'flex', alignItems: 'center', gap: 8 }}>{icon} {title}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: dark ? 'rgba(255,255,255,0.5)' : C.textTertiary, lineHeight: 1, padding: '0 4px' }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

function MeetingRoom({ meeting, user, T, prefs, onExit }) {
  const zegoRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);
  const [activePanel, setActivePanel] = useState(null);

  // CRUX-exclusive features (ZegoCloud handles video/audio/chat/hands/reactions natively)
  const [polls, setPolls] = useState([]);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [qaQuestions, setQaQuestions] = useState([]);
  const [qaInput, setQaInput] = useState('');
  const [notes, setNotes] = useState(() => localStorage.getItem('crux_notes_' + meeting.id) || '');
  const [showReactions, setShowReactions] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatAnon, setChatAnon] = useState(false);
  const chatBottomRef = useRef(null);
  const [callFrozen, setCallFrozen] = useState(false);
  const [netQuality, setNetQuality] = useState('good'); // good | fair | poor
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const screenStreamRef = useRef(null);
  const speechRef = useRef(null);
  const handsSeenRef = useRef(new Set());
  const pollsSeenRef = useRef(new Set());

  const isHost = meeting.creatorId === user.uid || meeting.organizerId === user.uid;

  const sendNotif = (title, body, icon = '📹') => {
    if (!prefs.notifications) return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/crux_web/logo192.png', silent: false });
    }
  };

  const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  const togglePanel = name => setActivePanel(p => p === name ? null : name);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Notes auto-save
  useEffect(() => {
    localStorage.setItem('crux_notes_' + meeting.id, notes);
    const t = setTimeout(() => {
        FirebaseMeetingService.saveNote(meeting.id, user.uid, notes).catch(() => {});
    }, 1000);
    return () => clearTimeout(t);
  }, [notes, meeting.id, user.uid]);

  // Load notes from Firestore on mount
  useEffect(() => {
    FirebaseMeetingService.getNote(meeting.id, user.uid).then(content => {
        if (content && !localStorage.getItem('crux_notes_' + meeting.id)) {
            setNotes(content);
        }
    }).catch(() => {});
  }, [meeting.id, user.uid]);

  // Pro paywall — freeze call after 30 minutes for free users
  useEffect(() => {
    if (elapsed === ProService.FREE_MINUTES * 60) {
      ProService.isPro(user.uid).then(pro => { if (!pro) setCallFrozen(true); });
    }
  }, [elapsed, user.uid]);

  // Simulated network quality indicator (real stats need WebRTC access)
  useEffect(() => {
    const t = setInterval(() => {
      const rtt = Math.random();
      setNetQuality(rtt < 0.7 ? 'good' : rtt < 0.9 ? 'fair' : 'poor');
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // Demande permission notifications au montage
  useEffect(() => {
    if (prefs.notifications && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [prefs.notifications]);

  // Firestore presence
  useEffect(() => {
    FirebaseMeetingService.joinPresence(meeting.id, user.uid, user.name || user.email);
    return () => { FirebaseMeetingService.leavePresence(meeting.id, user.uid); };
  }, [meeting.id, user.uid, user.name, user.email]);

  // Notification : main levée (hôte uniquement)
  useEffect(() => {
    if (!isHost) return;
    return FirebaseMeetingService.listenHands(meeting.id, hands => {
      hands.forEach(h => {
        if (!handsSeenRef.current.has(h.uid)) {
          handsSeenRef.current.add(h.uid);
          sendNotif('✋ Main levée', `${h.userName} a levé la main`, '✋');
        }
      });
      // Si une main est baissée, retirer de seen pour la notifier à nouveau si relevée
      const raisedUids = new Set(hands.map(h => h.uid));
      handsSeenRef.current.forEach(uid => { if (!raisedUids.has(uid)) handsSeenRef.current.delete(uid); });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting.id, isHost]);

  // Notification : nouveau sondage (participants non-hôte)
  useEffect(() => {
    return FirebaseMeetingService.listenPolls(meeting.id, incoming => {
      setPolls(incoming);
      incoming.forEach(p => {
        if (!pollsSeenRef.current.has(p.id) && p.active && p.userId !== user.uid) {
          pollsSeenRef.current.add(p.id);
          sendNotif('📊 Nouveau sondage', p.question || 'Un sondage a été lancé');
        } else {
          pollsSeenRef.current.add(p.id);
        }
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting.id, user.uid]);

  // Firestore Q&A
  useEffect(() => { return FirebaseMeetingService.listenQA(meeting.id, setQaQuestions); }, [meeting.id]);

  // Firestore reactions (real-time floating emojis)
  useEffect(() => {
    return FirebaseMeetingService.listenReactions(meeting.id, newReactions => {
      newReactions.forEach(r => {
        const id = r.id + '_' + Date.now();
        const x = 20 + Math.random() * 60; // % from left
        setFloatingReactions(prev => [...prev, { id, emoji: r.emoji, x }]);
        setTimeout(() => setFloatingReactions(prev => prev.filter(f => f.id !== id)), 3000);
      });
    });
  }, [meeting.id]);

  const sendReaction = async (emoji) => {
    setShowReactions(false);
    await FirebaseMeetingService.sendReaction(meeting.id, user.uid, user.name || user.email, emoji);
    GamService.addReaction(user.uid);
  };

  // Chat messages listener
  useEffect(() => {
    return FirebaseMeetingService.listenChatMessages(meeting.id, msgs => {
        setChatMessages(msgs);
    });
  }, [meeting.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChatMsg = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    await FirebaseMeetingService.sendChatMessage(meeting.id, user.uid, user.name || user.email, msg, chatAnon);
  };

  const startScreenShare = async () => {
    if (isSharingScreen) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      setIsSharingScreen(false);
      setScreenStream(null);
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      alert('Le partage d\'écran n\'est pas supporté sur cet appareil/navigateur.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' }, audio: false });
      screenStreamRef.current = stream;
      setIsSharingScreen(true);
      setScreenStream(stream);
      stream.getVideoTracks()[0].onended = () => {
        setIsSharingScreen(false);
        setScreenStream(null);
        screenStreamRef.current = null;
      };
    } catch (e) {
      if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') console.error('Screen share error', e);
    }
  };

  const requestPiP = async () => {
    try {
      const video = zegoRef.current?.querySelector('video');
      if (video) {
        await video.requestPictureInPicture();
      } else {
        alert('Impossible de démarrer le mode mini-écran pour le moment.');
      }
    } catch { }
  };


  // ZegoCloud video — initialise once on mount
  useEffect(() => {
    if (!zegoRef.current) return;
    const appID = Number(process.env.REACT_APP_ZEGO_APP_ID);
    const serverSecret = process.env.REACT_APP_ZEGO_SERVER_SECRET;
    const roomID = (meeting.roomId || meeting.id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 36) || 'room1';
    const userID = user.uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 36);
    const userName = user.name || user.email || 'Utilisateur';

    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(appID, serverSecret, roomID, userID, userName);
    const zp = ZegoUIKitPrebuilt.create(kitToken);

    zp.joinRoom({
      container: zegoRef.current,
      sharedLinks: [{
        name: "Lien d'invitation",
        url: window.location.origin + window.location.pathname + '?join=' + meeting.id,
      }],
      scenario: { mode: ZegoUIKitPrebuilt.VideoConference },
      showPreJoinView: true,
      turnOnMicrophoneWhenJoining: prefs.defaultMic !== false,
      turnOnCameraWhenJoining: prefs.defaultCam !== false,
      showMyMicrophoneToggleButton: true,
      showMyCameraToggleButton: true,
      showAudioVideoSettingsButton: true,
      showScreenSharingButton: true,
      showTextChat: true,
      showUserList: true,
      showRoomTimer: false,
      maxUsers: 100,
      layout: 'Auto',
      onLeaveRoom: () => {
        FirebaseMeetingService.leavePresence(meeting.id, user.uid);
        onExit();
      },
    });

    return () => { try { zp?.destroy?.(); } catch { } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const launchPoll = async () => {
    const opts = pollOptions.filter(o => o.trim());
    if (!pollQuestion.trim() || opts.length < 2) return;
    await FirebaseMeetingService.createPoll(meeting.id, user.uid, user.name, pollQuestion.trim(), opts);
    setPollQuestion(''); setPollOptions(['', '']); setCreatingPoll(false);
  };

  const submitQuestion = async (anonymous = false) => {
    if (!qaInput.trim()) return;
    const name = anonymous ? 'Anonyme' : (user.name || user.email);
    await FirebaseMeetingService.submitQuestion(meeting.id, user.uid, name, qaInput.trim());
    setQaInput('');
  };

  const activePoll = polls.find(p => p.active);

  // Portal helper — renders into document.body, above ZegoCloud's entire DOM
  const Portal = ({ children }) => ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: 'none', fontFamily: 'Poppins, sans-serif' }}>
      {children}
    </div>,
    document.body
  );

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111' }}>
      {/* ZegoCloud video — fills entire screen */}
      <div ref={zegoRef} style={{ position: 'absolute', inset: 0 }} />

      <Portal>
        {/* Floating emoji reactions */}
        {floatingReactions.map(r => (
          <div key={r.id} style={{ position: 'absolute', top: '30%', left: `${r.x}%`, fontSize: 40, userSelect: 'none', pointerEvents: 'none', animation: 'floatUp 3s ease-out forwards', zIndex: 1 }}>{r.emoji}</div>
        ))}

        {/* Reaction picker — above toolbar */}
        {showReactions && (
          <div style={{ position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,15,20,0.97)', borderRadius: 20, padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: '90vw', justifyContent: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.12)', pointerEvents: 'all', zIndex: 2 }}>
            {['👍','❤️','😂','😮','👏','🙌','🎉','🔥','💯','😍'].map(emoji => (
              <button key={emoji} onClick={() => sendReaction(emoji)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 26, padding: 5, borderRadius: 10, transition: 'transform 0.15s', lineHeight: 1 }}
                onMouseEnter={e => e.currentTarget.style.transform='scale(1.4)'}
                onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
              >{emoji}</button>
            ))}
          </div>
        )}

        {/* Screen share preview inside Portal */}
        {screenStream && (
          <video
            ref={el => { if (el) el.srcObject = screenStream; }}
            autoPlay muted
            style={{ position: 'absolute', top: 56, right: 12, width: 180, height: 100, borderRadius: 10, border: '2px solid #27AE60', zIndex: 4, objectFit: 'cover', boxShadow: '0 4px 20px rgba(0,0,0,0.6)', pointerEvents: 'none' }}
          />
        )}

        {/* Top toolbar — Row 1: reactions+chat+polls+Q&A / Row 2: notes+whiteboard+screenshare+PiP */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)', pointerEvents: 'all', zIndex: 2 }}>
          {/* Row 1 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px 4px' }}>
            {/* Left: timer */}
            <div style={{ background: 'transparent', color: 'white', fontSize: 11, fontWeight: 600 }}>🕐 {fmt(elapsed)}</div>
            {/* Center: network */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {[0,1,2].map(i => {
                const lit = (netQuality==='good') || (netQuality==='fair'&&i<2) || (netQuality==='poor'&&i<1);
                const col = netQuality==='good'?'#4CAF50':netQuality==='fair'?'#FFC107':'#E74C3C';
                return <div key={i} style={{ width: 3, height: 6+i*3, borderRadius: 2, background: lit?col:'rgba(255,255,255,0.25)' }} />;
              })}
              <span style={{ color: 'white', fontSize: 9, fontWeight: 600, marginLeft: 3 }}>{netQuality==='good'?'HD':netQuality==='fair'?'SD':'⚠'}</span>
            </div>
            {/* Right: PiP */}
            <button onClick={requestPiP} title="Mini-écran" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: 'white', fontSize: 14, cursor: 'pointer', padding: '3px 8px', fontFamily: 'Poppins, sans-serif' }}>⊡</button>
          </div>
          {/* Row 2: tool buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '4px 12px 8px', flexWrap: 'wrap' }}>
            <SideBtn icon="😀" label="Réactions" onClick={() => { setShowReactions(v=>!v); setActivePanel(null); }} active={showReactions} color={C.accentOrange} />
            <SideBtn icon="💬" label="Chat" onClick={() => togglePanel('chat')} active={activePanel==='chat'} badge={chatMessages.length > 0 ? chatMessages.length : 0} color={C.iceBlue} />
            <SideBtn icon="📊" label={T.polls} onClick={() => togglePanel('poll')} active={activePanel==='poll'} badge={activePoll?1:0} color={C.violet} />
            <SideBtn icon="❓" label="Q&A" onClick={() => togglePanel('qa')} active={activePanel==='qa'} color={C.accentGolden} />
            <SideBtn icon="📝" label={T.notes} onClick={() => togglePanel('notes')} active={activePanel==='notes'} color={C.iceBlue} />
            <SideBtn icon="🎨" label="Tableau" onClick={() => togglePanel('whiteboard')} active={activePanel==='whiteboard'} color={C.accentOrange} />
            <SideBtn icon="🖥️" label={isSharingScreen ? 'Arrêter' : 'Partager'} onClick={startScreenShare} active={isSharingScreen} color={C.success} />
          </div>
        </div>

        {/* Panel — slides from right, below top toolbar, keyboard-aware via env() */}
        {activePanel && (
          <div style={{ position: 'absolute', right: 0, top: 96, bottom: 'env(keyboard-inset-height, 0px)', width: Math.min(window.innerWidth, 320), pointerEvents: 'all', zIndex: 3 }}>

            {/* CHAT */}
            {activePanel === 'chat' && (
              <MeetPanel title="Messages" icon="💬" onClose={() => setActivePanel(null)}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {chatMessages.length === 0 ? (
                    <div style={{ textAlign: 'center', paddingTop: 40, color: C.textTertiary }}>
                      <div style={{ fontSize: 36 }}>💬</div>
                      <p style={{ fontSize: 13 }}>Aucun message</p>
                    </div>
                  ) : chatMessages.map(m => (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignSelf: m.userId === user.uid ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                      <span style={{ fontSize: 10, color: C.textTertiary, marginBottom: 2, fontStyle: m.isAnonymous ? 'italic' : 'normal' }}>{m.isAnonymous ? '🕵️ Anonyme' : (m.userId === user.uid ? 'Vous' : m.userName)}</span>
                      <div style={{ background: m.userId === user.uid ? C.violet : C.lightBg, color: m.userId === user.uid ? 'white' : C.textPrimary, padding: '8px 12px', borderRadius: m.userId === user.uid ? '14px 14px 2px 14px' : '14px 14px 14px 2px', fontSize: 13, lineHeight: 1.5 }}>{m.message}</div>
                    </div>
                  ))}
                  <div ref={chatBottomRef} />
                </div>
                <div style={{ padding: '6px 10px', borderTop: '1px solid ' + C.border, display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  <button onClick={() => setChatAnon(v => !v)} title={chatAnon ? 'Anonyme activé' : 'Envoyer anonymement'}
                    style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid ' + C.border, background: chatAnon ? C.violet + '20' : 'transparent', color: chatAnon ? C.violet : C.textSecondary, fontSize: 13, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🕵️</button>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMsg(); } }}
                    placeholder={chatAnon ? 'Message anonyme...' : 'Message...'}
                    style={{ flex: 1, padding: '7px 10px', borderRadius: 10, border: '1.5px solid ' + C.border, fontSize: 12, fontFamily: 'Poppins, sans-serif', background: '#FAFAFA', outline: 'none', color: C.textPrimary, minWidth: 0 }} />
                  <button onClick={sendChatMsg} style={{ width: 30, height: 30, background: C.violet, border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>➤</button>
                </div>
              </MeetPanel>
            )}

            {/* POLLS */}
            {activePanel === 'poll' && (
              <MeetPanel title={T.polls} icon="📊" onClose={() => setActivePanel(null)}>
                <div style={{ padding: 16, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {creatingPoll ? (
                    <>
                      <input placeholder={T.pollQuestion} value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} style={{ ...fieldStyle, fontSize: 13 }} />
                      {pollOptions.map((o, i) => (
                        <input key={i} placeholder={`${T.pollOption} ${i+1}`} value={o}
                          onChange={e => { const n=[...pollOptions]; n[i]=e.target.value; setPollOptions(n); }}
                          style={{ ...fieldStyle, fontSize: 13 }} />
                      ))}
                      {pollOptions.length < 5 && <button onClick={() => setPollOptions(p=>[...p,''])} style={{ ...secBtn, fontSize: 13 }}>+ {T.addOption}</button>}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={launchPoll} style={{ ...primBtn, fontSize: 13, flex: 1 }}>{T.launchPoll}</button>
                        <button onClick={() => setCreatingPoll(false)} style={{ ...secBtn, fontSize: 13, flex: 1 }}>{T.cancel}</button>
                      </div>
                    </>
                  ) : (
                    <>
                      {polls.length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: C.textTertiary }}><div style={{ fontSize: 40 }}>📊</div><p style={{ fontSize: 13 }}>Aucun sondage actif</p></div>}
                      {polls.map(poll => {
                        const total = poll.options.reduce((s,o) => s+(o.votes?.length||0), 0);
                        return (
                          <div key={poll.id} style={{ background: C.lightBg, borderRadius: 14, padding: 14, border: '1.5px solid '+(poll.active?C.violet:C.border) }}>
                            <p style={{ fontWeight: 700, fontSize: 14, color: C.textPrimary, margin: '0 0 10px' }}>{poll.question}</p>
                            {poll.options.map((o,i) => {
                              const pct = total>0?Math.round((o.votes?.length||0)/total*100):0;
                              const myVote = o.votes?.includes(user.uid);
                              return (
                                <div key={i} onClick={() => poll.active && FirebaseMeetingService.votePoll(meeting.id,poll.id,i,user.uid)}
                                  style={{ marginBottom: 8, cursor: poll.active?'pointer':'default', padding: '10px 14px', borderRadius: 10, border: '2px solid '+(myVote?C.violet:C.border), background: myVote?C.violet+'12':'white', position: 'relative', overflow: 'hidden' }}>
                                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct+'%', background: C.violet+'18', transition: 'width 0.4s' }} />
                                  <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 13, fontWeight: myVote?700:500, color: C.textPrimary }}>{myVote?'✓ ':''}{o.text}</span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: C.violet }}>{pct}%</span>
                                  </div>
                                </div>
                              );
                            })}
                            <p style={{ fontSize: 12, color: C.textTertiary, textAlign: 'center', margin: '4px 0 8px' }}>{total} vote(s)</p>
                            {poll.active && poll.userId===user.uid && <button onClick={() => FirebaseMeetingService.closePoll(meeting.id,poll.id)} style={{ ...secBtn, fontSize: 12, width: '100%' }}>{T.closePoll}</button>}
                          </div>
                        );
                      })}
                      <button onClick={() => setCreatingPoll(true)} style={{ ...primBtn, fontSize: 13, width: '100%' }}>{T.createPoll}</button>
                    </>
                  )}
                </div>
              </MeetPanel>
            )}

            {/* Q&A */}
            {activePanel === 'qa' && (
              <MeetPanel title="Questions & Réponses" icon="❓" onClose={() => setActivePanel(null)}>
                <div style={{ padding: '8px 10px', borderBottom: '1px solid '+C.border, flexShrink: 0, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input value={qaInput} onChange={e => setQaInput(e.target.value)}
                    onKeyDown={e => e.key==='Enter' && submitQuestion(false)}
                    placeholder="Votre question..."
                    style={{ flex: 1, padding: '7px 10px', borderRadius: 10, border: '1.5px solid '+C.border, fontSize: 12, fontFamily: 'Poppins, sans-serif', background: '#FAFAFA', outline: 'none', color: C.textPrimary, minWidth: 0 }} />
                  <button onClick={() => submitQuestion(false)} title="Envoyer" style={{ width: 30, height: 30, background: C.accentGolden, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>➤</button>
                  <button onClick={() => submitQuestion(true)} title="Anonyme" style={{ width: 30, height: 30, background: 'rgba(0,0,0,0.07)', color: C.textSecondary, border: '1px solid '+C.border, borderRadius: 8, cursor: 'pointer', fontSize: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🕵️</button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {qaQuestions.length === 0 ? (
                    <div style={{ textAlign: 'center', paddingTop: 40, color: C.textTertiary }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>❓</div>
                      <p style={{ fontSize: 13 }}>Aucune question pour le moment</p>
                      <p style={{ fontSize: 12 }}>Soyez le premier à poser une question !</p>
                    </div>
                  ) : qaQuestions.map(q => (
                    <div key={q.id} style={{ background: q.answered?C.success+'08':C.lightBg, borderRadius: 12, padding: '12px 14px', border: '1.5px solid '+(q.answered?C.success:C.border) }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: '0 0 8px', lineHeight: 1.5 }}>{q.question}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: C.textTertiary, fontStyle: q.userName==='Anonyme'?'italic':'normal' }}>
                          {q.userName==='Anonyme'?'🕵️ Anonyme':`👤 ${q.userName}`}
                        </span>
                        {q.answered && <span style={{ fontSize: 11, color: C.success, fontWeight: 700 }}>✓ Répondu</span>}
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                          <button onClick={() => FirebaseMeetingService.toggleUpvote(meeting.id,q.id,user.uid)}
                            style={{ background: q.upvotes?.includes(user.uid)?C.accentGolden+'20':'rgba(0,0,0,0.05)', border: '1px solid '+(q.upvotes?.includes(user.uid)?C.accentGolden:'transparent'), borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: q.upvotes?.includes(user.uid)?C.accentGolden:C.textTertiary, fontFamily: 'Poppins, sans-serif' }}>
                            👍 {q.upvotes?.length||0}
                          </button>
                          {(meeting.creatorId===user.uid||meeting.organizerId===user.uid) && !q.answered && (
                            <button onClick={() => FirebaseMeetingService.markAnswered(meeting.id,q.id)}
                              style={{ background: C.success+'15', border: '1px solid '+C.success, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: C.success, fontFamily: 'Poppins, sans-serif' }}>
                              ✓ Répondu
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </MeetPanel>
            )}

            {/* NOTES */}
            {activePanel === 'notes' && (
              <MeetPanel title={T.notes} icon="📝" onClose={() => setActivePanel(null)}>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Vos notes..."
                  style={{ flex: 1, padding: '10px 12px', border: 'none', resize: 'none', fontFamily: 'Poppins, sans-serif', fontSize: 12, color: C.textPrimary, background: 'transparent', outline: 'none', lineHeight: 1.6 }} />
                <div style={{ padding: '4px 12px 6px', borderTop: '1px solid '+C.border, fontSize: 10, color: C.textTertiary, textAlign: 'center', flexShrink: 0 }}>💾 Sauvegardé</div>
              </MeetPanel>
            )}

            {/* WHITEBOARD */}
            {activePanel === 'whiteboard' && (
              <MeetPanel title="Tableau blanc" icon="🎨" onClose={() => setActivePanel(null)}>
                <CruxWhiteboard meetingId={meeting.id} userId={user.uid} />
              </MeetPanel>
            )}
          </div>
        )}

        {/* Pro paywall */}
        {callFrozen && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'all' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>⏱️</div>
            <h2 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: '0 0 8px', textAlign: 'center' }}>Limite gratuite atteinte</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', maxWidth: 280, margin: '0 0 24px' }}>Passez à Pro pour des réunions illimitées.</p>
            <button onClick={() => ProService.openPayment()} style={{ padding: '14px 32px', background: 'linear-gradient(135deg,#F57F17,#FF8F00)', border: 'none', borderRadius: 16, color: 'white', fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', marginBottom: 12 }}>
              ⭐ Activer Pro — {ProService.PRICE_XOF.toLocaleString()} XOF
            </button>
            <button onClick={() => { setCallFrozen(false); onExit(); }} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '10px 24px', color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
              Quitter la réunion
            </button>
          </div>
        )}
      </Portal>
    </div>
  );
}


// LivePoll kept as stub (polls now managed inside MeetingRoom via Firestore)
function LivePoll({ meetingId, userId, userName, T, onClose }) {
  const POLL_KEY = `crux_poll_${meetingId}`;
  const [poll, setPoll] = useState(() => {
    try { return JSON.parse(localStorage.getItem(POLL_KEY) || 'null'); } catch { return null; }
  });
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [creating, setCreating] = useState(false);

  // Listen for poll updates from other tabs
  useEffect(() => {
    const handler = (e) => {
      if (e.key === POLL_KEY) {
        try { setPoll(JSON.parse(e.newValue || 'null')); } catch {}
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [POLL_KEY]);

  const createPoll = () => {
    const opts = options.filter(o => o.trim());
    if (!question.trim() || opts.length < 2) return;
    const p = { question, options: opts.map(o => ({ text: o, votes: [] })), creatorId: userId, active: true };
    localStorage.setItem(POLL_KEY, JSON.stringify(p));
    setPoll(p); setCreating(false);
  };

  const vote = (idx) => {
    if (!poll || !poll.active) return;
    // Remove any previous vote
    const updated = { ...poll, options: poll.options.map((o, i) => ({ ...o, votes: i === idx ? [...new Set([...o.votes, userId])] : o.votes.filter(v => v !== userId) })) };
    localStorage.setItem(POLL_KEY, JSON.stringify(updated));
    setPoll(updated);
  };

  const closePoll = () => {
    const updated = { ...poll, active: false };
    localStorage.setItem(POLL_KEY, JSON.stringify(updated));
    setPoll(updated);
  };

  const clearPoll = () => {
    localStorage.removeItem(POLL_KEY);
    setPoll(null); setCreating(false);
  };

  const totalVotes = poll ? poll.options.reduce((s, o) => s + o.votes.length, 0) : 0;

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 300, zIndex: 250, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)', boxShadow: '8px 0 32px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '60px 20px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: C.textPrimary }}>📊 {T.polls}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: C.textTertiary, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto' }}>
        {!poll && !creating && (
          <div style={{ textAlign: 'center', paddingTop: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
            <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: 20 }}>{T.polls}</p>
            <button onClick={() => setCreating(true)} style={{ ...primBtn, fontSize: 13 }}>{T.createPoll}</button>
          </div>
        )}
        {creating && !poll && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input placeholder={T.pollQuestion} value={question} onChange={e => setQuestion(e.target.value)} style={{ ...fieldStyle, fontSize: 13 }} />
            {options.map((o, i) => (
              <input key={i} placeholder={`${T.pollOption} ${i + 1}`} value={o} onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n); }} style={{ ...fieldStyle, fontSize: 13 }} />
            ))}
            {options.length < 4 && (
              <button onClick={() => setOptions(p => [...p, ''])} style={{ ...secBtn, fontSize: 13, padding: '8px' }}>+ {T.addOption}</button>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={createPoll} style={{ ...primBtn, fontSize: 13, flex: 1 }}>{T.launchPoll}</button>
              <button onClick={() => setCreating(false)} style={{ ...secBtn, fontSize: 13, flex: 1 }}>{T.cancel}</button>
            </div>
          </div>
        )}
        {poll && (
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: C.textPrimary, marginBottom: 16, lineHeight: 1.4 }}>{poll.question}</p>
            {poll.options.map((o, i) => {
              const pct = totalVotes > 0 ? Math.round(o.votes.length / totalVotes * 100) : 0;
              const myVote = o.votes.includes(userId);
              return (
                <div key={i} onClick={() => poll.active && vote(i)} style={{ marginBottom: 10, cursor: poll.active ? 'pointer' : 'default', padding: '10px 14px', borderRadius: 10, border: `2px solid ${myVote ? C.violet : C.border}`, background: myVote ? `${C.violet}08` : C.lightBg, position: 'relative', overflow: 'hidden', transition: 'all 0.2s' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: `${C.violet}15`, transition: 'width 0.4s' }} />
                  <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: myVote ? 700 : 500, color: C.textPrimary }}>{myVote ? '✓ ' : ''}{o.text}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.violet }}>{pct}%</span>
                  </div>
                </div>
              );
            })}
            <p style={{ fontSize: 12, color: C.textTertiary, textAlign: 'center', margin: '8px 0 16px' }}>{totalVotes} vote(s)</p>
            {poll.active && poll.creatorId === userId && (
              <button onClick={closePoll} style={{ ...primBtn, fontSize: 13 }}>{T.closePoll}</button>
            )}
            {!poll.active && (
              <button onClick={clearPoll} style={{ ...secBtn, fontSize: 13 }}>Nouvelle enquête</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PROFILE PAGE
// ============================================================
function ProfilePage({ user, T, dark, onBack, onUserUpdated }) {
  const [displayName, setDisplayName] = useState(user.name || user.email || '');
  const [editName, setEditName] = useState(false);
  const [newName, setNewName] = useState(displayName);
  const [changingPw, setChangingPw] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(() => localStorage.getItem(`crux_avatar_${user.uid}`) || '');
  const stats = GamService.getStats(user.uid);

  const [showMeetings, setShowMeetings] = React.useState(false);
  const [meetings, setMeetings] = React.useState([]);
  const [meetingsLoading, setMeetingsLoading] = React.useState(false);
  const [showNotes, setShowNotes] = React.useState(false);
  const [expandedNote, setExpandedNote] = React.useState(null);
  const [savedNotes] = React.useState(() => {
    const items = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('crux_notes_')) {
        const meetingId = key.replace('crux_notes_', '');
        const content = localStorage.getItem(key) || '';
        if (content.trim()) items.push({ meetingId, content });
      }
    }
    return items;
  });

  React.useEffect(() => {
    if (!showMeetings || meetings.length > 0) return;
    setMeetingsLoading(true);
    MeetingService.getUserMeetings(user.uid)
      .then(m => setMeetings(m))
      .catch(() => {})
      .finally(() => setMeetingsLoading(false));
  }, [showMeetings]);

  const bg = dark ? '#0D0020' : '#F5F3FF';
  const cardBg = dark ? '#1A0A2E' : 'white';
  const textPri = dark ? '#F0EAF8' : '#1A1A1A';
  const textSec = dark ? '#C0A8E0' : '#666';

  const saveName = async () => {
    if (!newName.trim() || newName.trim().length < 2) return;
    setLoading(true);
    try {
      await AuthService.updateDisplayName(newName.trim());
      setDisplayName(newName.trim());
      onUserUpdated({ ...user, name: newName.trim() });
      setEditName(false);
      showToast('✅ Nom mis à jour', 'success');
    } catch { showToast('❌ Erreur lors de la mise à jour', 'error'); }
    setLoading(false);
  };

  const changePassword = async () => {
    if (newPw.length < 6) { setPwError('Mot de passe trop court (min. 6 caractères)'); return; }
    setLoading(true); setPwError('');
    try {
      await AuthService.changePassword(currentPw, newPw);
      setChangingPw(false); setCurrentPw(''); setNewPw('');
      showToast('✅ Mot de passe modifié', 'success');
    } catch (e) { setPwError(e.message || 'Erreur'); }
    setLoading(false);
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      localStorage.setItem(`crux_avatar_${user.uid}`, dataUrl);
      setAvatarUrl(dataUrl);
      showToast('📸 Photo mise à jour', 'success');
    };
    reader.readAsDataURL(file);
  };

  const deleteAccount = async () => {
    setLoading(true);
    try {
      await AuthService.deleteAccount();
      showToast('🗑️ Compte supprimé', 'success');
    } catch (e) { showToast('❌ ' + (e.message || 'Erreur'), 'error'); }
    setLoading(false);
  };

  const initials = (displayName || user.email || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="crux-scroll" style={{ minHeight: '100vh', fontFamily: 'Poppins, sans-serif', background: bg }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#E74C3C,#8E44AD)', padding: '20px 20px 60px', position: 'relative' }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '8px 14px', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>←</button>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: '12px 0 0' }}>Mon Profil</h2>
      </div>

      <div style={{ padding: '0 16px', maxWidth: 520, margin: '0 auto', position: 'relative', top: -44 }}>
        {/* Avatar card */}
        <div style={{ background: cardBg, borderRadius: 20, padding: '24px 20px', textAlign: 'center', boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)', marginBottom: 16 }}>
          <div style={{ position: 'relative', width: 90, height: 90, margin: '0 auto 12px' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '3px solid white', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }} />
            ) : (
              <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg,#E74C3C,#8E44AD)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: 'white', border: '3px solid white', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>{initials}</div>
            )}
            <label style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: '#8E44AD', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid white', fontSize: 14 }}>
              📷<input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            </label>
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: textPri, margin: '0 0 4px' }}>{displayName}</p>
          <p style={{ fontSize: 13, color: textSec, margin: 0 }}>{user.email}</p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
            <div style={{ background: dark ? '#2D1050' : '#F5F3FF', borderRadius: 12, padding: '10px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#8E44AD', margin: 0 }}>{stats.meetings}</p>
              <p style={{ fontSize: 11, color: textSec, margin: '2px 0 0' }}>Réunions</p>
            </div>
            <div style={{ background: dark ? '#2D1050' : '#F5F3FF', borderRadius: 12, padding: '10px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#E74C3C', margin: 0 }}>{stats.xp}</p>
              <p style={{ fontSize: 11, color: textSec, margin: '2px 0 0' }}>XP</p>
            </div>
            <div style={{ background: dark ? '#2D1050' : '#F5F3FF', borderRadius: 12, padding: '10px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#27AE60', margin: 0 }}>{stats.badges?.length || 0}</p>
              <p style={{ fontSize: 11, color: textSec, margin: '2px 0 0' }}>Badges</p>
            </div>
          </div>
        </div>

        {/* Edit name */}
        <div style={{ background: cardBg, borderRadius: 20, padding: '0 4px', boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)', marginBottom: 16, overflow: 'hidden' }}>
          <div onClick={() => { setEditName(v => !v); setNewName(displayName); }} style={{ display: 'flex', alignItems: 'center', padding: '16px', cursor: 'pointer', gap: 14, borderBottom: editName ? `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#F0F0F0'}` : 'none' }}>
            <span style={{ fontSize: 20 }}>✏️</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: textPri }}>Modifier le nom</span>
            <span style={{ color: '#8E44AD', fontSize: 18 }}>{editName ? '▾' : '›'}</span>
          </div>
          {editName && (
            <div style={{ padding: '16px' }}>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Votre nom" maxLength={50}
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #8E44AD', fontSize: 14, color: textPri, background: dark ? '#2D1050' : '#F8F3FF', fontFamily: 'Poppins, sans-serif', outline: 'none', marginBottom: 12 }} />
              <button onClick={saveName} disabled={loading || !newName.trim()} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#E74C3C,#8E44AD)', border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                {loading ? '⏳' : '✅ Enregistrer'}
              </button>
            </div>
          )}
        </div>

        {/* Change password */}
        <div style={{ background: cardBg, borderRadius: 20, padding: '0 4px', boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)', marginBottom: 16, overflow: 'hidden' }}>
          <div onClick={() => { setChangingPw(v => !v); setPwError(''); }} style={{ display: 'flex', alignItems: 'center', padding: '16px', cursor: 'pointer', gap: 14, borderBottom: changingPw ? `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#F0F0F0'}` : 'none' }}>
            <span style={{ fontSize: 20 }}>🔒</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: textPri }}>Changer le mot de passe</span>
            <span style={{ color: '#8E44AD', fontSize: 18 }}>{changingPw ? '▾' : '›'}</span>
          </div>
          {changingPw && (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Mot de passe actuel"
                style={{ padding: '12px 16px', borderRadius: 12, border: '1.5px solid #DDD', fontSize: 14, color: textPri, background: dark ? '#2D1050' : '#F8F3FF', fontFamily: 'Poppins, sans-serif', outline: 'none' }} />
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Nouveau mot de passe (min. 6)"
                style={{ padding: '12px 16px', borderRadius: 12, border: '1.5px solid #DDD', fontSize: 14, color: textPri, background: dark ? '#2D1050' : '#F8F3FF', fontFamily: 'Poppins, sans-serif', outline: 'none' }} />
              {pwError && <p style={{ color: '#E74C3C', fontSize: 12, margin: 0 }}>{pwError}</p>}
              <button onClick={changePassword} disabled={loading} style={{ padding: '12px', background: 'linear-gradient(135deg,#E74C3C,#8E44AD)', border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                {loading ? '⏳' : '🔑 Modifier'}
              </button>
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div style={{ background: cardBg, borderRadius: 20, overflow: 'hidden', boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)', marginBottom: 32 }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#F0F0F0'}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#E74C3C', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>Zone dangereuse</p>
          </div>
          <div onClick={() => setShowDelete(true)} style={{ display: 'flex', alignItems: 'center', padding: '16px', cursor: 'pointer', gap: 14 }}>
            <span style={{ fontSize: 20 }}>🗑️</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#E74C3C' }}>Supprimer le compte</span>
            <span style={{ color: '#E74C3C', fontSize: 18 }}>›</span>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: cardBg, borderRadius: 20, padding: 28, maxWidth: 320, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: textPri, margin: '0 0 8px' }}>Supprimer le compte ?</h3>
            <p style={{ fontSize: 13, color: textSec, margin: '0 0 20px' }}>Cette action est irréversible. Toutes vos données seront perdues.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowDelete(false)} style={{ flex: 1, padding: '12px', background: dark ? '#2D1050' : '#F5F3FF', border: 'none', borderRadius: 12, color: textPri, fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>Annuler</button>
              <button onClick={deleteAccount} disabled={loading} style={{ flex: 1, padding: '12px', background: '#E74C3C', border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>{loading ? '⏳' : 'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// NOTES PAGE — persistent notes per meeting
// ============================================================
function NotesPage({ user, T, dark, onBack }) {
  const t = th(dark);
  // Gather all saved notes from localStorage
  const [notesList, setNotesList] = React.useState(() => {
    const items = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('crux_notes_')) {
        const meetingId = key.replace('crux_notes_', '');
        const content = localStorage.getItem(key) || '';
        if (content.trim()) items.push({ meetingId, content });
      }
    }
    return items;
  });
  const [selected, setSelected] = React.useState(notesList[0]?.meetingId || null);
  const [editContent, setEditContent] = React.useState(() => {
    const first = notesList[0];
    return first ? first.content : '';
  });

  const handleSelect = (id) => {
    setSelected(id);
    setEditContent(localStorage.getItem('crux_notes_' + id) || '');
  };

  const handleChange = (val) => {
    setEditContent(val);
    if (selected) {
      localStorage.setItem('crux_notes_' + selected, val);
      setNotesList(n => n.map(x => x.meetingId === selected ? { ...x, content: val } : x));
    }
  };

  const handleDelete = (id) => {
    localStorage.removeItem('crux_notes_' + id);
    const updated = notesList.filter(x => x.meetingId !== id);
    setNotesList(updated);
    if (selected === id) {
      const next = updated[0];
      setSelected(next?.meetingId || null);
      setEditContent(next?.content || '');
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', background: t.bgPage, fontFamily: 'Poppins, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', width: '100%', padding: '24px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSec, fontSize: 20 }}>←</button>
          <h1 style={{ color: t.textPri, fontSize: 20, fontWeight: 800, margin: 0 }}>📝 Mes Notes</h1>
        </div>

        {notesList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: t.textMuted }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📝</div>
            <p style={{ fontSize: 16, fontWeight: 600 }}>Aucune note sauvegardée</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Vos notes de réunion apparaîtront ici</p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
            {/* List */}
            <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notesList.map(n => (
                <div key={n.meetingId} onClick={() => handleSelect(n.meetingId)}
                  style={{ padding: '12px 14px', borderRadius: 12, background: selected===n.meetingId ? (dark ? '#2D1A5A' : '#F0E8FF') : t.bgCard, border: `1.5px solid ${selected===n.meetingId ? C.violet : t.border}`, cursor: 'pointer', position: 'relative' }}>
                  <p style={{ color: t.textPri, fontSize: 12, fontWeight: 700, margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Réunion {n.meetingId.slice(0, 8)}</p>
                  <p style={{ color: t.textMuted, fontSize: 11, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{n.content.slice(0, 80)}</p>
                  <button onClick={e => { e.stopPropagation(); handleDelete(n.meetingId); }}
                    style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', cursor: 'pointer', color: C.error, fontSize: 14, lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
            {/* Editor */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: t.bgCard, borderRadius: 16, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
              {selected ? (
                <>
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: t.textSec, fontSize: 12, fontWeight: 600 }}>Réunion {selected.slice(0, 8)}</span>
                    <span style={{ color: t.textMuted, fontSize: 11 }}>💾 Sauvegardé</span>
                  </div>
                  <textarea value={editContent} onChange={e => handleChange(e.target.value)}
                    placeholder="Vos notes..."
                    style={{ flex: 1, padding: '16px', border: 'none', resize: 'none', fontFamily: 'Poppins, sans-serif', fontSize: 14, color: t.textPri, background: 'transparent', outline: 'none', lineHeight: 1.8 }} />
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted, fontSize: 14 }}>Sélectionnez une note</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PRIVACY POLICY PAGE
// ============================================================
function PrivacyPolicyPage({ T, onBack }) {
  const sections = [
    { icon: '📊', title: 'Données collectées', body: 'CRUX collecte uniquement les informations nécessaires au fonctionnement du service : nom d\'utilisateur, adresse email et données de réunion. Aucune donnée sensible n\'est transmise à des tiers.' },
    { icon: '🔍', title: 'Utilisation des données', body: 'Vos données sont utilisées exclusivement pour vous fournir les fonctionnalités de CRUX : création de compte, gestion des réunions, gamification et personnalisation.' },
    { icon: '🔐', title: 'Stockage & sécurité', body: 'Les données sont stockées localement dans votre navigateur (localStorage). Aucune information n\'est transmise à des serveurs externes sans votre consentement. Les mots de passe sont encodés avant stockage.' },
    { icon: '⚖️', title: 'Vos droits', body: 'Conformément au RGPD, vous avez le droit d\'accéder, corriger, ou supprimer vos données à tout moment. Vous pouvez effacer toutes vos données en vidant le stockage local de votre navigateur.' },
    { icon: '🍪', title: 'Cookies', body: 'CRUX utilise uniquement le localStorage du navigateur pour mémoriser vos préférences. Aucun cookie de tracking publicitaire n\'est utilisé.' },
  ];
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px', fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36 }}>
        <button onClick={onBack} style={{ padding: '8px 16px', background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.textPrimary, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>{T.back}</button>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: 0 }}>🔐 {T.privacyPolicy}</h2>
      </div>
      {sections.map((s, i) => (
        <div key={i} style={{ background: C.white, borderRadius: 16, padding: 24, border: `1.5px solid ${C.border}`, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{s.icon}</span> {s.title}
          </h4>
          <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, lineHeight: 1.7 }}>{s.body}</p>
        </div>
      ))}
      <p style={{ fontSize: 12, color: C.textTertiary, textAlign: 'center', marginTop: 24 }}>
        Dernière mise à jour : Juin 2025 · contact@crux.app
      </p>
    </div>
  );
}

// ============================================================
// TERMS OF SERVICE PAGE
// ============================================================
function TermsPage({ T, onBack }) {
  const sections = [
    { icon: '✅', title: 'Acceptation des conditions', body: 'En utilisant CRUX, vous acceptez d\'être lié par ces conditions d\'utilisation. Si vous n\'acceptez pas ces conditions, veuillez ne pas utiliser le service.' },
    { icon: '🚫', title: 'Utilisation acceptable', body: 'Vous vous engagez à utiliser CRUX uniquement à des fins légales et conformément à ces conditions. Il est interdit d\'utiliser CRUX pour harceler, menacer ou diffuser des contenus illicites.' },
    { icon: '©️', title: 'Propriété intellectuelle', body: 'CRUX et tous ses contenus (logo, design, code) sont protégés par le droit de la propriété intellectuelle. Toute reproduction non autorisée est strictement interdite.' },
    { icon: '⚠️', title: 'Limitation de responsabilité', body: 'CRUX est fourni "en l\'état" sans garantie d\'aucune sorte. Nous ne saurions être tenus responsables des interruptions de service, pertes de données ou dommages indirects.' },
    { icon: '🔄', title: 'Modifications', body: 'Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prennent effet immédiatement après leur publication. L\'utilisation continue du service vaut acceptation.' },
    { icon: '📬', title: 'Contact', body: 'Pour toute question relative à ces conditions, contactez-nous à : legal@crux.app · CRUX SAS, 75001 Paris, France' },
  ];
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px', fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36 }}>
        <button onClick={onBack} style={{ padding: '8px 16px', background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.textPrimary, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>{T.back}</button>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: 0 }}>📋 {T.termsOfService}</h2>
      </div>
      {sections.map((s, i) => (
        <div key={i} style={{ background: C.white, borderRadius: 16, padding: 24, border: `1.5px solid ${C.border}`, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{s.icon}</span> {s.title}
          </h4>
          <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, lineHeight: 1.7 }}>{s.body}</p>
        </div>
      ))}
      <p style={{ fontSize: 12, color: C.textTertiary, textAlign: 'center', marginTop: 24 }}>
        Dernière mise à jour : Juin 2025 · legal@crux.app
      </p>
    </div>
  );
}

// ============================================================
// SETTINGS PAGE
// ============================================================
function SettingsPage({ T, prefs, dark, onUpdatePref, onBack, onPrivacy, onTerms, showToast }) {
  const [isPro, setIsPro] = useState(false);
  const [proLoading, setProLoading] = useState(true);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [dndStart, setDndStart] = useState(prefs.dndStart || '22:00');
  const [dndEnd, setDndEnd] = useState(prefs.dndEnd || '08:00');

  useEffect(() => {
    if (window._cruxUser?.uid) {
      ProService.isPro(window._cruxUser.uid).then(v => { setIsPro(v); setProLoading(false); });
    } else { setProLoading(false); }
  }, []);

  const currentPalette = getPalette(prefs.accentPalette);

  const langs = [
    { code: 'fr', label: '🇫🇷 Français' },
    { code: 'en', label: '🇬🇧 English' },
    { code: 'es', label: '🇪🇸 Español' },
    { code: 'de', label: '🇩🇪 Deutsch' },
    { code: 'ru', label: '🇷🇺 Русский' },
  ];
  const qualities = ['low', 'medium', 'high', 'veryHigh'];
  const qualityLabels = { low: T.low, medium: T.medium, high: T.high, veryHigh: T.veryHigh };
  const [showLang, setShowLang] = useState(false);
  const [showQuality, setShowQuality] = useState(false);

  const sectionTitle = (label) => (
    <p style={{ color: '#8E44AD', fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', margin: '0 0 4px', paddingLeft: 4 }}>{label}</p>
  );

  const tileRow = (icon, title, right, onClick, showDivider = true) => (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', padding: '14px 16px',
      borderTop: showDivider ? `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#F0F0F0'}` : 'none',
      cursor: onClick ? 'pointer' : 'default', gap: 14,
      transition: 'background 0.15s',
    }}
      onMouseEnter={e => onClick && (e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.05)' : '#F8F3FF')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: dark ? '#F0EAF8' : '#1A1A1A' }}>{title}</span>
      {right}
    </div>
  );

  const settCard = { background: dark ? '#1A0A2E' : 'white', borderRadius: 16, overflow: 'hidden', boxShadow: dark ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.06)', marginBottom: 8 };

  return (
    <div className="crux-scroll" style={{ minHeight: '100vh', fontFamily: 'Poppins, sans-serif', background: dark ? '#0D0020' : '#F5F3FF' }}>
      {/* Gradient AppBar */}
      <div style={{
        background: 'linear-gradient(135deg, #E74C3C, #8E44AD)',
        padding: '20px 20px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: '0 4px 20px rgba(231,76,60,0.30)',
      }}>
        <button onClick={onBack} style={{
          background: 'rgba(255,255,255,0.20)', border: '1px solid rgba(255,255,255,0.30)',
          borderRadius: 12, padding: '8px 14px', color: 'white', fontWeight: 700, fontSize: 13,
          cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
        }}>←</button>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: 0 }}>Paramètres</h2>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>

        {/* RÉUNION */}
        <div style={{ marginBottom: 20 }}>
          {sectionTitle('Réunion')}
          <div style={settCard}>
            {tileRow('📹', 'Caméra par défaut',
              <ToggleSwitch on={prefs.defaultCam} onChange={v => { onUpdatePref('defaultCam', v); showToast?.(v ? '📹 Caméra activée' : '📹 Caméra désactivée', 'success'); }} colorOn="#8E44AD" />,
              null, false)}
            {tileRow('🎤', 'Micro par défaut',
              <ToggleSwitch on={prefs.defaultMic} onChange={v => { onUpdatePref('defaultMic', v); showToast?.(v ? '🎤 Micro activé' : '🎤 Micro désactivé', 'success'); }} colorOn="#8E44AD" />)}
            {tileRow('🎬', 'Qualité vidéo',
              <button onClick={() => setShowQuality(true)} style={{
                background: '#F5F3FF', border: '1px solid #D0B0FF', borderRadius: 8,
                padding: '6px 12px', fontSize: 13, color: '#8E44AD', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
              }}>{qualityLabels[prefs.videoQuality] || 'Élevé'} ›</button>,
              () => setShowQuality(true))}
          </div>
        </div>

        {/* APPARENCE */}
        <div style={{ marginBottom: 20 }}>
          {sectionTitle(T.language || 'Apparence')}
          <div style={settCard}>
            {tileRow('🌙', T.darkMode,
              <ToggleSwitch on={!!prefs.darkMode} onChange={v => { onUpdatePref('darkMode', v); showToast?.(v ? '🌙 Mode sombre activé' : '☀️ Mode clair activé', 'success'); }} colorOn="#8E44AD" />,
              null, false)}
            {tileRow('🌐', T.language,
              <button onClick={() => setShowLang(true)} style={{
                background: '#F5F3FF', border: '1px solid #D0B0FF', borderRadius: 8,
                padding: '6px 12px', fontSize: 13, color: '#8E44AD', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
              }}>{langs.find(l => l.code === prefs.language)?.label || '🇫🇷 Français'} ›</button>,
              () => setShowLang(true))}
          </div>
        </div>

        {/* COULEUR DE L'APPLICATION */}
        <div style={{ marginBottom: 20 }}>
          {sectionTitle('Couleur de l\'application')}
          <div style={settCard}>
            {tileRow('🎨', 'Thème de couleur',
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg, ${currentPalette.start}, ${currentPalette.end})`, boxShadow: `0 2px 8px ${currentPalette.start}50` }} />
                <span style={{ fontSize: 12, color: '#8E44AD', fontWeight: 600 }}>{currentPalette.name} ›</span>
              </div>,
              () => setShowColorPicker(true), false)}
          </div>
        </div>

        {/* NOTIFICATIONS */}
        <div style={{ marginBottom: 20 }}>
          {sectionTitle('Notifications')}
          <div style={settCard}>
            {tileRow('🔔', 'Activer les notifications',
              <ToggleSwitch on={prefs.notifications} onChange={v => { onUpdatePref('notifications', v); showToast?.(v ? '🔔 Notifications activées' : '🔕 Notifications désactivées', 'success'); }} colorOn="#8E44AD" />,
              null, false)}
            {tileRow('🌙', 'Ne pas déranger',
              <ToggleSwitch on={!!prefs.dnd} onChange={v => { onUpdatePref('dnd', v); showToast?.(v ? '🌙 Ne pas déranger activé' : '🔔 Ne pas déranger désactivé', 'success'); }} colorOn="#8B5CF6" />)}
            {prefs.dnd && (
              <div style={{ padding: '12px 16px', borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#F0F0F0'}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: dark ? '#C0A8E0' : '#666', fontWeight: 500 }}>De</span>
                <input type="time" value={dndStart} onChange={e => { setDndStart(e.target.value); onUpdatePref('dndStart', e.target.value); }}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #8B5CF6', fontSize: 13, color: dark ? '#F0EAF8' : '#1A1A1A', background: dark ? '#2D1050' : '#F8F3FF', fontFamily: 'Poppins, sans-serif' }} />
                <span style={{ fontSize: 16, color: '#8B5CF6' }}>→</span>
                <input type="time" value={dndEnd} onChange={e => { setDndEnd(e.target.value); onUpdatePref('dndEnd', e.target.value); }}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #8B5CF6', fontSize: 13, color: dark ? '#F0EAF8' : '#1A1A1A', background: dark ? '#2D1050' : '#F8F3FF', fontFamily: 'Poppins, sans-serif' }} />
              </div>
            )}
          </div>
        </div>

        {/* PRO */}
        <div style={{ marginBottom: 20 }}>
          {sectionTitle('Abonnement')}
          <div style={{
            borderRadius: 16, overflow: 'hidden', marginBottom: 8,
            background: isPro ? 'linear-gradient(135deg,#F57F17,#FF8F00)' : 'linear-gradient(135deg,#6A1B9A,#8E44AD)',
            boxShadow: isPro ? '0 8px 24px rgba(245,127,23,0.4)' : '0 8px 24px rgba(142,68,173,0.3)',
            padding: 20,
          }}>
            {proLoading ? (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>⏳ Vérification...</div>
            ) : isPro ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 36 }}>⭐</span>
                <div>
                  <p style={{ color: 'white', fontWeight: 800, fontSize: 16, margin: 0 }}>CRUX Pro — Actif</p>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, margin: '4px 0 0' }}>Toutes les fonctionnalités débloquées</p>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 24 }}>✅</span>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <span style={{ fontSize: 36 }}>🚀</span>
                  <div>
                    <p style={{ color: 'white', fontWeight: 800, fontSize: 16, margin: 0 }}>Passer à Pro</p>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, margin: '4px 0 0' }}>Réunions illimitées · HD · Enregistrement</p>
                  </div>
                </div>
                <button onClick={() => ProService.openPayment()} style={{
                  width: '100%', padding: '12px', background: 'white', border: 'none', borderRadius: 12,
                  color: '#6A1B9A', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
                }}>
                  Activer Pro — {ProService.PRICE_XOF.toLocaleString()} XOF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* À PROPOS */}
        <div style={{ marginBottom: 20 }}>
          {sectionTitle('À Propos')}
          <div style={settCard}>
            {tileRow('📱', 'Version', <span style={{ fontSize: 13, color: '#999' }}>2.0.0</span>, null, false)}
            {tileRow('👥', 'Équipe', <span style={{ fontSize: 13, color: '#999' }}>CRUX Team</span>)}
          </div>
        </div>

        {/* LÉGAL */}
        <div style={{ marginBottom: 20 }}>
          {sectionTitle('Légal')}
          <div style={settCard}>
            {tileRow('🔐', T.privacyPolicy, <span style={{ color: '#8E44AD', fontSize: 16 }}>›</span>, onPrivacy, false)}
            {tileRow('📄', T.termsOfService, <span style={{ color: '#8E44AD', fontSize: 16 }}>›</span>, onTerms)}
          </div>
        </div>

        {/* Action buttons */}
        <button onClick={() => { window.location.href = 'mailto:support@crux.app'; }} style={{
          width: '100%', padding: '16px', marginBottom: 12,
          background: 'linear-gradient(135deg, #E74C3C, #8E44AD)',
          border: 'none', borderRadius: 16, color: 'white',
          fontSize: 15, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'Poppins, sans-serif',
          boxShadow: '0 8px 24px rgba(231,76,60,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          📧 Assistance
        </button>
        <button onClick={() => navigator.share?.({ title: 'CRUX', text: 'Rejoignez-moi sur CRUX !', url: 'https://meschac-creator.github.io/crux_web' }).catch(() => {})} style={{
          width: '100%', padding: '16px',
          background: 'linear-gradient(135deg, #3498DB, #8E44AD)',
          border: 'none', borderRadius: 16, color: 'white',
          fontSize: 15, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'Poppins, sans-serif',
          boxShadow: '0 8px 24px rgba(52,152,219,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          🔗 Partager l'application
        </button>
      </div>

      {/* Language dialog */}
      {showLang && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowLang(false)}>
          <div style={{ background: dark ? '#1A0A2E' : 'white', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 340 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: dark ? '#F0EAF8' : '#1A1A1A', margin: '0 0 16px' }}>Choisir la langue</h3>
            {langs.map(l => (
              <div key={l.code} onClick={() => { onUpdatePref('language', l.code); setShowLang(false); showToast?.('🌐 Langue modifiée', 'success'); }} style={{
                padding: '14px 16px', borderRadius: 12, cursor: 'pointer', marginBottom: 4,
                background: prefs.language === l.code ? (dark ? '#2D1050' : '#F5F3FF') : 'transparent',
                border: prefs.language === l.code ? '1.5px solid #8E44AD' : `1.5px solid ${dark ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
                fontSize: 14, fontWeight: 500, color: dark ? '#F0EAF8' : '#1A1A1A',
                display: 'flex', justifyContent: 'space-between',
              }}>
                {l.label}
                {prefs.language === l.code && <span style={{ color: '#8E44AD', fontWeight: 700 }}>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Color picker dialog */}
      {showColorPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowColorPicker(false)}>
          <div style={{ background: dark ? '#1A0A2E' : 'white', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: dark ? '#F0EAF8' : '#1A1A1A', margin: '0 0 20px' }}>🎨 Thème de couleur</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
              {COLOR_PALETTES.map(p => {
                const selected = prefs.accentPalette === p.id || (!prefs.accentPalette && p.id === 'flame');
                return (
                  <div key={p.id} onClick={() => { onUpdatePref('accentPalette', p.id); setShowColorPicker(false); showToast?.(`🎨 Thème "${p.name}" appliqué`, 'success'); }} style={{ cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${p.start}, ${p.end})`,
                      boxShadow: selected ? `0 0 0 3px white, 0 0 0 5px ${p.start}` : `0 4px 12px ${p.start}60`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: selected ? 20 : 0, color: 'white', transition: 'all 0.2s',
                      transform: selected ? 'scale(1.12)' : 'scale(1)',
                    }}>{selected ? '✓' : ''}</div>
                    <p style={{ fontSize: 10, color: selected ? p.start : (dark ? '#C0A8E0' : '#666'), fontWeight: selected ? 700 : 400, margin: '6px 0 0' }}>{p.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quality dialog */}
      {showQuality && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowQuality(false)}>
          <div style={{ background: dark ? '#1A0A2E' : 'white', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 340 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: dark ? '#F0EAF8' : '#1A1A1A', margin: '0 0 16px' }}>Qualité vidéo</h3>
            {qualities.map(q => (
              <div key={q} onClick={() => { onUpdatePref('videoQuality', q); setShowQuality(false); showToast?.('🎬 Qualité vidéo mise à jour', 'success'); }} style={{
                padding: '14px 16px', borderRadius: 12, cursor: 'pointer', marginBottom: 4,
                background: prefs.videoQuality === q ? (dark ? '#2D1050' : '#F5F3FF') : 'transparent',
                border: prefs.videoQuality === q ? '1.5px solid #8E44AD' : `1.5px solid ${dark ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
                fontSize: 14, fontWeight: 500, color: dark ? '#F0EAF8' : '#1A1A1A',
                display: 'flex', justifyContent: 'space-between',
              }}>
                {qualityLabels[q]}
                {prefs.videoQuality === q && <span style={{ color: '#8E44AD', fontWeight: 700 }}>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SHARED COMPONENTS
// ============================================================
function Field({ icon, type = 'text', placeholder, value, onChange, paddingRight, autoFocus, onKeyDown }) {
  return (
    <div style={{ position: 'relative' }}>
      {icon && <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>{icon}</span>}
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} autoFocus={autoFocus} onKeyDown={onKeyDown}
        style={{ ...fieldStyle, paddingLeft: icon ? 42 : 14, paddingRight: paddingRight || 14 }} />
    </div>
  );
}

function CruxModal({ children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.white, borderRadius: 24, padding: '40px 36px', maxWidth: 460, width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.15)', fontFamily: 'Poppins, sans-serif' }}>{children}</div>
    </div>
  );
}

const ModalHeader = ({ icon, title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
    <div style={{ width: 44, height: 44, borderRadius: 12, background: C.primaryGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{icon}</div>
    <h3 style={{ fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: 0 }}>{title}</h3>
  </div>
);

const ModalActions = ({ children }) => <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>{children}</div>;

const PrimaryBtn = ({ children, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{ ...primBtn, flex: 1, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>{children}</button>
);
const SecondaryBtn = ({ children, onClick }) => <button onClick={onClick} style={{ ...secBtn, flex: 1 }}>{children}</button>;

function ToggleSwitch({ on, onChange, colorOn = C.success }) {
  return (
    <div onClick={() => onChange(!on)} style={{ width: 46, height: 26, borderRadius: 13, cursor: 'pointer', flexShrink: 0, background: on ? colorOn : C.mediumBg, position: 'relative', transition: 'background 0.25s', border: `1px solid ${on ? colorOn : C.border}` }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
    </div>
  );
}

function SettSection({ title, children }) {
  return (
    <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1.5px solid ${C.border}`, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
      <h4 style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: '0 0 16px' }}>{title}</h4>
      {children}
    </div>
  );
}
function SettRow({ label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: C.textPrimary }}>{label}</span>
      {children}
    </div>
  );
}
function SettToggle({ label, value, onChange }) { return <SettRow label={label}><ToggleSwitch on={value} onChange={onChange} colorOn={C.violet} /></SettRow>; }
function SettSelect({ label, value, options, onChange }) {
  return (
    <SettRow label={label}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ background: C.lightBg, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </SettRow>
  );
}

// ============================================================
// STYLE CONSTANTS
// ============================================================
const fieldStyle = {
  width: '100%', padding: '12px 14px', boxSizing: 'border-box',
  background: C.lightBg, border: `1.5px solid ${C.border}`,
  borderRadius: 12, color: C.textPrimary, fontSize: 14,
  outline: 'none', fontFamily: 'Poppins, sans-serif', transition: 'border-color 0.2s, box-shadow 0.2s',
};
const primBtn = {
  padding: '12px 20px', background: C.primaryGradient, color: 'white',
  border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700,
  cursor: 'pointer', width: '100%', fontFamily: 'Poppins, sans-serif', boxShadow: `0 6px 18px ${C.fireGlow}`,
};
const secBtn = {
  padding: '12px 20px', background: 'transparent', color: C.primary,
  border: `2px solid ${C.primary}`, borderRadius: 12, fontSize: 14,
  fontWeight: 700, cursor: 'pointer', width: '100%', fontFamily: 'Poppins, sans-serif',
};
const navIconBtn = {
  width: 38, height: 38, borderRadius: 10, background: C.lightBg,
  border: `1.5px solid ${C.border}`, cursor: 'pointer', fontSize: 16,
  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
};
const notifPanel = {
  position: 'absolute', top: 44, right: 0, background: C.white,
  border: `1.5px solid ${C.border}`, borderRadius: 16, padding: '20px',
  width: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 200,
};

// ============================================================
// IOS UTILITIES
// ============================================================
const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isInStandaloneMode = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

// iOS-safe getUserMedia — adds iOS-specific constraints
async function getMediaStream(video = true, audio = true) {
  const constraints = {
    video: video ? {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    } : false,
    audio: audio ? {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 44100,
    } : false,
  };
  return navigator.mediaDevices.getUserMedia(constraints);
}

// ── iOS "Add to Home Screen" prompt banner ──────────────────
function IOSInstallBanner({ onDismiss }) {
  if (!isIOS() || isInStandaloneMode()) return null;
  return (
    <div style={{
      position: 'fixed', bottom: `calc(env(safe-area-inset-bottom) + 12px)`,
      left: 16, right: 16, zIndex: 9998,
      background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)',
      borderRadius: 16, padding: '14px 18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      border: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', gap: 14,
      fontFamily: 'Poppins, sans-serif',
      animation: 'slideInRight 0.4s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      <CruxLogo size={40} />
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: C.textPrimary, margin: 0 }}>
          Installer CRUX sur votre iPhone
        </p>
        <p style={{ fontSize: 11, color: C.textSecondary, margin: '2px 0 0', lineHeight: 1.4 }}>
          Appuyez sur <strong>⎙ Partager</strong> puis <strong>Sur l'écran d'accueil</strong>
        </p>
      </div>
      <button onClick={onDismiss} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 20, color: C.textTertiary, padding: 4, flexShrink: 0,
      }}>×</button>
    </div>
  );
}

// ============================================================
// GLOBAL CSS
// ============================================================
const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html {
    height: -webkit-fill-available;
    font-family: 'Poppins', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  }
  body {
    font-family: 'Poppins', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    background: #F8F9FA;
    min-height: 100vh;
    min-height: -webkit-fill-available;
    overscroll-behavior: none;
    -webkit-overflow-scrolling: touch;
  }

  /* ── iOS full-height fix (100dvh not supported on old iOS) ── */
  .crux-fullscreen {
    height: 100vh;
    height: 100dvh;
    height: -webkit-fill-available;
  }

  /* ── Safe area padding for notch / home bar ── */
  .crux-safe-top    { padding-top: env(safe-area-inset-top, 0px); }
  .crux-safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }

  /* ── Prevent iOS double-tap zoom & callout ── */
  * {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
  }
  input, textarea, select {
    -webkit-touch-callout: default;
    /* Prevent iOS zoom on focus (font-size must be ≥ 16px) */
    font-size: 16px !important;
  }
  button { -webkit-appearance: none; appearance: none; }

  /* ── iOS scroll momentum ── */
  .crux-scroll { -webkit-overflow-scrolling: touch; overflow-y: auto; }

  @keyframes loadBar {
    0%   { width: 0%; }
    30%  { width: 40%; }
    70%  { width: 75%; }
    100% { width: 100%; }
  }
  @keyframes blobFloat {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33%  { transform: translate(30px, -40px) scale(1.08); }
    66%  { transform: translate(-20px, 25px) scale(0.94); }
  }
  @keyframes recPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  @keyframes floatUp {
    0%   { transform: translateY(0) scale(1); opacity: 1; }
    80%  { opacity: 0.8; }
    100% { transform: translateY(-300px) scale(1.4); opacity: 0; }
  }
  @keyframes slideInRight {
    from { transform: translateX(120%); opacity: 0; }
    to   { transform: translateX(0); opacity: 1; }
  }
  @keyframes rippleGrow {
    0%   { transform: translate(-50%,-50%) scale(0.2); opacity: 0.7; }
    100% { transform: translate(-50%,-50%) scale(2.8); opacity: 0; }
  }
  @keyframes particleFloat {
    0%   { transform: translateY(0) scale(1); opacity: 0.8; }
    50%  { transform: translateY(-40px) scale(1.15); opacity: 1; }
    100% { transform: translateY(0) scale(1); opacity: 0.8; }
  }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 20px rgba(255,64,129,0.25); }
    50%       { box-shadow: 0 0 48px rgba(255,64,129,0.6), 0 0 80px rgba(170,0,255,0.3); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  input:focus, select:focus, textarea:focus {
    border-color: ${C.violetLight} !important;
    box-shadow: 0 0 0 3px ${C.violetGlow};
    outline: none;
  }
  button { font-family: 'Poppins', sans-serif; }
  button:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); transition: all 0.15s; }
  button:active:not(:disabled) { transform: translateY(0); }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: ${C.lightBg}; }
  ::-webkit-scrollbar-thumb { background: ${C.violetLight}; border-radius: 3px; }
`;

