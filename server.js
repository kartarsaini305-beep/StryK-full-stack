// stryk-backend/server.js — POORA BACKEND EK FILE MEIN
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const Razorpay = require('razorpay');
const multer = require('multer');

// ─── SETUP ───
const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());
app.use(cookieParser());
const upload = multer({ dest: 'uploads/' });
const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

// ─── MODELS ───
const userSchema = new mongoose.Schema({
  phone: String, countryCode: { type: String, default: '+91' },
  role: { type: String, enum: ['client','freelancer','admin'] }, name: String,
  skills: [String], bio: String, category: String,
  level: { type: Number, default: 1 }, levelTitle: { type: String, default: 'Beginner' },
  tasksCompleted: { type: Number, default: 0 }, totalEarnings: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 }, totalRatings: { type: Number, default: 0 },
  bankAccount: { accountNumber: String, ifscCode: String, upiId: String, isVerified: Boolean },
  subscriptionPlan: { type: String, default: 'free' }, tasksPostedThisMonth: { type: Number, default: 0 },
  otp: { code: String, expiresAt: Date, attempts: Number },
  refreshTokens: [{ token: String }],
  isPhoneVerified: Boolean, isProfileComplete: Boolean, isActive: { type: Boolean, default: true },
}, { timestamps: true });
userSchema.pre('save', async function(n) { if (this.isModified('otp.code') && this.otp.code) this.otp.code = await bcrypt.hash(this.otp.code, 10); n(); });
userSchema.methods.compareOtp = function(o) { return bcrypt.compare(o, this.otp.code || ''); };
const User = mongoose.model('User', userSchema);

const taskSchema = new mongoose.Schema({
  title: String, description: String, category: String, deliverables: String,
  freelancerLevel: Number, minPrice: Number, actualPrice: Number,
  deadline: Date, estimatedDuration: Number,
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, default: 'pending' },
  clarityWindow: {
    isOpen: Boolean, opensAt: Date, closesAt: Date,
    questions: [{ question: String, answer: String, askedAt: Date, answeredAt: Date }],
    autoAssigned: Boolean,
  },
  submission: { files: [{ url: String, filename: String }], notes: String, submittedAt: Date, isLate: Boolean },
  review: { revisionsRequested: { type: Number, default: 0 }, clientResponse: { type: String, default: 'pending' }, autoApproved: Boolean },
  payment: { razorpayOrderId: String, razorpayPaymentId: String, escrowAmount: Number, commissionAmount: Number, freelancerAmount: Number, status: { type: String, default: 'pending' } },
  dispute: { isOpen: Boolean, raisedBy: String, reason: String, resolution: String },
  clientRating: { rating: Number, review: String }, freelancerRating: { rating: Number, review: String },
  postedAt: { type: Date, default: Date.now }, bookedAt: Date, completedAt: Date,
}, { timestamps: true });
const Task = mongoose.model('Task', taskSchema);

const paymentSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  razorpayOrderId: String, razorpayPaymentId: String,
  amount: Number, amountInRupees: Number, commissionAmount: Number, freelancerAmount: Number,
  status: { type: String, default: 'created' },
}, { timestamps: true });
const Payment = mongoose.model('Payment', paymentSchema);

