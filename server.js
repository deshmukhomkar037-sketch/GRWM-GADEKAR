// ============================================================
//  GRWM GADEKAR - Complete Backend (server.js)
//  Stack: Node.js + Express + MongoDB + JWT
//  Run:   node server.js
// ============================================================

const express       = require('express');
const mongoose      = require('mongoose');
const bcrypt        = require('bcryptjs');
const jwt           = require('jsonwebtoken');
const cors          = require('cors');
const path          = require('path');
const multer        = require('multer');
const fs            = require('fs');
const nodemailer    = require('nodemailer');

const app = express();

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const CONFIG = {
  PORT        : process.env.PORT        || 5000,
  MONGO_URI   : process.env.MONGO_URI   || 'mongodb://127.0.0.1:27017/grwm_gadekar',
  JWT_SECRET  : process.env.JWT_SECRET  || 'grwm_gadekar_secret_2025',
  JWT_EXPIRES : process.env.JWT_EXPIRES || '7d',
  EMAIL_USER  : process.env.EMAIL_USER  || 'gadekarsakshi2002@gmail.com',
  EMAIL_PASS  : process.env.EMAIL_PASS  || '',          // App password
  CLIENT_URL  : process.env.CLIENT_URL  || 'http://localhost:5000',
};

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname)));          // serve frontend

// Upload folder
const uploadDir = path.join(__dirname, 'images');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ─────────────────────────────────────────────
// MULTER (file uploads)
// ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination : (_req, _file, cb) => cb(null, uploadDir),
  filename    : (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits        : { fileSize: 5 * 1024 * 1024 },       // 5 MB
  fileFilter    : (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  },
});

// ─────────────────────────────────────────────
// MONGODB CONNECTION
// ─────────────────────────────────────────────
mongoose.connect(CONFIG.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => { console.log('✅  MongoDB connected:', CONFIG.MONGO_URI); seedDatabase(); })
  .catch(err  => console.error('❌  MongoDB error:', err.message));

// ─────────────────────────────────────────────
// ═══════════════  SCHEMAS  ═══════════════════
// ─────────────────────────────────────────────

