const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

let io;

exports.init = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user || !user.isActive) {
        return next(new Error('Authentication error: User invalid or inactive'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id} (User: ${socket.user.email})`);

    socket.on('join_global', () => {
      socket.join('global');
      console.log(`[Socket] ${socket.user.email} joined global room`);
    });

    socket.on('leave_global', () => {
      socket.leave('global');
      console.log(`[Socket] ${socket.user.email} left global room`);
    });

    socket.on('join_station', (stationId) => {
      const roomName = `station:${stationId}`;
      socket.join(roomName);
      console.log(`[Socket] ${socket.user.email} joined room: ${roomName}`);
    });

    socket.on('leave_station', (stationId) => {
      const roomName = `station:${stationId}`;
      socket.leave(roomName);
      console.log(`[Socket] ${socket.user.email} left room: ${roomName}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id} (User: ${socket.user.email})`);
    });
  });

  return io;
};

exports.getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};
