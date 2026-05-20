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

      console.log('🔧 Creating ZegoCloud engine...');
      
      // Créer l'instance ZegoCloud
      this.engine = new ZegoExpressEngine(
        ZEGO_CONFIG.appID,
        ZEGO_CONFIG.serverSecret
      );

      console.log('✅ ZegoCloud engine created');

      // Configurer les listeners
      this.setupListeners();

      console.log('✅ ZegoCloud initialized');
      return true;
    } catch (error) {
      console.error('❌ Error initializing ZegoCloud:', error);
      throw error;
    }
  }

  // Rejoindre une room
  async joinRoom(roomID) {
    try {
      this.roomID = roomID;

      console.log('🚪 Joining room:', roomID);

      // Créer un token simple
      const token = await this.generateToken(roomID);

      // Rejoindre la room
      await this.engine.loginRoom(this.roomID, token, {
        userID: this.userID,
        userName: this.userName,
      });

      console.log('✅ Joined room:', roomID);
      return true;
    } catch (error) {
      console.error('❌ Error joining room:', error);
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
      console.error('❌ Error leaving room:', error);
      throw error;
    }
  }

  // Démarrer la vidéo locale
  async startLocalVideo(videoElementId) {
    try {
      if (!this.engine) {
        throw new Error('ZegoCloud not initialized');
      }

      console.log('📹 Starting local video...');

      // Créer le stream local
      this.localStream = await this.engine.createLocalVideoStream();
      console.log('✅ Local stream created');

      // Attacher au DOM
      const videoElement = document.getElementById(videoElementId);
      if (videoElement) {
        this.localStream.attach(videoElement);
        console.log('✅ Video attached to DOM');
      } else {
        console.warn('⚠️ Video element not found:', videoElementId);
      }

      // Publier le stream
      if (this.roomID) {
        await this.engine.startPublishingStream(this.localStream, this.roomID);
        console.log('✅ Stream published');
      }

      return this.localStream;
    } catch (error) {
      console.error('❌ Error starting video:', error);
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
      console.error('❌ Error stopping video:', error);
      throw error;
    }
  }

  // Activer/Désactiver le micro
  async toggleMicrophone(enabled) {
    try {
      if (this.engine && this.localStream) {
        this.localStream.setAudioTrackEnabled(enabled);
        console.log(`✅ Microphone ${enabled ? 'ON' : 'OFF'}`);
      }
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
      }
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
      console.log('👥 Participants:', users.length);
      return users;
    } catch (error) {
      console.error('❌ Error getting participants:', error);
      return [];
    }
  }

  // Configurer les listeners
  setupListeners() {
    if (!this.engine) return;

    console.log('🎧 Setting up listeners...');

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

    // Room fermée
    this.engine.on('roomClosed', () => {
      console.log('🚪 Room closed');
    });

    // Disconnecté
    this.engine.on('disconnected', () => {
      console.log('📡 Disconnected from ZegoCloud');
    });
  }

  // Générer un token
  async generateToken(roomID) {
    try {
      // En production, appeler votre backend:
      // const response = await fetch('/api/zego/generate-token', {...})
      // return response.json().token

      // Pour dev, créer un token basique
      const timestamp = Math.floor(Date.now() / 1000);
      const token = `${this.userID}_${roomID}_${timestamp}`;
      console.log('🔑 Token generated');
      return token;
    } catch (error) {
      console.error('❌ Error generating token:', error);
      throw error;
    }
  }

  // Détruire et nettoyer
  destroy() {
    try {
      if (this.engine) {
        this.engine.destroy();
        this.engine = null;
        console.log('🗑️ ZegoCloud destroyed');
      }
    } catch (error) {
      console.error('❌ Error destroying ZegoCloud:', error);
    }
  }
}

export default new ZegoCloudService();