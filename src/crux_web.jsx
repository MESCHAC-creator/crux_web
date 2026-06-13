import AgoraRTC from 'agora-rtc-sdk-ng';
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
    meetingType: 'Type', temporary: 'Temporaire', persistent: 'Persistante', webinar: 'Webinaire (500+)',
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
    captions: 'Sous-titres',
    captionsOn: 'Sous-titres activés',
    captionsOff: 'Sous-titres désactivés',
    captionsUnsupported: 'Non supporté sur ce navigateur',
    notes: 'Notes',
    notesPlaceholder: 'Vos notes ici...',
    saved: 'Sauvegardé',
    invite: 'Inviter',
    meetingInfo: 'Infos réunion',
    copyLink: 'Copier le lien',
    copyId: "Copier l'ID",
    linkCopied: 'Lien copié !',
    idCopied: 'ID copié !',
    securityPanel: 'Sécurité',
    lockMeetingOn: 'Réunion verrouillée — plus personne ne peut rejoindre',
    waitingRoomToggle: 'Salle d\'attente',
    endMeetingForAll: 'Terminer pour tous',
    endMeetingConfirm: 'Terminer la réunion pour tous les participants ?',
    bgBlur: 'Flou arrière-plan',
    noiseCancel: 'Réduction du bruit',
    message: 'Message',
    appearance: 'Apparence',
    chooseLang: 'Choisir la langue',
    whiteboard: 'Tableau',
    miniScreen: 'Mini-écran',
    stopSharing: 'Arrêter',
    kickUser: 'Exclure',
    muteUser: 'Micro off',
    makeCoHost: 'Co-hôte',
    coHost: 'Co-hôte',
    kicked: 'Vous avez été exclu',
    kickedMsg: "L'hôte vous a retiré de cette réunion.",
    noParticipants: 'Aucun participant',
    muted: 'L\'hôte a coupé votre micro',
    mutedAll: 'L\'hôte a coupé tous les micros',
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
    meetingType: 'Type', temporary: 'Temporary', persistent: 'Persistent', webinar: 'Webinar (500+)',
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
    captions: 'Captions',
    captionsOn: 'Captions on',
    captionsOff: 'Captions off',
    captionsUnsupported: 'Not supported on this browser',
    notes: 'Notes',
    notesPlaceholder: 'Your notes here...',
    saved: 'Saved',
    invite: 'Invite',
    meetingInfo: 'Meeting info',
    copyLink: 'Copy link',
    copyId: 'Copy ID',
    linkCopied: 'Link copied!',
    idCopied: 'ID copied!',
    securityPanel: 'Security',
    lockMeetingOn: 'Meeting locked — no one else can join',
    waitingRoomToggle: 'Waiting room',
    endMeetingForAll: 'End for all',
    endMeetingConfirm: 'End the meeting for all participants?',
    bgBlur: 'Background blur',
    noiseCancel: 'Noise cancellation',
    message: 'Message',
    appearance: 'Appearance',
    chooseLang: 'Choose Language',
    whiteboard: 'Board',
    miniScreen: 'Mini Screen',
    stopSharing: 'Stop',
    kickUser: 'Kick',
    muteUser: 'Mute',
    makeCoHost: 'Co-Host',
    coHost: 'Co-Host',
    kicked: 'You were removed',
    kickedMsg: 'The host removed you from this meeting.',
    noParticipants: 'No participants',
    muted: 'Host muted your microphone',
    mutedAll: 'Host muted all microphones',
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
  pt: { appTagline:'Videoconferência Premium', signIn:'Entrar', signUp:'Cadastrar', email:'Email', password:'Senha', fullName:'Nome completo', show:'Mostrar', hide:'Ocultar', orContinue:'ou continuar com', googleBtn:'Continuar com Google', termsNote:'Ao continuar, você aceita nossos Termos.', welcome:'Olá', dashboard:'Painel', instantMeeting:'Reunião instantânea', schedule:'Agendar', joinCode:'Entrar', dialIn:'Discagem', recentMeetings:'Reuniões recentes', noMeetings:'Sem reuniões', noMeetingsHint:'Crie sua primeira reunião', participants:'participante(s)', settings:'Configurações', logout:'Sair', notifications:'Notificações', noNotif:'Sem novas notificações', darkMode:'Modo escuro', language:'Idioma', videoQuality:'Qualidade de vídeo', defaultMic:'Microfone ativado por padrão', defaultCam:'Câmera ativada por padrão', notifToggle:'Notificações', about:'Sobre', version:'Versão', team:'Equipe', support:'Suporte', share:'Compartilhar CRUX', shareMsg:'Experimente o CRUX!', meetingSettings:'Reunião', generalSettings:'Geral', low:'Baixa', medium:'Média', high:'Alta', veryHigh:'Muito alta', waitingRoom:'Sala de espera', waitingFor:'Aguardando o host...', prepareDevices:'Prepare seus dispositivos', camera:'Câmera', mic:'Microfone', joinMeeting:'Entrar na reunião', leaveWaiting:'Sair da sala de espera', meetingTitle:'Título da reunião', meetingDesc:'Descrição (opcional)', meetingType:'Tipo', temporary:'Temporária', persistent:'Persistente', create:'Criar', cancel:'Cancelar', join:'Entrar', enterCode:'ID ou código da reunião', endMeeting:'Encerrar', confirmExit:'Sair da reunião?', confirmExitMsg:'Tem certeza que deseja sair?', confirm:'Sair', newMeeting:'Nova reunião', back:'← Voltar', contactSupport:'Contatar suporte', loading:'Carregando...', connecting:'Conectando...', xpPoints:'Pontos XP', badges:'Emblemas', yourStats:'Suas estatísticas', meetingsHeld:'Reuniões', badgeEarned:'Novo emblema!', reactions:'Reações', raiseHand:'Levantar a mão', handRaised:'Mão levantada!', notes:'Notas', notesPlaceholder:'Escreva suas notas...', polls:'Enquetes', createPoll:'Criar enquete', pollQuestion:'Pergunta', pollOption:'Opção', addOption:'Adicionar opção', launchPoll:'Lançar', vote:'Votar', pollResults:'Resultados', closePoll:'Fechar', bgBlur:'Desfoque de fundo', audioLevel:'Nível de áudio', privacyMode:'Modo privacidade', privacyModeOn:'Vídeo desfocado', confirmPassword:'Confirmar senha', passwordMismatch:'As senhas não coincidem', passwordTooShort:'Senha muito curta', nameRequired:'Nome muito curto', emailInvalid:'Email inválido', rememberMe:'Lembrar-me', forgotPassword:'Esqueceu a senha?', resetPasswordTitle:'Redefinir senha', resetPasswordDesc:'Digite seu email.', resetPasswordBtn:'Enviar link', resetSent:'Link enviado!', resetSentMsg:'Verifique seu email.', statusScheduled:'Agendada', statusOngoing:'Em andamento', statusEnded:'Encerrada', hostBadge:'Anfitrião', hostControls:'Controles do host', lockMeeting:'Bloquear reunião', unlockMeeting:'Desbloquear', meetingLocked:'Reunião bloqueada', muteAll:'Silenciar todos', muteAllDone:'Sinal enviado', startRecording:'Iniciar gravação', stopRecording:'Parar gravação', recordingActive:'Gravação ativa', endForAll:'Encerrar para todos', legal:'Legal', privacyPolicy:'Política de privacidade', termsOfService:'Termos de serviço', securitySection:'Segurança', changePassword:'Alterar senha', successCopied:'Copiado!', successSaved:'Salvo', meetingCreated:'Reunião criada', chat:'Chat', inviteLink:'Link de convite', linkCopied:'Link copiado!', chatPlaceholder:'Sua mensagem...', noMessages:'Sem mensagens', send:'Enviar', guestJoin:'Entrar como convidado', shareCode:'Compartilhar código', admit:'Admitir', reject:'Rejeitar', admitAll:'Admitir todos', unmuteSelf:'Ativar meu som', screenShare:'Compartilhar tela', waitingForHost:'Aguardando o host', startInstantMeeting:'Iniciar reunião instantânea', scheduleMeeting:'Agendar reunião', joinViaCode:'Entrar via código', noRecentMeetings:'Sem reuniões recentes', message:'Mensagem' },
  it: { appTagline:'Videoconferenza Premium', signIn:'Accedi', signUp:'Registrati', email:'Email', password:'Password', fullName:'Nome completo', show:'Mostra', hide:'Nascondi', welcome:'Ciao', dashboard:'Dashboard', instantMeeting:'Riunione istantanea', schedule:'Pianifica', joinCode:'Partecipa', recentMeetings:'Riunioni recenti', noMeetings:'Nessuna riunione', participants:'partecipante/i', settings:'Impostazioni', logout:'Esci', darkMode:'Modalità scura', language:'Lingua', notes:'Note', polls:'Sondaggi', chat:'Chat', cancel:'Annulla', create:'Crea', join:'Partecipa', endMeeting:'Termina', newMeeting:'Nuova riunione', back:'← Indietro', loading:'Caricamento...', connecting:'Connessione...', reactions:'Reazioni', raiseHand:'Alza la mano', handRaised:'Mano alzata!', createPoll:'Crea sondaggio', pollQuestion:'Domanda', pollOption:'Opzione', addOption:'Aggiungi opzione', launchPoll:'Lancia', vote:'Vota', closePoll:'Chiudi', hostBadge:'Host', lockMeeting:'Blocca riunione', unlockMeeting:'Sblocca', muteAll:'Silenzia tutti', startRecording:'Avvia registrazione', stopRecording:'Ferma registrazione', send:'Invia', screenShare:'Condividi schermo', meetingCreated:'Riunione creata', successCopied:'Copiato!', forgotPassword:'Password dimenticata?', rememberMe:'Ricordami', statusScheduled:'Programmata', statusOngoing:'In corso', statusEnded:'Terminata', message:'Messaggio', noMeetingsHint:'Crea la tua prima riunione', confirmPassword:'Conferma password', passwordMismatch:'Le password non corrispondono', passwordTooShort:'Password troppo corta', nameRequired:'Nome troppo corto', emailInvalid:'Email non valida', meetingTitle:'Titolo riunione', meetingDesc:'Descrizione (opzionale)', temporary:'Temporanea', persistent:'Persistente', enterCode:"Inserisci l'ID della riunione", endForAll:'Termina per tutti', privacyPolicy:'Informativa privacy', termsOfService:'Termini di servizio', changePassword:'Cambia password', waitingRoom:'Sala d\'attesa', waitingFor:'In attesa dell\'host...', notesPlaceholder:'Le tue note...', low:'Bassa', medium:'Media', high:'Alta', veryHigh:'Molto alta' },
  ar: { appTagline:'مؤتمر فيديو متميز', signIn:'تسجيل الدخول', signUp:'إنشاء حساب', email:'البريد الإلكتروني', password:'كلمة المرور', fullName:'الاسم الكامل', show:'عرض', hide:'إخفاء', welcome:'مرحباً', dashboard:'لوحة التحكم', instantMeeting:'اجتماع فوري', schedule:'جدولة', joinCode:'انضمام', recentMeetings:'الاجتماعات الأخيرة', noMeetings:'لا اجتماعات', participants:'مشارك/ون', settings:'الإعدادات', logout:'تسجيل الخروج', darkMode:'الوضع الداكن', language:'اللغة', notes:'ملاحظات', polls:'استطلاعات', chat:'دردشة', cancel:'إلغاء', create:'إنشاء', join:'انضم', endMeeting:'إنهاء', newMeeting:'اجتماع جديد', back:'← رجوع', loading:'جاري التحميل...', reactions:'ردود الفعل', raiseHand:'رفع اليد', handRaised:'تم رفع اليد!', createPoll:'إنشاء استطلاع', pollQuestion:'السؤال', pollOption:'خيار', addOption:'إضافة خيار', launchPoll:'إطلاق', vote:'تصويت', closePoll:'إغلاق', hostBadge:'مضيف', lockMeeting:'قفل الاجتماع', unlockMeeting:'فتح', muteAll:'كتم الجميع', startRecording:'بدء التسجيل', stopRecording:'إيقاف التسجيل', send:'إرسال', screenShare:'مشاركة الشاشة', meetingCreated:'تم إنشاء الاجتماع', successCopied:'تم النسخ!', message:'رسالة', noMeetingsHint:'أنشئ اجتماعك الأول', meetingTitle:'عنوان الاجتماع', temporary:'مؤقت', persistent:'دائم', statusScheduled:'مجدول', statusOngoing:'جارٍ', statusEnded:'منتهي', noRecentMeetings:'لا اجتماعات أخيرة' },
  zh: { appTagline:'高端视频会议', signIn:'登录', signUp:'注册', email:'邮箱', password:'密码', fullName:'全名', show:'显示', hide:'隐藏', welcome:'你好', dashboard:'仪表板', instantMeeting:'即时会议', schedule:'安排', joinCode:'加入', recentMeetings:'最近会议', noMeetings:'无会议', participants:'参与者', settings:'设置', logout:'退出', darkMode:'深色模式', language:'语言', notes:'笔记', polls:'投票', chat:'聊天', cancel:'取消', create:'创建', join:'加入', endMeeting:'结束', newMeeting:'新会议', back:'← 返回', loading:'加载中...', reactions:'反应', raiseHand:'举手', handRaised:'已举手！', createPoll:'创建投票', pollQuestion:'问题', pollOption:'选项', addOption:'添加选项', launchPoll:'启动', vote:'投票', closePoll:'关闭', hostBadge:'主持人', lockMeeting:'锁定会议', unlockMeeting:'解锁', muteAll:'全员静音', startRecording:'开始录制', stopRecording:'停止录制', send:'发送', screenShare:'屏幕共享', meetingCreated:'会议已创建', successCopied:'已复制！', message:'消息', noMeetingsHint:'创建您的第一个会议', meetingTitle:'会议标题', temporary:'临时', persistent:'持久', statusScheduled:'已安排', statusOngoing:'进行中', statusEnded:'已结束', noRecentMeetings:'无最近会议' },
  hi: { appTagline:'प्रीमियम वीडियो कॉन्फ्रेंसिंग', signIn:'साइन इन', signUp:'साइन अप', email:'ईमेल', password:'पासवर्ड', fullName:'पूरा नाम', show:'दिखाएं', hide:'छुपाएं', welcome:'नमस्ते', dashboard:'डैशबोर्ड', instantMeeting:'तत्काल मीटिंग', schedule:'शेड्यूल', joinCode:'जॉइन', recentMeetings:'हाल की मीटिंग', noMeetings:'कोई मीटिंग नहीं', participants:'प्रतिभागी', settings:'सेटिंग', logout:'लॉगआउट', darkMode:'डार्क मोड', language:'भाषा', notes:'नोट्स', polls:'पोल', chat:'चैट', cancel:'रद्द करें', create:'बनाएं', join:'जॉइन', endMeeting:'समाप्त', newMeeting:'नई मीटिंग', back:'← वापस', loading:'लोड हो रहा है...', reactions:'प्रतिक्रियाएं', raiseHand:'हाथ उठाएं', handRaised:'हाथ उठाया!', createPoll:'पोल बनाएं', pollQuestion:'प्रश्न', pollOption:'विकल्प', addOption:'विकल्प जोड़ें', launchPoll:'शुरू करें', vote:'वोट', closePoll:'बंद करें', hostBadge:'होस्ट', muteAll:'सभी म्यूट', send:'भेजें', screenShare:'स्क्रीन शेयर', meetingCreated:'मीटिंग बनाई', successCopied:'कॉपी हो गया!', message:'संदेश', noMeetingsHint:'अपनी पहली मीटिंग बनाएं', meetingTitle:'मीटिंग शीर्षक', temporary:'अस्थायी', persistent:'स्थायी', statusScheduled:'निर्धारित', statusOngoing:'चल रही है', statusEnded:'समाप्त', noRecentMeetings:'हाल की कोई मीटिंग नहीं' },
  ja: { appTagline:'プレミアムビデオ会議', signIn:'ログイン', signUp:'登録', email:'メール', password:'パスワード', fullName:'フルネーム', show:'表示', hide:'非表示', welcome:'こんにちは', dashboard:'ダッシュボード', instantMeeting:'即時ミーティング', schedule:'スケジュール', joinCode:'参加', recentMeetings:'最近のミーティング', noMeetings:'ミーティングなし', participants:'参加者', settings:'設定', logout:'ログアウト', darkMode:'ダークモード', language:'言語', notes:'ノート', polls:'投票', chat:'チャット', cancel:'キャンセル', create:'作成', join:'参加', endMeeting:'終了', newMeeting:'新しいミーティング', back:'← 戻る', loading:'読み込み中...', reactions:'リアクション', raiseHand:'挙手', handRaised:'挙手しました！', createPoll:'投票作成', pollQuestion:'質問', pollOption:'オプション', addOption:'オプション追加', launchPoll:'開始', vote:'投票', closePoll:'終了', hostBadge:'ホスト', muteAll:'全員ミュート', send:'送信', screenShare:'画面共有', meetingCreated:'ミーティング作成済み', successCopied:'コピーしました！', message:'メッセージ', noMeetingsHint:'最初のミーティングを作成', meetingTitle:'ミーティングタイトル', temporary:'一時的', persistent:'永続的', statusScheduled:'予定済み', statusOngoing:'進行中', statusEnded:'終了', noRecentMeetings:'最近のミーティングなし' },
  ko: { appTagline:'프리미엄 화상 회의', signIn:'로그인', signUp:'가입', email:'이메일', password:'비밀번호', fullName:'전체 이름', show:'표시', hide:'숨기기', welcome:'안녕하세요', dashboard:'대시보드', instantMeeting:'즉석 회의', schedule:'예약', joinCode:'참가', recentMeetings:'최근 회의', noMeetings:'회의 없음', participants:'참가자', settings:'설정', logout:'로그아웃', darkMode:'다크 모드', language:'언어', notes:'메모', polls:'투표', chat:'채팅', cancel:'취소', create:'만들기', join:'참가', endMeeting:'종료', newMeeting:'새 회의', back:'← 뒤로', loading:'로드 중...', reactions:'반응', raiseHand:'손들기', handRaised:'손들었습니다!', createPoll:'투표 만들기', pollQuestion:'질문', pollOption:'옵션', addOption:'옵션 추가', launchPoll:'시작', vote:'투표', closePoll:'닫기', hostBadge:'호스트', muteAll:'전체 음소거', send:'보내기', screenShare:'화면 공유', meetingCreated:'회의 생성됨', successCopied:'복사됨!', message:'메시지', noMeetingsHint:'첫 회의를 만드세요', temporary:'임시', persistent:'영구', statusScheduled:'예약됨', statusOngoing:'진행 중', statusEnded:'종료됨' },
  tr: { appTagline:'Premium Video Konferans', signIn:'Giriş Yap', signUp:'Kaydol', email:'E-posta', password:'Şifre', fullName:'Tam Ad', show:'Göster', hide:'Gizle', welcome:'Merhaba', dashboard:'Gösterge Paneli', instantMeeting:'Anlık Toplantı', schedule:'Planla', joinCode:'Katıl', recentMeetings:'Son Toplantılar', noMeetings:'Toplantı yok', participants:'katılımcı', settings:'Ayarlar', logout:'Çıkış', darkMode:'Karanlık Mod', language:'Dil', notes:'Notlar', polls:'Anketler', chat:'Sohbet', cancel:'İptal', create:'Oluştur', join:'Katıl', endMeeting:'Bitir', newMeeting:'Yeni Toplantı', back:'← Geri', loading:'Yükleniyor...', reactions:'Tepkiler', raiseHand:'El Kaldır', handRaised:'El kaldırıldı!', createPoll:'Anket oluştur', pollQuestion:'Soru', pollOption:'Seçenek', addOption:'Seçenek ekle', launchPoll:'Başlat', vote:'Oy ver', closePoll:'Kapat', hostBadge:'Ev Sahibi', muteAll:'Herkesi sessize al', send:'Gönder', screenShare:'Ekran paylaş', meetingCreated:'Toplantı oluşturuldu', successCopied:'Kopyalandı!', message:'Mesaj', temporary:'Geçici', persistent:'Kalıcı', statusScheduled:'Planlandı', statusOngoing:'Devam ediyor', statusEnded:'Bitti' },
  vi: { appTagline:'Hội Nghị Video Cao Cấp', signIn:'Đăng nhập', signUp:'Đăng ký', email:'Email', password:'Mật khẩu', fullName:'Họ và tên', show:'Hiện', hide:'Ẩn', welcome:'Xin chào', dashboard:'Bảng điều khiển', instantMeeting:'Cuộc họp tức thì', schedule:'Lên lịch', joinCode:'Tham gia', recentMeetings:'Cuộc họp gần đây', noMeetings:'Không có cuộc họp', participants:'người tham gia', settings:'Cài đặt', logout:'Đăng xuất', darkMode:'Chế độ tối', language:'Ngôn ngữ', notes:'Ghi chú', polls:'Khảo sát', chat:'Trò chuyện', cancel:'Hủy', create:'Tạo', join:'Tham gia', endMeeting:'Kết thúc', newMeeting:'Cuộc họp mới', back:'← Quay lại', loading:'Đang tải...', reactions:'Phản ứng', raiseHand:'Giơ tay', handRaised:'Đã giơ tay!', send:'Gửi', screenShare:'Chia sẻ màn hình', meetingCreated:'Đã tạo cuộc họp', successCopied:'Đã sao chép!', message:'Tin nhắn', temporary:'Tạm thời', persistent:'Cố định', statusScheduled:'Đã lên lịch', statusOngoing:'Đang diễn ra', statusEnded:'Đã kết thúc' },
  id: { appTagline:'Konferensi Video Premium', signIn:'Masuk', signUp:'Daftar', email:'Email', password:'Kata Sandi', fullName:'Nama Lengkap', show:'Tampilkan', hide:'Sembunyikan', welcome:'Halo', dashboard:'Dasbor', instantMeeting:'Rapat Instan', schedule:'Jadwalkan', joinCode:'Bergabung', recentMeetings:'Rapat Terkini', noMeetings:'Tidak ada rapat', participants:'peserta', settings:'Pengaturan', logout:'Keluar', darkMode:'Mode Gelap', language:'Bahasa', notes:'Catatan', polls:'Polling', chat:'Obrolan', cancel:'Batal', create:'Buat', join:'Bergabung', endMeeting:'Akhiri', newMeeting:'Rapat Baru', back:'← Kembali', loading:'Memuat...', reactions:'Reaksi', raiseHand:'Angkat Tangan', handRaised:'Tangan diangkat!', send:'Kirim', screenShare:'Bagikan Layar', meetingCreated:'Rapat berhasil dibuat', successCopied:'Disalin!', message:'Pesan', temporary:'Sementara', persistent:'Permanen', statusScheduled:'Dijadwalkan', statusOngoing:'Berlangsung', statusEnded:'Selesai' },
  nl: { appTagline:'Premium Videoconferentie', signIn:'Inloggen', signUp:'Registreren', email:'E-mail', password:'Wachtwoord', fullName:'Volledige naam', welcome:'Hallo', dashboard:'Dashboard', instantMeeting:'Direct vergaderen', schedule:'Plannen', joinCode:'Deelnemen', recentMeetings:'Recente vergaderingen', noMeetings:'Geen vergaderingen', settings:'Instellingen', logout:'Uitloggen', darkMode:'Donkere modus', language:'Taal', notes:'Notities', polls:'Peilingen', chat:'Chat', cancel:'Annuleren', create:'Maken', join:'Deelnemen', endMeeting:'Beëindigen', newMeeting:'Nieuwe vergadering', back:'← Terug', loading:'Laden...', reactions:'Reacties', send:'Versturen', screenShare:'Scherm delen', meetingCreated:'Vergadering aangemaakt', successCopied:'Gekopieerd!', message:'Bericht', temporary:'Tijdelijk', persistent:'Permanent', statusOngoing:'Bezig', statusEnded:'Beëindigd', participants:'deelnemer(s)' },
  pl: { appTagline:'Premium Wideokonferencje', signIn:'Zaloguj', signUp:'Zarejestruj', email:'Email', password:'Hasło', fullName:'Imię i nazwisko', welcome:'Cześć', dashboard:'Panel', instantMeeting:'Natychmiastowe spotkanie', schedule:'Zaplanuj', joinCode:'Dołącz', recentMeetings:'Ostatnie spotkania', noMeetings:'Brak spotkań', settings:'Ustawienia', logout:'Wyloguj', darkMode:'Tryb ciemny', language:'Język', notes:'Notatki', polls:'Ankiety', chat:'Czat', cancel:'Anuluj', create:'Utwórz', join:'Dołącz', endMeeting:'Zakończ', newMeeting:'Nowe spotkanie', back:'← Wstecz', loading:'Ładowanie...', reactions:'Reakcje', send:'Wyślij', screenShare:'Udostępnij ekran', meetingCreated:'Spotkanie utworzone', successCopied:'Skopiowano!', message:'Wiadomość', temporary:'Tymczasowe', persistent:'Stałe', statusOngoing:'W toku', statusEnded:'Zakończone', participants:'uczestnik/ów' },
  uk: { appTagline:'Преміальна відеоконференція', signIn:'Увійти', signUp:'Зареєструватися', email:'Електронна пошта', password:'Пароль', fullName:"Повне ім'я", welcome:'Привіт', dashboard:'Панель', instantMeeting:'Миттєва зустріч', schedule:'Запланувати', joinCode:'Приєднатися', recentMeetings:'Останні зустрічі', noMeetings:'Немає зустрічей', settings:'Налаштування', logout:'Вийти', darkMode:'Темний режим', language:'Мова', notes:'Нотатки', polls:'Опитування', chat:'Чат', cancel:'Скасувати', create:'Створити', join:'Приєднатися', endMeeting:'Завершити', newMeeting:'Нова зустріч', back:'← Назад', loading:'Завантаження...', reactions:'Реакції', send:'Надіслати', screenShare:'Поділитися екраном', meetingCreated:'Зустріч створена', successCopied:'Скопійовано!', message:'Повідомлення', temporary:'Тимчасова', persistent:'Постійна', statusOngoing:'Триває', statusEnded:'Завершена', participants:'учасник/ів' },
  sv: { appTagline:'Premium Videokonferens', signIn:'Logga in', signUp:'Registrera', email:'E-post', password:'Lösenord', fullName:'Fullständigt namn', welcome:'Hej', dashboard:'Kontrollpanel', instantMeeting:'Omedelbart möte', schedule:'Schemalägg', joinCode:'Delta', recentMeetings:'Senaste möten', noMeetings:'Inga möten', settings:'Inställningar', logout:'Logga ut', darkMode:'Mörkt läge', language:'Språk', notes:'Anteckningar', polls:'Omröstningar', chat:'Chatt', cancel:'Avbryt', create:'Skapa', join:'Delta', endMeeting:'Avsluta', newMeeting:'Nytt möte', back:'← Tillbaka', loading:'Laddar...', reactions:'Reaktioner', send:'Skicka', screenShare:'Dela skärm', meetingCreated:'Möte skapat', successCopied:'Kopierat!', message:'Meddelande', temporary:'Tillfälligt', persistent:'Permanent', statusOngoing:'Pågår', statusEnded:'Avslutad', participants:'deltagare' },
  ha: { appTagline:'Tattaunawar Bidiyo ta Gaba', signIn:'Shiga', signUp:'Yi Rajista', email:'Imel', password:'Kalmar Sirri', fullName:'Cikakken Suna', welcome:'Sannu', dashboard:'Allon Kulawa', instantMeeting:'Taron Nan Take', schedule:'Shirya', joinCode:'Shiga', recentMeetings:'Tarukan Kwanan Nan', noMeetings:'Babu taro', settings:'Saituna', logout:'Fita', darkMode:'Yanayin Duhun', language:'Harshe', notes:'Bayanai', polls:'Zaɓe', chat:'Hira', cancel:'Soke', create:'Ƙirƙira', join:'Shiga', endMeeting:'Ƙarewa', newMeeting:'Sabon Taro', send:'Aika', meetingCreated:'An ƙirƙiri taro', successCopied:'An kwafi!', message:'Saƙo', temporary:'Na ɗan lokaci', persistent:'Na dindindin', participants:'mahalarta' },
  yo: { appTagline:'Ipade Fidio ti o Gaju', signIn:'Wọle', signUp:'Forukọsilẹ', email:'Imeeli', password:'Ọrọigbaniwọle', fullName:'Orukọ ni kikun', welcome:'Ẹ káàbọ̀', dashboard:'Ibi Iṣakoso', instantMeeting:'Ipade Lesekese', schedule:'Ṣeto', joinCode:'Darapọ', recentMeetings:'Awọn ipade aipẹ', noMeetings:'Ko si ipade', settings:'Eto', logout:'Jade', darkMode:'Ipo Dudu', language:'Ede', notes:'Awọn akọsilẹ', polls:'Idibo', chat:'Ibaraẹnisọrọ', cancel:'Fagilee', create:'Ṣẹda', join:'Darapọ', endMeeting:'Pari', newMeeting:'Ipade Tuntun', send:'Firanṣẹ', meetingCreated:'Ipade ti ṣẹda', successCopied:'Ti daakọ!', message:'Ifiranṣẹ', temporary:'Igba diẹ', persistent:'Titilai', participants:'olukopa' },
  sw: { appTagline:'Mkutano wa Video wa Hali ya Juu', signIn:'Ingia', signUp:'Jisajili', email:'Barua pepe', password:'Nenosiri', fullName:'Jina Kamili', welcome:'Karibu', dashboard:'Dashibodi', instantMeeting:'Mkutano wa Haraka', schedule:'Panga', joinCode:'Jiunge', recentMeetings:'Mikutano ya Hivi Karibuni', noMeetings:'Hakuna mikutano', settings:'Mipangilio', logout:'Ondoka', darkMode:'Hali ya Giza', language:'Lugha', notes:'Maelezo', polls:'Kura', chat:'Mazungumzo', cancel:'Ghairi', create:'Unda', join:'Jiunge', endMeeting:'Maliza', newMeeting:'Mkutano Mpya', send:'Tuma', meetingCreated:'Mkutano umeundwa', successCopied:'Imenakiliwa!', message:'Ujumbe', temporary:'ya Muda', persistent:'ya Kudumu', participants:'washiriki' },
  am: { appTagline:'የፕሪሚየም ቪዲዮ ኮንፈረንስ', signIn:'ግባ', signUp:'ተመዝገብ', email:'ኢሜይል', password:'የይለፍ ቃል', fullName:'ሙሉ ስም', welcome:'ሰላም', dashboard:'ዳሽቦርድ', instantMeeting:'ፈጣን ስብሰባ', schedule:'መርሃ ግብር', joinCode:'ተቀላቀል', recentMeetings:'የቅርብ ጊዜ ስብሰባዎች', noMeetings:'ምንም ስብሰባ የለም', settings:'ቅንብሮች', logout:'ውጣ', language:'ቋንቋ', notes:'ማስታወሻዎች', chat:'ውይይት', cancel:'ሰርዝ', create:'ፍጠር', join:'ተቀላቀል', endMeeting:'አጠናቅቅ', newMeeting:'አዲስ ስብሰባ', send:'ላክ', meetingCreated:'ስብሰባ ተፈጥሯል', successCopied:'ተቀድቷል!', message:'መልዕክት', participants:'ተሳታፊዎች' },
  fa: { appTagline:'ویدئوکنفرانس حرفه‌ای', signIn:'ورود', signUp:'ثبت‌نام', email:'ایمیل', password:'رمز عبور', fullName:'نام کامل', show:'نمایش', hide:'مخفی', welcome:'سلام', dashboard:'داشبورد', instantMeeting:'جلسه فوری', schedule:'زمان‌بندی', joinCode:'پیوستن', recentMeetings:'جلسات اخیر', noMeetings:'جلسه‌ای وجود ندارد', settings:'تنظیمات', logout:'خروج', darkMode:'حالت تاریک', language:'زبان', notes:'یادداشت‌ها', polls:'نظرسنجی', chat:'چت', cancel:'لغو', create:'ایجاد', join:'پیوستن', endMeeting:'پایان', newMeeting:'جلسه جدید', back:'← بازگشت', loading:'در حال بارگذاری...', reactions:'واکنش‌ها', send:'ارسال', screenShare:'اشتراک‌گذاری صفحه', meetingCreated:'جلسه ایجاد شد', successCopied:'کپی شد!', message:'پیام', temporary:'موقت', persistent:'دائمی', statusOngoing:'در حال برگزاری', statusEnded:'پایان یافته', participants:'شرکت‌کنندگان' },
  ro: { appTagline:'Videoconferință Premium', signIn:'Autentificare', signUp:'Înregistrare', email:'Email', password:'Parolă', fullName:'Nume complet', welcome:'Bună', dashboard:'Panou', instantMeeting:'Întâlnire instantanee', schedule:'Programare', joinCode:'Alăturați-vă', recentMeetings:'Întâlniri recente', noMeetings:'Fără întâlniri', settings:'Setări', logout:'Deconectare', darkMode:'Mod întunecat', language:'Limbă', notes:'Note', polls:'Sondaje', chat:'Chat', cancel:'Anulare', create:'Creați', join:'Alăturați-vă', endMeeting:'Terminați', newMeeting:'Întâlnire nouă', back:'← Înapoi', loading:'Se încarcă...', reactions:'Reacții', send:'Trimite', screenShare:'Partajare ecran', meetingCreated:'Întâlnire creată', successCopied:'Copiat!', message:'Mesaj', temporary:'Temporar', persistent:'Permanent', participants:'participant(ți)' },
  el: { appTagline:'Προηγμένη Τηλεδιάσκεψη', signIn:'Σύνδεση', signUp:'Εγγραφή', email:'Email', password:'Κωδικός', fullName:'Πλήρες Όνομα', welcome:'Γεια', dashboard:'Πίνακας', instantMeeting:'Άμεση Σύσκεψη', schedule:'Προγραμματισμός', joinCode:'Συμμετοχή', recentMeetings:'Πρόσφατες Συσκέψεις', noMeetings:'Καμία σύσκεψη', settings:'Ρυθμίσεις', logout:'Αποσύνδεση', darkMode:'Σκοτεινή λειτουργία', language:'Γλώσσα', notes:'Σημειώσεις', polls:'Ψηφοφορίες', chat:'Συνομιλία', cancel:'Ακύρωση', create:'Δημιουργία', join:'Συμμετοχή', endMeeting:'Τέλος', newMeeting:'Νέα Σύσκεψη', back:'← Πίσω', loading:'Φόρτωση...', reactions:'Αντιδράσεις', send:'Αποστολή', screenShare:'Κοινή χρήση οθόνης', meetingCreated:'Η σύσκεψη δημιουργήθηκε', successCopied:'Αντιγράφηκε!', message:'Μήνυμα', temporary:'Προσωρινή', persistent:'Μόνιμη', participants:'συμμετέχοντας/ες' },
  cs: { appTagline:'Prémiová videokonference', signIn:'Přihlásit', signUp:'Registrovat', email:'Email', password:'Heslo', fullName:'Celé jméno', welcome:'Ahoj', dashboard:'Přehled', instantMeeting:'Okamžitá schůzka', schedule:'Naplánovat', joinCode:'Připojit se', recentMeetings:'Nedávné schůzky', noMeetings:'Žádné schůzky', settings:'Nastavení', logout:'Odhlásit', darkMode:'Tmavý režim', language:'Jazyk', notes:'Poznámky', polls:'Hlasování', chat:'Chat', cancel:'Zrušit', create:'Vytvořit', join:'Připojit se', endMeeting:'Ukončit', newMeeting:'Nová schůzka', back:'← Zpět', loading:'Načítání...', reactions:'Reakce', send:'Odeslat', meetingCreated:'Schůzka vytvořena', successCopied:'Zkopírováno!', message:'Zpráva', temporary:'Dočasná', persistent:'Trvalá', participants:'účastník/ů' },
  hu: { appTagline:'Prémium Videokonferencia', signIn:'Bejelentkezés', signUp:'Regisztráció', email:'Email', password:'Jelszó', fullName:'Teljes név', welcome:'Szia', dashboard:'Irányítópult', instantMeeting:'Azonnali értekezlet', schedule:'Tervezés', joinCode:'Csatlakozás', recentMeetings:'Közelmúlt értekezletei', noMeetings:'Nincs értekezlet', settings:'Beállítások', logout:'Kijelentkezés', darkMode:'Sötét mód', language:'Nyelv', notes:'Megjegyzések', polls:'Szavazások', chat:'Csevegés', cancel:'Mégse', create:'Létrehozás', join:'Csatlakozás', endMeeting:'Befejezés', newMeeting:'Új értekezlet', back:'← Vissza', loading:'Betöltés...', reactions:'Reakciók', send:'Küldés', meetingCreated:'Értekezlet létrehozva', successCopied:'Másolva!', message:'Üzenet', temporary:'Ideiglenes', persistent:'Állandó', participants:'résztvevő' },
  bn: { appTagline:'প্রিমিয়াম ভিডিও কনফারেন্সিং', signIn:'সাইন ইন', signUp:'সাইন আপ', email:'ইমেইল', password:'পাসওয়ার্ড', fullName:'পুরো নাম', welcome:'হ্যালো', dashboard:'ড্যাশবোর্ড', instantMeeting:'তাৎক্ষণিক মিটিং', schedule:'সময়সূচী', joinCode:'যোগ দিন', recentMeetings:'সাম্প্রতিক মিটিং', noMeetings:'কোনো মিটিং নেই', settings:'সেটিংস', logout:'লগআউট', language:'ভাষা', notes:'নোট', polls:'পোল', chat:'চ্যাট', cancel:'বাতিল', create:'তৈরি করুন', join:'যোগ দিন', endMeeting:'শেষ করুন', newMeeting:'নতুন মিটিং', back:'← ফিরে যান', loading:'লোড হচ্ছে...', reactions:'প্রতিক্রিয়া', send:'পাঠান', meetingCreated:'মিটিং তৈরি হয়েছে', successCopied:'কপি করা হয়েছে!', message:'বার্তা', participants:'অংশগ্রহণকারী' },
  th: { appTagline:'วิดีโอคอนเฟอเรนซ์ระดับพรีเมียม', signIn:'เข้าสู่ระบบ', signUp:'สมัครสมาชิก', email:'อีเมล', password:'รหัสผ่าน', fullName:'ชื่อเต็ม', welcome:'สวัสดี', dashboard:'แดชบอร์ด', instantMeeting:'การประชุมทันที', schedule:'กำหนดการ', joinCode:'เข้าร่วม', recentMeetings:'การประชุมล่าสุด', noMeetings:'ไม่มีการประชุม', settings:'การตั้งค่า', logout:'ออกจากระบบ', darkMode:'โหมดมืด', language:'ภาษา', notes:'บันทึก', polls:'โพล', chat:'แชท', cancel:'ยกเลิก', create:'สร้าง', join:'เข้าร่วม', endMeeting:'สิ้นสุด', newMeeting:'การประชุมใหม่', back:'← กลับ', loading:'กำลังโหลด...', reactions:'ปฏิกิริยา', send:'ส่ง', screenShare:'แชร์หน้าจอ', meetingCreated:'สร้างการประชุมแล้ว', successCopied:'คัดลอกแล้ว!', message:'ข้อความ', temporary:'ชั่วคราว', persistent:'ถาวร', participants:'ผู้เข้าร่วม' },
  mg: { appTagline:'Fivoriana Video Ambony', signIn:'Hiditra', signUp:'Hisoratra anarana', email:'Imailaka', password:'Tenimiafina', fullName:'Anarana feno', welcome:'Miarahaba', dashboard:'Tableau de bord', instantMeeting:'Fivoriana haingana', schedule:'Fikasana', joinCode:'Hiditra', recentMeetings:'Fivoriana vao', noMeetings:'Tsy misy fivoriana', settings:'Fikirana', logout:'Hivoaka', language:'Fiteny', notes:'Fanamarihana', chat:'Resaka', cancel:'Hanafoana', create:'Hamorona', join:'Hiditra', endMeeting:'Hamarana', newMeeting:'Fivoriana vaovao', send:'Handefa', meetingCreated:'Voadinika ny fivoriana', successCopied:'Voakopy!', message:'Hafatra', participants:'mpandray anjara' },
  wo: { appTagline:'Dëkkale Video bu Xoox', signIn:'Dugg', signUp:'Jëfandikoo', email:'Iméél', password:'Njëkk bu dul xamoon', fullName:'Tur bu dëgëér', welcome:'Asalaamaalékum', dashboard:'Laaj', instantMeeting:'Dëkkale bu njëkk', schedule:'Dëkkal', joinCode:'Boole', recentMeetings:'Dëkkale yu mujj', noMeetings:'Amul dëkkale', settings:'Seti', logout:'Génn', language:'Làkk', notes:'Bind', chat:'Xibaar', cancel:'Baal', create:'Sos', join:'Boole', endMeeting:'Jeex', newMeeting:'Dëkkale bu bees', send:'Yónnee', meetingCreated:'Dëkkale bi sos na', successCopied:'Jëfal na!', message:'Xibaar', participants:'jëfandikookat' },
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
// AUTH PAGE — Google-style clean card
// ============================================================
function GlassTextField({ icon, type = 'text', placeholder, label, value, onChange, suffix, autoFocus }) {
  return (
    <div style={{ marginBottom: 0 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3C4043', marginBottom: 6 }}>{label || placeholder}</label>
      <div style={{ position: 'relative' }}>
        {icon && <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none', zIndex: 1 }}>{icon}</span>}
        <input
          type={type} placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)} autoFocus={autoFocus}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '12px 14px', paddingLeft: icon ? 40 : 14, paddingRight: suffix ? 48 : 14,
            background: '#fff', border: '1.5px solid #DADCE0',
            borderRadius: 8, color: '#202124', fontSize: 15,
            outline: 'none', fontFamily: 'Poppins, sans-serif', transition: 'border-color 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor = '#1A73E8'; e.target.style.boxShadow = '0 0 0 3px rgba(26,115,232,0.12)'; }}
          onBlur={e => { e.target.style.borderColor = '#DADCE0'; e.target.style.boxShadow = 'none'; }}
        />
        {suffix && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}>{suffix}</span>}
      </div>
    </div>
  );
}

