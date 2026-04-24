const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Chat DB connected'))
  .catch(err => console.log(err));

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
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.get('/chat/messages', auth, async (req, res) => {
  const messages = await Message.find({ groupCode: req.user.groupCode });
  res.json(messages);
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (groupCode) => {
    socket.join(groupCode);
    console.log('User joined group:', groupCode);
  });

  socket.on('send_message', async (data) => {
    const message = await Message.create({
      sender: data.sender,
      content: data.content,
      groupCode: data.groupCode
    });
    io.to(data.groupCode).emit('receive_message', message);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(3004, () => console.log('Chat service running on port 3004'));