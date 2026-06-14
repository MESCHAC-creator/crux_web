import { initializeApp } from 'firebase/app';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
} from 'firebase/auth';
import {
    getFirestore,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    orderBy,
    limit,
    setDoc,
    onSnapshot,
    serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ============================================
// AUTH SERVICE
// ============================================

export const AuthService = {
    async register(email, password, name) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email,
            name,
            createdAt: new Date(),
            profilePhoto: null,
            isOnline: true,
        });

        return { uid: user.uid, email, name };
    },

    async login(email, password, rememberMe = false) {
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists()
            ? { uid: user.uid, ...userDoc.data() }
            : { uid: user.uid, email };

        return userData;
    },

    async logout() {
        await signOut(auth);
    },

    async resetPassword(email) {
        await sendPasswordResetEmail(auth, email);
        return true;
    },

    getCurrentUser() {
        return auth.currentUser;
    },

    onAuthStateChanged(callback) {
        return onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                callback(null);
                return;
            }
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            const userData = userDoc.exists()
                ? { uid: firebaseUser.uid, ...userDoc.data() }
                : { uid: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName || firebaseUser.email };
            callback(userData);
        });
    },
};

// ============================================
// MEETING SERVICE
// ============================================

export const MeetingService = {
    async createMeeting(title, userId, userName, type = 'temporary', description = '') {
        const roomId = 'room_' + Math.random().toString(36).substr(2, 9);

        const meeting = {
            title,
            description,
            // Champs compatibles Flutter (crux_new_final)
            channelName: roomId,
            organizerId: userId,
            organizer: userName,
            // Champs natifs web
            roomId,
            creatorId: userId,
            creatorName: userName,
            type,
            status: 'scheduled',
            isLocked: false,
            isRecording: false,
            createdAt: new Date(),
            participants: [userId],
            participantCount: 1,
            isActive: true,
        };

        const docRef = await addDoc(collection(db, 'meetings'), meeting);

        return { id: docRef.id, ...meeting };
    },

    async getUserMeetings(userId) {
        const toMeeting = d => ({
            id: d.id,
            ...d.data(),
            // Normaliser les champs Flutter → web
            creatorId: d.data().creatorId || d.data().organizerId,
            creatorName: d.data().creatorName || d.data().organizer,
            roomId: d.data().roomId || d.data().channelName,
            createdAt: d.data().createdAt?.toDate?.() || new Date(),
        });

        try {
            // Réunions web (creatorId) + réunions Flutter (organizerId) fusionnées
            const [snapWeb, snapFlutter] = await Promise.all([
                getDocs(query(collection(db, 'meetings'), where('creatorId', '==', userId), orderBy('createdAt', 'desc'))),
                getDocs(query(collection(db, 'meetings'), where('organizerId', '==', userId), orderBy('createdAt', 'desc'))),
            ]);

            const seen = new Set();
            const meetings = [];
            [...snapWeb.docs, ...snapFlutter.docs].forEach(d => {
                if (!seen.has(d.id)) {
                    seen.add(d.id);
                    meetings.push(toMeeting(d));
                }
            });

            return meetings.sort((a, b) => b.createdAt - a.createdAt);
        } catch {
            // Fallback sans orderBy si l'index Firestore n'est pas encore créé
            const [snapWeb, snapFlutter] = await Promise.all([
                getDocs(query(collection(db, 'meetings'), where('creatorId', '==', userId))),
                getDocs(query(collection(db, 'meetings'), where('organizerId', '==', userId))),
            ]);
            const seen = new Set();
            const meetings = [];
            [...snapWeb.docs, ...snapFlutter.docs].forEach(d => {
                if (!seen.has(d.id)) { seen.add(d.id); meetings.push(toMeeting(d)); }
            });
            return meetings.sort((a, b) => b.createdAt - a.createdAt);
        }
    },

    async getMeeting(meetingId) {
        const docRef = doc(db, 'meetings', meetingId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) throw new Error('Réunion introuvable');
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            // Normaliser les champs Flutter → web
            creatorId: data.creatorId || data.organizerId,
            creatorName: data.creatorName || data.organizer,
            roomId: data.roomId || data.channelName || docSnap.id,
            createdAt: data.createdAt?.toDate?.() || new Date(),
        };
    },

    async joinMeeting(meetingId, userId) {
        const docRef = doc(db, 'meetings', meetingId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) throw new Error('Réunion introuvable');

        const meeting = docSnap.data();
        if (!meeting.participants.includes(userId)) {
            const newParticipants = [...meeting.participants, userId];
            await updateDoc(docRef, {
                participants: newParticipants,
                participantCount: newParticipants.length,
            });
        }
        return true;
    },

    async toggleLock(meetingId) {
        const docRef = doc(db, 'meetings', meetingId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return false;
        const newVal = !docSnap.data().isLocked;
        await updateDoc(docRef, { isLocked: newVal });
        return newVal;
    },

    async toggleRecording(meetingId) {
        const docRef = doc(db, 'meetings', meetingId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return false;
        const newVal = !docSnap.data().isRecording;
        await updateDoc(docRef, { isRecording: newVal });
        return newVal;
    },

    async endMeeting(meetingId, type = 'temporary') {
        const docRef = doc(db, 'meetings', meetingId);
        if (type === 'temporary') {
            await deleteDoc(docRef);
        } else {
            await updateDoc(docRef, { isActive: false, status: 'ended', endedAt: new Date() });
        }
        return true;
    },

    async saveChatMessage(meetingId, userId, userName, message) {
        await addDoc(collection(db, 'meetings', meetingId, 'chat'), {
            userId,
            userName,
            message,
            timestamp: serverTimestamp(),
        });
    },

    listenChatMessages(meetingId, callback) {
        const q = query(
            collection(db, 'meetings', meetingId, 'chat'),
            orderBy('timestamp', 'asc')
        );
        return onSnapshot(q, snap => {
            const msgs = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                timestamp: d.data().timestamp?.toDate?.() || new Date(),
            }));
            callback(msgs);
        }, () => {
            // Fallback without orderBy if index missing
            return onSnapshot(collection(db, 'meetings', meetingId, 'chat'), snap2 => {
                const msgs = snap2.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                    timestamp: d.data().timestamp?.toDate?.() || new Date(),
                })).sort((a, b) => a.timestamp - b.timestamp);
                callback(msgs);
            });
        });
    },

    // ── RAISE HAND ─────────────────────────────────────────
    async setHandRaised(meetingId, userId, userName, raised) {
        await setDoc(doc(db, 'meetings', meetingId, 'hands', userId), {
            userName,
            raised,
            raisedAt: raised ? serverTimestamp() : null,
            updatedAt: serverTimestamp(),
        });
    },

    async lowerHand(meetingId, userId) {
        await updateDoc(doc(db, 'meetings', meetingId, 'hands', userId), {
            raised: false, updatedAt: serverTimestamp(),
        });
    },

    async lowerAllHands(meetingId) {
        const snap = await getDocs(collection(db, 'meetings', meetingId, 'hands'));
        await Promise.all(snap.docs.map(d => updateDoc(d.ref, { raised: false })));
    },

    listenHands(meetingId, callback) {
        return onSnapshot(collection(db, 'meetings', meetingId, 'hands'), snap => {
            const hands = snap.docs
                .filter(d => d.data().raised)
                .map(d => ({ uid: d.id, userName: d.data().userName, raisedAt: d.data().raisedAt?.toDate?.() || new Date() }))
                .sort((a, b) => a.raisedAt - b.raisedAt);
            callback(hands); // ordered array [{ uid, userName, raisedAt }]
        });
    },

    // ── PRESENCE (who is in the meeting) ──────────────────
    async joinPresence(meetingId, userId, userName) {
        await setDoc(doc(db, 'meetings', meetingId, 'presence', userId), {
            userName, joinedAt: serverTimestamp(), online: true,
        });
    },

    async leavePresence(meetingId, userId) {
        try {
            await updateDoc(doc(db, 'meetings', meetingId, 'presence', userId), {
                online: false, leftAt: serverTimestamp(),
            });
        } catch { }
    },

    listenPresence(meetingId, callback) {
        return onSnapshot(collection(db, 'meetings', meetingId, 'presence'), snap => {
            const p = snap.docs.filter(d => d.data().online).map(d => ({ uid: d.id, ...d.data() }));
            callback(p);
        });
    },

    // ── HOST COMMANDS ─────────────────────────────────────────
    async sendHostCommand(meetingId, fromId, targetId, type) {
        // type: 'mute' | 'kick' | 'muteAll' | 'makeCoHost'
        await setDoc(doc(db, 'meetings', meetingId, 'hostCommands', targetId === 'all' ? `muteAll_${Date.now()}` : targetId), {
            type, fromId, targetId, timestamp: serverTimestamp(),
        });
    },

    listenHostCommands(meetingId, userId, callback) {
        return onSnapshot(doc(db, 'meetings', meetingId, 'hostCommands', userId), snap => {
            if (snap.exists()) callback(snap.data());
        });
    },

    async sendMuteAll(meetingId, fromId) {
        await setDoc(doc(db, 'meetings', meetingId, 'hostCommands', '__muteAll__'), {
            type: 'muteAll', fromId, timestamp: serverTimestamp(),
        });
    },

    listenMuteAll(meetingId, callback) {
        return onSnapshot(doc(db, 'meetings', meetingId, 'hostCommands', '__muteAll__'), snap => {
            if (snap.exists()) callback(snap.data());
        });
    },

    async setCoHosts(meetingId, coHostIds) {
        await updateDoc(doc(db, 'meetings', meetingId), { coHosts: coHostIds });
    },

    async saveProfilePhoto(userId, photoDataUrl) {
        // Store only a short identifier; full base64 is too large for Firestore
        await updateDoc(doc(db, 'users', userId), { hasAvatar: true }).catch(() => {});
    },

    async getUserProfile(userId) {
        const snap = await getDoc(doc(db, 'users', userId));
        return snap.exists() ? snap.data() : null;
    },

    // ── Q&A ───────────────────────────────────────────────
    async submitQuestion(meetingId, userId, userName, question) {
        return addDoc(collection(db, 'meetings', meetingId, 'qa'), {
            userId, userName, question, upvotes: [], answered: false, createdAt: serverTimestamp(),
        });
    },

    async toggleUpvote(meetingId, questionId, userId) {
        const ref = doc(db, 'meetings', meetingId, 'qa', questionId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        const upvotes = snap.data().upvotes || [];
        await updateDoc(ref, {
            upvotes: upvotes.includes(userId) ? upvotes.filter(u => u !== userId) : [...upvotes, userId],
        });
    },

    async markAnswered(meetingId, questionId) {
        await updateDoc(doc(db, 'meetings', meetingId, 'qa', questionId), { answered: true });
    },

    listenQA(meetingId, callback) {
        return onSnapshot(collection(db, 'meetings', meetingId, 'qa'), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.upvotes?.length || 0) - (a.upvotes?.length || 0)));
        });
    },

    // ── POLLS (Firestore real-time) ───────────────────────
    async createPoll(meetingId, userId, userName, question, options) {
        return addDoc(collection(db, 'meetings', meetingId, 'polls'), {
            userId, userName, question,
            options: options.map(o => ({ text: o, votes: [] })),
            active: true, createdAt: serverTimestamp(),
        });
    },

    async votePoll(meetingId, pollId, optionIdx, userId) {
        const ref = doc(db, 'meetings', meetingId, 'polls', pollId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        const options = snap.data().options.map((o, i) => ({
            ...o,
            votes: i === optionIdx
                ? [...new Set([...o.votes, userId])]
                : o.votes.filter(v => v !== userId),
        }));
        await updateDoc(ref, { options });
    },

    async closePoll(meetingId, pollId) {
        await updateDoc(doc(db, 'meetings', meetingId, 'polls', pollId), { active: false });
    },

    listenPolls(meetingId, callback) {
        return onSnapshot(collection(db, 'meetings', meetingId, 'polls'), snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    },

    // ── REACTIONS (Firestore real-time) ───────────────────────
    async sendReaction(meetingId, userId, userName, emoji) {
        return addDoc(collection(db, 'meetings', meetingId, 'reactions'), {
            userId, userName, emoji, createdAt: serverTimestamp(),
        });
    },

    listenReactions(meetingId, callback) {
        return onSnapshot(
            query(collection(db, 'meetings', meetingId, 'reactions'), orderBy('createdAt', 'desc'), limit(50)),
            snap => { callback(snap.docChanges().filter(c => c.type === 'added').map(c => ({ id: c.doc.id, ...c.doc.data() }))); }
        );
    },

    // ── HOST CONTROLS ─────────────────────────────────────────
    async muteAllParticipants(meetingId) {
        await updateDoc(doc(db, 'meetings', meetingId), { muteAll: true, muteAllAt: serverTimestamp() });
    },

    // ── NOTES ─────────────────────────────────────────────────
    async saveNote(meetingId, userId, content) {
        await setDoc(doc(db, 'meetings', meetingId, 'notes', userId), {
            content, updatedAt: serverTimestamp(), userId,
        });
    },

    async getNote(meetingId, userId) {
        const snap = await getDoc(doc(db, 'meetings', meetingId, 'notes', userId));
        return snap.exists() ? snap.data().content : '';
    },

    listenNote(meetingId, userId, callback) {
        return onSnapshot(doc(db, 'meetings', meetingId, 'notes', userId), snap => {
            callback(snap.exists() ? snap.data().content : '');
        });
    },

    async getUserNotes(userId) {
        // returns array of {meetingId, content, updatedAt}
        // NOTE: Firestore collectionGroup queries require index; use localStorage fallback
        return [];
    },

    // ── ANONYMOUS CHAT ────────────────────────────────────────
    async sendChatMessage(meetingId, userId, userName, message, anonymous = false) {
        return addDoc(collection(db, 'meetings', meetingId, 'chat'), {
            userId,
            userName: anonymous ? 'Anonyme' : userName,
            isAnonymous: anonymous,
            message,
            timestamp: serverTimestamp(),
        });
    },

    // ── WebRTC SIGNALING (offer/answer) ───────────────────────
    async sendRtcSignal(meetingId, from, to, type, sdp) {
        await setDoc(doc(db, 'meetings', meetingId, 'rtc', `${from}_${to}`), {
            type, sdp, from, to, updatedAt: serverTimestamp(),
        });
    },

    listenRtcSignals(meetingId, toUid, callback) {
        const q = query(collection(db, 'meetings', meetingId, 'rtc'), where('to', '==', toUid));
        return onSnapshot(q, snap => {
            snap.docChanges().forEach(change => {
                if (change.type === 'added' || change.type === 'modified') callback(change.doc.data());
            });
        });
    },

    async addRtcCandidate(meetingId, from, to, candidate) {
        await addDoc(collection(db, 'meetings', meetingId, 'rtc_ice'), {
            from, to, candidate, createdAt: serverTimestamp(),
        });
    },

    listenRtcCandidates(meetingId, toUid, callback) {
        const q = query(collection(db, 'meetings', meetingId, 'rtc_ice'), where('to', '==', toUid));
        return onSnapshot(q, snap => {
            snap.docChanges().forEach(change => {
                if (change.type === 'added') callback(change.doc.data());
            });
        });
    },

    async clearRtcSignals(meetingId, userId) {
        const [sigSnap, iceSnap] = await Promise.all([
            getDocs(query(collection(db, 'meetings', meetingId, 'rtc'), where('from', '==', userId))),
            getDocs(query(collection(db, 'meetings', meetingId, 'rtc_ice'), where('from', '==', userId))),
        ]);
        await Promise.all([
            ...sigSnap.docs.map(d => deleteDoc(d.ref)),
            ...iceSnap.docs.map(d => deleteDoc(d.ref)),
        ]);
    },
};

// ============================================================
// PAYMENT SERVICE — Firestore-based payment requests
// ============================================================
const genCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const rand = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `CRUX-${rand}`;
};

