import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

const connectedUsers = new Map();
const documentSessions = new Map();

export const initializeSocketIO = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);
    connectedUsers.set(socket.userId, socket.id);

    // Join document session
    socket.on('join-document', (documentId) => {
      socket.join(documentId);
      
      if (!documentSessions.has(documentId)) {
        documentSessions.set(documentId, new Set());
      }
      documentSessions.get(documentId).add(socket.userId);

      // Notify others in the session
      socket.to(documentId).emit('user-joined', {
        userId: socket.userId,
        activeUsers: Array.from(documentSessions.get(documentId))
      });
    });

    // Handle document changes
    socket.on('document-change', ({ documentId, code }) => {
      socket.to(documentId).emit('document-change', code);
    });

    // Leave document session
    socket.on('leave-document', (documentId) => {
      socket.leave(documentId);
      
      if (documentSessions.has(documentId)) {
        documentSessions.get(documentId).delete(socket.userId);
        if (documentSessions.get(documentId).size === 0) {
          documentSessions.delete(documentId);
        }
      }

      // Notify others in the session
      socket.to(documentId).emit('user-left', {
        userId: socket.userId,
        activeUsers: documentSessions.has(documentId) 
          ? Array.from(documentSessions.get(documentId))
          : []
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      connectedUsers.delete(socket.userId);
      
      // Remove user from all document sessions
      documentSessions.forEach((users, documentId) => {
        if (users.has(socket.userId)) {
          users.delete(socket.userId);
          if (users.size === 0) {
            documentSessions.delete(documentId);
          } else {
            // Notify others in the session
            socket.to(documentId).emit('user-left', {
              userId: socket.userId,
              activeUsers: Array.from(users)
            });
          }
        }
      });
    });
  });

  return io;
}; 