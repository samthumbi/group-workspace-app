const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Timetable DB connected'))
  .catch(err => console.log(err));

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

const SlotSchema = new mongoose.Schema({
  title: String,
  day: String,
  startTime: String,
  endTime: String,
  description: String,
  groupCode: String,
  createdAt: { type: Date, default: Date.now }
});
const Slot = mongoose.model('Slot', SlotSchema);

app.get('/timetable', auth, async (req, res) => {
  const slots = await Slot.find({ groupCode: req.user.groupCode });
  res.json(slots);
});

app.post('/timetable', auth, async (req, res) => {
  try {
    const { title, day, startTime, endTime, description } = req.body;
    const slot = await Slot.create({
      title, day, startTime, endTime, description,
      groupCode: req.user.groupCode
    });
    res.json(slot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/timetable/:id', auth, async (req, res) => {
  await Slot.findByIdAndDelete(req.params.id);
  res.json({ message: 'Slot deleted' });
});

app.listen(3003, () => console.log('Timetable service running on port 3003'));