import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Video, VideoOff, Mic, MicOff, PhoneOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface VideoChatProps {
  projectId: string;
}

export const VideoChat = ({ projectId }: VideoChatProps) => {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isInCall, setIsInCall] = useState(false);
  const [participants, setParticipants] = useState<Record<string, MediaStream>>({});
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const channelRef = useRef<any>(null);

  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setIsInCall(true);

      // Join the video channel
      const channel = supabase.channel(`video-${projectId}`);
      channelRef.current = channel;

      // Track presence
      await channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          handlePresenceSync(state);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('User joined:', key, newPresences);
          handleUserJoined(key, newPresences[0]);
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          console.log('User left:', key);
          handleUserLeft(key);
        })
        .on('broadcast', { event: 'offer' }, ({ payload }) => {
          handleOffer(payload);
        })
        .on('broadcast', { event: 'answer' }, ({ payload }) => {
          handleAnswer(payload);
        })
        .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
          handleIceCandidate(payload);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user_id: user?.id,
              online_at: new Date().toISOString(),
            });
          }
        });

      toast.success("Joined video call");
    } catch (error) {
      console.error("Error starting call:", error);
      toast.error("Failed to start video call");
    }
  };

  const endCall = () => {
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    // Close all peer connections
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};

    // Leave channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    setLocalStream(null);
    setIsInCall(false);
    setParticipants({});
    toast.success("Left video call");
  };

  const handlePresenceSync = async (state: any) => {
    const users = Object.keys(state);
    console.log('All users in call:', users);
    
    // Create peer connections for all users except self
    for (const userId of users) {
      if (userId !== user?.id && !peerConnectionsRef.current[userId]) {
        await createPeerConnection(userId, true);
      }
    }
  };

  const handleUserJoined = async (userId: string, presence: any) => {
    if (userId === user?.id) return;
    
    // Create peer connection and send offer
    await createPeerConnection(userId, true);
  };

  const handleUserLeft = (userId: string) => {
    if (peerConnectionsRef.current[userId]) {
      peerConnectionsRef.current[userId].close();
      delete peerConnectionsRef.current[userId];
    }
    
    setParticipants(prev => {
      const newParticipants = { ...prev };
      delete newParticipants[userId];
      return newParticipants;
    });
  };

  const createPeerConnection = async (userId: string, shouldCreateOffer: boolean): Promise<RTCPeerConnection> => {
    if (peerConnectionsRef.current[userId]) return peerConnectionsRef.current[userId];

    const pc = new RTCPeerConnection(iceServers);
    peerConnectionsRef.current[userId] = pc;

    // Add local stream tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log('Received remote track from:', userId);
      setParticipants(prev => ({
        ...prev,
        [userId]: event.streams[0],
      }));
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate,
            from: user?.id,
            to: userId,
          },
        });
      }
    };

    // Create and send offer if needed
    if (shouldCreateOffer) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'offer',
          payload: {
            offer,
            from: user?.id,
            to: userId,
          },
        });
      }
    }

    return pc;
  };

  const handleOffer = async (payload: any) => {
    const { offer, from, to } = payload;
    if (to !== user?.id) return;

    const pc = await createPeerConnection(from, false);
    
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'answer',
        payload: {
          answer,
          from: user?.id,
          to: from,
        },
      });
    }
  };

  const handleAnswer = async (payload: any) => {
    const { answer, from, to } = payload;
    if (to !== user?.id) return;

    const pc = peerConnectionsRef.current[from];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleIceCandidate = async (payload: any) => {
    const { candidate, from, to } = payload;
    if (to !== user?.id) return;

    const pc = peerConnectionsRef.current[from];
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  };

  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Local video */}
        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
            You {!isVideoEnabled && "(Camera Off)"}
          </div>
        </div>

        {/* Remote videos */}
        {Object.entries(participants).map(([userId, stream]) => (
          <RemoteVideo key={userId} stream={stream} userId={userId} />
        ))}
      </div>

      <div className="flex gap-2 justify-center">
        {!isInCall ? (
          <Button onClick={startCall}>
            <Video className="h-4 w-4 mr-2" />
            Join Video Call
          </Button>
        ) : (
          <>
            <Button
              variant={isVideoEnabled ? "default" : "destructive"}
              size="icon"
              onClick={toggleVideo}
            >
              {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
            <Button
              variant={isAudioEnabled ? "default" : "destructive"}
              size="icon"
              onClick={toggleAudio}
            >
              {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            <Button variant="destructive" size="icon" onClick={endCall}>
              <PhoneOff className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

const RemoteVideo = ({ stream, userId }: { stream: MediaStream; userId: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
        Participant
      </div>
    </div>
  );
};