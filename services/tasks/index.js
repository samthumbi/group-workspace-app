const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Tasks DB connected'))
  .catch(err => console.log(err));

// Middleware to verify token
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

// Task Model
const TaskSchema = new mongoose.Schema({
  title: String,
  description: String,
  assignedTo: String,
  status: { type: String, default: 'pending' },
  deadline: Date,
  groupCode: String,
  createdAt: { type: Date, default: Date.now }
});
const Task = mongoose.model('Task', TaskSchema);

// Get all tasks for a group
app.get('/tasks', auth, async (req, res) => {
  const tasks = await Task.find({ groupCode: req.user.groupCode });
  res.json(tasks);
});

// Create task
app.post('/tasks', auth, async (req, res) => {
  const { title, description, assignedTo, deadline } = req.body;
  const task = await Task.create({
    title, description, assignedTo, deadline,
    groupCode: req.user.groupCode
  });
  res.json(task);
});

// Update task status
app.patch('/tasks/:id', auth, async (req, res) => {
  const task = await Task.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );
  res.json(task);
});

// Delete task
app.delete('/tasks/:id', auth, async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.json({ message: 'Task deleted' });
});

app.listen(3002, () => console.log('Tasks service running on port 3002'));