import { ZegoExpressEngine } from 'zego-express-engine-webrtc';

const ZEGO_CONFIG = {
    appID: 1806674959,
    serverSecret: '8fa054e86ffa39defc0a703f83ab77b9',
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

            this.engine = new ZegoExpressEngine(
                ZEGO_CONFIG.appID,
                ZEGO_CONFIG.serverSecret
            );

            if (!this.engine) {
                throw new Error('Failed to create ZegoCloud engine');
            }

            const zegoConfig = {
                turnOnMicrophoneWhenJoining: true,
                turnOnCameraWhenJoining: true,
                showMyCameraToggleButton: true,
                showMyMicrophoneToggleButton: true,
                showAudioVideoSettingsButton: true,
                showScreenSharingButton: true,
                showTextChat: true,
                showUserList: true,
                maxUsers: 50,
                layout: "Grid",
                showLayoutButton: true,
                scenario: {
                    mode: "VideoConference",
                    config: {
                        role: "Host",
                    },
                },
            };

            if (this.engine.setConfig) {
                this.engine.setConfig(zegoConfig);
                console.log('✅ ZegoCloud config applied');
            }

            this.setupEventListeners();

            console.log('✅ ZegoCloud initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Error initializing ZegoCloud:', error.message);
            this.engine = null;
            throw new Error(`ZegoCloud init failed: ${error.message}`);
        }
    }

    async getTokenFromBackend(roomID) {
        try {
            const backendURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
            
            console.log('📡 Requesting token from backend...');
            console.log('   - Backend URL:', backendURL);
            console.log('   - Room ID:', roomID);
            
            const response = await fetch(`${backendURL}/api/generate-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userID: this.userID,
                    userName: this.userName,
                    roomID: roomID
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}: Failed to generate token`);
            }

            const data = await response.json();
            
            if (!data.token) {
                throw new Error('No token in response');
            }

            console.log('✅ Token received from backend');
            console.log(`   - Token length: ${data.token.length} chars`);
            console.log(`   - Expires in: ${data.expiresIn}s`);
            
            return data.token;
        } catch (error) {
            console.error('❌ Error getting token from backend:', error.message);
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

            console.log('🔑 Getting token from backend...');
            const token = await this.getTokenFromBackend(roomID);

            if (!token) {
                throw new Error('Failed to get token from backend');
            }

            console.log('✅ Token obtained, logging into room...');

            const loginResult = await Promise.race([
                this.engine.loginRoom(roomID, token, {
                    userID: this.userID,
                    userName: this.userName,
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Login timeout')), 10000)
                ),
            ]);

            this.isConnected = true;
            console.log('✅ Successfully joined room:', roomID);
            return true;
        } catch (error) {
            console.error('❌ Error joining room:', error.message);
            this.isConnected = false;
            throw new Error(`Join room failed: ${error.message}`);
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
            console.log('   - Element ID:', videoElementId);

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
            if (!videoElement) {
                console.warn('⚠️ Video element not found:', videoElementId);
                return this.localStream;
            }

            try {
                this.localStream.attach(videoElement);
                console.log('✅ Video attached to DOM element');
            } catch (attachError) {
                console.warn('⚠️ Error attaching video:', attachError.message);
            }

            if (this.isConnected && this.roomID) {
                try {
                    await this.engine.startPublishingStream(this.localStream, this.roomID);
                    console.log('✅ Publishing stream to room');
                } catch (publishError) {
                    console.warn('⚠️ Warning publishing stream:', publishError.message);
                }
            }

            return this.localStream;
        } catch (error) {
            console.error('❌ Error starting video:', error.message);
            this.localStream = null;
            throw new Error(`Video start failed: ${error.message}`);
        }
    }

    async stopLocalVideo() {
        try {
            if (this.localStream) {
                try {
                    if (this.engine && this.isConnected) {
                        await this.engine.stopPublishingStream(this.localStream);
                    }
                } catch (err) {
                    console.warn('⚠️ Warning stopping publishing:', err.message);
                }

                try {
                    this.localStream.detach();
                } catch (err) {
                    console.warn('⚠️ Warning detaching stream:', err.message);
                }

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
            console.log('👤 Users joined:', userList.map(u => u.userID));
            if (this.listeners.onUserJoined) {
                this.listeners.onUserJoined(userList);
            }
        });

        this.engine.on('userLeave', (userList) => {
            console.log('👤 Users left:', userList.map(u => u.userID));
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
            console.log('📹 Remote streams removed:', streamList.length);
            streamList.forEach((stream) => {
                this.remoteStreams.delete(stream.streamID);
            });
            if (this.listeners.onRemoteStreamRemove) {
                this.listeners.onRemoteStreamRemove(streamList);
            }
        });

        this.engine.on('error', (error) => {
            console.error('❌ ZegoCloud error event:', error);
            if (this.listeners.onError) {
                this.listeners.onError(error);
            }
        });

        this.engine.on('roomClosed', () => {
            console.log('🚪 Room closed by server');
            this.isConnected = false;
        });

        this.engine.on('disconnected', () => {
            console.log('📡 Disconnected from server');
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
                try {
                    this.localStream.detach();
                } catch (err) {
                    console.warn('⚠️ Warning detaching on destroy:', err.message);
                }
                this.localStream = null;
            }

            if (this.engine) {
                try {
                    this.engine.destroy();
                } catch (err) {
                    console.warn('⚠️ Warning destroying engine:', err.message);
                }
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