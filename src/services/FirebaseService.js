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
    setDoc,
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
            timestamp: new Date(),
        });
    },

    async getChatMessages(meetingId) {
        try {
            const q = query(
                collection(db, 'meetings', meetingId, 'chat'),
                orderBy('timestamp', 'asc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                timestamp: d.data().timestamp?.toDate?.() || new Date(),
            }));
        } catch {
            return [];
        }
    },
};

export default { AuthService, MeetingService };
