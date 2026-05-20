import { useEffect, useRef, useState } from 'react';
import { ZegoCloudService } from '../services/ZegoService';

export function useZegoMeeting(userID, userName, roomID) {
    const zegoRef = useRef(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [error, setError] = useState(null);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isAudioOn, setIsAudioOn] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const initZego = async () => {
            try {
                console.log('🚀 Initializing meeting...');

                zegoRef.current = new ZegoCloudService();

                // Initialiser ZegoCloud
                await zegoRef.current.initialize(userID, userName);

                if (!isMounted) return;

                // Rejoindre la room
                await zegoRef.current.joinRoom(roomID);

                if (!isMounted) return;

                // Démarrer la vidéo avec un petit délai
                setTimeout(async () => {
                    if (isMounted && zegoRef.current) {
                        try {
                            await zegoRef.current.startLocalVideo('local-video');
                            console.log('✅ Meeting initialized successfully');
                            setIsInitialized(true);
                            setError(null);
                        } catch (err) {
                            console.error('Warning starting video:', err);
                            // Ne pas bloquer si la vidéo échoue
                            setIsInitialized(true);
                            setError(null);
                        }
                    }
                }, 500);

                if (isMounted) {
                    setIsInitialized(true);
                    setError(null);
                }
            } catch (err) {
                console.error('Error in meeting initialization:', err);
                if (isMounted) {
                    setError(err.message || 'Erreur lors de l\'initialisation');
                    // Laisser l'utilisateur entrer quand même
                    setIsInitialized(true);
                }
            }
        };

        if (userID && userName && roomID) {
            initZego();
        }

        return () => {
            isMounted = false;
            if (zegoRef.current) {
                try {
                    zegoRef.current.stopLocalVideo();
                    zegoRef.current.leaveRoom();
                    zegoRef.current.destroy();
                } catch (err) {
                    console.warn('Error cleanup:', err);
                }
            }
        };
    }, [userID, userName, roomID]);

    const toggleVideo = async () => {
        try {
            if (zegoRef.current) {
                await zegoRef.current.toggleVideo(!isVideoOn);
                setIsVideoOn(!isVideoOn);
            }
        } catch (err) {
            console.error('Error toggling video:', err);
        }
    };

    const toggleAudio = async () => {
        try {
            if (zegoRef.current) {
                await zegoRef.current.toggleMicrophone(!isAudioOn);
                setIsAudioOn(!isAudioOn);
            }
        } catch (err) {
            console.error('Error toggling audio:', err);
        }
    };

    return {
        zego: zegoRef.current,
        isInitialized,
        participants,
        error,
        isVideoOn,
        isAudioOn,
        toggleVideo,
        toggleAudio,
    };
}