export const PaymentService = {
    // Utilisateur soumet une demande de paiement
    async submitRequest({ userId, userName, userEmail, txRef, plan, meetingId }) {
        const ref = await addDoc(collection(db, 'payment_requests'), {
            userId,
            userName: userName || 'Utilisateur',
            userEmail: userEmail || '',
            txRef,
            plan,
            meetingId,
            status: 'pending',
            code: null,
            createdAt: serverTimestamp(),
        });
        return ref.id;
    },

    // Admin : approuver une demande → génère et sauvegarde le code
    async approveRequest(requestId) {
        const code = genCode();
        await updateDoc(doc(db, 'payment_requests', requestId), {
            status: 'approved',
            code,
            approvedAt: serverTimestamp(),
        });
        return code;
    },

    // Admin : rejeter une demande
    async rejectRequest(requestId) {
        await updateDoc(doc(db, 'payment_requests', requestId), {
            status: 'rejected',
            rejectedAt: serverTimestamp(),
        });
    },

    // Écoute en temps réel toutes les demandes (admin)
    listenAllRequests(callback) {
        const q = query(collection(db, 'payment_requests'), orderBy('createdAt', 'desc'));
        return onSnapshot(q, snap => {
            const requests = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() || new Date() }));
            callback(requests);
        });
    },

    // Écoute en temps réel les demandes d'un utilisateur (inbox)
    listenUserRequests(userId, callback) {
        const q = query(collection(db, 'payment_requests'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
        return onSnapshot(q, snap => {
            const requests = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() || new Date() }));
            callback(requests);
        }, () => {
            // Fallback sans orderBy si index manquant
            const q2 = query(collection(db, 'payment_requests'), where('userId', '==', userId));
            return onSnapshot(q2, snap2 => {
                const requests = snap2.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() || new Date() }));
                callback(requests.sort((a, b) => b.createdAt - a.createdAt));
            });
        });
    },
};

export default { AuthService, MeetingService, PaymentService };
