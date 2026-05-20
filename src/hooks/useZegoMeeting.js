import { useEffect, useRef, useState } from 'react';

export function useZegoMeeting(userID, userName, roomID) {
    const [isInitialized, setIsInitialized] = useState(true);
    const [participants, setParticipants] = useState([
        { id: userID, name: userName, isAudio: true, isVideo: true },
    ]);
    const [error, setError] = useState(null);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isAudioOn, setIsAudioOn] = useState(true);

    useEffect(() => {
        console.log('✅ Meeting initialized (Zego disabled for testing)');
        setIsInitialized(true);
        setError(null);
    }, [userID, userName, roomID]);

    const toggleVideo = async () => {
        setIsVideoOn(!isVideoOn);
        console.log('📹 Video toggled');
    };

    const toggleAudio = async () => {
        setIsAudioOn(!isAudioOn);
        console.log('🎤 Audio toggled');
    };

    return {
        zego: null,
        isInitialized,
        participants,
        error,
        isVideoOn,
        isAudioOn,
        toggleVideo,
        toggleAudio,
    };
}