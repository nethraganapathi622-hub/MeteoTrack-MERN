const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 5000;

// Initialize Server
const server = http.createServer(app);

// Initialize Socket.IO
const socketModule = require('./src/socket');
const io = socketModule.init(server);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Connect to Database
connectDB().catch(err => {
  console.error('Failed to connect to database', err);
});
