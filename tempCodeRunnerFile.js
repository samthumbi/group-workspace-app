const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Auth DB connected'))
  .catch(err => console.log(err));

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  groupCode: String
}, { timestamps: true });
const User = mongoose.model('User', UserSchema);

app.post('/auth/register', async (req, res) => {
  try {
   const { name, email, password, groupCode } = req.body;
if (!name || !email || !password) {
  return res.status(400).json({ error: 'Name, email, and password are required' });
}
    const hashed = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashed, groupCode });
    res.json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Wrong password' });
    const token = jwt.sign({ id: user._id, groupCode: user.groupCode }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, name: user.name, groupCode: user.groupCode });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(3001, () => console.log('Auth service running on port 3001'));