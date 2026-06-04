import { AuthService, MeetingService } from './services/LocalStorageService';
import React, { useState, useEffect, useRef, useCallback } from 'react';

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
  },
};

// ============================================================
// PREFS
// ============================================================
const loadPrefs = () => { try { return JSON.parse(localStorage.getItem('crux_prefs') || '{}'); } catch { return {}; } };
const savePrefs = (p) => localStorage.setItem('crux_prefs', JSON.stringify(p));

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
// ============================================================
// ADMIN PANEL — génération de codes d'activation
// Accès : ?admin=crux2024
// ============================================================
function AdminPanel() {
  const [codes, setCodes] = useState(() => VCodeService.list());
  const [newCode, setNewCode] = useState('');
  const [plan, setPlan] = useState('sub');
  const [copied, setCopied] = useState('');

  const generate = () => {
    const code = VCodeService.addCode(plan);
    setNewCode(code);
    setCodes(VCodeService.list());
  };

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
  };

  const deleteCode = (code) => {
    try {
      const pool = VCodeService.list().filter(c => c.code !== code);
      localStorage.setItem('crux_vcodes', JSON.stringify(pool));
      setCodes(VCodeService.list());
    } catch {}
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0D0020', fontFamily: 'Poppins, sans-serif', padding: '32px 24px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#FF4081,#AA00FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💎</div>
          <div>
            <h1 style={{ color: 'white', fontWeight: 800, fontSize: 20, margin: 0 }}>CRUX Admin</h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: 0 }}>Gestion des codes d'activation</p>
          </div>
        </div>

        {/* Génération */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '24px', marginBottom: 24 }}>
          <h3 style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: '0 0 16px' }}>Générer un nouveau code</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { v: 'sub', label: '💎 Abonnement mensuel (6 500 FCFA)' },
              { v: 'single', label: '🎟️ Réunion unique (1 300 FCFA)' },
            ].map(p => (
              <button key={p.v} onClick={() => setPlan(p.v)} style={{
                padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
                background: plan === p.v ? 'linear-gradient(135deg,#FF4081,#AA00FF)' : 'rgba(255,255,255,0.08)',
                border: plan === p.v ? 'none' : '1px solid rgba(255,255,255,0.15)',
                color: 'white', fontSize: 13, fontWeight: 600,
              }}>{p.label}</button>
            ))}
          </div>
          <button onClick={generate} style={{
            width: '100%', padding: '14px', borderRadius: 14,
            background: 'linear-gradient(135deg,#FF4081,#AA00FF)',
            border: 'none', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}>
            ✨ Générer un code
          </button>
          {newCode && (
            <div style={{ marginTop: 16, background: 'rgba(255,64,129,0.12)', border: '1px solid rgba(255,64,129,0.30)', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, margin: '0 0 8px', textTransform: 'uppercase' }}>Nouveau code généré</p>
              <p style={{ color: 'white', fontFamily: 'monospace', fontSize: 22, fontWeight: 800, margin: '0 0 12px', letterSpacing: 2 }}>{newCode}</p>
              <button onClick={() => copyCode(newCode)} style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: copied === newCode ? '#27AE60' : 'rgba(255,255,255,0.15)',
                color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>{copied === newCode ? '✓ Copié !' : '📋 Copier le code'}</button>
            </div>
          )}
        </div>

        {/* Liste des codes */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '24px' }}>
          <h3 style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: '0 0 16px' }}>
            Codes existants ({codes.filter(c => !c.used).length} disponibles / {codes.length} total)
          </h3>
          {codes.length === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Aucun code généré</p>
          )}
          {[...codes].reverse().map(c => (
            <div key={c.code} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
            }}>
              <span style={{
                fontFamily: 'monospace', fontSize: 14, fontWeight: 700,
                color: c.used ? 'rgba(255,255,255,0.25)' : 'white',
                textDecoration: c.used ? 'line-through' : 'none', flex: 1,
              }}>{c.code}</span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                background: c.plan === 'sub' ? 'rgba(255,64,129,0.20)' : 'rgba(255,152,0,0.20)',
                color: c.plan === 'sub' ? '#FF4081' : '#FFB74D',
              }}>{c.plan === 'sub' ? 'Mensuel' : 'Unique'}</span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                background: c.used ? 'rgba(255,255,255,0.05)' : 'rgba(39,174,96,0.20)',
                color: c.used ? 'rgba(255,255,255,0.25)' : '#27AE60',
              }}>{c.used ? 'Utilisé' : 'Disponible'}</span>
              {!c.used && (
                <button onClick={() => copyCode(c.code)} style={{
                  padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                  background: copied === c.code ? '#27AE60' : 'transparent',
                  color: 'white', fontSize: 12, cursor: 'pointer',
                }}>{copied === c.code ? '✓' : '📋'}</button>
              )}
              <button onClick={() => deleteCode(c.code)} style={{
                padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(231,76,60,0.30)',
                background: 'transparent', color: '#E74C3C', fontSize: 12, cursor: 'pointer',
              }}>🗑</button>
            </div>
          ))}
        </div>

        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'center', marginTop: 24 }}>
          Accès admin — ne partagez pas cette URL
        </p>
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
    defaultMic: true, defaultCam: true, videoQuality: 'high',
    ...loadPrefs(),
  }));
  const T = T_MAP[prefs.language] || T_MAP.fr;
  const updatePref = useCallback((k, v) => setPrefs(p => { const n = { ...p, [k]: v }; savePrefs(n); return n; }), []);

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
        {page === 'dashboard' && <Dashboard user={user} T={T} onJoin={goMeeting} onJoinByCode={(code) => handleJoinByCode(code, user)} />}
        {page === 'settings' && (
          <SettingsPage T={T} prefs={prefs} onUpdatePref={updatePref} onBack={() => setPage('dashboard')}
            onPrivacy={() => setPage('privacy')} onTerms={() => setPage('terms')} />
        )}
        {page === 'privacy' && <PrivacyPolicyPage T={T} onBack={() => setPage('settings')} />}
        {page === 'terms' && <TermsPage T={T} onBack={() => setPage('settings')} />}
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

