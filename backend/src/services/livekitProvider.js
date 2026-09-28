import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { env } from '../config/env.js';

/**
 * LiveKit integration.
 * - createRoom: idempotent — creates the LiveKit room if it doesn't exist
 * - createParticipantToken: returns a JWT the client uses to connect
 */
export class LiveKitProvider {
  constructor() {
    this.url = env.LIVEKIT_URL;
    this.apiKey = env.LIVEKIT_API_KEY;
    this.apiSecret = env.LIVEKIT_API_SECRET;

    // HTTP endpoint (RoomServiceClient expects https, not wss)
    this.httpUrl = this.url.replace(/^wss:\/\//, 'https://');

    if (this.url && this.apiKey && this.apiSecret) {
      this.rooms = new RoomServiceClient(this.httpUrl, this.apiKey, this.apiSecret);
    } else {
      this.rooms = null;
    }
  }

  isConfigured() {
    return !!(this.url && this.apiKey && this.apiSecret);
  }

  async createRoom({ meetingId, title }) {
    if (!this.isConfigured()) {
      return { provider: 'none', meetingId, title, mode: 'no-sfu' };
    }

    try {
      // Idempotent — if room exists, LiveKit returns it
      await this.rooms.createRoom({
        name: meetingId,
        metadata: JSON.stringify({ title }),
        emptyTimeout: 60 * 5,     // auto-delete empty room after 5 min
        maxParticipants: 50,
      });
    } catch (err) {
      // Ignore "already exists" errors
      if (!String(err).includes('already exists')) {
        console.warn('[livekit] createRoom:', err.message);
      }
    }

    return {
      provider: 'livekit',
      meetingId,
      title,
      url: this.url,
      mode: 'sfu',
    };
  }

  async createParticipantToken({ meetingId, userId, userName, role }) {
    if (!this.isConfigured()) return { token: null };

    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: String(userId),
      name: userName,
      ttl: '2h',
    });

    at.addGrant({
      roomJoin: true,
      room: meetingId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: role === 'host' || role === 'teacher',
    });

    return {
      provider: 'livekit',
      url: this.url,
      token: await at.toJwt(),
      meetingId,
      userId,
      role,
    };
  }
}

let singleton = null;

export const getLiveKit = () => {
  if (!singleton) singleton = new LiveKitProvider();
  return singleton;
};