/* ── Users ── */
const userSchema = new mongoose.Schema({
  name      : { type: String, required: true, trim: true },
  email     : { type: String, required: true, unique: true, lowercase: true },
  password  : { type: String, required: true },
  phone     : { type: String, default: '' },
  role      : { type: String, enum: ['user','admin'], default: 'user' },
  avatar    : { type: String, default: '' },
  addresses : [{
    label   : String,
    line1   : String,
    city    : String,
    state   : String,
    pin     : String,
  }],
  createdAt : { type: Date, default: Date.now },
});
userSchema.pre('save', async function(next) {
  if (this.isModified('password'))
    this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.matchPassword = function(plain) {
  return bcrypt.compare(plain, this.password);
};
const User = mongoose.model('User', userSchema);

/* ── Clothes ── */
const clothesSchema = new mongoose.Schema({
  name        : { type: String, required: true },
  description : { type: String, default: '' },
  price       : { type: Number, required: true },
  oldPrice    : { type: Number, default: 0 },
  image       : { type: String, default: 'images/clothes1.jpg' },
  images      : [String],
  category    : { type: String, default: 'clothes' },
  sub         : { type: String, enum: ['men','women','kids','unisex'], default: 'women' },
  sizes       : [String],
  colors      : [String],
  tag         : { type: String, enum: ['new','hot','trending','sale',''], default: 'new' },
  rating      : { type: Number, default: 4.5 },
  reviewCount : { type: Number, default: 0 },
  stock       : { type: Number, default: 50 },
  isActive    : { type: Boolean, default: true },
  createdAt   : { type: Date, default: Date.now },
});
const Clothes = mongoose.model('Clothes', clothesSchema);

/* ── Chosematics ── */
const chosematicsSchema = new mongoose.Schema({
  name        : { type: String, required: true },
  description : { type: String, default: '' },
  price       : { type: Number, required: true },
  oldPrice    : { type: Number, default: 0 },
  image       : { type: String, default: 'images/chosematic1.jpg' },
  images      : [String],
  category    : { type: String, default: 'chosematics' },
  sub         : { type: String, enum: ['earrings','necklaces','rings','bracelets','accessories'], default: 'earrings' },
  sizes       : [String],
  colors      : [String],
  tag         : { type: String, default: 'new' },
  rating      : { type: Number, default: 4.5 },
  reviewCount : { type: Number, default: 0 },
  stock       : { type: Number, default: 30 },
  isActive    : { type: Boolean, default: true },
  createdAt   : { type: Date, default: Date.now },
});
const Chosematics = mongoose.model('Chosematics', chosematicsSchema);

/* ── Orders ── */
const orderSchema = new mongoose.Schema({
  orderId   : { type: String, unique: true },
  user      : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  guestName : String,
  guestEmail: String,
  items     : [{
    product   : { type: mongoose.Schema.Types.ObjectId },
    productModel: String,
    name      : String,
    price     : Number,
    qty       : Number,
    size      : String,
    color     : String,
    image     : String,
  }],
  shipping  : {
    name   : String,
    phone  : String,
    line1  : String,
    city   : String,
    state  : String,
    pin    : String,
  },
  payment   : {
    method  : { type: String, default: 'COD' },
    status  : { type: String, enum: ['pending','paid','failed'], default: 'pending' },
    txnId   : String,
  },
  coupon    : { code: String, discount: Number },
  subtotal  : Number,
  total     : Number,
  status    : { type: String, enum: ['placed','packed','shipped','out_for_delivery','delivered','cancelled'], default: 'placed' },
  createdAt : { type: Date, default: Date.now },
  updatedAt : { type: Date, default: Date.now },
});
orderSchema.pre('save', function(next) {
  if (!this.orderId) this.orderId = 'ORD-' + Date.now().toString().slice(-8);
  this.updatedAt = Date.now();
  next();
});
const Order = mongoose.model('Order', orderSchema);

/* ── Cart ── */
const cartSchema = new mongoose.Schema({
  user     : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items    : [{
    product  : { type: mongoose.Schema.Types.ObjectId },
    productModel: String,
    name     : String,
    price    : Number,
    image    : String,
    qty      : { type: Number, default: 1 },
    size     : String,
    color    : String,
  }],
  updatedAt: { type: Date, default: Date.now },
});
const Cart = mongoose.model('Cart', cartSchema);

/* ── Wishlist ── */
const wishlistSchema = new mongoose.Schema({
  user    : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items   : [{
    product  : { type: mongoose.Schema.Types.ObjectId },
    productModel: String,
    name     : String,
    price    : Number,
    image    : String,
  }],
});
const Wishlist = mongoose.model('Wishlist', wishlistSchema);

/* ── Reviews ── */
const reviewSchema = new mongoose.Schema({
  user     : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  product  : { type: mongoose.Schema.Types.ObjectId },
  productModel: String,
  rating   : { type: Number, min: 1, max: 5, required: true },
  comment  : { type: String, default: '' },
  name     : String,
  createdAt: { type: Date, default: Date.now },
});
const Review = mongoose.model('Review', reviewSchema);

/* ── Coupons ── */
const couponSchema = new mongoose.Schema({
  code       : { type: String, unique: true, uppercase: true },
  discount   : { type: Number, required: true },          // percentage e.g. 20
  minOrder   : { type: Number, default: 0 },
  maxUses    : { type: Number, default: 1000 },
  usedCount  : { type: Number, default: 0 },
  isActive   : { type: Boolean, default: true },
  expiresAt  : { type: Date },
  createdAt  : { type: Date, default: Date.now },
});
const Coupon = mongoose.model('Coupon', couponSchema);

/* ── Support Tickets ── */
const ticketSchema = new mongoose.Schema({
  ticketId  : String,
  name      : String,
  email     : String,
  subject   : String,
  message   : String,
  orderId   : String,
  status    : { type: String, enum: ['open','in_progress','resolved','closed'], default: 'open' },
  createdAt : { type: Date, default: Date.now },
});
ticketSchema.pre('save', function(next) {
  if (!this.ticketId) this.ticketId = 'TKT-' + Date.now().toString().slice(-6);
  next();
});
const Ticket = mongoose.model('Ticket', ticketSchema);

// ─────────────────────────────────────────────
// ═══════════  AUTH MIDDLEWARE  ═══════════════
// ─────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  try {
    const decoded = jwt.verify(header.split(' ')[1], CONFIG.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Admin access required' });
    next();
  });
}

// ─────────────────────────────────────────────
// ═══════════  EMAIL HELPER  ══════════════════
// ─────────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  if (!CONFIG.EMAIL_PASS) return;          // skip if not configured
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: CONFIG.EMAIL_USER, pass: CONFIG.EMAIL_PASS },
    });
    await transporter.sendMail({ from: `"GRWM Gadekar" <${CONFIG.EMAIL_USER}>`, to, subject, html });
  } catch (err) {
    console.error('Email error:', err.message);
  }
}

