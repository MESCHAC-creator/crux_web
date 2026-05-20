import { ZegoExpressEngine } from 'zego-express-engine-webrtc';

const ZEGO_CONFIG = {
    appID: 2042049519,
    serverSecret: '41fb869d2bbcb148571a22b1ad4840ae',
    serverUrl: 'wss://webliveroom2042049519-api.coolzcloud.com/ws',
};

export class ZegoCloudService {
    constructor() {
        this.engine = null;
        this.roomID = null;
        this.userID = null;
        this.userName = null;
        this.localStream = null;
        this.remoteStreams = new Map();
    }

    // Initialiser ZegoCloud
    async initialize(userID, userName) {
        try {
            this.userID = userID;
            this.userName = userName;

            // Créer l'instance ZegoCloud
            this.engine = new ZegoExpressEngine(
                ZEGO_CONFIG.appID,
                ZEGO_CONFIG.serverSecret
            );

            // Configurer les listeners
            this.setupListeners();

            console.log('✅ ZegoCloud initialized');
            return true;
        } catch (error) {
            console.error('❌ Erreur initialisation ZegoCloud:', error);
            throw error;
        }
    }

    // Rejoindre une room
    async joinRoom(roomID) {
        try {
            this.roomID = roomID;

            // Créer un token simple (pour dev, sinon générer via backend)
            const token = await this.generateToken(roomID);

            // Rejoindre la room
            await this.engine.loginRoom(this.roomID, token, {
                userID: this.userID,
                userName: this.userName,
            });

            console.log('✅ Joined room:', roomID);
            return true;
        } catch (error) {
            console.error('❌ Erreur rejoindre room:', error);
            throw error;
        }
    }

    // Quitter la room
    async leaveRoom() {
        try {
            if (this.engine && this.roomID) {
                await this.engine.logoutRoom(this.roomID);
                this.roomID = null;
                console.log('✅ Left room');
            }
        } catch (error) {
            console.error('❌ Erreur quitter room:', error);
            throw error;
        }
    }

    // Démarrer la vidéo locale
    async startLocalVideo(videoElementId) {
        try {
            if (!this.engine) {
                throw new Error('ZegoCloud not initialized');
            }

            // Créer le stream local
            this.localStream = await this.engine.createLocalVideoStream();

            // Attacher au DOM
            const videoElement = document.getElementById(videoElementId);
            if (videoElement) {
                this.localStream.attach(videoElement);
                console.log('✅ Local video started');
            }

            // Publier le stream
            await this.engine.startPublishingStream(this.localStream, this.roomID);

            return this.localStream;
        } catch (error) {
            console.error('❌ Erreur démarrage vidéo:', error);
            throw error;
        }
    }

    // Arrêter la vidéo locale
    async stopLocalVideo() {
        try {
            if (this.engine && this.localStream) {
                await this.engine.stopPublishingStream(this.localStream);
                this.localStream.detach();
                this.localStream = null;
                console.log('✅ Local video stopped');
            }
        } catch (error) {
            console.error('❌ Erreur arrêt vidéo:', error);
            throw error;
        }
    }

    // Activer/Désactiver le micro
    async toggleMicrophone(enabled) {
        try {
            if (this.engine && this.localStream) {
                this.localStream.setAudioTrackEnabled(enabled);
                console.log(`✅ Micro ${enabled ? 'ON' : 'OFF'}`);
            }
        } catch (error) {
            console.error('❌ Erreur toggler micro:', error);
            throw error;
        }
    }

    // Activer/Désactiver la vidéo
    async toggleVideo(enabled) {
        try {
            if (this.engine && this.localStream) {
                this.localStream.setVideoTrackEnabled(enabled);
                console.log(`✅ Vidéo ${enabled ? 'ON' : 'OFF'}`);
            }
        } catch (error) {
            console.error('❌ Erreur toggler vidéo:', error);
            throw error;
        }
    }

    // Obtenir la liste des participants
    getParticipants() {
        try {
            if (!this.engine || !this.roomID) {
                return [];
            }

            return this.engine.getUsers(this.roomID) || [];
        } catch (error) {
            console.error('❌ Erreur obtenir participants:', error);
            return [];
        }
    }

    // Configurer les listeners
    setupListeners() {
        if (!this.engine) return;

        // Utilisateur ajouté
        this.engine.on('userAdd', (userList) => {
            console.log('👤 Users added:', userList);
        });

        // Utilisateur supprimé
        this.engine.on('userLeave', (userList) => {
            console.log('👤 Users left:', userList);
        });

        // Stream reçu
        this.engine.on('remoteStreamAdd', (streamList) => {
            console.log('📹 Remote streams added:', streamList);
            streamList.forEach((stream) => {
                this.remoteStreams.set(stream.streamID, stream);
            });
        });

        // Stream supprimé
        this.engine.on('remoteStreamRemove', (streamList) => {
            console.log('📹 Remote streams removed:', streamList);
            streamList.forEach((stream) => {
                this.remoteStreams.delete(stream.streamID);
            });
        });

        // Erreur
        this.engine.on('error', (error) => {
            console.error('❌ ZegoCloud error:', error);
        });
    }

    // Générer un token (simplifié pour dev)
    async generateToken(roomID) {
        try {
            // En production, appeler votre backend:
            // const response = await fetch('/api/zego/generate-token', {...})
            // return response.json().token

            // Pour dev, créer un token basique
            const timestamp = Math.floor(Date.now() / 1000);
            return `${this.userID}_${roomID}_${timestamp}`;
        } catch (error) {
            console.error('❌ Erreur génération token:', error);
            throw error;
        }
    }

    // Détruire et nettoyer
    destroy() {
        try {
            if (this.engine) {
                this.engine.destroy();
                this.engine = null;
            }
        } catch (error) {
            console.error('❌ Erreur destruction ZegoCloud:', error);
        }
    }
}

export default new ZegoCloudService();