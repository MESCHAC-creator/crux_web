import { ZegoExpressEngine } from 'zego-express-engine-webrtc';

const ZEGO_CONFIG = {
    appID: 2042049519,
    serverSecret: '41fb869d2bbcb148571a22b1ad4840ae',
};

export class ZegoCloudService {
    constructor() {
        this.engine = null;
        this.roomID = null;
        this.userID = null;
        this.userName = null;
        this.localStream = null;
        this.remoteStreams = new Map();
        this.isConnected = false;
    }

    // Initialiser ZegoCloud
    async initialize(userID, userName) {
        try {
            if (this.engine) {
                console.log('⚠️ ZegoCloud already initialized');
                return true;
            }

            this.userID = userID;
            this.userName = userName;

            console.log('🔧 Initializing ZegoCloud...');

            // Créer l'instance ZegoCloud
            this.engine = new ZegoExpressEngine(
                ZEGO_CONFIG.appID,
                ZEGO_CONFIG.serverSecret
            );

            if (!this.engine) {
                throw new Error('Failed to create ZegoCloud engine');
            }

            console.log('✅ ZegoCloud engine created');

            // Configurer les listeners
            this.setupListeners();

            console.log('✅ ZegoCloud initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Error initializing ZegoCloud:', error);
            this.engine = null;
            throw error;
        }
    }

    // Rejoindre une room
    async joinRoom(roomID) {
        try {
            if (!this.engine) {
                throw new Error('ZegoCloud not initialized');
            }

            if (this.roomID === roomID) {
                console.log('⚠️ Already in room:', roomID);
                return true;
            }

            this.roomID = roomID;

            console.log('🚪 Joining room:', roomID);

            // Créer un token simple
            const token = `${this.userID}_${roomID}_${Math.floor(Date.now() / 1000)}`;

            // Rejoindre la room
            const result = await this.engine.loginRoom(this.roomID, token, {
                userID: this.userID,
                userName: this.userName,
            });

            this.isConnected = true;
            console.log('✅ Joined room successfully:', roomID);
            return true;
        } catch (error) {
            console.error('❌ Error joining room:', error);
            this.isConnected = false;
            throw error;
        }
    }

    // Quitter la room
    async leaveRoom() {
        try {
            if (this.engine && this.roomID) {
                await this.engine.logoutRoom(this.roomID);
                this.roomID = null;
                this.isConnected = false;
                console.log('✅ Left room');
            }
        } catch (error) {
            console.error('❌ Error leaving room:', error);
        }
    }

    // Démarrer la vidéo locale
    async startLocalVideo(videoElementId) {
        try {
            if (!this.engine) {
                console.warn('⚠️ ZegoCloud not initialized, skipping video');
                return null;
            }

            if (this.localStream) {
                console.log('⚠️ Local stream already started');
                return this.localStream;
            }

            console.log('📹 Starting local video...');

            // Créer le stream local avec timeout
            const createStreamPromise = this.engine.createLocalVideoStream();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Video stream creation timeout')), 10000)
            );

            this.localStream = await Promise.race([createStreamPromise, timeoutPromise]);

            if (!this.localStream) {
                throw new Error('Failed to create local stream');
            }

            console.log('✅ Local stream created');

            // Attacher au DOM
            const videoElement = document.getElementById(videoElementId);
            if (videoElement) {
                try {
                    this.localStream.attach(videoElement);
                    console.log('✅ Video attached to DOM');
                } catch (err) {
                    console.error('❌ Error attaching video:', err);
                }
            } else {
                console.warn('⚠️ Video element not found:', videoElementId);
            }

            // Publier le stream si connecté
            if (this.isConnected && this.roomID) {
                try {
                    await this.engine.startPublishingStream(this.localStream, this.roomID);
                    console.log('✅ Stream published');
                } catch (err) {
                    console.warn('⚠️ Warning publishing stream:', err);
                }
            }

            return this.localStream;
        } catch (error) {
            console.error('❌ Error starting video:', error);
            this.localStream = null;
            throw error;
        }
    }

    // Arrêter la vidéo locale
    async stopLocalVideo() {
        try {
            if (this.engine && this.localStream) {
                try {
                    await this.engine.stopPublishingStream(this.localStream);
                } catch (err) {
                    console.warn('⚠️ Warning stopping publishing:', err);
                }

                try {
                    this.localStream.detach();
                } catch (err) {
                    console.warn('⚠️ Warning detaching stream:', err);
                }

                this.localStream = null;
                console.log('✅ Local video stopped');
            }
        } catch (error) {
            console.error('❌ Error stopping video:', error);
        }
    }

    // Activer/Désactiver le micro
    async toggleMicrophone(enabled) {
        try {
            if (this.engine && this.localStream) {
                this.localStream.setAudioTrackEnabled(enabled);
                console.log(`✅ Microphone ${enabled ? 'ON' : 'OFF'}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Error toggling microphone:', error);
            throw error;
        }
    }

    // Activer/Désactiver la vidéo
    async toggleVideo(enabled) {
        try {
            if (this.engine && this.localStream) {
                this.localStream.setVideoTrackEnabled(enabled);
                console.log(`✅ Video ${enabled ? 'ON' : 'OFF'}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Error toggling video:', error);
            throw error;
        }
    }

    // Obtenir la liste des participants
    getParticipants() {
        try {
            if (!this.engine || !this.roomID) {
                return [];
            }

            const users = this.engine.getUsers(this.roomID) || [];
            return users;
        } catch (error) {
            console.error('❌ Error getting participants:', error);
            return [];
        }
    }

    // Configurer les listeners
    setupListeners() {
        if (!this.engine) return;

        console.log('🎧 Setting up event listeners...');

        this.engine.on('userAdd', (userList) => {
            console.log('👤 Users joined:', userList);
        });

        this.engine.on('userLeave', (userList) => {
            console.log('👤 Users left:', userList);
        });

        this.engine.on('remoteStreamAdd', (streamList) => {
            console.log('📹 Remote streams received:', streamList.length);
            streamList.forEach((stream) => {
                this.remoteStreams.set(stream.streamID, stream);
            });
        });

        this.engine.on('remoteStreamRemove', (streamList) => {
            console.log('📹 Remote streams removed:', streamList.length);
            streamList.forEach((stream) => {
                this.remoteStreams.delete(stream.streamID);
            });
        });

        this.engine.on('error', (error) => {
            console.error('❌ ZegoCloud error event:', error);
        });

        this.engine.on('roomClosed', () => {
            console.log('🚪 Room closed');
            this.isConnected = false;
        });

        this.engine.on('disconnected', () => {
            console.log('📡 Disconnected from ZegoCloud');
            this.isConnected = false;
        });
    }

    // Détruire et nettoyer
    destroy() {
        try {
            if (this.localStream) {
                try {
                    this.localStream.detach();
                } catch (err) {
                    console.warn('⚠️ Warning detaching on destroy:', err);
                }
                this.localStream = null;
            }

            if (this.engine) {
                try {
                    this.engine.destroy();
                } catch (err) {
                    console.warn('⚠️ Warning destroying engine:', err);
                }
                this.engine = null;
            }

            this.isConnected = false;
            console.log('🗑️ ZegoCloud cleaned up');
        } catch (error) {
            console.error('❌ Error in destroy:', error);
        }
    }
}

export default new ZegoCloudService();