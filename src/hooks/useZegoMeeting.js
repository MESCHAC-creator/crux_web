import { useEffect, useRef, useState } from 'react';
import { ZegoCloudService } from '../services/ZegoService';

export function useZegoMeeting(userID, userName, roomID) {
    const zegoRef = useRef(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [error, setError] = useState(null);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isAudioOn, setIsAudioOn] = useState(true);

    // Initialiser ZegoCloud
    useEffect(() => {
        const initZego = async () => {
            try {
                zegoRef.current = new ZegoCloudService();
                await zegoRef.current.initialize(userID, userName);
                await zegoRef.current.joinRoom(roomID);

                // Démarrer la vidéo locale
                await zegoRef.current.startLocalVideo('local-video');

                setIsInitialized(true);
                setError(null);
            } catch (err) {
                setError(err.message);
                console.error('Erreur initialisation:', err);
            }
        };

        if (userID && userName && roomID) {
            initZego();
        }

        return () => {
            if (zegoRef.current) {
                zegoRef.current.stopLocalVideo();
                zegoRef.current.leaveRoom();
                zegoRef.current.destroy();
            }
        };
    }, [userID, userName, roomID]);

    // Toggler la vidéo
    const toggleVideo = async () => {
        try {
            await zegoRef.current.toggleVideo(!isVideoOn);
            setIsVideoOn(!isVideoOn);
        } catch (err) {
            console.error('Erreur toggle vidéo:', err);
        }
    };

    // Toggler le micro
    const toggleAudio = async () => {
        try {
            await zegoRef.current.toggleMicrophone(!isAudioOn);
            setIsAudioOn(!isAudioOn);
        } catch (err) {
            console.error('Erreur toggle audio:', err);
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