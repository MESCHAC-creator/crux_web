const generateId = () => Math.random().toString(36).substr(2, 9);

let authStateListeners = [];
let currentUser = null;

// Restore session from localStorage
try {
    const stored = localStorage.getItem('crux_current_user');
    if (stored) currentUser = JSON.parse(stored);
} catch (_) {}

function notifyListeners(user) {
    authStateListeners.forEach(cb => {
        try { cb(user); } catch (_) {}
    });
}

export const AuthService = {
    async register(email, password, name) {
        const users = JSON.parse(localStorage.getItem('crux_users') || '[]');

        if (users.find(u => u.email === email)) {
            throw new Error('Cet email est déjà utilisé');
        }

        const user = {
            uid: generateId(),
            email,
            password: btoa(unescape(encodeURIComponent(password))),
            name,
            createdAt: new Date().toISOString(),
        };

        users.push(user);
        localStorage.setItem('crux_users', JSON.stringify(users));

        const userData = { uid: user.uid, email, name };
        currentUser = userData;
        localStorage.setItem('crux_current_user', JSON.stringify(userData));

        notifyListeners(userData);
        return userData;
    },

    async login(email, password) {
        const users = JSON.parse(localStorage.getItem('crux_users') || '[]');
        const encoded = btoa(unescape(encodeURIComponent(password)));
        const user = users.find(u => u.email === email && u.password === encoded);

        if (!user) {
            throw new Error('Email ou mot de passe incorrect');
        }

        const userData = { uid: user.uid, email: user.email, name: user.name };
        currentUser = userData;
        localStorage.setItem('crux_current_user', JSON.stringify(userData));

        notifyListeners(userData);
        return userData;
    },

    async logout() {
        currentUser = null;
        localStorage.removeItem('crux_current_user');
        notifyListeners(null);
    },

    getCurrentUser() {
        return currentUser;
    },

    onAuthStateChanged(callback) {
        authStateListeners.push(callback);
        // Fire immediately with current state
        setTimeout(() => {
            try { callback(currentUser); } catch (_) {}
        }, 0);

        return () => {
            authStateListeners = authStateListeners.filter(cb => cb !== callback);
        };
    },
};

export const MeetingService = {
    async createMeeting(title, userId, userName, type = 'temporary') {
        const meetings = JSON.parse(localStorage.getItem('crux_meetings') || '[]');

        const meeting = {
            id: generateId(),
            title,
            roomId: 'room_' + generateId(),
            type,
            creatorId: userId,
            creatorName: userName,
            createdAt: new Date().toISOString(),
            participants: [userId],
            participantCount: 1,
            isActive: true,
        };

        meetings.push(meeting);
        localStorage.setItem('crux_meetings', JSON.stringify(meetings));

        return { ...meeting, createdAt: new Date() };
    },

    async getUserMeetings(userId) {
        const meetings = JSON.parse(localStorage.getItem('crux_meetings') || '[]');
        return meetings
            .filter(m => m.creatorId === userId)
            .map(m => ({ ...m, createdAt: new Date(m.createdAt) }))
            .sort((a, b) => b.createdAt - a.createdAt);
    },

    async joinMeeting(meetingId, userId) {
        const meetings = JSON.parse(localStorage.getItem('crux_meetings') || '[]');
        const idx = meetings.findIndex(m => m.id === meetingId);

        if (idx === -1) throw new Error('Réunion introuvable');

        if (!meetings[idx].participants.includes(userId)) {
            meetings[idx].participants.push(userId);
            meetings[idx].participantCount = meetings[idx].participants.length;
            localStorage.setItem('crux_meetings', JSON.stringify(meetings));
        }

        return true;
    },

    async endMeeting(meetingId, type = 'temporary') {
        const meetings = JSON.parse(localStorage.getItem('crux_meetings') || '[]');

        if (type === 'temporary') {
            localStorage.setItem('crux_meetings', JSON.stringify(meetings.filter(m => m.id !== meetingId)));
        } else {
            const idx = meetings.findIndex(m => m.id === meetingId);
            if (idx !== -1) {
                meetings[idx].isActive = false;
                localStorage.setItem('crux_meetings', JSON.stringify(meetings));
            }
        }

        return true;
    },

    async saveChatMessage(meetingId, userId, userName, message) {
        const key = `crux_chat_${meetingId}`;
        const messages = JSON.parse(localStorage.getItem(key) || '[]');
        messages.push({ id: generateId(), userId, userName, message, timestamp: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(messages));
    },

    async getChatMessages(meetingId) {
        const key = `crux_chat_${meetingId}`;
        const messages = JSON.parse(localStorage.getItem(key) || '[]');
        return messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
    },
};

export const db = null;
export default { AuthService, MeetingService };
