import { getLiveKit } from './livekitProvider.js';
import { env } from '../config/env.js';

/**
 * Factory that returns the currently configured media provider.
 * For now, this is LiveKit only. WebRTC/peer-to-peer fallback removed.
 */
export const getMediaProvider = () => {
  const livekit = getLiveKit();
  if (livekit.isConfigured()) return livekit;

  // Fallback: no-op provider if LiveKit isn't configured
  return {
    isConfigured: () => false,
    async createRoom({ meetingId, title }) {
      return { provider: 'none', meetingId, title, mode: 'signaling' };
    },
    async createParticipantToken({ meetingId, userId, role }) {
      return { provider: 'none', token: null, meetingId, userId, role };
    },
  };
};