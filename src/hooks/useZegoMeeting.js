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
        const initZego = async () => {
            try {
                console.log('🚀 Initializing ZegoCloud...');

                zegoRef.current = new ZegoCloudService();
                await zegoRef.current.initialize(userID, userName);

                console.log('✅ ZegoCloud initialized');

                await zegoRef.current.joinRoom(roomID);
                console.log('✅ Joined room:', roomID);

                // Démarrer la vidéo locale avec délai
                setTimeout(async () => {
                    try {
                        await zegoRef.current.startLocalVideo('local-video');
                        console.log('✅ Local video started');
                    } catch (err) {
                        console.error('❌ Error starting video:', err);
                        setError('Erreur démarrage vidéo: ' + err.message);
                    }
                }, 500);

                setIsInitialized(true);
                setError(null);
            } catch (err) {
                console.error('❌ Error initializing ZegoCloud:', err);
                setError('Erreur ZegoCloud: ' + err.message);
                setIsInitialized(true); // Laisser l'utilisateur entrer quand même
            }
        };

        if (userID && userName && roomID) {
            initZego();
        }

        return () => {
            if (zegoRef.current) {
                try {
                    zegoRef.current.stopLocalVideo();
                    zegoRef.current.leaveRoom();
                    zegoRef.current.destroy();
                } catch (err) {
                    console.error('Error cleanup:', err);
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
            console.error('Error toggle video:', err);
            setError('Erreur vidéo: ' + err.message);
        }
    };

    const toggleAudio = async () => {
        try {
            if (zegoRef.current) {
                await zegoRef.current.toggleMicrophone(!isAudioOn);
                setIsAudioOn(!isAudioOn);
            }
        } catch (err) {
            console.error('Error toggle audio:', err);
            setError('Erreur audio: ' + err.message);
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