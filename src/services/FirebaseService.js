import { initializeApp } from 'firebase/app';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
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
} from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log('✅ Firebase initialized');

// ============================================
// AUTH SERVICE
// ============================================

export const AuthService = {
    // Inscription
    async register(email, password, name) {
        try {
            console.log('📝 Registering user:', email);

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Sauvegarder les infos dans Firestore
            await addDoc(collection(db, 'users'), {
                uid: user.uid,
                email: email,
                name: name,
                createdAt: new Date(),
                profilePhoto: null,
            });

            console.log('✅ User registered:', user.uid);

            return { uid: user.uid, email, name };
        } catch (error) {
            console.error('❌ Error registering:', error);
            throw error;
        }
    },

    // Connexion
    async login(email, password) {
        try {
            console.log('🔐 Logging in:', email);

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Récupérer les infos depuis Firestore
            const q = query(collection(db, 'users'), where('uid', '==', user.uid));
            const querySnapshot = await getDocs(q);
            let userData = { uid: user.uid, email };

            querySnapshot.forEach((doc) => {
                userData = { ...userData, ...doc.data() };
            });

            console.log('✅ User logged in:', user.uid);

            return userData;
        } catch (error) {
            console.error('❌ Error logging in:', error);
            throw error;
        }
    },

    // Déconnexion
    async logout() {
        try {
            console.log('👋 Logging out');
            await signOut(auth);
            console.log('✅ User logged out');
        } catch (error) {
            console.error('❌ Error logging out:', error);
            throw error;
        }
    },

    // Obtenir l'utilisateur courant
    getCurrentUser() {
        return auth.currentUser;
    },

    // Observer l'état d'authentification
    onAuthStateChanged(callback) {
        return onAuthStateChanged(auth, callback);
    },
};

// ============================================
// MEETING SERVICE
// ============================================

export const MeetingService = {
    // Créer une réunion
    async createMeeting(title, userId, userName, type = 'temporary') {
        try {
            console.log('📅 Creating meeting:', title);

            const roomId = 'room_' + Math.random().toString(36).substr(2, 9);

            const meeting = {
                title,
                roomId,
                type,
                creatorId: userId,
                creatorName: userName,
                createdAt: new Date(),
                participants: [userId],
                participantCount: 1,
                isActive: true,
                description: '',
            };

            const docRef = await addDoc(collection(db, 'meetings'), meeting);

            console.log('✅ Meeting created:', docRef.id);

            return {
                id: docRef.id,
                ...meeting,
            };
        } catch (error) {
            console.error('❌ Error creating meeting:', error);
            throw error;
        }
    },

    // Récupérer les réunions de l'utilisateur
    async getUserMeetings(userId) {
        try {
            console.log('📋 Fetching user meetings:', userId);

            const q = query(
                collection(db, 'meetings'),
                where('creatorId', '==', userId),
                orderBy('createdAt', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const meetings = [];

            querySnapshot.forEach((doc) => {
                meetings.push({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate?.() || new Date(),
                });
            });

            console.log('✅ Meetings fetched:', meetings.length);

            return meetings;
        } catch (error) {
            console.error('❌ Error fetching meetings:', error);
            return [];
        }
    },

    // Récupérer une réunion spécifique
    async getMeeting(meetingId) {
        try {
            console.log('🔍 Fetching meeting:', meetingId);

            const docRef = doc(db, 'meetings', meetingId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                console.log('✅ Meeting found');
                return {
                    id: docSnap.id,
                    ...docSnap.data(),
                    createdAt: docSnap.data().createdAt?.toDate?.() || new Date(),
                };
            } else {
                throw new Error('Meeting not found');
            }
        } catch (error) {
            console.error('❌ Error fetching meeting:', error);
            throw error;
        }
    },

    // Rejoindre une réunion
    async joinMeeting(meetingId, userId) {
        try {
            console.log('👤 Joining meeting:', meetingId);

            const docRef = doc(db, 'meetings', meetingId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                throw new Error('Meeting not found');
            }

            const meeting = docSnap.data();

            // Ajouter l'utilisateur aux participants
            if (!meeting.participants.includes(userId)) {
                const newParticipants = [...meeting.participants, userId];

                await updateDoc(docRef, {
                    participants: newParticipants,
                    participantCount: newParticipants.length,
                });

                console.log('✅ Joined meeting');
            }

            return true;
        } catch (error) {
            console.error('❌ Error joining meeting:', error);
            throw error;
        }
    },

    // Terminer une réunion
    async endMeeting(meetingId, type = 'temporary') {
        try {
            console.log('🏁 Ending meeting:', meetingId);

            const docRef = doc(db, 'meetings', meetingId);

            if (type === 'temporary') {
                // Supprimer la réunion temporaire
                await deleteDoc(docRef);
                console.log('✅ Temporary meeting deleted');
            } else {
                // Désactiver la réunion persistante
                await updateDoc(docRef, {
                    isActive: false,
                    endedAt: new Date(),
                });
                console.log('✅ Persistent meeting deactivated');
            }

            return true;
        } catch (error) {
            console.error('❌ Error ending meeting:', error);
            throw error;
        }
    },

    // Sauvegarder un message de chat
    async saveChatMessage(meetingId, userId, userName, message) {
        try {
            console.log('💬 Saving chat message');

            await addDoc(collection(db, 'meetings', meetingId, 'chat'), {
                userId,
                userName,
                message,
                timestamp: new Date(),
            });

            console.log('✅ Message saved');
        } catch (error) {
            console.error('❌ Error saving message:', error);
            throw error;
        }
    },

    // Récupérer les messages d'une réunion
    async getChatMessages(meetingId) {
        try {
            console.log('📨 Fetching chat messages');

            const q = query(
                collection(db, 'meetings', meetingId, 'chat'),
                orderBy('timestamp', 'asc')
            );

            const querySnapshot = await getDocs(q);
            const messages = [];

            querySnapshot.forEach((doc) => {
                messages.push({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate?.() || new Date(),
                });
            });

            console.log('✅ Messages fetched:', messages.length);

            return messages;
        } catch (error) {
            console.error('❌ Error fetching messages:', error);
            return [];
        }
    },
};

export default { AuthService, MeetingService };