// ─── AUTH ───
function genToken(u) { return jwt.sign({ userId: u._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '15m' }); }
function genRefresh(u) { return jwt.sign({ userId: u._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' }); }
function setCookies(res, a, r) {
  res.cookie('stryk_token', a, { httpOnly: true, sameSite: 'strict', maxAge: 900000 });
  res.cookie('stryk_refresh', r, { httpOnly: true, sameSite: 'strict', path: '/api/auth/refresh', maxAge: 604800000 });
}

// ─── MIDDLEWARE ───
async function auth(req, res, next) {
  try {
    const t = req.cookies?.stryk_token;
    if (!t) return res.status(401).json({ error: 'Auth required' });
    const d = jwt.verify(t, process.env.JWT_SECRET);
    const u = await User.findById(d.userId).select('-otp -refreshTokens');
    if (!u || !u.isActive) return res.status(401).json({ error: 'Invalid' });
    req.user = u; req.userId = u._id; next();
  } catch (e) { return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' }); }
}
function role(...r) { return (req, res, next) => { if (!r.includes(req.user.role)) return res.status(403).json({ error: 'Unauthorized' }); next(); }; }

// ─── API ROUTES ───
// 🟢 AUTH
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phone, countryCode = '+91' } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    let u = await User.findOne({ phone, countryCode });
    if (!u) return res.json({ message: 'OTP sent', otp, isNewUser: true });
    u.otp = { code: otp, expiresAt: new Date(Date.now() + 600000), attempts: 0 };
    await u.save();
    console.log(`📱 OTP for ${phone}: ${otp}`);
    res.json({ message: 'OTP sent', ...(process.env.NODE_ENV === 'development' && { otp }) });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { phone, otp, name, role: rl, countryCode = '+91' } = req.body;
    let u = await User.findOne({ phone, countryCode });
    if (!u) {
      if (!rl || !['client', 'freelancer'].includes(rl)) return res.status(400).json({ error: 'Role required' });
      u = new User({ phone, countryCode, role: rl, name: name || '' });
      await u.save();
    }
    u.lastLogin = new Date();
    u.isPhoneVerified = true;
    await u.save();
    const aT = genToken(u), rT = genRefresh(u);
    u.refreshTokens.push({ token: rT }); await u.save();
    setCookies(res, aT, rT);
    res.json({ message: 'OK', user: { id: u._id, phone: u.phone, role: u.role, name: u.name, level: u.level, levelTitle: u.levelTitle } });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/auth/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/logout', auth, async (req, res) => {
  try { await User.findByIdAndUpdate(req.userId, { $pull: { refreshTokens: { token: req.cookies?.stryk_refresh } } }); } catch {}
  res.clearCookie('stryk_token'); res.clearCookie('stryk_refresh');
  res.json({ message: 'Logged out' });
});

// 🟢 TASKS
app.post('/api/tasks', auth, role('client'), async (req, res) => {
  try {
    const { title, description, category, deliverables, freelancerLevel, deadline, estimatedDuration, price } = req.body;
    const minPrices = [100, 500, 1500, 4000];
    const mp = minPrices[freelancerLevel - 1] || 100;
    if (price < mp) return res.status(400).json({ error: `Minimum price Rs.${mp}`, minPrice: mp });
    const task = new Task({
      title, description, category, deliverables, freelancerLevel, minPrice: mp, actualPrice: price,
      deadline: new Date(deadline), estimatedDuration, client: req.userId, status: 'pending',
    });
    await task.save();
    const order = await razorpay.orders.create({
      amount: Math.round(price * 100), currency: 'INR',
      receipt: `task_${task._id}`,
      notes: { taskId: task._id.toString() },
    });
    await new Payment({ task: task._id, client: req.userId, razorpayOrderId: order.id, amount: price * 100, amountInRupees: price }).save();
    res.status(201).json({ message: 'Created', task, payment: { orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID } });
  } catch (e) { res.status(500).json({ error: 'Failed', details: e.message }); }
});

app.post('/api/tasks/:taskId/pay', auth, role('client'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Not found' });
    task.status = 'live';
    task.payment = { razorpayOrderId: req.body.razorpayOrderId, razorpayPaymentId: req.body.razorpayPaymentId, status: 'held', escrowAmount: task.actualPrice };
    await task.save();
    await User.findByIdAndUpdate(req.userId, { $inc: { tasksPostedThisMonth: 1 } });
    res.json({ message: 'Task live!', task });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Available tasks for freelancer
app.get('/api/tasks/browse/all', auth, role('freelancer'), async (req, res) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    const q = { status: 'live', freelancerLevel: { $lte: req.user.level } };
    if (category) q.category = category;
    const tasks = await Task.find(q).populate('client', 'name').select('title description category actualPrice freelancerLevel deadline estimatedDuration createdAt').sort('-createdAt').skip((page - 1) * limit).limit(Number(limit));
    const total = await Task.countDocuments(q);
    res.json({ tasks, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// My tasks
app.get('/api/tasks/my-tasks', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const field = req.user.role === 'client' ? 'client' : 'freelancer';
    const q = { [field]: req.userId };
    if (status) q.status = status;
    const tasks = await Task.find(q).populate('client', 'name').populate('freelancer', 'name level').sort('-createdAt').skip((page - 1) * limit).limit(Number(limit));
    const total = await Task.countDocuments(q);
    res.json({ tasks, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Task detail
app.get('/api/tasks/:taskId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId).populate('client', 'name').populate('freelancer', 'name level');
    if (!task) return res.status(404).json({ error: 'Not found' });
    res.json({ task });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Book task
app.post('/api/tasks/:taskId/book', auth, role('freelancer'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Not found' });
    if (task.status !== 'live') return res.status(400).json({ error: 'Not available' });
    if (task.client.toString() === req.userId.toString()) return res.status(400).json({ error: 'Own task' });
    task.freelancer = req.userId;
    task.status = 'booked';
    task.bookedAt = new Date();
    task.clarityWindow = { isOpen: true, opensAt: new Date(), closesAt: new Date(Date.now() + 600000), questions: [] };
    await task.save();
    res.json({ message: 'Booked!', task });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Submit work
app.post('/api/tasks/:taskId/submit', auth, role('freelancer'), upload.array('files', 5), async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (task.freelancer.toString() !== req.userId.toString()) return res.status(403).json({ error: 'Unauthorized' });
    const files = req.files?.map(f => ({ url: f.path, filename: f.originalname })) || [];
    task.submission = { files, notes: req.body.notes || '', submittedAt: new Date(), isLate: new Date() > task.deadline };
    task.status = 'submitted';
    await task.save();
    res.json({ message: 'Submitted!', task });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Review
app.post('/api/tasks/:taskId/review', auth, role('client'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Not found' });
    if (task.client.toString() !== req.userId.toString()) return res.status(403).json({ error: 'Unauthorized' });
    const { action } = req.body;
    if (action === 'approve') {
      task.status = 'approved';
      task.review.clientResponse = 'approved';
      task.payment.status = 'released';
      task.completedAt = new Date();
      await task.save();
      const f = await User.findById(task.freelancer);
      if (f) { f.tasksCompleted += 1; f.totalEarnings += task.actualPrice; await f.save(); }
      res.json({ message: 'Approved! Payment released.', task });
    } else if (action === 'revision') {
      task.status = 'revision';
      task.review.revisionsRequested = (task.review.revisionsRequested || 0) + 1;
      await task.save();
      res.json({ message: 'Revision requested', task });
    } else if (action === 'dispute') {
      task.status = 'disputed';
      task.dispute = { isOpen: true, raisedBy: 'client', reason: req.body.comment || '' };
      await task.save();
      res.json({ message: 'Dispute raised', task });
    } else res.status(400).json({ error: 'Invalid action' });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Cancel task
app.put('/api/tasks/:taskId/cancel', auth, role('client'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Not found' });
    if (task.client.toString() !== req.userId.toString()) return res.status(403).json({ error: 'Unauthorized' });
    if (!['pending', 'live'].includes(task.status)) return res.status(400).json({ error: 'Cannot cancel' });
    task.status = 'cancelled'; task.payment.status = 'refunded'; await task.save();
    res.json({ message: 'Cancelled. Refund initiated.', task });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Ratings
app.post('/api/ratings/:taskId', auth, async (req, res) => {
  try {
    const { rating, review } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: '1-5' });
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Not found' });
    if (!['completed', 'approved'].includes(task.status)) return res.status(400).json({ error: 'Not completed' });
    if (req.user.role === 'client') {
      if (task.clientRating?.rating) return res.status(400).json({ error: 'Already rated' });
      task.clientRating = { rating, review };
      const f = await User.findById(task.freelancer);
      if (f) {
        f.totalRatings += 1;
        f.averageRating = Math.round(((f.averageRating * (f.totalRatings - 1)) + rating) / f.totalRatings * 10) / 10;
        if (f.averageRating >= 4.5 && f.tasksCompleted >= 50) { f.level = 4; f.levelTitle = 'Expert'; }
        else if (f.averageRating >= 4.0 && f.tasksCompleted >= 25) { f.level = 3; f.levelTitle = 'Skilled'; }
        else if (f.averageRating >= 3.5 && f.tasksCompleted >= 10) { f.level = 2; f.levelTitle = 'Rising'; }
        await f.save();
      }
    } else {
      if (task.freelancerRating?.rating) return res.status(400).json({ error: 'Already rated' });
      task.freelancerRating = { rating, review };
    }
    await task.save();
    res.json({ message: 'Rated!' });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/ratings/my', auth, async (req, res) => {
  try {
    const isF = req.user.role === 'freelancer';
    const field = isF ? 'clientRating' : 'freelancerRating';
    const q = { [isF ? 'freelancer' : 'client']: req.userId };
    q[`${field}.rating`] = { $exists: true };
    const tasks = await Task.find(q).populate(isF ? 'client' : 'freelancer', 'name').select(`title ${field}`);
    res.json({ ratings: tasks.map(t => ({ task: t.title, ...(t[field]?.toObject() || {}) })) });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// 🟢 ADMIN
app.get('/api/admin/stats', auth, role('admin'), async (req, res) => {
  const [totalUsers, totalFreelancers, totalClients, totalTasks, completedTasks] = await Promise.all([
    User.countDocuments(), User.countDocuments({ role: 'freelancer' }), User.countDocuments({ role: 'client' }),
    Task.countDocuments(), Task.countDocuments({ status: 'completed' }),
  ]);
  res.json({ totalUsers, totalFreelancers, totalClients, totalTasks, completedTasks });
});

app.get('/api/admin/users', auth, role('admin'), async (req, res) => {
  const users = await User.find().select('-otp -refreshTokens').sort('-createdAt');
  res.json({ users });
});

app.get('/api/admin/tasks', auth, role('admin'), async (req, res) => {
  const tasks = await Task.find().populate('client', 'name phone').populate('freelancer', 'name level').sort('-createdAt');
  res.json({ tasks });
});

app.get('/api/admin/transactions', auth, role('admin'), async (req, res) => {
  const payments = await Payment.find().populate('task', 'title').populate('client', 'name').sort('-createdAt');
  res.json({ payments });
});

// 🟢 HEALTH
app.get('/api/health', (req, res) => res.json({ status: 'OK', time: new Date().toISOString() }));

// ─── START ───
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stryk')
  .then(() => {
    console.log('✅ MongoDB Connected');
    app.listen(process.env.PORT || 5000, () => console.log(`🚀 StryK Backend running on port ${process.env.PORT || 5000}`));
  })
  .catch(e => { console.error('❌ MongoDB:', e.message); process.exit(1); });