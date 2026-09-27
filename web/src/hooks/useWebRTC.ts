import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { User } from '../types';

interface SignalData {
  type: 'offer' | 'answer' | 'candidate';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * Establishes a WebRTC peer connection for every other participant
 * in the meeting. Returns a map of userId ? remote MediaStream.
 */
export function useWebRTC(
  socket: Socket,
  meetingId: string,
  self: User,
  localStream: MediaStream | null
): Map<string, MediaStream> {
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map()
  );
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  useEffect(() => {
    if (!socket || !meetingId || !localStream) return;

    const createPeer = (userId: string): RTCPeerConnection => {
      const existing = peersRef.current.get(userId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      // Send our tracks to this peer
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // Receive their tracks
      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) return;
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(userId, stream);
          return next;
        });
      };

      // Relay ICE candidates via signaling channel
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('meeting:signal', {
            meetingId,
            to: userId,
            data: { type: 'candidate', candidate: event.candidate.toJSON() },
          });
        }
      };

      // Clean up on disconnection
      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          pc.close();
          peersRef.current.delete(userId);
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.delete(userId);
            return next;
          });
        }
      };

      peersRef.current.set(userId, pc);
      return pc;
    };

    const initiateOffer = async (userId: string) => {
      const pc = createPeer(userId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('meeting:signal', {
          meetingId,
          to: userId,
          data: { type: 'offer', sdp: pc.localDescription },
        });
      } catch (err) {
        console.error('[webrtc] createOffer failed', err);
      }
    };

    const handleOffer = async (
      from: string,
      sdp: RTCSessionDescriptionInit
    ) => {
      const pc = createPeer(from);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('meeting:signal', {
          meetingId,
          to: from,
          data: { type: 'answer', sdp: pc.localDescription },
        });
      } catch (err) {
        console.error('[webrtc] handleOffer failed', err);
      }
    };

    const handleAnswer = async (
      from: string,
      sdp: RTCSessionDescriptionInit
    ) => {
      const pc = peersRef.current.get(from);
      if (!pc) return;
      try {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        }
      } catch (err) {
        console.error('[webrtc] handleAnswer failed', err);
      }
    };

    const handleCandidate = async (
      from: string,
      candidate: RTCIceCandidateInit
    ) => {
      const pc = peersRef.current.get(from);
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('[webrtc] addIceCandidate failed', err);
      }
    };

    // Someone new joined ? initiate offer to them
    const onParticipant = (p: { user: User } | null) => {
      if (!p?.user) return;
      if (p.user._id === self._id) return; // ourselves, skip
      initiateOffer(p.user._id);
    };

    // Someone left ? tear down their peer
    const onLeft = ({ userId }: { userId: string }) => {
      const pc = peersRef.current.get(userId);
      if (pc) {
        pc.close();
        peersRef.current.delete(userId);
      }
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    };

    // Route offer/answer/candidate to the right handler
    const onSignal = (payload: { from: string; data: SignalData }) => {
      if (payload.from === self._id) return;
      const { type, sdp, candidate } = payload.data;
      if (type === 'offer' && sdp) handleOffer(payload.from, sdp);
      else if (type === 'answer' && sdp) handleAnswer(payload.from, sdp);
      else if (type === 'candidate' && candidate)
        handleCandidate(payload.from, candidate);
    };

    socket.on('meeting:participant', onParticipant);
    socket.on('meeting:participant-left', onLeft);
    socket.on('meeting:signal', onSignal);

    return () => {
      socket.off('meeting:participant', onParticipant);
      socket.off('meeting:participant-left', onLeft);
      socket.off('meeting:signal', onSignal);

      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      setRemoteStreams(new Map());
    };
  }, [socket, meetingId, self._id, localStream]);

  return remoteStreams;
}
