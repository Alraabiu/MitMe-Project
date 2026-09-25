/**
 * Media abstraction.
 * - webrtc → signaling only (peer-to-peer; good for small rooms)
 * - livekit / other → SFU
 */
export class MediaProvider {
  constructor(config = {}) {
    this.config = config;
  }

  async createRoom({ meetingId, title }) {
    return {
      provider: this.config.provider || 'webrtc',
      meetingId,
      title,
      mode: this.config.provider === 'webrtc' ? 'signaling' : 'sfu',
    };
  }

  async createParticipantToken({ meetingId, userId, role }) {
    return {
      provider: this.config.provider || 'webrtc',
      meetingId,
      userId,
      role,
      token: null, // provider-specific
    };
  }
}