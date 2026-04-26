const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));

const mongoUri = process.env.MONGO_URI || 'mongodb://samnduba14_db_user:Buc3UMyu3HIHQ2oc@ac-dmd6ye6-shard-00-00.hbjd2c1.mongodb.net:27017,ac-dmd6ye6-shard-00-01.hbjd2c1.mongodb.net:27017,ac-dmd6ye6-shard-00-02.hbjd2c1.mongodb.net:27017/?ssl=true&replicaSet=atlas-p87win-shard-0&authSource=admin&appName=Cluster0&dbName=chatdb';

mongoose.connect(mongoUri)
  .then(() => console.log('✓ Chat DB connected'))
  .catch(err => console.log('DB Error:', err.message));

const MessageSchema = new mongoose.Schema({
  sender: String,
  content: String,
  groupCode: String,
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', MessageSchema);

// REST API
app.get('/chat/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 }).limit(50);
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post('/chat/messages', async (req, res) => {
  try {
    const { sender, content, groupCode } = req.body;
    const message = await Message.create({
      sender,
      content,
      groupCode: groupCode || 'default',
      timestamp: new Date()
    });
    res.json(message);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});
// Socket.io
const connectedUsers = {};

io.on('connection', (socket) => {
  console.log('✓ User connected:', socket.id);
  connectedUsers[socket.id] = { id: socket.id, joined: false };

  socket.on('join', (data) => {
    console.log('Join event received:', data);
    socket.join('chatroom');
    connectedUsers[socket.id].joined = true;
    connectedUsers[socket.id].name = data.name || 'Anonymous';
    console.log('✓ User joined chatroom:', connectedUsers[socket.id].name);
    io.to('chatroom').emit('user_joined', { name: data.name, total: Object.keys(connectedUsers).length });
  });

  socket.on('send_message', async (data) => {
    try {
      console.log('📨 Message received from', data.sender, ':', data.content);
      
      // Save to DB
      const message = await Message.create({
        sender: data.sender,
        content: data.content,
        groupCode: data.groupCode || 'default'
      });
      
      console.log('✓ Message saved to DB');
      
      // Broadcast to all connected users
      io.to('chatroom').emit('receive_message', {
        sender: message.sender,
        content: message.content,
        timestamp: message.timestamp,
        _id: message._id
      });
      
      console.log('✓ Message broadcasted to all users');
    } catch (e) {
      console.error('Message error:', e.message);
      socket.emit('error', 'Failed to save message');
    }
  });

  socket.on('disconnect', () => {
    console.log('✗ User disconnected:', socket.id);
    delete connectedUsers[socket.id];
  });
});

server.listen(3004, () => {
  console.log('🚀 Chat service running on port 3004');
});