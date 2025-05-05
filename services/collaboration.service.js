import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

export const initializeSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.user.id);

    // Join resume editing room
    socket.on('join-resume', (resumeId) => {
      socket.join(`resume:${resumeId}`);
      socket.to(`resume:${resumeId}`).emit('user-joined', {
        userId: socket.user.id,
        username: socket.user.name,
      });
    });

    // Handle real-time content updates
    socket.on('content-update', ({ resumeId, content, section }) => {
      socket.to(`resume:${resumeId}`).emit('content-updated', {
        userId: socket.user.id,
        username: socket.user.name,
        content,
        section,
        timestamp: new Date(),
      });
    });

    // Handle comments
    socket.on('add-comment', ({ resumeId, comment }) => {
      socket.to(`resume:${resumeId}`).emit('comment-added', {
        userId: socket.user.id,
        username: socket.user.name,
        comment,
        timestamp: new Date(),
      });
    });

    // Handle cursor position updates for collaborative editing
    socket.on('cursor-move', ({ resumeId, position }) => {
      socket.to(`resume:${resumeId}`).emit('cursor-moved', {
        userId: socket.user.id,
        username: socket.user.name,
        position,
      });
    });

    // Handle section reordering
    socket.on('section-reorder', ({ resumeId, sections }) => {
      socket.to(`resume:${resumeId}`).emit('sections-reordered', {
        userId: socket.user.id,
        username: socket.user.name,
        sections,
      });
    });

    // Handle template changes
    socket.on('template-change', ({ resumeId, template }) => {
      socket.to(`resume:${resumeId}`).emit('template-changed', {
        userId: socket.user.id,
        username: socket.user.name,
        template,
      });
    });

    // Handle user typing indicator
    socket.on('typing', ({ resumeId, section }) => {
      socket.to(`resume:${resumeId}`).emit('user-typing', {
        userId: socket.user.id,
        username: socket.user.name,
        section,
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.user.id);
      // Notify all rooms the user was in about their departure
      socket.rooms.forEach((room) => {
        if (room.startsWith('resume:')) {
          socket.to(room).emit('user-left', {
            userId: socket.user.id,
            username: socket.user.name,
          });
        }
      });
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

export const notifyResumeUpdate = (resumeId, update) => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  io.to(`resume:${resumeId}`).emit('resume-updated', update);
};

export default {
  initializeSocketIO,
  getIO,
  notifyResumeUpdate,
}; 