function Dashboard({ user, T, onJoin, onJoinByCode }) {
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

  return (
    <div style={{ background: '#F5F3FF', minHeight: 'calc(100vh - 64px)', fontFamily: 'Poppins, sans-serif' }}>
      {/* Gradient Header — Flutter SliverAppBar */}
      <div style={{
        background: 'linear-gradient(135deg, #E74C3C, #8E44AD)',
        padding: '24px 20px 28px',
      }}>
        <p style={{ fontSize: 18, fontWeight: 600, color: 'white', margin: '0 0 2px' }}>
          {T.welcome}, {user.name.split(' ')[0]} 👋
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
          Prêt pour votre prochaine réunion ?
        </p>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>
        {/* Create Meeting Card */}
        <div style={{
          background: 'linear-gradient(135deg, #E74C3C, #9B59B6, #8E44AD)',
          borderRadius: 24, padding: 22, marginBottom: 28,
          boxShadow: '0 8px 20px rgba(231,76,60,0.35)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📹</div>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>Nouvelle réunion</span>
          </div>
          <input
            value={meetingName}
            onChange={e => setMeetingName(e.target.value)}
            placeholder="Nom de la réunion..."
            onKeyDown={e => e.key === 'Enter' && createMeeting()}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '13px 16px',
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 14, color: 'white', fontSize: 15,
              outline: 'none', fontFamily: 'Poppins, sans-serif', marginBottom: 14,
            }}
          />
          <button onClick={createMeeting} disabled={creating} style={{
            width: '100%', height: 50, background: 'white', border: 'none', borderRadius: 14,
            color: '#E74C3C', fontWeight: 700, fontSize: 15, cursor: 'pointer',
            fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {creating
              ? <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2.5px solid #E74C3C30', borderTopColor: '#E74C3C', animation: 'spin 0.9s linear infinite' }} />
              : <><span>🚀</span> Démarrer la réunion</>
            }
          </button>
        </div>

        {/* Actions rapides */}
        <p style={{ fontSize: 17, fontWeight: 800, color: '#1A1A1A', margin: '0 0 14px' }}>Actions rapides</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          <ActionCard icon="👥" title="Rejoindre" subtitle="Via un ID" gradient="linear-gradient(135deg,#8E44AD,#6C3483)" onTap={() => setShowJoinDialog(true)} />
          <ActionCard icon="📅" title="Planifier" subtitle="Créer" gradient="linear-gradient(135deg,#3498DB,#2980B9)" onTap={() => setShowSchedule(true)} />
          <ActionCard icon="📤" title="Partager" subtitle="Inviter" gradient="linear-gradient(135deg,#27AE60,#1E8449)" onTap={() => { navigator.share?.({ title: 'CRUX', text: 'Rejoignez CRUX — Visioconférence Premium!' }).catch(() => {}); showToast('📱 Partagez CRUX !', 'success'); }} />
          <ActionCard icon="❓" title="Aide" subtitle="Support" gradient="linear-gradient(135deg,#F39C12,#D68910)" onTap={() => showToast('📧 support@crux.app', 'info')} />
        </div>

        {/* Meetings list */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ fontSize: 17, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
            {T.recentMeetings} {!loadingMeetings && `(${meetings.length})`}
          </p>
          <button onClick={() => setShowSchedule(true)} style={{
            padding: '8px 16px', background: 'linear-gradient(135deg,#E74C3C,#8E44AD)',
            color: 'white', border: 'none', borderRadius: 10, fontWeight: 700,
            fontSize: 12, cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
          }}>+ {T.newMeeting}</button>
        </div>

        {loadingMeetings ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>⏳ {T.loading}</div>
        ) : meetings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: 'white', borderRadius: 20, border: '2px dashed #DDD' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
            <p style={{ fontWeight: 700, color: '#1A1A1A', margin: '0 0 6px' }}>{T.noMeetings}</p>
            <p style={{ color: '#999', fontSize: 13 }}>{T.noMeetingsHint}</p>
            <button onClick={createMeeting} style={{ marginTop: 18, padding: '11px 24px', background: 'linear-gradient(135deg,#E74C3C,#8E44AD)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
              🚀 Démarrer maintenant
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {meetings.map(m => <MeetingCard key={m.id} meeting={m} T={T} onJoin={() => onJoin(m)} />)}
          </div>
        )}

        {/* Info banner */}
        <div style={{
          background: 'rgba(142,68,173,0.08)', border: '1px solid rgba(142,68,173,0.25)',
          borderRadius: 16, padding: '14px 16px', marginTop: 24,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(142,68,173,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>ℹ️</div>
          <p style={{ fontSize: 12, color: '#555', margin: 0, lineHeight: 1.5 }}>
            Les réunions s'ouvrent directement dans CRUX via Jitsi Meet — gratuit et sécurisé.
          </p>
        </div>
      </div>

      {/* Dialogs */}
      {showJoinDialog && (
        <CruxModal onClose={() => setShowJoinDialog(false)}>
          <ModalHeader icon="🔗" title="Rejoindre" />
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
function MeetingCard({ meeting, T, onJoin }) {
  const ago = Math.floor((Date.now() - meeting.createdAt) / 60000);
  const isPersistent = meeting.type === 'persistent';
  const status = meeting.status || 'scheduled';
  const statusColors = { scheduled: C.iceBlue, ongoing: C.success, ended: C.textTertiary };
  const statusLabels = { scheduled: T.statusScheduled, ongoing: T.statusOngoing, ended: T.statusEnded };
  const statusColor = statusColors[status] || C.textTertiary;
  const isEnded = status === 'ended';
  return (
    <div style={{ background: C.white, borderRadius: 16, padding: 20, border: `1.5px solid ${C.border}`, transition: 'all 0.22s', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', fontFamily: 'Poppins, sans-serif', opacity: isEnded ? 0.7 : 1 }}
      onMouseEnter={e => { if (!isEnded) { e.currentTarget.style.boxShadow = `0 8px 28px ${C.violetGlow}`; e.currentTarget.style.borderColor = C.violetLight; } }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = C.border; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1, marginRight: 8 }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: '0 0 4px' }}>
            {meeting.isLocked && <span style={{ marginRight: 6 }}>🔒</span>}
            {meeting.title}
          </h4>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${statusColor}18`, color: statusColor }}>
              ● {statusLabels[status] || status}
            </span>
            {meeting.isRecording && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${C.error}18`, color: C.error, animation: 'recPulse 2s infinite' }}>
                ⏺ REC
              </span>
            )}
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: isPersistent ? `${C.violet}15` : `${C.flamePrimary}12`, color: isPersistent ? C.violet : C.flamePrimary, flexShrink: 0 }}>
          {isPersistent ? '📌' : '⏱'} {isPersistent ? T.persistent : T.temporary}
        </span>
      </div>
      {meeting.description && <p style={{ fontSize: 13, color: C.textSecondary, margin: '0 0 12px', lineHeight: 1.5 }}>{meeting.description}</p>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: `${C.success}15`, color: C.success }}>👥 {meeting.participantCount || 1}</span>
          <span style={{ fontSize: 12, color: C.textTertiary }}>{ago > 0 ? `${ago}min` : "À l'instant"}</span>
        </div>
        {!isEnded && (
          <button onClick={onJoin} style={{ padding: '8px 16px', background: C.primaryGradient, color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', boxShadow: `0 4px 12px ${C.fireGlow}` }}>{T.joinMeeting} →</button>
        )}
      </div>
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
  const muteAll = () => {
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
// PAYMENT WALL (Djamo)
// ============================================================
const FREE_MINUTES = 2;
const DJAMO_PAYMENT_URL = 'https://pay.djamo.com/qxmvj';

// ── Pro status helpers ───────────────────────────────────────
const ProService = {
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
};

// ── Validation code service (codes générés par l'admin) ──────
// L'admin génère un code depuis /admin#CRUX-XXXXX et l'envoie à l'acheteur
// Le code est stocké dans localStorage côté admin sous crux_vcodes
const VCodeService = {
  // Vérifie si un code est valide et non utilisé
  validate(code) {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return { ok: false, reason: 'empty' };
    // Format : CRUX-XXXXXX (10 chars après CRUX-)
    if (!/^CRUX-[A-Z0-9]{6,12}$/.test(normalized)) return { ok: false, reason: 'format' };
    // Vérifie dans le pool de codes valides stockés par l'admin
    try {
      const pool = JSON.parse(localStorage.getItem('crux_vcodes') || '[]');
      const entry = pool.find(c => c.code === normalized && !c.used);
      if (!entry) return { ok: false, reason: 'not_found' };
      return { ok: true, plan: entry.plan || 'sub', entry };
    } catch { return { ok: false, reason: 'error' }; }
  },
  // Marque un code comme utilisé
  markUsed(code, userId) {
    try {
      const pool = JSON.parse(localStorage.getItem('crux_vcodes') || '[]');
      const idx = pool.findIndex(c => c.code === code.trim().toUpperCase());
      if (idx !== -1) { pool[idx].used = true; pool[idx].usedBy = userId; pool[idx].usedAt = Date.now(); }
      localStorage.setItem('crux_vcodes', JSON.stringify(pool));
    } catch {}
  },
  // Admin : ajouter un code
  addCode(plan = 'sub') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const rand = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const code = `CRUX-${rand}`;
    try {
      const pool = JSON.parse(localStorage.getItem('crux_vcodes') || '[]');
      pool.push({ code, plan, used: false, createdAt: Date.now() });
      localStorage.setItem('crux_vcodes', JSON.stringify(pool));
    } catch {}
    return code;
  },
  list() {
    try { return JSON.parse(localStorage.getItem('crux_vcodes') || '[]'); } catch { return []; }
  },
};

// ── Payment steps: 'plans' | 'paying' | 'verify' | 'success' ─
function PaymentWall({ user, meeting, onPaid, onExit }) {
  const [step, setStep] = useState(() =>
    ProService.isActive(user.uid, meeting.id) ? 'success' : 'plans'
  );
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [txRef, setTxRef] = useState('');

  // Auto-unlock if already pro
  useEffect(() => {
    if (ProService.isActive(user.uid, meeting.id)) { onPaid(); }
  }, []); // eslint-disable-line

  const handlePay = (plan) => {
    setSelectedPlan(plan);
    setStep('paying');
    window.open(DJAMO_PAYMENT_URL, '_blank');
    // After a short delay show the verification step
    setTimeout(() => setStep('verify'), 1500);
  };

  const handleVerify = () => {
    const code = txRef.trim().toUpperCase();
    if (!code) { setVerifyError('Entrez le code d\'activation reçu après paiement.'); return; }
    setVerifying(true);
    setVerifyError('');

    setTimeout(() => {
      const result = VCodeService.validate(code);
      setVerifying(false);
      if (result.ok) {
        VCodeService.markUsed(code, user.uid);
        ProService.activate(user.uid, result.plan, meeting.id);
        setStep('success');
      } else {
        const msgs = {
          format: 'Format invalide. Le code doit ressembler à CRUX-XXXXXXXX.',
          not_found: 'Code introuvable ou déjà utilisé. Vérifiez le code envoyé par l\'administrateur.',
          error: 'Erreur de vérification. Réessayez.',
          empty: 'Entrez le code d\'activation.',
        };
        setVerifyError(msgs[result.reason] || 'Code invalide.');
      }
    }, 800);
  };

  // ── Success screen ──────────────────────────────────────────
  if (step === 'success') {
    const status = ProService.getStatus(user.uid);
    const expiry = status ? new Date(status.expiresAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(13,0,32,0.97)', backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Poppins, sans-serif', padding: 20,
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 24, padding: '40px 32px', maxWidth: 400, width: '100%', textAlign: 'center',
        }}>
          {/* Badge Pro animé */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
            background: 'linear-gradient(135deg,#FF4081,#AA00FF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38,
            boxShadow: '0 0 0 12px rgba(255,64,129,0.15), 0 0 40px rgba(170,0,255,0.30)',
          }}>💎</div>
          <h2 style={{ color: 'white', fontWeight: 800, fontSize: 22, margin: '0 0 8px' }}>
            Bienvenue dans CRUX Pro !
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.60)', fontSize: 14, margin: '0 0 6px' }}>
            Votre accès est actif jusqu'au
          </p>
          <p style={{ color: '#FF4081', fontWeight: 700, fontSize: 15, margin: '0 0 28px' }}>{expiry}</p>

          {/* Avantages */}
          <div style={{ background: 'rgba(255,64,129,0.08)', border: '1px solid rgba(255,64,129,0.20)', borderRadius: 14, padding: '16px 20px', marginBottom: 28, textAlign: 'left' }}>
            {['✅ Réunions sans limite de durée', '✅ Qualité vidéo HD', '✅ Enregistrement activé', '✅ Contrôles hôte avancés'].map(f => (
              <p key={f} style={{ color: 'rgba(255,255,255,0.80)', fontSize: 13, margin: '4px 0' }}>{f}</p>
            ))}
          </div>

          <button onClick={onPaid} style={{
            width: '100%', padding: '16px', borderRadius: 16,
            background: 'linear-gradient(135deg,#FF4081,#AA00FF)',
            border: 'none', color: 'white', fontSize: 16, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
            boxShadow: '0 8px 24px rgba(255,64,129,0.35)',
          }}>
            🚀 Continuer la réunion
          </button>
        </div>
      </div>
    );
  }

  // ── Verify screen ───────────────────────────────────────────
  if (step === 'verify') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(13,0,32,0.97)', backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Poppins, sans-serif', padding: 20,
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 24, padding: '40px 32px', maxWidth: 400, width: '100%', textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
          <h2 style={{ color: 'white', fontWeight: 800, fontSize: 20, margin: '0 0 8px' }}>
            Confirmer le paiement
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>
            Une fois le paiement reçu, l'administrateur vous enverra un <strong style={{ color: '#FF4081' }}>code d'activation</strong> par WhatsApp ou SMS.
          </p>

          {/* Instruction */}
          <div style={{ background: 'rgba(255,64,129,0.08)', border: '1px solid rgba(255,64,129,0.20)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, textAlign: 'left' }}>
            <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: 11, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.8 }}>Comment obtenir le code ?</p>
            <p style={{ color: 'rgba(255,255,255,0.80)', fontSize: 12, margin: 0, lineHeight: 1.7 }}>
              1. Payez via Djamo<br/>
              2. Envoyez une capture de preuve à l'admin<br/>
              3. Recevez votre code (ex: <span style={{ fontFamily: 'monospace', color: '#FF4081' }}>CRUX-XXXXXXXX</span>)<br/>
              4. Entrez le code ci-dessous
            </p>
          </div>

          <input
            type="text"
            placeholder="Ex: CRUX-AB3X7K2M"
            value={txRef}
            onChange={e => setTxRef(e.target.value)}
            style={{
              width: '100%', padding: '14px 16px', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.10)', border: verifyError ? '1.5px solid #FF4081' : '1.5px solid rgba(255,255,255,0.20)',
              borderRadius: 12, color: 'white', fontSize: 15, fontFamily: 'monospace',
              outline: 'none', marginBottom: 8,
            }}
          />
          {verifyError && <p style={{ color: '#FF4081', fontSize: 12, marginBottom: 12 }}>⚠️ {verifyError}</p>}

          <button onClick={handleVerify} disabled={verifying} style={{
            width: '100%', padding: '15px', borderRadius: 14, marginBottom: 12,
            background: verifying ? 'rgba(255,64,129,0.5)' : 'linear-gradient(135deg,#FF4081,#AA00FF)',
            border: 'none', color: 'white', fontSize: 15, fontWeight: 700,
            cursor: verifying ? 'not-allowed' : 'pointer', fontFamily: 'Poppins, sans-serif',
          }}>
            {verifying ? '⏳ Vérification...' : '✅ Vérifier et activer'}
          </button>

          <button onClick={() => { window.open(DJAMO_PAYMENT_URL, '_blank'); }} style={{
            width: '100%', padding: '12px', borderRadius: 14, marginBottom: 12,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.70)', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
          }}>
            🔄 Rouvrir Djamo
          </button>

          <button onClick={onExit} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)',
            fontSize: 12, cursor: 'pointer',
          }}>Quitter la réunion</button>
        </div>
      </div>
    );
  }

  // ── Plans screen (default) ──────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(13,0,32,0.96)', backdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Poppins, sans-serif', padding: 20,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 24, padding: '40px 32px', maxWidth: 420, width: '100%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>⏱️</div>
        <h2 style={{ color: 'white', fontWeight: 800, fontSize: 22, margin: '0 0 8px' }}>
          30 minutes écoulées
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: '0 0 32px', lineHeight: 1.6 }}>
          La période gratuite est terminée. Choisissez un plan pour continuer votre réunion <strong style={{ color: 'white' }}>{meeting.title}</strong>.
        </p>

        {/* Plans */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          <button onClick={() => handlePay('sub')} style={{
            padding: '18px 24px', borderRadius: 16,
            background: 'linear-gradient(135deg,#FF4081,#AA00FF)',
            border: 'none', color: 'white', textAlign: 'left', cursor: 'pointer',
          }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>💎 Pro — Abonnement mensuel</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Réunions illimitées · 6 500 FCFA / mois</div>
            <div style={{ marginTop: 10, fontSize: 12, background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 12px', display: 'inline-block' }}>
              Payer via Djamo →
            </div>
          </button>

          <button onClick={() => handlePay('single')} style={{
            padding: '18px 24px', borderRadius: 16,
            background: 'rgba(255,255,255,0.10)', border: '1.5px solid rgba(255,255,255,0.20)',
            color: 'white', textAlign: 'left', cursor: 'pointer',
          }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>🎟️ Paiement à la réunion</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Cette réunion uniquement · 1 300 FCFA</div>
            <div style={{ marginTop: 10, fontSize: 12, background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 12px', display: 'inline-block' }}>
              Payer via Djamo →
            </div>
          </button>
        </div>

        {/* Moyens de paiement */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 8 }}>MOYENS DE PAIEMENT ACCEPTÉS</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            {['🟠 Orange Money', '💛 MTN MoMo', '🔵 Wave', '💳 Carte bancaire'].map(m => (
              <span key={m} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{m}</span>
            ))}
          </div>
        </div>

        <button onClick={onExit} style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
          fontSize: 13, cursor: 'pointer', marginTop: 8,
        }}>
          Quitter la réunion
        </button>
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
// MEETING ROOM
// ============================================================
function MeetingRoom({ meeting, user, T, prefs, onExit }) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);
  const [count, setCount] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(() => localStorage.getItem(`crux_notes_${meeting.id}`) || '');
  const [showPoll, setShowPoll] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [showHostControls, setShowHostControls] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const reactIdRef = useRef(0);
  const isHost = meeting.creatorId === user.uid;
  const [jitsiReady, setJitsiReady] = useState(false);
  const [jitsiError, setJitsiError] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);
  const [paid, setPaid] = useState(() => !!localStorage.getItem(`crux_paid_${meeting.id}_${user?.uid}`));

  const EMOJI_REACTIONS = ['👍', '❤️', '😂', '🎉', '👏', '🔥', '😮', '🙌'];

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (elapsed >= FREE_MINUTES * 60 && !paid) {
      setShowPaywall(true);
    }
  }, [elapsed, paid]);

  // Iframe src — plain iframe avoids the 5-min External API restriction
  const jitsiSrc = React.useMemo(() => {
    const roomName = `crux${(meeting.roomId || meeting.id).replace(/[^a-zA-Z0-9]/g, '')}`;
    const params = new URLSearchParams({
      'config.prejoinPageEnabled': 'false',
      'config.startWithAudioMuted': String(!prefs.defaultMic),
      'config.startWithVideoMuted': String(!prefs.defaultCam),
      'config.disableDeepLinking': 'true',
      'config.enableWelcomePage': 'false',
      'config.defaultLanguage': 'fr',
      'userInfo.displayName': user.name || 'Utilisateur',
    });
    return `https://meet.jit.si/${roomName}#${params.toString()}`;
  }, [meeting.roomId, meeting.id, user.name, prefs.defaultMic, prefs.defaultCam]);

  useEffect(() => {
    const t = setTimeout(() => setJitsiReady(true), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    localStorage.setItem(`crux_notes_${meeting.id}`, notes);
  }, [notes, meeting.id]);

  useEffect(() => {
    const loadChat = async () => {
      const msgs = await MeetingService.getChatMessages(meeting.id);
      setChatMessages(msgs);
    };
    loadChat();
    const interval = setInterval(loadChat, 3000);
    return () => clearInterval(interval);
  }, [meeting.id]);

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    await MeetingService.saveChatMessage(meeting.id, user.uid, user.name, chatInput.trim());
    setChatInput('');
    const msgs = await MeetingService.getChatMessages(meeting.id);
    setChatMessages(msgs);
  };

  const handleExit = async () => {
    try { await MeetingService.endMeeting(meeting.id, meeting.type); } catch { }
    onExit();
  };

  const sendReaction = (emoji) => {
    const id = ++reactIdRef.current;
    const left = 12 + Math.random() * 70;
    GamService.addReaction(user.uid);
    setReactions(r => [...r, { id, emoji, left }]);
    setTimeout(() => setReactions(r => r.filter(x => x.id !== id)), 3000);
  };

  const toggleHand = () => {
    const raised = !handRaised;
    setHandRaised(raised);
    if (raised) GamService.addHandRaise(user.uid);
  };

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Tool button style for top bar
  const toolBtn = (active, activeColor) => ({
    height: 32, padding: '0 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 700, fontFamily: 'Poppins, sans-serif',
    background: active ? activeColor : 'rgba(255,255,255,0.15)',
    color: 'white', backdropFilter: 'blur(8px)',
    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 5,
    boxShadow: active ? `0 2px 10px ${activeColor}80` : 'none',
    whiteSpace: 'nowrap',
  });

  if (showPaywall && !paid) {
    return <PaymentWall user={user} meeting={meeting} onPaid={() => { setPaid(true); setShowPaywall(false); }} onExit={handleExit} />;
  }

  if (jitsiError) {
    return (
      <div style={{ minHeight: '100vh', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D0020', fontFamily: 'Poppins, sans-serif' }}>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: '40px 36px', maxWidth: 400, textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>⚠️</div>
          <h3 style={{ color: 'white', fontWeight: 800, margin: '0 0 10px' }}>Connexion impossible</h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 24 }}>{jitsiError}</p>
          <button onClick={onExit} style={{ padding: '12px 28px', background: 'linear-gradient(135deg,#FF4081,#AA00FF)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="crux-fullscreen" style={{ width: '100vw', height: '100vh', minHeight: '100vh', background: '#0A0A0A', position: 'relative', fontFamily: 'Poppins, sans-serif', overflow: 'hidden' }}>

      {/* ── Connecting overlay — hides Jitsi loading ── */}
      {!jitsiReady && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 500, background: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <CruxLogo size={72} />
          <div>
            <h2 style={{ color: 'white', fontWeight: 800, fontSize: 22, margin: '0 0 8px', textAlign: 'center' }}>{meeting.title}</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', margin: 0 }}>{T.connecting}</p>
          </div>
          <div style={{ width: 200, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg,#E74C3C,#8E44AD)', borderRadius: 2, animation: 'loadBar 4s ease-in-out forwards' }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0 }}>ID : {meeting.id}</p>
        </div>
      )}

      {/* ── Floating emoji reactions (pointer-events: none, above video, below panels) ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 90 }}>
        {reactions.map(r => (
          <div key={r.id} style={{ position: 'absolute', bottom: 100, left: `${r.left}%`, fontSize: 34, animation: 'floatUp 3s ease-out forwards' }}>
            {r.emoji}
          </div>
        ))}
      </div>

      {/* ── TOP BAR ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 200,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.0) 100%)',
        padding: '10px 16px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        {/* Left: logo + title + badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <CruxLogo size={30} />
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {meeting.title}
          </span>
          <button onClick={() => {
            const link = `${window.location.origin}${window.location.pathname}?join=${meeting.id}`;
            navigator.clipboard?.writeText(link).catch(() => {});
            showToast('🔗 Lien copié !', 'success');
          }} style={{ height: 28, padding: '0 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.12)', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', gap: 4, backdropFilter: 'blur(8px)' }}>
            🔗 Inviter
          </button>
          <span style={{ background: C.flamePrimary, color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 5, letterSpacing: 1, animation: 'recPulse 2s infinite' }}>⏺ REC</span>
          {handRaised && (
            <span style={{ background: C.accentOrange, color: 'white', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, animation: 'recPulse 1s infinite' }}>✋</span>
          )}
          {privacyMode && (
            <span style={{ background: C.violetDark, color: 'white', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5 }}>🌫</span>
          )}
        </div>

        {/* Center: CRUX tools — all in the top bar, nothing in the bottom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* Emoji reactions toggle */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowEmojiBar(v => !v)} style={toolBtn(showEmojiBar, C.accentOrange)}>
              😊 {T.reactions}
            </button>
            {showEmojiBar && (
              <div style={{
                position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(10,10,10,0.90)', backdropFilter: 'blur(16px)',
                borderRadius: 40, padding: '10px 14px',
                display: 'flex', gap: 4, zIndex: 300, whiteSpace: 'nowrap',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}>
                {EMOJI_REACTIONS.map(e => (
                  <button key={e} onClick={() => { sendReaction(e); setShowEmojiBar(false); }} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', padding: '2px 3px', borderRadius: 8, transition: 'transform 0.15s' }}
                    onMouseEnter={ev => { ev.currentTarget.style.transform = 'scale(1.35)'; }}
                    onMouseLeave={ev => { ev.currentTarget.style.transform = 'scale(1)'; }}
                  >{e}</button>
                ))}
              </div>
            )}
          </div>

          {/* Hand raise */}
          <button onClick={toggleHand} style={toolBtn(handRaised, C.accentOrange)}>
            ✋ {T.raiseHand}
          </button>

          {/* Chat */}
          <button onClick={() => { setShowChat(v => !v); setShowNotes(false); setShowPoll(false); }} style={toolBtn(showChat, C.success)}>
            💬 {T.chat}
          </button>

          {/* Notes */}
          <button onClick={() => { setShowNotes(v => !v); setShowPoll(false); setShowChat(false); }} style={toolBtn(showNotes, C.iceBlue)}>
            📝 {T.notes}
          </button>

          {/* Polls */}
          <button onClick={() => { setShowPoll(v => !v); setShowNotes(false); setShowChat(false); }} style={toolBtn(showPoll, C.violet)}>
            📊 {T.polls}
          </button>

          {/* Privacy mode */}
          <button onClick={() => setPrivacyMode(v => !v)} style={toolBtn(privacyMode, C.violetDark)}>
            🌫 {T.privacyMode}
          </button>

          {/* Host controls */}
          {isHost && (
            <button onClick={() => setShowHostControls(v => !v)} style={toolBtn(showHostControls, C.accentGolden)}>
              👑 {T.hostControls}
            </button>
          )}
        </div>

        {/* Right: stats + exit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 500 }}>👥 {count}</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>🕐 {fmt(elapsed)}</span>
          {!paid && elapsed < FREE_MINUTES * 60 && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: elapsed > (FREE_MINUTES - 5) * 60 ? 'rgba(255,64,129,0.3)' : 'rgba(255,255,255,0.1)',
              color: elapsed > (FREE_MINUTES - 5) * 60 ? '#FF4081' : 'rgba(255,255,255,0.5)',
              border: elapsed > (FREE_MINUTES - 5) * 60 ? '1px solid #FF4081' : 'none',
            }}>
              🆓 {fmt(FREE_MINUTES * 60 - elapsed)} restant
            </span>
          )}
          {paid && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(0,200,100,0.2)', color: '#00C864' }}>✅ Pro</span>}
          <button onClick={() => setShowConfirm(true)} style={{ padding: '7px 14px', background: C.error, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', boxShadow: `0 3px 12px rgba(231,76,60,0.45)` }}>
            📞 {T.endMeeting}
          </button>
        </div>
      </div>

      {/* ── JITSI IFRAME — plain iframe, no 5-min restriction ── */}
      <iframe
        src={jitsiSrc}
        allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
        allowFullScreen
        title="CRUX Meeting"
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          border: 'none', background: '#0D0020', zIndex: 1,
          filter: privacyMode ? 'blur(10px)' : 'none',
          transition: 'filter 0.4s',
        }}
      />

      {/* Privacy reveal hint */}
      {privacyMode && (
        <div onClick={() => setPrivacyMode(false)} style={{ position: 'absolute', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <div style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', color: 'white', padding: '10px 22px', borderRadius: 12, fontSize: 13, fontWeight: 600, border: '1px solid rgba(255,255,255,0.2)' }}>
            🌫 {T.privacyModeOn}
          </div>
        </div>
      )}

      {/* ── NOTES PANEL — right side, starts below top bar ── */}
      {showNotes && (
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 300, zIndex: 250,
          background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '60px 16px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: C.textPrimary }}>📝 {T.notes}</span>
            <button onClick={() => setShowNotes(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: C.textTertiary, lineHeight: 1 }}>×</button>
          </div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={T.notesPlaceholder}
            style={{ flex: 1, padding: '14px', border: 'none', resize: 'none', fontFamily: 'Poppins, sans-serif', fontSize: 13, color: C.textPrimary, background: 'transparent', outline: 'none', lineHeight: 1.7 }} />
        </div>
      )}

      {/* ── CHAT PANEL — right side ── */}
      {showChat && (
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 320, zIndex: 250,
          background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '60px 16px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: C.textPrimary }}>💬 {T.chat}</span>
            <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: C.textTertiary, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chatMessages.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 40, color: C.textTertiary, fontSize: 13 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
                {T.noMessages}
              </div>
            ) : chatMessages.map(m => (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.userId === user.uid ? 'flex-end' : 'flex-start' }}>
                <span style={{ fontSize: 10, color: C.textTertiary, marginBottom: 3, fontWeight: 600 }}>{m.userId === user.uid ? 'Vous' : m.userName}</span>
                <div style={{
                  maxWidth: '85%', padding: '8px 12px', borderRadius: m.userId === user.uid ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: m.userId === user.uid ? C.primaryGradient : C.lightBg,
                  color: m.userId === user.uid ? 'white' : C.textPrimary,
                  fontSize: 13, lineHeight: 1.5,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}>{m.message}</div>
                <span style={{ fontSize: 10, color: C.textTertiary, marginTop: 2 }}>
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
              placeholder={T.chatPlaceholder}
              style={{ ...fieldStyle, flex: 1, fontSize: 13, padding: '10px 14px' }} />
            <button onClick={sendChatMessage} style={{ padding: '10px 14px', background: C.primaryGradient, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              ➤
            </button>
          </div>
        </div>
      )}

      {/* ── POLL PANEL — left side, starts below top bar ── */}
      {showPoll && (
        <LivePoll meetingId={meeting.id} userId={user.uid} userName={user.name} T={T} onClose={() => setShowPoll(false)} />
      )}

      {/* ── HOST CONTROLS PANEL — left side ── */}
      {showHostControls && isHost && (
        <HostControlsPanel meeting={meeting} T={T} onClose={() => setShowHostControls(false)} onEndForAll={handleExit} />
      )}

      {/* ── CONFIRM EXIT ── */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.80)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: C.white, borderRadius: 24, padding: '40px 36px', maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><CruxLogo size={56} /></div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: '0 0 10px' }}>{T.confirmExit}</h3>
            <p style={{ color: C.textSecondary, fontSize: 14, margin: '0 0 28px' }}>{T.confirmExitMsg}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowConfirm(false)} style={{ ...secBtn, flex: 1 }}>{T.cancel}</button>
              <button onClick={handleExit} style={{ ...primBtn, flex: 1, background: C.error, boxShadow: 'none' }}>{T.confirm}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// LIVE POLL
// ============================================================
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
function SettingsPage({ T, prefs, onUpdatePref, onBack, onPrivacy, onTerms }) {
  const langs = [{ code: 'fr', label: '🇫🇷 Français' }, { code: 'en', label: '🇬🇧 English' }, { code: 'es', label: '🇪🇸 Español' }, { code: 'de', label: '🇩🇪 Deutsch' }];
  const qualities = ['low', 'medium', 'high', 'veryHigh'];
  const qualityLabels = { low: 'Faible', medium: 'Moyen', high: 'Élevé', veryHigh: 'Très élevé' };
  const [showLang, setShowLang] = useState(false);
  const [showQuality, setShowQuality] = useState(false);

  const sectionTitle = (label) => (
    <p style={{ color: '#8E44AD', fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', margin: '0 0 4px', paddingLeft: 4 }}>{label}</p>
  );

  const settCard = { background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: 8 };

  const tileRow = (icon, title, right, onClick, showDivider = true) => (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', padding: '14px 16px',
      borderTop: showDivider ? '1px solid #F0F0F0' : 'none',
      cursor: onClick ? 'pointer' : 'default', gap: 14,
      transition: 'background 0.15s',
    }}
      onMouseEnter={e => onClick && (e.currentTarget.style.background = '#F8F3FF')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>{title}</span>
      {right}
    </div>
  );

  return (
    <div className="crux-scroll" style={{ minHeight: '100vh', fontFamily: 'Poppins, sans-serif', background: '#F5F3FF' }}>
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
              <ToggleSwitch on={prefs.defaultCam} onChange={v => onUpdatePref('defaultCam', v)} colorOn="#8E44AD" />,
              null, false)}
            {tileRow('🎤', 'Micro par défaut',
              <ToggleSwitch on={prefs.defaultMic} onChange={v => onUpdatePref('defaultMic', v)} colorOn="#8E44AD" />)}
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
          {sectionTitle('Apparence')}
          <div style={settCard}>
            {tileRow('🌐', 'Langue',
              <button onClick={() => setShowLang(true)} style={{
                background: '#F5F3FF', border: '1px solid #D0B0FF', borderRadius: 8,
                padding: '6px 12px', fontSize: 13, color: '#8E44AD', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
              }}>{langs.find(l => l.code === prefs.language)?.label || '🇫🇷 Français'} ›</button>,
              () => setShowLang(true), false)}
          </div>
        </div>

        {/* NOTIFICATIONS */}
        <div style={{ marginBottom: 20 }}>
          {sectionTitle('Notifications')}
          <div style={settCard}>
            {tileRow('🔔', 'Activer les notifications',
              <ToggleSwitch on={prefs.notifications} onChange={v => onUpdatePref('notifications', v)} colorOn="#8E44AD" />,
              null, false)}
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
            {tileRow('🔐', 'Politique de confidentialité', <span style={{ color: '#8E44AD', fontSize: 16 }}>›</span>, onPrivacy, false)}
            {tileRow('📄', 'Conditions d\'utilisation', <span style={{ color: '#8E44AD', fontSize: 16 }}>›</span>, onTerms)}
          </div>
        </div>

        {/* Action buttons */}
        <button onClick={() => alert('📧 support@crux.app')} style={{
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
        <button onClick={() => navigator.share?.({ title: 'CRUX', text: 'Rejoignez-moi sur CRUX !' }).catch(() => {})} style={{
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowLang(false)}>
          <div style={{ background: 'white', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 340 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', margin: '0 0 16px' }}>Choisir la langue</h3>
            {langs.map(l => (
              <div key={l.code} onClick={() => { onUpdatePref('language', l.code); setShowLang(false); }} style={{
                padding: '14px 16px', borderRadius: 12, cursor: 'pointer', marginBottom: 4,
                background: prefs.language === l.code ? '#F5F3FF' : 'transparent',
                border: prefs.language === l.code ? '1.5px solid #8E44AD' : '1.5px solid transparent',
                fontSize: 14, fontWeight: 500, color: '#1A1A1A',
                display: 'flex', justifyContent: 'space-between',
              }}>
                {l.label}
                {prefs.language === l.code && <span style={{ color: '#8E44AD', fontWeight: 700 }}>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quality dialog */}
      {showQuality && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowQuality(false)}>
          <div style={{ background: 'white', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 340 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', margin: '0 0 16px' }}>Qualité vidéo</h3>
            {qualities.map(q => (
              <div key={q} onClick={() => { onUpdatePref('videoQuality', q); setShowQuality(false); }} style={{
                padding: '14px 16px', borderRadius: 12, cursor: 'pointer', marginBottom: 4,
                background: prefs.videoQuality === q ? '#F5F3FF' : 'transparent',
                border: prefs.videoQuality === q ? '1.5px solid #8E44AD' : '1.5px solid transparent',
                fontSize: 14, fontWeight: 500, color: '#1A1A1A',
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

