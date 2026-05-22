import { useEffect, useRef, useState } from 'react';
import { ZegoCloudService } from '../services/ZegoService';

export function useZegoMeeting(userID, userName, roomID) {
    const zegoRef = useRef(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState(null);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isAudioOn, setIsAudioOn] = useState(true);
    const [participants, setParticipants] = useState([]);

    useEffect(() => {
        let isMounted = true;
        let initTimeout;

        const initZego = async () => {
            try {
                console.log('🎬 Starting ZegoCloud initialization...');

                zegoRef.current = new ZegoCloudService();

                // Initialize
                await zegoRef.current.initialize(userID, userName);
                if (!isMounted) return;

                console.log('✅ Initialized, joining room...');

                // Join room
                await zegoRef.current.joinRoom(roomID);
                if (!isMounted) return;

                console.log('✅ Joined room, starting video...');

                // Start video with delay
                initTimeout = setTimeout(async () => {
                    if (!isMounted || !zegoRef.current) return;

                    try {
                        await zegoRef.current.startLocalVideo('local-video');
                        console.log('✅ Video started successfully');

                        if (isMounted) {
                            setIsInitialized(true);
                            setError(null);
                        }
                    } catch (videoError) {
                        console.error('⚠️ Video error (non-blocking):', videoError.message);
                        // Still initialize even if video fails
                        if (isMounted) {
                            setIsInitialized(true);
                            setError(null);
                        }
                    }
                }, 800);

                if (isMounted) {
                    setIsInitialized(true);
                    setError(null);
                }
            } catch (err) {
                console.error('❌ Init error:', err.message);
                if (isMounted) {
                    setError(err.message);
                    // Allow entering even with error
                    setIsInitialized(true);
                }
            }
        };

        if (userID && userName && roomID) {
            initZego();
        }

        return () => {
            isMounted = false;
            if (initTimeout) clearTimeout(initTimeout);
            if (zegoRef.current) {
                try {
                    zegoRef.current.stopLocalVideo();
                    zegoRef.current.leaveRoom();
                    zegoRef.current.destroy();
                } catch (err) {
                    console.warn('Cleanup error:', err);
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
            console.error('Toggle video error:', err);
            setError('Erreur vidéo');
        }
    };

    const toggleAudio = async () => {
        try {
            if (zegoRef.current) {
                await zegoRef.current.toggleMicrophone(!isAudioOn);
                setIsAudioOn(!isAudioOn);
            }
        } catch (err) {
            console.error('Toggle audio error:', err);
            setError('Erreur audio');
        }
    };

    return {
        zego: zegoRef.current,
        isInitialized,
        error,
        isVideoOn,
        isAudioOn,
        participants,
        toggleVideo,
        toggleAudio,
    };
}