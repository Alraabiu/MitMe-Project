import { verifyAccess } from '../utils/tokens.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Meeting from '../models/Meeting.js';
import MeetingParticipant from '../models/MeetingParticipant.js';
import { log } from '../config/logger.js';

// ─── Authorization helpers ──────────────────────────────────

const isMemberOfConversation = async (conversationId, userId) =>
  Conversation.exists({ _id: conversationId, members: userId });

const isHostOrParticipant = async (meetingId, userId) =>
  Meeting.exists({
    _id: meetingId,
    $or: [{ host: userId }, { participants: userId }],
  });

/**
 * Returns the participant record only if the user's status is 'admitted'.
 * Used to block pending users from entering the meeting socket room.
 */
const isAdmitted = async (meetingId, userId) => {
  const participant = await MeetingParticipant.findOne({
    meeting: meetingId,
    user: userId,
  }).select('status role');
  return participant && participant.status === 'admitted' ? participant : null;
};

const isHostOrCoHost = async (meetingId, userId) => {
  const meeting = await Meeting.findById(meetingId).select('host coHosts');
  if (!meeting) return false;
  const uid = String(userId);
  return (
    String(meeting.host) === uid ||
    meeting.coHosts.some((c) => String(c) === uid)
  );
};

// ─── Sockets ─────────────────────────────────────────────────

export const registerSockets = (io) => {
  // ─── Auth handshake ────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));

      const payload = verifyAccess(token);
      const user = await User.findById(payload.sub).select(
        '_id displayName username avatarUrl presence status role'
      );
      if (!user || user.status !== 'active') {
        return next(new Error('Unauthorized'));
      }

      socket.user = user;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  // ─── Connection ────────────────────────────────────────────
  io.on('connection', async (socket) => {
    const uid = String(socket.user._id);
    socket.join(`user:${uid}`);

    await User.findByIdAndUpdate(uid, {
      presence: 'online',
      lastSeen: new Date(),
    });
    io.emit('presence:update', { userId: uid, presence: 'online' });

    // ─── Chat ────────────────────────────────────────────────
    socket.on('conversation:join', async (id) => {
      if (await isMemberOfConversation(id, uid)) {
        socket.join(`conversation:${id}`);
      }
    });

    socket.on('typing', ({ conversationId, isTyping }) => {
      socket.to(`conversation:${conversationId}`).emit('typing', {
        userId: uid,
        conversationId,
        isTyping: !!isTyping,
      });
    });

    // ─── Meeting: join the media room ────────────────────────
    // Only ADMITTED participants may enter the socket room.
    // Pending users stay in the waiting room and get no stream.
    socket.on('meeting:join', async (meetingId) => {
      if (!(await isHostOrParticipant(meetingId, uid))) return;

      const admission = await isAdmitted(meetingId, uid);
      if (!admission) {
        // Tell the client to stay in the waiting room
        socket.emit('meeting:pending', { meetingId });
        return;
      }

      socket.join(`meeting:${meetingId}`);

      const participant = await MeetingParticipant.findOne({
        meeting: meetingId,
        user: socket.user._id,
      }).populate('user', 'displayName username avatarUrl');

      io.to(`meeting:${meetingId}`).emit('meeting:participant', participant);
    });

    socket.on('meeting:leave', (meetingId) => {
      socket.leave(`meeting:${meetingId}`);
      socket
        .to(`meeting:${meetingId}`)
        .emit('meeting:participant-left', { userId: uid });
    });

    // ─── Meeting: waiting room subscription (host/co-host) ───
    // The host joins this special room to receive live join requests.
    socket.on('meeting:watch-requests', async (meetingId) => {
      if (!(await isHostOrCoHost(meetingId, uid))) return;

      socket.join(`meeting:${meetingId}:requests`);

      // Immediately send the current pending list
      const pending = await MeetingParticipant.find({
        meeting: meetingId,
        status: 'pending',
      }).populate('user', 'displayName username avatarUrl');

      socket.emit('meeting:pending-list', { meetingId, pending });
    });

    socket.on('meeting:unwatch-requests', (meetingId) => {
      socket.leave(`meeting:${meetingId}:requests`);
    });

    // ─── Meeting: WebRTC signaling ───────────────────────────
    socket.on('meeting:signal', ({ meetingId, to, data }) => {
      io.to(`user:${to}`).emit('meeting:signal', {
        meetingId,
        from: uid,
        data,
      });
    });

    // ─── Meeting: broadcast state (mute, camera, hand, whiteboard) ─
    socket.on('meeting:state', ({ meetingId, type, value }) => {
      socket
        .to(`meeting:${meetingId}`)
        .emit('meeting:state', { userId: uid, type, value });
    });

    socket.on('reaction', ({ meetingId, reaction }) => {
      socket
        .to(`meeting:${meetingId}`)
        .emit('reaction', { userId: uid, reaction });
    });

    // ─── Whiteboard ──────────────────────────────────────────
    socket.on('whiteboard:event', ({ meetingId, pageId, event }) => {
      socket
        .to(`meeting:${meetingId}`)
        .emit('whiteboard:event', { pageId, event });
    });

    // ─── Disconnect ──────────────────────────────────────────
    socket.on('disconnect', async () => {
      await User.findByIdAndUpdate(uid, {
        presence: 'offline',
        lastSeen: new Date(),
      });
      io.emit('presence:update', { userId: uid, presence: 'offline' });
      log.debug('socket_disconnected', { uid });
    });
  });
};