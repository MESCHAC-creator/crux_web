import { ZegoExpressEngine } from 'zego-express-engine-webrtc';

const ZEGO_CONFIG = {
    appID: parseInt(process.env.REACT_APP_ZEGO_APP_ID || '0'),
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
        this.listeners = {};
    }

    async initialize(userID, userName) {
        try {
            if (this.engine) {
                console.log('⚠️ ZegoCloud already initialized');
                return true;
            }

            this.userID = userID;
            this.userName = userName;

            console.log('🔧 Initializing ZegoCloud...');
            console.log('   - AppID:', ZEGO_CONFIG.appID);
            console.log('   - UserID:', userID);
            console.log('   - UserName:', userName);

            // ✅ NOUVEAU: Créer l'engine SANS serverSecret
            this.engine = new ZegoExpressEngine(ZEGO_CONFIG.appID);

            if (!this.engine) {
                throw new Error('Failed to create ZegoCloud engine');
            }

            console.log('✅ ZegoCloud initialized successfully');
            this.setupEventListeners();
            return true;
        } catch (error) {
            console.error('❌ Error initializing ZegoCloud:', error.message);
            this.engine = null;
            throw new Error(`ZegoCloud init failed: ${error.message}`);
        }
    }

    async getAccessToken(roomID) {
        try {
            console.log('📡 Requesting access token from Railway API...');

            const response = await fetch('/api/generate-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userID: this.userID,
                    userName: this.userName,
                    roomID: roomID
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Access token received');
            return data.token;
        } catch (error) {
            console.error('❌ Error getting access token:', error.message);
            throw error;
        }
    }

    async joinRoom(roomID) {
        try {
            if (!this.engine) {
                throw new Error('ZegoCloud not initialized');
            }

            if (this.isConnected && this.roomID === roomID) {
                console.log('⚠️ Already connected to room:', roomID);
                return true;
            }

            this.roomID = roomID;
            console.log('🚪 Joining room:', roomID);

            // Obtenir le token du backend Vercel
            const token = await this.getAccessToken(roomID);

            // ✅ Login avec token
            console.log('🔑 Logging in with token...');

            await Promise.race([
                this.engine.loginRoom(roomID, token, {
                    userID: this.userID,
                    userName: this.userName,
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Login timeout')), 15000)
                ),
            ]);

            this.isConnected = true;
            console.log('✅ Successfully joined room:', roomID);
            return true;
        } catch (error) {
            console.error('❌ Error joining room:', error.message);
            this.isConnected = false;
            throw error;
        }
    }

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

    async startLocalVideo(videoElementId) {
        try {
            if (!this.engine) {
                console.warn('⚠️ ZegoCloud not initialized');
                return null;
            }

            if (this.localStream) {
                console.log('⚠️ Local stream already running');
                return this.localStream;
            }

            console.log('📹 Starting local video...');

            const streamPromise = this.engine.createLocalVideoStream();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Stream creation timeout')), 15000)
            );

            this.localStream = await Promise.race([streamPromise, timeoutPromise]);

            if (!this.localStream) {
                throw new Error('Failed to create local stream');
            }

            console.log('✅ Local stream created');

            const videoElement = document.getElementById(videoElementId);
            if (videoElement) {
                this.localStream.attach(videoElement);
                console.log('✅ Video attached to DOM');
            }

            if (this.isConnected && this.roomID) {
                try {
                    await this.engine.startPublishingStream(this.localStream, this.roomID);
                    console.log('✅ Publishing stream');
                } catch (err) {
                    console.warn('⚠️ Warning publishing:', err.message);
                }
            }

            return this.localStream;
        } catch (error) {
            console.error('❌ Error starting video:', error.message);
            this.localStream = null;
            throw error;
        }
    }

    async stopLocalVideo() {
        try {
            if (this.localStream) {
                if (this.engine && this.isConnected) {
                    await this.engine.stopPublishingStream(this.localStream);
                }
                this.localStream.detach();
                this.localStream = null;
                console.log('✅ Local video stopped');
            }
        } catch (error) {
            console.error('❌ Error stopping video:', error);
        }
    }

    async toggleMicrophone(enabled) {
        try {
            if (this.localStream) {
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

    async toggleVideo(enabled) {
        try {
            if (this.localStream) {
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

    setupEventListeners() {
        if (!this.engine) return;

        console.log('🎧 Setting up event listeners...');

        this.engine.on('userAdd', (userList) => {
            console.log('👤 Users joined:', userList.length);
            if (this.listeners.onUserJoined) {
                this.listeners.onUserJoined(userList);
            }
        });

        this.engine.on('userLeave', (userList) => {
            console.log('👤 Users left:', userList.length);
            if (this.listeners.onUserLeft) {
                this.listeners.onUserLeft(userList);
            }
        });

        this.engine.on('remoteStreamAdd', (streamList) => {
            console.log('📹 Remote streams added:', streamList.length);
            streamList.forEach((stream) => {
                this.remoteStreams.set(stream.streamID, stream);
            });
            if (this.listeners.onRemoteStreamAdd) {
                this.listeners.onRemoteStreamAdd(streamList);
            }
        });

        this.engine.on('remoteStreamRemove', (streamList) => {
            console.log('📹 Remote streams removed');
            streamList.forEach((stream) => {
                this.remoteStreams.delete(stream.streamID);
            });
            if (this.listeners.onRemoteStreamRemove) {
                this.listeners.onRemoteStreamRemove(streamList);
            }
        });

        this.engine.on('error', (error) => {
            console.error('❌ ZegoCloud error:', error);
            if (this.listeners.onError) {
                this.listeners.onError(error);
            }
        });

        this.engine.on('roomClosed', () => {
            console.log('🚪 Room closed');
            this.isConnected = false;
        });

        this.engine.on('disconnected', () => {
            console.log('📡 Disconnected');
            this.isConnected = false;
        });
    }

    on(event, callback) {
        this.listeners[event] = callback;
    }

    getParticipants() {
        try {
            if (!this.engine || !this.roomID) {
                return [];
            }
            return this.engine.getUsers(this.roomID) || [];
        } catch (error) {
            console.error('❌ Error getting participants:', error);
            return [];
        }
    }

    destroy() {
        try {
            if (this.localStream) {
                this.localStream.detach();
                this.localStream = null;
            }

            if (this.engine) {
                this.engine.destroy();
                this.engine = null;
            }

            this.isConnected = false;
            this.listeners = {};
            console.log('🗑️ ZegoCloud cleaned up');
        } catch (error) {
            console.error('❌ Error in destroy:', error);
        }
    }
}