// Floating circle for auth background (kept for potential reuse)
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

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
  const isLogin = mode === 'signIn';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F9FA', fontFamily: 'Poppins, sans-serif', padding: '24px 16px' }}>
      {showForgot && <ForgotPasswordModal T={T} onClose={() => setShowForgot(false)} />}

      <div style={{
        background: 'white', borderRadius: 12, padding: '40px 36px',
        width: '100%', maxWidth: 400,
        boxShadow: '0 2px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        transform: mounted ? 'translateY(0)' : 'translateY(16px)',
        opacity: mounted ? 1 : 0, transition: 'all 0.4s ease',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
            <CruxLogo size={44} />
            <span style={{ fontSize: 26, fontWeight: 900, background: C.pinkPurple, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>CRUX</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: '#202124' }}>
            {isLogin ? 'Se connecter' : 'Créer un compte'}
          </h1>
          <p style={{ fontSize: 13, color: '#5F6368', margin: 0 }}>
            {isLogin ? 'Bienvenue sur CRUX' : 'Rejoignez CRUX dès maintenant'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!isLogin && (
            <GlassTextField icon="👤" placeholder="Nom complet" label={T.fullName} value={name} onChange={setName} />
          )}
          <GlassTextField icon="✉️" type="email" placeholder="email@exemple.com" label={T.email} value={email} onChange={setEmail} />
          <GlassTextField icon="🔒" type={showPass ? 'text' : 'password'} placeholder="••••••••" label={T.password} value={pass} onChange={setPass}
            suffix={<button type="button" onClick={() => setShowPass(v => !v)} style={{ background: 'none', border: 'none', color: '#5F6368', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>{showPass ? '🙈' : '👁'}</button>}
          />
          {!isLogin && (
            <GlassTextField icon="🔒" type={showConfirmPass ? 'text' : 'password'} placeholder="••••••••" label={T.confirmPassword} value={confirmPass} onChange={setConfirmPass}
              suffix={<button type="button" onClick={() => setShowConfirmPass(v => !v)} style={{ background: 'none', border: 'none', color: '#5F6368', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>{showConfirmPass ? '🙈' : '👁'}</button>}
            />
          )}
          {isLogin && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#5F6368' }}>
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ accentColor: '#1A73E8' }} />
                {T.rememberMe}
              </label>
              <button type="button" onClick={() => setShowForgot(true)} style={{ background: 'none', border: 'none', color: '#1A73E8', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                {T.forgotPassword}
              </button>
            </div>
          )}
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>⚠️ {error}</div>
          )}
          <button type="submit" disabled={loading} style={{
            width: '100%', height: 50, border: 'none', borderRadius: 8, marginTop: 4,
            background: loading ? '#DADCE0' : 'linear-gradient(135deg,#FF4081,#AA00FF)',
            color: 'white', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'Poppins, sans-serif',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(255,64,129,0.35)',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {loading
              ? <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.9s linear infinite' }} />
              : (isLogin ? T.signIn : T.signUp)
            }
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span style={{ fontSize: 14, color: '#5F6368' }}>
            {isLogin ? "Pas encore de compte ? " : "Déjà un compte ? "}
          </span>
          <button onClick={() => switchMode(isLogin ? 'signUp' : 'signIn')} style={{
            background: 'none', border: 'none', color: '#1A73E8', fontWeight: 700,
            fontSize: 14, cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
          }}>
            {isLogin ? T.signUp : T.signIn}
          </button>
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
          <div style={{ marginTop: 12 }}><select value={newType} onChange={e => setNewType(e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}><option value="temporary">{T.temporary}</option><option value="persistent">{T.persistent}</option><option value="webinar">{T.webinar || 'Webinaire (500+)'}</option></select></div>
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
// WAITING ROOM — Google Meet style with camera preview
// ============================================================
function WaitingRoom({ meeting, user, T, prefs, onEnter, onLeave }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    if (camOn) {
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        .then(s => {
          if (!active) { s.getTracks().forEach(t => t.stop()); return; }
          streamRef.current = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(() => {});
    } else {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [camOn]);

  const copyCode = () => {
    navigator.clipboard?.writeText(meeting.id).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    onEnter(micOn, camOn);
  };

  return (
    <div className="crux-fullscreen" style={{ minHeight: '100vh', background: '#202124', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Poppins, sans-serif', padding: 20 }}>
      <div style={{ display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 940, width: '100%' }}>

        {/* Camera preview */}
        <div style={{ position: 'relative', width: 480, maxWidth: '100%', aspectRatio: '16/9', background: '#3c4043', borderRadius: 16, overflow: 'hidden', flexShrink: 0 }}>
          <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: camOn ? 'block' : 'none' }} />
          {!camOn && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#5f6368', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                {(user.name || user.email || 'U')[0].toUpperCase()}
              </div>
            </div>
          )}
          {/* Controls overlay */}
          <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 12 }}>
            <button onClick={() => setMicOn(v => !v)} title={micOn ? 'Couper le micro' : 'Activer le micro'} style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', background: micOn ? 'rgba(255,255,255,0.18)' : '#EA4335', cursor: 'pointer', fontSize: 20, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              {micOn ? '🎤' : '🔇'}
            </button>
            <button onClick={() => setCamOn(v => !v)} title={camOn ? 'Éteindre la caméra' : 'Allumer la caméra'} style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', background: camOn ? 'rgba(255,255,255,0.18)' : '#EA4335', cursor: 'pointer', fontSize: 20, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              {camOn ? '📷' : '🚫'}
            </button>
          </div>
        </div>

        {/* Join card */}
        <div style={{ textAlign: 'center', color: 'white', minWidth: 240 }}>
          <h1 style={{ fontSize: 28, fontWeight: 400, marginBottom: 8, color: 'white' }}>Prêt à rejoindre ?</h1>
          <p style={{ color: '#9aa0a6', fontSize: 14, marginBottom: 4 }}>{meeting.title}</p>
          <p style={{ color: '#9aa0a6', fontSize: 13, marginBottom: 8 }}>Organisé par {meeting.creatorName || meeting.organizer || 'Hôte'}</p>

          {/* Meeting ID */}
          <button onClick={copyCode} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: copied ? 'rgba(39,174,96,0.15)' : 'rgba(255,255,255,0.08)', border: copied ? '1px solid rgba(39,174,96,0.40)' : '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 16px', color: copied ? '#4CAF50' : 'rgba(255,255,255,0.75)', fontSize: 13, fontFamily: 'monospace', letterSpacing: 1.5, cursor: 'pointer', marginBottom: 28, transition: 'all 0.25s' }}>
            {meeting.id} {copied ? '✓' : '📋'}
          </button>

          <div>
            <button onClick={handleJoin} style={{ padding: '14px 48px', background: '#1a73e8', border: 'none', borderRadius: 8, color: 'white', fontWeight: 600, fontSize: 16, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', marginBottom: 16, display: 'block', width: '100%', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#1557b0'}
              onMouseLeave={e => e.currentTarget.style.background = '#1a73e8'}>
              Rejoindre maintenant
            </button>
            <button onClick={() => {
              const link = `${window.location.origin}${window.location.pathname}?join=${meeting.id}`;
              navigator.clipboard?.writeText(link).catch(() => {});
              showToast('🔗 Lien copié !', 'success');
            }} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '10px 24px', color: 'rgba(255,255,255,0.75)', fontSize: 13, fontFamily: 'Poppins, sans-serif', cursor: 'pointer', display: 'block', width: '100%', marginBottom: 10 }}>
              🔗 Copier le lien d'invitation
            </button>
            <button onClick={onLeave} style={{ background: 'none', border: 'none', color: '#9aa0a6', cursor: 'pointer', fontSize: 13, fontFamily: 'Poppins, sans-serif' }}>
              Annuler
            </button>
          </div>
        </div>
      </div>
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
        <h2 style={{ color: 'white', fontWeight: 800, fontSize: 22, margin: '0 0 8px' }}>{ProService.FREE_MINUTES} minutes écoulées</h2>
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

// ============================================================
// PRE-JOIN WAITING ROOM — Google Meet style camera preview
// ============================================================
function PreJoinRoom({ meeting, user, onJoin, onLeave }) {
  const videoRef = useRef(null);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const streamRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (camOn) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        .then(s => {
          if (!active) { s.getTracks().forEach(t => t.stop()); return; }
          streamRef.current = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(() => {});
    } else {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [camOn]);

  return (
    <div style={{ minHeight: '100vh', background: '#202124', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Poppins, sans-serif', padding: 20 }}>
      <div style={{ display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 900, width: '100%' }}>
        {/* Camera preview */}
        <div style={{ position: 'relative', width: 480, maxWidth: '100%', aspectRatio: '16/9', background: '#3c4043', borderRadius: 16, overflow: 'hidden', flexShrink: 0 }}>
          <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: camOn ? 'block' : 'none' }} />
          {!camOn && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#5f6368', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>👤</div>
            </div>
          )}
          {/* Controls overlay */}
          <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 12 }}>
            <button onClick={() => setMicOn(v => !v)} style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', background: micOn ? 'rgba(255,255,255,0.18)' : '#EA4335', cursor: 'pointer', fontSize: 20, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{micOn ? '🎤' : '🔇'}</button>
            <button onClick={() => setCamOn(v => !v)} style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', background: camOn ? 'rgba(255,255,255,0.18)' : '#EA4335', cursor: 'pointer', fontSize: 20, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{camOn ? '📷' : '🚫'}</button>
          </div>
        </div>

        {/* Join card */}
        <div style={{ textAlign: 'center', color: 'white', minWidth: 240 }}>
          <h1 style={{ fontSize: 28, fontWeight: 400, marginBottom: 8, margin: '0 0 8px' }}>Prêt à rejoindre ?</h1>
          <p style={{ color: '#9aa0a6', fontSize: 14, marginBottom: 4, margin: '0 0 4px' }}>{meeting.title}</p>
          <p style={{ color: '#9aa0a6', fontSize: 13, marginBottom: 32, margin: '0 0 32px' }}>Organisé par {meeting.creatorName || meeting.organizer || 'Hôte'}</p>
          <button onClick={() => onJoin(micOn, camOn)} style={{ padding: '14px 40px', background: '#1a73e8', border: 'none', borderRadius: 8, color: 'white', fontWeight: 600, fontSize: 16, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', marginBottom: 16, display: 'block', width: '100%' }}>
            Rejoindre maintenant
          </button>
          <button onClick={onLeave} style={{ background: 'none', border: 'none', color: '#9aa0a6', cursor: 'pointer', fontSize: 13, fontFamily: 'Poppins, sans-serif' }}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

function AgoraVideoTile({ track, audioTrack, name, isLocal, micOn, camOn }) {
  const divRef = React.useRef(null);
  React.useEffect(() => {
    if (track && divRef.current) {
      track.play(divRef.current);
      return () => { try { track.stop(); } catch {} };
    }
  }, [track]);
  React.useEffect(() => {
    if (audioTrack) {
      audioTrack.play();
      return () => { try { audioTrack.stop(); } catch {} };
    }
  }, [audioTrack]);
  const showVideo = isLocal ? camOn !== false : !!track;
  return (
    <div style={{ position: 'relative', background: '#0f0f1a', borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
      <div ref={divRef} style={{ position: 'absolute', inset: 0, display: showVideo ? 'block' : 'none' }} />
      {!showVideo && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 1 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#8E44AD,#3498DB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: 'white' }}>
            {(name || '?')[0].toUpperCase()}
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'Poppins, sans-serif' }}>{name}</span>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 6, left: 8, display: 'flex', alignItems: 'center', gap: 4, zIndex: 2 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', fontFamily: 'Poppins, sans-serif', background: 'rgba(0,0,0,0.5)', borderRadius: 6, padding: '2px 6px' }}>
          {isLocal ? '(Vous)' : name}
        </span>
        {(isLocal ? micOn === false : !audioTrack) && <span style={{ fontSize: 11 }}>🔇</span>}
      </div>
    </div>
  );
}

function MeetingRoom({ meeting, user, T, prefs, onExit }) {
  const agoraClientRef = useRef(null);
  const localTracksRef = useRef({ audio: null, video: null });
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [localMicOn, setLocalMicOn] = useState(true);
  const [localCamOn, setLocalCamOn] = useState(true);
  const [agoraJoined, setAgoraJoined] = useState(false);
  const [inPreJoin, setInPreJoin] = useState(true);
  const initMicRef = useRef(true);
  const initCamRef = useRef(true);
  const [elapsed, setElapsed] = useState(0);
  const [activePanel, setActivePanel] = useState(null);

  // CRUX features — chat, polls, reactions, Q&A, captions, notes (Agora handles video/audio)
  const [polls, setPolls] = useState([]);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [qaQuestions, setQaQuestions] = useState([]);
  const [qaInput, setQaInput] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatAnon, setChatAnon] = useState(false);
  const chatBottomRef = useRef(null);
  const [callFrozen, setCallFrozen] = useState(false);
  const [netQuality, setNetQuality] = useState('good');
  const handsSeenRef = useRef(new Set());
  const pollsSeenRef = useRef(new Set());
  const [participants, setParticipants] = useState([]);
  const [coHosts, setCoHosts] = useState(meeting.coHosts || []);
  const [kicked, setKicked] = useState(false);
  const muteAllSeenRef = useRef(null);

  const [captionsOn, setCaptionsOn] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const recognitionRef = useRef(null);
  const [notes, setNotes] = useState(() => localStorage.getItem('crux_notes_' + meeting.id) || '');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesSaved, setNotesSaved] = useState(true);
  const notesSaveTimer = useRef(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  const isHost = meeting.creatorId === user.uid || meeting.organizerId === user.uid;
  const isCoHost = coHosts.includes(user.uid);

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

  // Background continuation — équivalent Flutter foreground service
  // Keeps WebRTC audio alive when user switches apps or locks screen
  useEffect(() => {
    if (inPreJoin) return;

    // 1. MediaSession API — registers as active audio session on OS level
    //    Shows meeting controls on lock screen / notification shade
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: meeting.title || 'Réunion CRUX',
          artist: 'CRUX',
          album: '🎙️ En cours...',
        });
        navigator.mediaSession.playbackState = 'playing';
        // Prevent OS from pausing/stopping the call
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('stop', () => onExit());
        navigator.mediaSession.setActionHandler('hangup', () => onExit());
      } catch {}
    }

    // 2. Silent audio loop — critical for iOS Safari to keep audio session active
    //    iOS kills WebRTC if no HTMLAudioElement is playing
    let silentAudio;
    try {
      // Minimal WAV: 44-byte RIFF header, 0 samples
      silentAudio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
      silentAudio.loop = true;
      silentAudio.volume = 0.001;
      silentAudio.play().catch(() => {});
    } catch {}

    // 3. Web Locks API — prevents the browser from suspending background JS execution
    let releaseLock;
    if (navigator?.locks?.request) {
      navigator.locks.request('crux-meeting', { mode: 'shared' }, () =>
        new Promise(resolve => { releaseLock = resolve; })
      ).catch(() => {});
    }

    // 4. Screen Wake Lock — keeps screen on during meeting (optional, user can override)
    let wakeLock;
    if (navigator?.wakeLock) {
      navigator.wakeLock.request('screen').then(wl => { wakeLock = wl; }).catch(() => {});
    }

    // 5. visibilitychange — reclaim media session when returning to foreground
    const onVisibility = () => {
      if (!document.hidden && 'mediaSession' in navigator) {
        try { navigator.mediaSession.playbackState = 'playing'; } catch {}
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      releaseLock?.();
      wakeLock?.release?.().catch(() => {});
      try { silentAudio?.pause(); } catch {}
      document.removeEventListener('visibilitychange', onVisibility);
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = null;
          navigator.mediaSession.playbackState = 'none';
        } catch {}
      }
    };
  }, [inPreJoin]);

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

  // Firestore presence + participant list
  useEffect(() => {
    FirebaseMeetingService.joinPresence(meeting.id, user.uid, user.name || user.email);
    const unsub = FirebaseMeetingService.listenPresence(meeting.id, setParticipants);
    return () => { FirebaseMeetingService.leavePresence(meeting.id, user.uid); unsub(); };
  }, [meeting.id, user.uid, user.name, user.email]);

  // Listen for host commands targeting me
  useEffect(() => {
    const unsub = FirebaseMeetingService.listenHostCommands(meeting.id, user.uid, (cmd) => {
      if (cmd.type === 'kick') { setKicked(true); }
      else if (cmd.type === 'mute') { showToast('🔇 ' + (T.muted || "L'hôte a coupé votre micro"), 'info'); }
      else if (cmd.type === 'makeCoHost') { setCoHosts(prev => [...new Set([...prev, user.uid])]); showToast('⭐ ' + (T.coHost || 'Co-hôte'), 'success'); }
    });
    return unsub;
  }, [meeting.id, user.uid]);

  // Listen for mute-all commands
  useEffect(() => {
    const unsub = FirebaseMeetingService.listenMuteAll(meeting.id, (cmd) => {
      if (!cmd?.timestamp) return;
      const ts = cmd.timestamp?.seconds || 0;
      if (muteAllSeenRef.current !== ts) {
        muteAllSeenRef.current = ts;
        if (cmd.fromId !== user.uid) showToast('🔇 ' + (T.mutedAll || "L'hôte a coupé tous les micros"), 'info');
      }
    });
    return unsub;
  }, [meeting.id, user.uid]);

  // Live captions — Web Speech API
  const toggleCaptions = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showToast(T.captionsUnsupported || 'Non supporté', 'error'); return; }
    if (captionsOn) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setCaptionsOn(false);
      setCaptionText('');
      return;
    }
    const langMap = { fr:'fr-FR', en:'en-US', es:'es-ES', de:'de-DE', ru:'ru-RU', pt:'pt-BR', it:'it-IT', ar:'ar-SA', zh:'zh-CN', ja:'ja-JP', ko:'ko-KR' };
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = langMap[prefs?.language] || 'fr-FR';
    rec.onresult = e => {
      const text = Array.from(e.results).map(r => r[0].transcript).join(' ');
      setCaptionText(text);
    };
    rec.onerror = () => { setCaptionsOn(false); setCaptionText(''); };
    rec.onend = () => { if (recognitionRef.current) { try { rec.start(); } catch {} } };
    recognitionRef.current = rec;
    rec.start();
    setCaptionsOn(true);
    showToast('🖊️ ' + (T.captionsOn || 'Sous-titres activés'), 'success');
  };

  // Notes auto-save (debounced)
  useEffect(() => {
    setNotesSaved(false);
    clearTimeout(notesSaveTimer.current);
    notesSaveTimer.current = setTimeout(() => {
      localStorage.setItem('crux_notes_' + meeting.id, notes);
      FirebaseMeetingService.saveNote(meeting.id, user.uid, notes).catch(() => {});
      setNotesSaved(true);
    }, 800);
    return () => clearTimeout(notesSaveTimer.current);
  }, [notes, meeting.id, user.uid]);

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

  // Firestore reactions — ignore initial burst, only show NEW reactions after subscribe
  const reactionsInitRef = useRef(false);
  useEffect(() => {
    reactionsInitRef.current = false;
    return FirebaseMeetingService.listenReactions(meeting.id, newReactions => {
      if (!reactionsInitRef.current) {
        // Skip the first snapshot (historical reactions on load)
        reactionsInitRef.current = true;
        return;
      }
      newReactions.forEach(r => {
        const id = r.id + '_' + Date.now();
        const x = 10 + Math.random() * 70;
        setFloatingReactions(prev => [...prev, { id, emoji: r.emoji, x }]);
        setTimeout(() => setFloatingReactions(prev => prev.filter(f => f.id !== id)), 3000);
      });
    });
  }, [meeting.id]);

  const spawnLocalReaction = (emoji) => {
    const id = 'local_' + Date.now();
    const x = 10 + Math.random() * 70;
    setFloatingReactions(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => setFloatingReactions(prev => prev.filter(f => f.id !== id)), 3000);
  };

  const sendReaction = async (emoji) => {
    setShowReactions(false);
    spawnLocalReaction(emoji); // instant local feedback
    try {
      await FirebaseMeetingService.sendReaction(meeting.id, user.uid, user.name || user.email, emoji);
    } catch {}
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

  const requestPiP = async () => {
    try {
      const video = document.querySelector('[data-crux-local-video] video, [data-crux-remote-video] video');
      if (video) await video.requestPictureInPicture();
    } catch { }
  };

  const toggleMic = async () => {
    const track = localTracksRef.current.audio;
    if (!track) return;
    const next = !localMicOn;
    await track.setMuted(!next);
    setLocalMicOn(next);
  };

  const toggleCam = async () => {
    const track = localTracksRef.current.video;
    if (!track) return;
    const next = !localCamOn;
    await track.setMuted(!next);
    setLocalCamOn(next);
  };

  const leaveAgora = async () => {
    localTracksRef.current.audio?.close();
    localTracksRef.current.video?.close();
    localTracksRef.current = { audio: null, video: null };
    await agoraClientRef.current?.leave();
    FirebaseMeetingService.leavePresence(meeting.id, user.uid);
    onExit();
  };


  // Agora RTC — embedded video, no external window, free 10k min/month
  useEffect(() => {
    if (inPreJoin) return;
    const AGORA_APP_ID = process.env.REACT_APP_AGORA_APP_ID;
    if (!AGORA_APP_ID) {
      showToast('⚠️ Clé Agora manquante — ajoutez REACT_APP_AGORA_APP_ID dans .env', 'error');
      return;
    }

    const isWebinar = meeting.type === 'webinar';
    const channelName = 'crux_' + (meeting.id || 'room').replace(/[^a-zA-Z0-9]/g, '').slice(0, 64);
    const uid = user.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32) || 'user';

    AgoraRTC.setLogLevel(4); // errors only
    const client = AgoraRTC.createClient({ mode: isWebinar ? 'live' : 'rtc', codec: 'vp8' });
    if (isWebinar) client.setClientRole(isHost ? 'host' : 'audience');
    agoraClientRef.current = client;

    const handleUserPublished = async (remoteUser, mediaType) => {
      await client.subscribe(remoteUser, mediaType);
      setRemoteUsers(prev => {
        const exists = prev.find(u => u.uid === remoteUser.uid);
        return exists ? prev.map(u => u.uid === remoteUser.uid ? remoteUser : u) : [...prev, remoteUser];
      });
      FirebaseMeetingService.joinPresence(meeting.id, String(remoteUser.uid), 'Participant');
    };

    const handleUserUnpublished = (remoteUser) => {
      setRemoteUsers(prev => prev.map(u => u.uid === remoteUser.uid ? remoteUser : u));
    };

    const handleUserLeft = (remoteUser) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
      FirebaseMeetingService.leavePresence(meeting.id, String(remoteUser.uid));
    };

    client.on('user-published', handleUserPublished);
    client.on('user-unpublished', handleUserUnpublished);
    client.on('user-left', handleUserLeft);

    const start = async () => {
      await client.join(AGORA_APP_ID, channelName, null, uid);
      const tracks = [];
      if (initMicRef.current && !(isWebinar && !isHost)) {
        const audio = await AgoraRTC.createMicrophoneAudioTrack().catch(() => null);
        if (audio) { localTracksRef.current.audio = audio; tracks.push(audio); }
      }
      if (initCamRef.current && !(isWebinar && !isHost)) {
        const video = await AgoraRTC.createCameraVideoTrack({ encoderConfig: '720p_2' }).catch(() => null);
        if (video) { localTracksRef.current.video = video; tracks.push(video); }
      }
      if (tracks.length) await client.publish(tracks);
      setLocalMicOn(!!localTracksRef.current.audio);
      setLocalCamOn(!!localTracksRef.current.video);
      setAgoraJoined(true);
    };

    start().catch(e => showToast('❌ Erreur connexion: ' + e.message, 'error'));

    return () => {
      client.off('user-published', handleUserPublished);
      client.off('user-unpublished', handleUserUnpublished);
      client.off('user-left', handleUserLeft);
      localTracksRef.current.audio?.close();
      localTracksRef.current.video?.close();
      localTracksRef.current = { audio: null, video: null };
      client.leave().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inPreJoin]);

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

  // Portal helper — renders into document.body, above the Agora video grid
  const Portal = ({ children }) => ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: 'none', fontFamily: 'Poppins, sans-serif' }}>
      {children}
    </div>,
    document.body
  );

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#202124' }}>
      {/* Agora video grid — shown once pre-join is complete */}
      {!inPreJoin && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Video tiles */}
          <div style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: remoteUsers.length === 0 ? '1fr' : remoteUsers.length <= 1 ? '1fr 1fr' : remoteUsers.length <= 3 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
            gap: 4,
            padding: '56px 4px 74px',
            overflow: 'hidden',
            background: '#0d0d1a',
          }}>
            <AgoraVideoTile
              track={localTracksRef.current.video}
              name={user.displayName || user.email?.split('@')[0] || 'Vous'}
              isLocal
              micOn={localMicOn}
              camOn={localCamOn}
            />
            {remoteUsers.map(u => (
              <AgoraVideoTile
                key={u.uid}
                track={u.videoTrack}
                audioTrack={u.audioTrack}
                name={'Participant ' + String(u.uid).slice(0, 4)}
              />
            ))}
          </div>
          {/* Bottom control bar */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 70, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 'env(safe-area-inset-bottom, 0px)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button onClick={toggleMic} style={{ width: 50, height: 50, borderRadius: '50%', border: 'none', background: localMicOn ? 'rgba(255,255,255,0.12)' : '#E74C3C', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
              {localMicOn ? '🎤' : '🔇'}
            </button>
            <button onClick={toggleCam} style={{ width: 50, height: 50, borderRadius: '50%', border: 'none', background: localCamOn ? 'rgba(255,255,255,0.12)' : '#E74C3C', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
              {localCamOn ? '📷' : '🚫'}
            </button>
            <button onClick={() => { togglePanel('chat'); }} style={{ width: 50, height: 50, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.12)', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>💬</button>
            <button onClick={leaveAgora} style={{ width: 50, height: 50, borderRadius: '50%', border: 'none', background: '#E74C3C', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📵</button>
          </div>
          {!agoraJoined && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, zIndex: 10 }}>
              <div style={{ fontSize: 36 }}>⏳</div>
              <p style={{ color: 'white', fontFamily: 'Poppins, sans-serif', fontSize: 14, margin: 0 }}>Connexion à la réunion...</p>
            </div>
          )}
        </div>
      )}

      {/* Pre-join waiting room */}
      {inPreJoin && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 999 }}>
          <PreJoinRoom
            meeting={meeting}
            user={user}
            onJoin={(mic, cam) => {
              initMicRef.current = mic;
              initCamRef.current = cam;
              setInPreJoin(false);
            }}
            onLeave={onExit}
          />
        </div>
      )}

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

        {/* Live captions overlay — bottom of screen, Google Meet style */}
        {captionsOn && captionText && (
          <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', maxWidth: '90vw', background: 'rgba(0,0,0,0.82)', color: 'white', borderRadius: 10, padding: '8px 16px', fontSize: 15, fontWeight: 500, textAlign: 'center', pointerEvents: 'none', zIndex: 5, lineHeight: 1.5, backdropFilter: 'blur(8px)' }}>
            {captionText.split(' ').slice(-12).join(' ')}
          </div>
        )}

        {/* Meeting info / invite panel */}
        {showInfoPanel && (
          <div style={{ position: 'absolute', top: 52, right: 0, width: 'min(100vw, 320px)', bottom: 0, pointerEvents: 'all', zIndex: 3 }}>
            <MeetPanel title={T.meetingInfo || 'Infos réunion'} icon="🔗" onClose={() => setShowInfoPanel(false)}>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Meeting title */}
                <div style={{ background: C.lightBg, borderRadius: 12, padding: '12px 14px' }}>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: C.textTertiary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Réunion</p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{meeting.title || 'Réunion CRUX'}</p>
                </div>
                {/* Meeting ID */}
                <div style={{ background: C.lightBg, borderRadius: 12, padding: '12px 14px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: C.textTertiary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>ID de réunion</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.textPrimary, letterSpacing: 1 }}>{meeting.id?.slice(0,6).toUpperCase()}</p>
                    <button onClick={() => { navigator.clipboard?.writeText(meeting.id || '').then(() => showToast('📋 ' + (T.idCopied || 'ID copié !'), 'success')); }} style={{ padding: '5px 10px', background: C.violet + '20', border: '1px solid ' + C.violet + '40', borderRadius: 8, color: C.violet, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>{T.copyId || 'Copier'}</button>
                  </div>
                </div>
                {/* Invite link */}
                <div style={{ background: C.lightBg, borderRadius: 12, padding: '12px 14px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: C.textTertiary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Lien d'invitation</p>
                  <p style={{ margin: '0 0 8px', fontSize: 11, color: C.textSecondary, wordBreak: 'break-all' }}>{window.location.origin + '/crux_web?join=' + meeting.id}</p>
                  <button onClick={() => {
                    const url = window.location.origin + '/crux_web?join=' + meeting.id;
                    navigator.clipboard?.writeText(url).then(() => showToast('🔗 ' + (T.linkCopied || 'Lien copié !'), 'success'));
                  }} style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg,#8E44AD,#3498DB)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                    📋 {T.copyLink || 'Copier le lien'}
                  </button>
                  <button onClick={() => navigator.share?.({ title: 'Rejoins ma réunion CRUX', url: window.location.origin + '/crux_web?join=' + meeting.id }).catch(() => {})} style={{ width: '100%', padding: '10px', marginTop: 6, background: 'transparent', border: '1px solid ' + C.border, borderRadius: 10, color: C.textSecondary, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                    🔗 Partager via...
                  </button>
                </div>
                {/* QR code text fallback */}
                <div style={{ background: C.lightBg, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 11, color: C.textTertiary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Code réunion</p>
                  <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 6, color: C.violet, fontFamily: 'monospace' }}>
                    {meeting.id?.slice(0,6).toUpperCase()}
                  </div>
                </div>
              </div>
            </MeetPanel>
          </div>
        )}

        {/* Top toolbar — single compact row */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)', pointerEvents: 'all', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px' }}>
            {/* Left: timer + network */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
              <div style={{ color: 'white', fontSize: 11, fontWeight: 600 }}>🕐 {fmt(elapsed)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {[0,1,2].map(i => {
                  const lit = (netQuality==='good') || (netQuality==='fair'&&i<2) || (netQuality==='poor'&&i<1);
                  const col = netQuality==='good'?'#4CAF50':netQuality==='fair'?'#FFC107':'#E74C3C';
                  return <div key={i} style={{ width: 3, height: 6+i*3, borderRadius: 2, background: lit?col:'rgba(255,255,255,0.25)' }} />;
                })}
              </div>
            </div>
            {/* Center: tool buttons — scrollable on mobile, no wrap */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none', justifyContent: 'center', padding: '0 4px' }}>
              <SideBtn icon="😀" label={T.reactions} onClick={() => { setShowReactions(v=>!v); setActivePanel(null); setShowInfoPanel(false); }} active={showReactions} color={C.accentOrange} />
              <SideBtn icon="📊" label={T.polls} onClick={() => { togglePanel('poll'); setShowInfoPanel(false); }} active={activePanel==='poll'} badge={activePoll?1:0} color={C.violet} />
              <SideBtn icon="📝" label={T.notes || 'Notes'} onClick={() => { setShowNotesModal(true); setActivePanel(null); setShowInfoPanel(false); }} active={showNotesModal} color={C.iceBlue} />
              <SideBtn icon="🖊️" label={T.captions || 'Sous-titres'} onClick={toggleCaptions} active={captionsOn} color={captionsOn ? '#27AE60' : C.textTertiary} />
              <SideBtn icon="🔗" label={T.invite || 'Inviter'} onClick={() => { setShowInfoPanel(v=>!v); setActivePanel(null); }} active={showInfoPanel} color={C.violet} />
              <SideBtn icon="⊡" label={T.miniScreen || 'Mini-écran'} onClick={requestPiP} color={C.iceBlue} />
              {(isHost || isCoHost) && (
                <SideBtn icon="👑" label={T.hostControls || 'Contrôles'} onClick={() => { togglePanel('hostControls'); setShowInfoPanel(false); }} active={activePanel==='hostControls'} color="#F57F17" />
              )}
            </div>
          </div>
        </div>

        {/* Panel — slides from right, below top toolbar, keyboard-aware via env() */}
        {activePanel && (
          <div style={{ position: 'absolute', right: 0, top: 52, bottom: 0, width: 'min(100vw, 320px)', pointerEvents: 'all', zIndex: 3 }}>

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

            {/* HOST CONTROLS — visible only to host / co-host */}
            {activePanel === 'hostControls' && (isHost || isCoHost) && (
              <MeetPanel title={T.hostControls || 'Contrôles hôte'} icon="👑" onClose={() => setActivePanel(null)}>
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1 }}>
                  {/* Mute All */}
                  <button onClick={async () => {
                    await FirebaseMeetingService.sendMuteAll(meeting.id, user.uid);
                    showToast('🔇 ' + (T.muteAllDone || 'Signal envoyé aux participants'), 'success');
                  }} style={{ padding: '12px', background: 'linear-gradient(135deg,#E74C3C,#8E44AD)', border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    🔇 {T.muteAll || 'Couper tous les micros'}
                  </button>

                  {/* Participant list with individual controls */}
                  <p style={{ fontSize: 11, color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, margin: '4px 0 0' }}>
                    Participants ({participants.length})
                  </p>
                  {participants.filter(p => p.uid !== user.uid).map(p => {
                    const isAlreadyCoHost = coHosts.includes(p.uid);
                    return (
                      <div key={p.uid} style={{ background: C.lightBg, borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#8E44AD,#3498DB)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                          {(p.name || '?')[0].toUpperCase()}
                        </div>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name || 'Participant'}
                          {isAlreadyCoHost && <span style={{ marginLeft: 4, fontSize: 10, color: C.violet }}>co-hôte</span>}
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {/* Mute individual */}
                          <button title="Couper le micro" onClick={async () => {
                            await FirebaseMeetingService.sendHostCommand(meeting.id, user.uid, p.uid, 'mute');
                            showToast('🔇 Signal envoyé à ' + (p.name || 'Participant'), 'success');
                          }} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#E74C3C20', color: '#E74C3C', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔇</button>
                          {/* Promote/remove co-host */}
                          {isHost && (
                            <button title={isAlreadyCoHost ? 'Retirer co-hôte' : 'Nommer co-hôte'} onClick={async () => {
                              const newCoHosts = isAlreadyCoHost ? coHosts.filter(id => id !== p.uid) : [...coHosts, p.uid];
                              setCoHosts(newCoHosts);
                              await FirebaseMeetingService.setCoHosts(meeting.id, newCoHosts);
                              if (!isAlreadyCoHost) await FirebaseMeetingService.sendHostCommand(meeting.id, user.uid, p.uid, 'makeCoHost');
                              showToast(isAlreadyCoHost ? '✅ Co-hôte retiré' : '⭐ Co-hôte nommé', 'success');
                            }} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: isAlreadyCoHost ? C.violet + '20' : '#FFC10720', color: isAlreadyCoHost ? C.violet : '#F57F17', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⭐</button>
                          )}
                          {/* Kick */}
                          <button title="Exclure de la réunion" onClick={async () => {
                            await FirebaseMeetingService.sendHostCommand(meeting.id, user.uid, p.uid, 'kick');
                            showToast('🚪 ' + (p.name || 'Participant') + ' exclu', 'success');
                          }} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#E74C3C20', color: '#E74C3C', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🚪</button>
                        </div>
                      </div>
                    );
                  })}
                  {participants.filter(p => p.uid !== user.uid).length === 0 && (
                    <p style={{ fontSize: 12, color: C.textTertiary, textAlign: 'center', padding: '12px 0', margin: 0 }}>Aucun autre participant</p>
                  )}
                </div>
              </MeetPanel>
            )}
          </div>
        )}

        {/* Kicked overlay */}
        {kicked && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'all', zIndex: 99 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🚪</div>
            <h2 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: '0 0 8px', textAlign: 'center' }}>{T.kicked || 'Vous avez été exclu'}</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', maxWidth: 280, margin: '0 0 24px' }}>{T.kickedMsg || "L'hôte vous a retiré de cette réunion."}</p>
            <button onClick={onExit} style={{ padding: '14px 32px', background: 'linear-gradient(135deg,#E74C3C,#8E44AD)', border: 'none', borderRadius: 16, color: 'white', fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
              ← {T.back || 'Retour'}
            </button>
          </div>
        )}

        {/* Notes full-screen modal — Google Meet style, no keyboard issues */}
        {showNotesModal && ReactDOM.createPortal(
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontFamily: 'Poppins, sans-serif' }} onClick={() => setShowNotesModal(false)}>
            <div style={{ width: '100%', maxWidth: 600, background: '#1A1A2E', borderRadius: '20px 20px 0 0', padding: '0 0 env(safe-area-inset-bottom, 0)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>📝</span>
                  <span style={{ fontWeight: 700, fontSize: 15, color: 'white' }}>{T.notes || 'Notes'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: notesSaved ? '#4CAF50' : 'rgba(255,255,255,0.4)' }}>
                    {notesSaved ? '✓ ' + (T.saved || 'Sauvegardé') : '…'}
                  </span>
                  <button onClick={() => setShowNotesModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 30, height: 30, color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              </div>
              {/* Textarea — full height, no focus issues */}
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={T.notesPlaceholder || 'Vos notes ici...'}
                autoFocus
                style={{ flex: 1, padding: '16px 20px', background: 'transparent', border: 'none', color: 'white', fontSize: 14, lineHeight: 1.7, fontFamily: 'Poppins, sans-serif', resize: 'none', outline: 'none', minHeight: 200 }}
              />
            </div>
          </div>,
          document.body
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
    { code: 'pt', label: '🇧🇷 Português' },
    { code: 'it', label: '🇮🇹 Italiano' },
    { code: 'ar', label: '🇸🇦 العربية' },
    { code: 'zh', label: '🇨🇳 中文' },
    { code: 'hi', label: '🇮🇳 हिन्दी' },
    { code: 'ja', label: '🇯🇵 日本語' },
    { code: 'ko', label: '🇰🇷 한국어' },
    { code: 'tr', label: '🇹🇷 Türkçe' },
    { code: 'vi', label: '🇻🇳 Tiếng Việt' },
    { code: 'id', label: '🇮🇩 Bahasa Indonesia' },
    { code: 'nl', label: '🇳🇱 Nederlands' },
    { code: 'pl', label: '🇵🇱 Polski' },
    { code: 'uk', label: '🇺🇦 Українська' },
    { code: 'sv', label: '🇸🇪 Svenska' },
    { code: 'ha', label: '🇳🇬 Hausa' },
    { code: 'yo', label: '🇳🇬 Yorùbá' },
    { code: 'sw', label: '🇰🇪 Kiswahili' },
    { code: 'am', label: '🇪🇹 አማርኛ' },
    { code: 'fa', label: '🇮🇷 فارسی' },
    { code: 'ro', label: '🇷🇴 Română' },
    { code: 'el', label: '🇬🇷 Ελληνικά' },
    { code: 'cs', label: '🇨🇿 Čeština' },
    { code: 'hu', label: '🇭🇺 Magyar' },
    { code: 'bn', label: '🇧🇩 বাংলা' },
    { code: 'th', label: '🇹🇭 ภาษาไทย' },
    { code: 'mg', label: '🇲🇬 Malagasy' },
    { code: 'wo', label: '🇸🇳 Wolof' },
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
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: 0 }}>{T.settings}</h2>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>

        {/* RÉUNION */}
        <div style={{ marginBottom: 20 }}>
          {sectionTitle(T.meetingSettings)}
          <div style={settCard}>
            {tileRow('📹', T.defaultCam,
              <ToggleSwitch on={prefs.defaultCam} onChange={v => { onUpdatePref('defaultCam', v); showToast?.(v ? '📹 Caméra activée' : '📹 Caméra désactivée', 'success'); }} colorOn="#8E44AD" />,
              null, false)}
            {tileRow('🎤', T.defaultMic,
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
          {sectionTitle(T.appearance || 'Apparence')}
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
          {sectionTitle(T.legal)}
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
          <div style={{ background: dark ? '#1A0A2E' : 'white', borderRadius: 20, width: '100%', maxWidth: 340, maxHeight: 'min(75vh, 520px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: dark ? '#F0EAF8' : '#1A1A1A', margin: 0, padding: '20px 20px 12px', flexShrink: 0 }}>{T.chooseLang || 'Choisir la langue'}</h3>
            <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 12px 16px', flex: 1 }}>
              {langs.map(l => (
                <div key={l.code} onClick={() => { onUpdatePref('language', l.code); setShowLang(false); showToast?.('🌐 ' + (T.chooseLang || 'Langue modifiée'), 'success'); }} style={{
                  padding: '13px 14px', borderRadius: 12, cursor: 'pointer', marginBottom: 4,
                  background: prefs.language === l.code ? (dark ? '#2D1050' : '#F5F3FF') : 'transparent',
                  border: prefs.language === l.code ? '1.5px solid #8E44AD' : `1.5px solid ${dark ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
                  fontSize: 14, fontWeight: 500, color: dark ? '#F0EAF8' : '#1A1A1A',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  {l.label}
                  {prefs.language === l.code && <span style={{ color: '#8E44AD', fontWeight: 700 }}>✓</span>}
                </div>
              ))}
            </div>
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

