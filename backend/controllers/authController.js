const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (user) =>
  jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: '7d',
  });

exports.register = async (req, res) => {
  // debug: log incoming payload for easier tracing while developing
  console.log('POST /api/auth/register body =>', req.body);
  try {
    const { name, email, password, phone, role } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email and password required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({ name, email, password: hashedPassword, phone, role: role || 'farmer' });
    await user.save();

    const token = signToken(user);

    // return safe user data
    const safeUser = { id: user._id, name: user.name, email: user.email, role: user.role };
    return res.status(201).json({ user: safeUser, token });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = signToken(user);
    const safeUser = { id: user._id, name: user.name, email: user.email, role: user.role };
    return res.json({ user: safeUser, token });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
