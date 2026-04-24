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
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  } 
});

app.use(express.json());
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const mongoUri = process.env.MONGO_URI || 'mongodb://samnduba14_db_user:Buc3UMyu3HIHQ2oc@ac-dmd6ye6-shard-00-00.hbjd2c1.mongodb.net:27017,ac-dmd6ye6-shard-00-01.hbjd2c1.mongodb.net:27017,ac-dmd6ye6-shard-00-02.hbjd2c1.mongodb.net:27017/?ssl=true&replicaSet=atlas-p87win-shard-0&authSource=admin&appName=Cluster0&dbName=chatdb';

mongoose.connect(mongoUri)
  .then(() => console.log('Chat DB connected'))
  .catch(err => console.log('DB Error:', err.message));

const MessageSchema = new mongoose.Schema({
  sender: String,
  content: String,
  groupCode: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'groupworkspacesecret123');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.get('/chat/messages', auth, async (req, res) => {
  try {
    const messages = await Message.find({ groupCode: req.user.groupCode });
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (groupCode) => {
    socket.join(groupCode);
    console.log('User joined group:', groupCode);
  });

  socket.on('send_message', async (data) => {
    try {
      const message = await Message.create({
        sender: data.sender,
        content: data.content,
        groupCode: data.groupCode
      });
      io.to(data.groupCode).emit('receive_message', message);
    } catch (e) {
      console.log('Message error:', e.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(3004, () => console.log('Chat service running on port 3004'));