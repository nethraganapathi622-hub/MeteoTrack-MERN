import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.rooms = new Set();
  }

  connect() {
    if (this.socket) {
      return this.socket;
    }

    const userInfo = localStorage.getItem('meteotrack-user');
    let token = null;
    if (userInfo) {
      try {
        const parsed = JSON.parse(userInfo);
        token = parsed.token;
      } catch (e) {
        console.error('Failed to parse user info for socket token');
      }
    }

    if (!token) {
      console.warn('Socket connection attempted without token');
      return null;
    }

    this.socket = io('http://localhost:5000', {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected to server');
      this.rooms.forEach(room => {
        if (room === 'global') {
          this.socket.emit('join_global');
        } else {
          this.socket.emit('join_station', room);
        }
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });

    // Re-attach existing listeners
    this.listeners.forEach((callback, event) => {
      this.socket.on(event, callback);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribeToReadings(callback) {
    if (this.socket) {
      this.socket.on('sensor:reading', callback);
    }
    this.listeners.set('sensor:reading', callback);
  }

  unsubscribeFromReadings(callback) {
    if (this.socket) {
      this.socket.off('sensor:reading', callback);
    }
    this.listeners.delete('sensor:reading');
  }

  subscribeToAlertNew(callback) {
    if (this.socket) {
      this.socket.on('alert:new', callback);
    }
    this.listeners.set('alert:new', callback);
  }

  unsubscribeFromAlertNew(callback) {
    if (this.socket) {
      this.socket.off('alert:new', callback);
    }
    this.listeners.delete('alert:new');
  }

  subscribeToAlertUpdate(callback) {
    if (this.socket) {
      this.socket.on('alert:update', callback);
    }
    this.listeners.set('alert:update', callback);
  }

  unsubscribeFromAlertUpdate(callback) {
    if (this.socket) {
      this.socket.off('alert:update', callback);
    }
    this.listeners.delete('alert:update');
  }

  joinGlobal() {
    this.rooms.add('global');
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_global');
    }
  }

  leaveGlobal() {
    this.rooms.delete('global');
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_global');
    }
  }

  joinStation(stationId) {
    this.rooms.add(stationId);
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_station', stationId);
    }
  }

  leaveStation(stationId) {
    this.rooms.delete(stationId);
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_station', stationId);
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

// Export a singleton instance
export const socketService = new SocketService();
export default socketService;