function orderConfirmationEmail(order) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;background:#0a0a0f;color:#f0eeff;padding:32px;border-radius:16px">
      <h1 style="color:#c678f5;font-family:Georgia,serif">GRWM Gadekar 🛍</h1>
      <h2>Order Confirmed! 🎉</h2>
      <p>Hi ${order.shipping?.name || 'Customer'}, your order <strong style="color:#c678f5">${order.orderId}</strong> has been placed successfully.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        ${order.items.map(i=>`<tr><td style="padding:8px;border-bottom:1px solid #333">${i.name} x${i.qty}</td><td style="padding:8px;border-bottom:1px solid #333;text-align:right">₹${(i.price*i.qty).toLocaleString()}</td></tr>`).join('')}
        <tr><td style="padding:12px;font-weight:700">Total</td><td style="padding:12px;text-align:right;color:#c678f5;font-weight:700">₹${order.total?.toLocaleString()}</td></tr>
      </table>
      <p style="color:#a09ab8">Estimated delivery: <strong style="color:#f0eeff">3-7 business days</strong></p>
      <p style="color:#665e80;font-size:13px">📍 Pune, Maharashtra | gadekarsakshi2002@gmail.com</p>
    </div>
  `;
}

// ─────────────────────────────────────────────
// ═══════════════  ROUTES  ════════════════════
// ─────────────────────────────────────────────

// ── Health Check ──
app.get('/api/health', (_req, res) => res.json({ success: true, message: 'GRWM Gadekar API running 🚀', time: new Date() }));

// ─────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email & password required' });

    if (await User.findOne({ email }))
      return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({ name, email, password, phone });
    const token = jwt.sign({ id: user._id, role: user.role, name: user.name, email: user.email }, CONFIG.JWT_SECRET, { expiresIn: CONFIG.JWT_EXPIRES });

    await sendEmail({
      to      : email,
      subject : 'Welcome to GRWM Gadekar! 🎉',
      html    : `<div style="font-family:Inter,sans-serif;padding:32px;background:#0a0a0f;color:#f0eeff;border-radius:16px"><h1 style="color:#c678f5">Welcome, ${name}! 🛍</h1><p>Your account is created. Use code <strong style="color:#c678f5">FIRST10</strong> for 10% off your first order.</p></div>`,
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email & password required' });

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role, name: user.name, email: user.email }, CONFIG.JWT_SECRET, { expiresIn: CONFIG.JWT_EXPIRES });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Profile
app.get('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update Profile
app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone, addresses } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone, addresses },
      { new: true, select: '-password' }
    );
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Change Password
app.put('/api/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!(await user.matchPassword(currentPassword)))
      return res.status(400).json({ success: false, message: 'Current password incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// CLOTHES ROUTES
// ─────────────────────────────────────────────

// Get all clothes (with filters)
app.get('/api/clothes', async (req, res) => {
  try {
    const { sub, tag, minPrice, maxPrice, sort, search, page = 1, limit = 12 } = req.query;
    const filter = { isActive: true };

    if (sub)                filter.sub     = sub;
    if (tag)                filter.tag     = tag;
    if (search)             filter.name    = { $regex: search, $options: 'i' };
    if (minPrice || maxPrice) filter.price = {};
    if (minPrice)           filter.price.$gte = Number(minPrice);
    if (maxPrice)           filter.price.$lte = Number(maxPrice);

    const sortMap = {
      'price-low'  : { price:  1 },
      'price-high' : { price: -1 },
      'rating'     : { rating: -1 },
      'newest'     : { createdAt: -1 },
      'default'    : { createdAt: -1 },
    };
    const sortObj   = sortMap[sort] || sortMap.default;
    const skip      = (Number(page) - 1) * Number(limit);
    const [clothes, total] = await Promise.all([
      Clothes.find(filter).sort(sortObj).skip(skip).limit(Number(limit)),
      Clothes.countDocuments(filter),
    ]);
    res.json({ success: true, clothes, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single clothes item
app.get('/api/clothes/:id', async (req, res) => {
  try {
    const item = await Clothes.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add clothes (admin)
app.post('/api/clothes', adminMiddleware, upload.array('images', 5), async (req, res) => {
  try {
    const { name, description, price, oldPrice, sub, sizes, colors, tag, stock } = req.body;
    if (!name || !price) return res.status(400).json({ success: false, message: 'Name & price required' });

    const images = req.files?.map(f => 'images/' + f.filename) || [];
    const item = await Clothes.create({
      name, description,
      price: Number(price),
      oldPrice: Number(oldPrice) || 0,
      sub: sub || 'women',
      sizes: sizes ? JSON.parse(sizes) : [],
      colors: colors ? JSON.parse(colors) : [],
      tag: tag || 'new',
      stock: Number(stock) || 50,
      image: images[0] || 'images/clothes1.jpg',
      images,
    });
    res.status(201).json({ success: true, product: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update clothes (admin)
app.put('/api/clothes/:id', adminMiddleware, async (req, res) => {
  try {
    const item = await Clothes.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete clothes (admin)
app.delete('/api/clothes/:id', adminMiddleware, async (req, res) => {
  try {
    await Clothes.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// CHOSEMATICS ROUTES
// ─────────────────────────────────────────────

app.get('/api/chosematics', async (req, res) => {
  try {
    const { sub, tag, minPrice, maxPrice, sort, search, page = 1, limit = 12 } = req.query;
    const filter = { isActive: true };

    if (sub)    filter.sub  = sub;
    if (tag)    filter.tag  = tag;
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (minPrice || maxPrice) filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);

    const sortMap = { 'price-low':{ price:1 },'price-high':{ price:-1 },'rating':{ rating:-1 },'newest':{ createdAt:-1 } };
    const sortObj = sortMap[sort] || { createdAt: -1 };
    const skip    = (Number(page)-1) * Number(limit);
    const [items, total] = await Promise.all([
      Chosematics.find(filter).sort(sortObj).skip(skip).limit(Number(limit)),
      Chosematics.countDocuments(filter),
    ]);
    res.json({ success: true, chosematics: items, total, page: Number(page), pages: Math.ceil(total/Number(limit)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/chosematics/:id', async (req, res) => {
  try {
    const item = await Chosematics.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/chosematics', adminMiddleware, upload.array('images', 5), async (req, res) => {
  try {
    const { name, description, price, oldPrice, sub, sizes, colors, tag, stock } = req.body;
    if (!name || !price) return res.status(400).json({ success: false, message: 'Name & price required' });
    const images = req.files?.map(f=>'images/'+f.filename)||[];
    const item = await Chosematics.create({
      name, description,
      price: Number(price),
      oldPrice: Number(oldPrice)||0,
      sub: sub||'earrings',
      sizes: sizes ? JSON.parse(sizes) : [],
      colors: colors ? JSON.parse(colors) : [],
      tag: tag||'new',
      stock: Number(stock)||30,
      image: images[0]||'images/chosematic1.jpg',
      images,
    });
    res.status(201).json({ success: true, product: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/chosematics/:id', adminMiddleware, async (req, res) => {
  try {
    const item = await Chosematics.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/chosematics/:id', adminMiddleware, async (req, res) => {
  try {
    await Chosematics.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// COMBINED PRODUCTS SEARCH (clothes + chosematics)
// ─────────────────────────────────────────────
app.get('/api/products/search', async (req, res) => {
  try {
    const { q, category } = req.query;
    if (!q) return res.json({ success: true, results: [] });
    const regex = { $regex: q, $options: 'i' };
    let results = [];
    if (!category || category === 'clothes') {
      const c = await Clothes.find({ name: regex, isActive: true }).limit(5);
      results.push(...c.map(p=>({...p.toObject(), category:'clothes'})));
    }
    if (!category || category === 'chosematics') {
      const ch = await Chosematics.find({ name: regex, isActive: true }).limit(5);
      results.push(...ch.map(p=>({...p.toObject(), category:'chosematics'})));
    }
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Trending (top rated)
app.get('/api/products/trending', async (req, res) => {
  try {
    const [c, ch] = await Promise.all([
      Clothes.find({ isActive: true }).sort({ rating: -1 }).limit(6),
      Chosematics.find({ isActive: true }).sort({ rating: -1 }).limit(6),
    ]);
    const all = [...c.map(p=>({...p.toObject(),category:'clothes'})), ...ch.map(p=>({...p.toObject(),category:'chosematics'}))]
                  .sort((a,b)=>b.rating-a.rating).slice(0,8);
    res.json({ success: true, products: all });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// New arrivals
app.get('/api/products/new-arrivals', async (req, res) => {
  try {
    const [c, ch] = await Promise.all([
      Clothes.find({ isActive: true, tag: 'new' }).sort({ createdAt: -1 }).limit(4),
      Chosematics.find({ isActive: true, tag: 'new' }).sort({ createdAt: -1 }).limit(4),
    ]);
    res.json({ success: true, clothes: c, chosematics: ch });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// CART ROUTES
// ─────────────────────────────────────────────
app.get('/api/cart', authMiddleware, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    res.json({ success: true, cart: cart || { items: [] } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/cart/add', authMiddleware, async (req, res) => {
  try {
    const { productId, productModel, name, price, image, qty = 1, size = 'M', color = '' } = req.body;
    if (!productId || !productModel) return res.status(400).json({ success: false, message: 'Product info required' });

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) cart = new Cart({ user: req.user.id, items: [] });

    const idx = cart.items.findIndex(i => i.product?.toString() === productId);
    if (idx > -1) {
      cart.items[idx].qty += qty;
    } else {
      cart.items.push({ product: productId, productModel, name, price, image, qty, size, color });
    }
    cart.updatedAt = Date.now();
    await cart.save();
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/cart/update', authMiddleware, async (req, res) => {
  try {
    const { productId, qty } = req.body;
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const idx = cart.items.findIndex(i => i.product?.toString() === productId);
    if (idx > -1) {
      if (qty <= 0) cart.items.splice(idx, 1);
      else          cart.items[idx].qty = qty;
    }
    await cart.save();
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/cart/remove/:productId', authMiddleware, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    cart.items = cart.items.filter(i => i.product?.toString() !== req.params.productId);
    await cart.save();
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/cart/clear', authMiddleware, async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] });
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// WISHLIST ROUTES
// ─────────────────────────────────────────────
app.get('/api/wishlist', authMiddleware, async (req, res) => {
  try {
    const wish = await Wishlist.findOne({ user: req.user.id });
    res.json({ success: true, wishlist: wish || { items: [] } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/wishlist/toggle', authMiddleware, async (req, res) => {
  try {
    const { productId, productModel, name, price, image } = req.body;
    let wish = await Wishlist.findOne({ user: req.user.id });
    if (!wish) wish = new Wishlist({ user: req.user.id, items: [] });

    const idx = wish.items.findIndex(i => i.product?.toString() === productId);
    let action;
    if (idx > -1) { wish.items.splice(idx, 1); action = 'removed'; }
    else          { wish.items.push({ product: productId, productModel, name, price, image }); action = 'added'; }

    await wish.save();
    res.json({ success: true, action, wishlist: wish });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// COUPON ROUTES
// ─────────────────────────────────────────────
app.post('/api/coupon/validate', async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Coupon code required' });

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Invalid coupon code' });
    if (coupon.expiresAt && coupon.expiresAt < Date.now()) return res.status(400).json({ success: false, message: 'Coupon expired' });
    if (coupon.usedCount >= coupon.maxUses) return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
    if (orderTotal < coupon.minOrder) return res.status(400).json({ success: false, message: `Minimum order ₹${coupon.minOrder} required` });

    const discountAmount = Math.round(orderTotal * coupon.discount / 100);
    res.json({ success: true, discount: coupon.discount, discountAmount, code: coupon.code });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all coupons (admin)
app.get('/api/coupons', adminMiddleware, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create coupon (admin)
app.post('/api/coupons', adminMiddleware, async (req, res) => {
  try {
    const { code, discount, minOrder, maxUses, expiresAt } = req.body;
    if (!code || !discount) return res.status(400).json({ success: false, message: 'Code & discount required' });
    const coupon = await Coupon.create({ code: code.toUpperCase(), discount, minOrder, maxUses, expiresAt });
    res.status(201).json({ success: true, coupon });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/coupons/:id', adminMiddleware, async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// ORDER ROUTES
// ─────────────────────────────────────────────

// Place order
app.post('/api/orders', async (req, res) => {
  try {
    const { items, shipping, payment, coupon, subtotal, total, guestName, guestEmail } = req.body;
    if (!items?.length || !shipping) return res.status(400).json({ success: false, message: 'Items & shipping required' });

    const userId = req.headers.authorization
      ? jwt.verify(req.headers.authorization.split(' ')[1], CONFIG.JWT_SECRET)?.id
      : null;

    // Reduce stock
    for (const item of items) {
      if (item.productModel === 'Clothes')      await Clothes.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
      if (item.productModel === 'Chosematics')  await Chosematics.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
    }

    const order = await Order.create({ user: userId, guestName, guestEmail, items, shipping, payment, coupon, subtotal, total });

    if (userId) await Cart.findOneAndUpdate({ user: userId }, { items: [] });

    // Update coupon usage
    if (coupon?.code) await Coupon.findOneAndUpdate({ code: coupon.code }, { $inc: { usedCount: 1 } });

    const emailTo = guestEmail || (userId ? (await User.findById(userId))?.email : null);
    if (emailTo) await sendEmail({ to: emailTo, subject: `Order Confirmed: ${order.orderId} 🎉`, html: orderConfirmationEmail(order) });

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get my orders
app.get('/api/orders/my', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Track order by orderId (public)
app.get('/api/orders/track/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({
      success : true,
      orderId : order.orderId,
      status  : order.status,
      items   : order.items.length,
      total   : order.total,
      createdAt: order.createdAt,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all orders (admin)
app.get('/api/orders', adminMiddleware, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};
    const skip   = (Number(page)-1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('user','name email'),
      Order.countDocuments(filter),
    ]);
    res.json({ success: true, orders, total, pages: Math.ceil(total/Number(limit)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update order status (admin)
app.put('/api/orders/:id/status', adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status, updatedAt: Date.now() }, { new: true });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// REVIEWS ROUTES
// ─────────────────────────────────────────────
app.get('/api/reviews/:productModel/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId, productModel: req.params.productModel })
                                .populate('user','name')
                                .sort({ createdAt: -1 });
    const avg = reviews.length ? (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1) : 0;
    res.json({ success: true, reviews, averageRating: Number(avg), count: reviews.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/reviews', authMiddleware, async (req, res) => {
  try {
    const { product, productModel, rating, comment } = req.body;
    if (!product || !productModel || !rating) return res.status(400).json({ success: false, message: 'Product & rating required' });

    const existing = await Review.findOne({ user: req.user.id, product });
    if (existing) return res.status(400).json({ success: false, message: 'You have already reviewed this product' });

    const review = await Review.create({ user: req.user.id, product, productModel, rating, comment, name: req.user.name });

    // Update product rating
    const reviews = await Review.find({ product, productModel });
    const newAvg  = (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1);
    if (productModel === 'Clothes')     await Clothes.findByIdAndUpdate(product, { rating: Number(newAvg), reviewCount: reviews.length });
    if (productModel === 'Chosematics') await Chosematics.findByIdAndUpdate(product, { rating: Number(newAvg), reviewCount: reviews.length });

    res.status(201).json({ success: true, review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// SUPPORT TICKET ROUTES
// ─────────────────────────────────────────────
app.post('/api/support/ticket', async (req, res) => {
  try {
    const { name, email, subject, message, orderId } = req.body;
    if (!name || !email || !message) return res.status(400).json({ success: false, message: 'Name, email & message required' });

    const ticket = await Ticket.create({ name, email, subject, message, orderId });

    await sendEmail({
      to      : email,
      subject : `Support Ticket Received: ${ticket.ticketId}`,
      html    : `<div style="font-family:Inter,sans-serif;padding:32px;background:#0a0a0f;color:#f0eeff;border-radius:16px"><h2 style="color:#c678f5">GRWM Gadekar Support 💬</h2><p>Hi ${name}, we received your message. Ticket ID: <strong style="color:#c678f5">${ticket.ticketId}</strong></p><p>We'll respond to <strong>${email}</strong> within 24 hours.</p></div>`,
    });

    res.status(201).json({ success: true, ticketId: ticket.ticketId, message: 'Ticket submitted! We\'ll reply within 24 hours.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/support/tickets', adminMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const tickets = await Ticket.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/support/tickets/:id', adminMiddleware, async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// ADMIN – ANALYTICS
// ─────────────────────────────────────────────
app.get('/api/admin/analytics', adminMiddleware, async (req, res) => {
  try {
    const [
      totalOrders,
      totalUsers,
      totalClothes,
      totalChosematics,
      recentOrders,
      revenue,
      lowStock,
    ] = await Promise.all([
      Order.countDocuments(),
      User.countDocuments(),
      Clothes.countDocuments(),
      Chosematics.countDocuments(),
      Order.find().sort({ createdAt: -1 }).limit(5).populate('user','name email'),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]),
      Clothes.find({ stock: { $lt: 5 } }),
    ]);

    // Monthly revenue (last 6 months)
    const monthlyRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 180*24*60*60*1000) } } },
      { $group: {
        _id     : { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
        revenue : { $sum: '$total' },
        orders  : { $sum: 1 },
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      success: true,
      stats: {
        totalOrders,
        totalUsers,
        totalProducts : totalClothes + totalChosematics,
        totalRevenue  : revenue[0]?.total || 0,
      },
      recentOrders,
      monthlyRevenue,
      lowStockItems: lowStock,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Manage users (admin)
app.get('/api/admin/users', adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/admin/users/:id/role', adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true, select: '-password' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// FILE UPLOAD (images)
// ─────────────────────────────────────────────
app.post('/api/upload', adminMiddleware, upload.array('images', 10), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ success: false, message: 'No files uploaded' });
  const urls = req.files.map(f => 'images/' + f.filename);
  res.json({ success: true, images: urls });
});

// Serve uploaded images
app.use('/images', express.static(uploadDir));

// ─────────────────────────────────────────────
// NEWSLETTER (simple log – integrate with email service)
// ─────────────────────────────────────────────
app.post('/api/newsletter', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });
    await sendEmail({
      to      : email,
      subject : 'Welcome to GRWM Gadekar Newsletter! 🎁',
      html    : `<div style="font-family:Inter,sans-serif;padding:32px;background:#0a0a0f;color:#f0eeff;border-radius:16px"><h2 style="color:#c678f5">You're subscribed! 🎉</h2><p>Use code <strong style="color:#c678f5">GRWM20</strong> for 20% off your next order.</p></div>`,
    });
    res.json({ success: true, message: 'Subscribed successfully! Check your email for a coupon.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// SERVE FRONTEND
// ─────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─────────────────────────────────────────────
// SEED DATABASE (runs once on first start)
// ─────────────────────────────────────────────
async function seedDatabase() {
  try {
    // Admin user
    const adminExists = await User.findOne({ email: 'gadekarsakshi2002@gmail.com' });
    if (!adminExists) {
      await User.create({
        name    : 'Sakshi Gadekar',
        email   : 'gadekarsakshi2002@gmail.com',
        password: 'admin@123',
        role    : 'admin',
        phone   : '+91 9876543210',
      });
      console.log('👑  Admin user created  →  email: gadekarsakshi2002@gmail.com  |  password: admin@123');
    }

    // Coupons
    const couponCount = await Coupon.countDocuments();
    if (!couponCount) {
      await Coupon.insertMany([
        { code: 'GRWM20',    discount: 20, minOrder: 999,  maxUses: 1000 },
        { code: 'SAKSHI15',  discount: 15, minOrder: 500,  maxUses: 500  },
        { code: 'FIRST10',   discount: 10, minOrder: 0,    maxUses: 2000 },
        { code: 'FLASH50',   discount: 50, minOrder: 1999, maxUses: 100  },
        { code: 'CHOSEM25',  discount: 25, minOrder: 799,  maxUses: 300  },
      ]);
      console.log('🎟️  Default coupons seeded');
    }

    // Sample clothes
    const clothesCount = await Clothes.countDocuments();
    if (!clothesCount) {
      await Clothes.insertMany([
        { name:'Floral Midi Dress',      price:1299, oldPrice:1999, sub:'women', sizes:['XS','S','M','L','XL'], colors:['#ff6b9d','#c678f5','#fff'], tag:'new',      stock:40, rating:4.8, reviewCount:124, description:'Elegant floral midi dress perfect for all occasions.' },
        { name:'Men\'s Classic Blazer',  price:2499, oldPrice:3499, sub:'men',   sizes:['S','M','L','XL','XXL'], colors:['#1a1a28','#333'],          tag:'hot',      stock:25, rating:4.6, reviewCount:87,  description:'Premium wool-blend blazer for the modern gentleman.' },
        { name:'Boho Crop Top',          price:699,  oldPrice:999,  sub:'women', sizes:['XS','S','M','L'],       colors:['#fff','#ff6b9d','#f5a623'], tag:'trending', stock:60, rating:4.9, reviewCount:203, description:'Trendy boho-style crop top with unique embroidery.' },
        { name:'Men\'s Kurta Set',       price:1599, oldPrice:2299, sub:'men',   sizes:['S','M','L','XL','XXL'], colors:['#fff','#4ecdc4','#c678f5'], tag:'new',      stock:35, rating:4.7, reviewCount:156, description:'Premium cotton kurta set with matching pyjama.' },
        { name:'Women\'s Palazzo Pants', price:899,  oldPrice:1299, sub:'women', sizes:['XS','S','M','L','XL'], colors:['#1a1a28','#c678f5'],        tag:'sale',     stock:45, rating:4.5, reviewCount:98,  description:'Flowy palazzo pants in premium crepe fabric.' },
        { name:'Casual Denim Jacket',    price:1799, oldPrice:2499, sub:'men',   sizes:['S','M','L','XL'],       colors:['#4a90d9','#1a1a28'],        tag:'trending', stock:20, rating:4.4, reviewCount:67,  description:'Classic denim jacket with modern cuts.' },
        { name:'Embroidered Saree',      price:3499, oldPrice:4999, sub:'women', sizes:['Free Size'],            colors:['#ff6b9d','#c678f5'],        tag:'hot',      stock:15, rating:4.9, reviewCount:312, description:'Handcrafted embroidered saree in luxurious fabric.' },
        { name:'Men\'s Linen Shirt',     price:999,  oldPrice:1499, sub:'men',   sizes:['S','M','L','XL','XXL'], colors:['#fff','#4ecdc4'],           tag:'new',      stock:55, rating:4.6, reviewCount:143, description:'Premium linen shirt for summer.' },
      ]);
      console.log('👗  Sample clothes seeded');
    }

    // Sample chosematics
    const choCount = await Chosematics.countDocuments();
    if (!choCount) {
      await Chosematics.insertMany([
        { name:'Crystal Drop Earrings',   price:599,  oldPrice:899,  sub:'earrings',   colors:['#c678f5','#f5a623','#ff6b9d'], tag:'hot',      stock:80, rating:4.9, reviewCount:234, description:'Stunning crystal drop earrings.' },
        { name:'Gold Layered Necklace',   price:1299, oldPrice:1899, sub:'necklaces',  colors:['#f5a623','#C0C0C0'],           tag:'new',      stock:40, rating:4.8, reviewCount:189, description:'Elegant 3-layered necklace in gold-plated finish.' },
        { name:'Pearl Beaded Bracelet',   price:399,  oldPrice:699,  sub:'bracelets',  colors:['#fff','#f5a623'],              tag:'trending', stock:90, rating:4.7, reviewCount:156, description:'Delicate pearl bracelet with gold accent beads.' },
        { name:'Statement Ring Set',      price:699,  oldPrice:999,  sub:'rings',      sizes:['5','6','7','8','9'],            tag:'new',      stock:60, rating:4.6, reviewCount:98,  description:'Set of 5 statement rings in mixed metals.' },
        { name:'Kundan Earrings',         price:849,  oldPrice:1299, sub:'earrings',   colors:['#f5a623','#ff6b9d'],           tag:'hot',      stock:50, rating:4.9, reviewCount:267, description:'Traditional kundan earrings with modern design.' },
        { name:'Oxidised Silver Necklace',price:999,  oldPrice:1499, sub:'necklaces',  colors:['#C0C0C0'],                     tag:'new',      stock:35, rating:4.7, reviewCount:134, description:'Handcrafted oxidised silver necklace.' },
        { name:'Charm Bangle Set',        price:549,  oldPrice:849,  sub:'bracelets',  sizes:['2.4','2.6','2.8'],              tag:'sale',     stock:70, rating:4.5, reviewCount:89,  description:'Set of 6 mixed metal charm bangles.' },
        { name:'Floral Hair Accessories', price:299,  oldPrice:499,  sub:'accessories',colors:['#ff6b9d','#c678f5','#f5a623'],tag:'trending', stock:100, rating:4.8, reviewCount:178, description:'Cute floral hair clips and pins set.' },
      ]);
      console.log('💎  Sample chosematics seeded');
    }

    console.log('🌱  Database seeding complete');
  } catch (err) {
    console.error('Seed error:', err.message);
  }
}

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────
app.listen(CONFIG.PORT, () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   GRWM GADEKAR — Backend Started 🚀     ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Frontend  →  http://localhost:${CONFIG.PORT}       ║`);
  console.log(`║  API       →  http://localhost:${CONFIG.PORT}/api   ║`);
  console.log(`║  DB        →  ${CONFIG.MONGO_URI.slice(0,28)}...   ║`);
  console.log('╚══════════════════════════════════════════╝\n');
});

module.exports = app;