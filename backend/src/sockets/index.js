import { verifyAccess } from '../utils/tokens.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Meeting from '../models/Meeting.js';
import MeetingParticipant from '../models/MeetingParticipant.js';
import { log } from '../config/logger.js';

const isMemberOfConversation = async (conversationId, userId) =>
  Conversation.exists({ _id: conversationId, members: userId });

const isHostOrParticipant = async (meetingId, userId) =>
  Meeting.exists({
    _id: meetingId,
    $or: [{ host: userId }, { participants: userId }],
  });

export const registerSockets = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));
      const payload = verifyAccess(token);
      const user = await User.findById(payload.sub).select(
        '_id displayName username avatarUrl presence status'
      );
      if (!user || user.status !== 'active') return next(new Error('Unauthorized'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const uid = String(socket.user._id);
    socket.join(`user:${uid}`);

    await User.findByIdAndUpdate(uid, {
      presence: 'online',
      lastSeen: new Date(),
    });
    io.emit('presence:update', { userId: uid, presence: 'online' });

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

    socket.on('meeting:join', async (meetingId) => {
      if (!(await isHostOrParticipant(meetingId, uid))) return;
      socket.join(`meeting:${meetingId}`);
      const p = await MeetingParticipant.findOne({
        meeting: meetingId,
        user: socket.user._id,
      }).populate('user', 'displayName username avatarUrl');
      io.to(`meeting:${meetingId}`).emit('meeting:participant', p);
    });

    socket.on('meeting:leave', (meetingId) => {
      socket.leave(`meeting:${meetingId}`);
      socket.to(`meeting:${meetingId}`).emit('meeting:participant-left', { userId: uid });
    });

    socket.on('meeting:signal', ({ meetingId, to, data }) => {
      io.to(`user:${to}`).emit('meeting:signal', { meetingId, from: uid, data });
    });

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

    socket.on('whiteboard:event', ({ meetingId, pageId, event }) => {
      socket
        .to(`meeting:${meetingId}`)
        .emit('whiteboard:event', { pageId, event });
    });

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