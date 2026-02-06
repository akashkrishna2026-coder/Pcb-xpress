import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import { sendResetOtpEmail } from '../lib/mail.js';

const router = Router();

function tryDecodeToken(req) {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    try {
      return jwt.verify(parts[1], process.env.JWT_SECRET || 'dev_secret');
    } catch (_) {}
  }
  return null;
}

function requireUser(req, res, next) {
  const decoded = tryDecodeToken(req);
  if (!decoded) return res.status(401).json({ message: 'Unauthorized' });
  req.user = decoded;
  next();
}

function requireAdmin(req, res, next) {
  const decoded = tryDecodeToken(req);
  if (!decoded || decoded.role !== 'admin') {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  req.user = decoded;
  next();
}

function requireMfg(req, res, next) {
  const decoded = tryDecodeToken(req);
  if (!decoded || decoded.role !== 'mfg') {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  req.user = decoded;
  next();
}

function signToken(user) {
  const payload = { sub: user._id.toString(), email: user.email, role: user.role || 'user' };
  return jwt.sign(payload, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
}

function formatTimestampForDisplay(d) {
  if (!d) return null;
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(dt.getDate());
  const month = pad(dt.getMonth() + 1);
  const year = dt.getFullYear();
  const hours = pad(dt.getHours());
  const mins = pad(dt.getMinutes());
  const secs = pad(dt.getSeconds());
  return `${day}/${month}/${year} ${hours}:${mins}:${secs}`;
}

const SHIFT_START_HOUR = 9;

// Get today's date in YYYY-MM-DD format
function getTodayDateString(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isLateLogin(dateInput) {
  if (!dateInput) return false;
  const ts = new Date(dateInput);
  const shiftStart = new Date(ts);
  shiftStart.setHours(SHIFT_START_HOUR, 0, 0, 0);
  return ts > shiftStart;
}

function serializeAttendance(entry) {
  if (!entry) return null;
  const src = entry.toObject ? entry.toObject() : entry;
  return {
    id: src._id,
    date: src.date || null,
    userId: src.user,
    name: src.name,
    email: src.email,
    loginId: src.loginId || null,
    operatorName: src.operatorName || '',
    mfgRole: src.mfgRole || '',
    workCenter: src.workCenter || '',
    role: src.role || '',
    loggedInAt: src.loggedInAt,
    logoutAt: src.logoutAt || null,
    loginCount: src.loginCount || 1,
    ip: src.ip || '',
    userAgent: src.userAgent || '',
    breaks: Array.isArray(src.breaks) ? src.breaks : [],
    movements: Array.isArray(src.movements) ? src.movements : [],
    lateLogin: isLateLogin(src.loggedInAt),
  };
}

async function recordLogin(user, req) {
  try {
    const now = new Date();
    const todayStr = getTodayDateString(now);
    const ip = (req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip || '').split(',')[0].trim();
    const ua = req.get && req.get('User-Agent') ? req.get('User-Agent') : '';
    
    // Update user login history
    user.lastLogin = now;
    user.loginHistory = Array.isArray(user.loginHistory) ? user.loginHistory : [];
    user.loginHistory.unshift({ at: now, ip, userAgent: ua });
    if (user.loginHistory.length > 50) user.loginHistory = user.loginHistory.slice(0, 50);
    
    // Check for existing attendance record for today
    const existingAttendance = await Attendance.findOne({ user: user._id, date: todayStr });
    
    let attendancePromise;
    if (existingAttendance) {
      // Update existing record - increment login count, update IP/UA
      existingAttendance.loginCount = (existingAttendance.loginCount || 1) + 1;
      existingAttendance.ip = ip;
      existingAttendance.userAgent = ua;
      attendancePromise = existingAttendance.save().catch((err) => {
        console.error('Failed to update attendance:', err);
        return null;
      });
    } else {
      // Create new record for today
      const attendancePayload = {
        user: user._id,
        date: todayStr,
        name: user.name || '',
        email: user.email || '',
        loginId: user.loginId || '',
        mfgRole: user.mfgRole || '',
        workCenter: user.workCenter || '',
        role: user.role || '',
        loggedInAt: now,
        loginCount: 1,
        ip,
        userAgent: ua,
      };
      attendancePromise = Attendance.create(attendancePayload).catch((err) => {
        console.error('Failed to record attendance:', err);
        return null;
      });
    }
    
    const saveUserPromise = user.save();
    const [savedUser] = await Promise.all([saveUserPromise, attendancePromise]);
    return savedUser;
  } catch (e) {
    console.error('Failed to record login:', e);
    return user;
  }
}

// Sales signup
router.post('/sales/signup', async (req, res) => {
  try {
    const { name, email, password, phone, department, experience, address, notes } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new sales user
    const salesUser = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      role: 'sales',
      department,
      experience,
      address,
      notes,
      isActive: false, // Requires admin approval
      createdAt: new Date()
    });

    await salesUser.save();

    // Remove password from response
    const { password: _, ...userWithoutPassword } = salesUser.toObject();

    res.status(201).json({
      message: 'Sales account created successfully. Please wait for admin approval.',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Sales signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sales login
router.post('/sales/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find sales user
    const salesUser = await User.findOne({ 
      email, 
      role: 'sales'
    });

    if (!salesUser) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is active
    if (!salesUser.isActive) {
      return res.status(401).json({ error: 'Account is not active. Please wait for admin approval.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, salesUser.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        sub: salesUser._id.toString(), 
        email: salesUser.email, 
        role: 'sales' 
      },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );

    // record login timing
    await recordLogin(salesUser, req);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = salesUser.toObject();

    res.json({
      message: 'Sales login successful',
      token,
      salesUser: userWithoutPassword,
      lastLogin: salesUser.lastLogin || null,
      lastLoginFormatted: formatTimestampForDisplay(salesUser.lastLogin || null)
    });
  } catch (error) {
    console.error('Sales login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name = '', email, password, gstNo = '', phone } = req.body || {};
    if (!email || !password || !phone) return res.status(400).json({ error: 'Email, password and phone number are required' });
    
    // Validate GST number (optional, max 15 chars, alphanumeric)
    if (gstNo && (!/^[A-Za-z0-9]{1,15}$/.test(gstNo))) {
      return res.status(400).json({ error: 'GST number must be max 15 characters with letters and numbers only' });
    }
    
    // Validate phone number (required, exactly 10 digits)
    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Phone number is required and must be exactly 10 digits' });
    }
    
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already in use' });
    if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ 
      name, 
      email: email.toLowerCase(), 
      password: hash, 
      role: 'user',
      gstNo: gstNo.trim(),
      phone: phone.trim()
    });
    const token = signToken(user);
    res.status(201).json({
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        gstNo: user.gstNo,
        phone: user.phone,
        createdAt: user.createdAt 
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user);
    // record login timing
    await recordLogin(user, req);

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        gstNo: user.gstNo,
        phone: user.phone,
        createdAt: user.createdAt 
      },
      lastLogin: user.lastLogin || null,
      lastLoginFormatted: formatTimestampForDisplay(user.lastLogin || null)
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Unauthorized' });
    const decoded = jwt.verify(parts[1], process.env.JWT_SECRET || 'dev_secret');
    const user = await User.findById(decoded.sub).select('_id name email role createdAt');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt } });
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// POST /api/auth/admin/login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const user = await User.findOne({ email: email.toLowerCase(), role: 'admin' });
    if (!user) return res.status(401).json({ error: 'Invalid admin credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid admin credentials' });
    const token = signToken(user);
    await recordLogin(user, req);
    res.json({ token, admin: { id: user._id, email: user.email, role: user.role, createdAt: user.createdAt }, lastLogin: user.lastLogin || null, lastLoginFormatted: formatTimestampForDisplay(user.lastLogin || null) });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/mfg/login
router.post('/mfg/login', async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    console.log('MFG Login Attempt:', { identifier, passwordLength: password ? password.length : 0 });
    if (!identifier || !password) return res.status(400).json({ error: 'Identifier and password are required' });

    const normalized = String(identifier).trim().toLowerCase();
    console.log('Normalized identifier:', normalized);
    const query = {
      role: 'mfg',
      isActive: { $ne: false },
      $or: [{ loginId: normalized }, { email: normalized }],
    };
    console.log('Query:', JSON.stringify(query, null, 2));

    const user = await User.findOne(query);
    console.log('User found:', user ? { id: user._id, email: user.email, loginId: user.loginId, mfgRole: user.mfgRole, isActive: user.isActive } : 'No user found');
    if (!user) return res.status(401).json({ error: 'Invalid manufacturing credentials' });
    const ok = await bcrypt.compare(password, user.password);
    console.log('Password compare result:', ok);
    if (!ok) return res.status(401).json({ error: 'Invalid manufacturing credentials' });

    const token = signToken(user);
    await recordLogin(user, req);
    res.json({
      token,
      operator: {
        id: user._id,
        name: user.name,
        email: user.email,
        loginId: user.loginId || null,
        role: user.mfgRole || 'operator',
        workCenter: user.workCenter || '',
        permissions: Array.isArray(user.permissions) ? user.permissions : [],
        createdAt: user.createdAt,
      },
      lastLogin: user.lastLogin || null,
      lastLoginFormatted: formatTimestampForDisplay(user.lastLogin || null)
    });
  } catch (err) {
    console.error('MFG Login Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot — request a password reset OTP sent by email
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const normalized = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalized });

    // Always respond success to avoid user enumeration
    if (!user) return res.json({ ok: true });

    // generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const hash = await bcrypt.hash(otp, 10);
    user.resetOtpHash = hash;
    user.resetOtpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    user.resetOtpAttempts = 0;
    await user.save();

    try {
      await sendResetOtpEmail(user.email, otp, { name: user.name, expireMinutes: 15 });
    } catch (e) {
      console.error('Failed to send reset email:', e);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/reset-otp — reset password using OTP
router.post('/reset-otp', async (req, res) => {
  try {
    const { email, otp, password } = req.body || {};
    if (!email || !otp || !password) return res.status(400).json({ error: 'Email, otp and new password are required' });
    const normalized = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalized });
    if (!user || !user.resetOtpHash || !user.resetOtpExpires) return res.status(400).json({ error: 'Invalid or expired code' });
    if (new Date() > new Date(user.resetOtpExpires)) return res.status(400).json({ error: 'Invalid or expired code' });
    if ((user.resetOtpAttempts || 0) >= 5) return res.status(429).json({ error: 'Too many attempts' });

    const ok = await bcrypt.compare(String(otp), user.resetOtpHash);
    if (!ok) {
      user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ error: 'Invalid code' });
    }

    if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const passHash = await bcrypt.hash(password, 10);
    user.password = passHash;
    user.resetOtpHash = null;
    user.resetOtpExpires = null;
    user.resetOtpAttempts = 0;
    await user.save();
    return res.json({ ok: true });
  } catch (err) {
    console.error('Reset OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/admin/users
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const filter = {};
    if (req.query.role) filter.role = req.query.role;

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('_id name email role createdAt loginId mfgRole workCenter isActive permissions')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const pages = Math.max(1, Math.ceil(total / limit));

    res.json({ users, page, limit, total, pages });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PATCH /api/auth/admin/users/:userId/activate - Toggle user active status (approve/deactivate)
router.patch('/admin/users/:userId/activate', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isActive = isActive;
    if (isActive) {
      user.approvedAt = new Date();
      user.approvedBy = req.user.sub;
    }
    await user.save();

    res.json({
      message: isActive ? 'User activated successfully' : 'User deactivated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        approvedAt: user.approvedAt,
      },
    });
  } catch (err) {
    console.error('Toggle user active error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/admin/attendance - supports date filtering
router.get('/admin/attendance', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const role = String(req.query.role || 'mfg').trim();
    const search = String(req.query.search || '').trim();
    const dateFilter = String(req.query.date || '').trim(); // YYYY-MM-DD or 'today'
    const showHistory = req.query.history === 'true';
    const normalizeDateParam = (value) => {
      if (!value) return null;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      return getTodayDateString(d);
    };
    const startDate = normalizeDateParam(req.query.startDate);
    const endDate = normalizeDateParam(req.query.endDate);

    const filter = {};
    if (role && role !== 'all') {
      filter.role = role;
    }
    if (search) {
      const rx = new RegExp(search, 'i');
      filter.$or = [{ name: rx }, { email: rx }, { loginId: rx }, { mfgRole: rx }, { workCenter: rx }];
    }
    
    // Date filtering - prioritize explicit ranges, otherwise fall back to legacy single-date filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    } else if (!showHistory) {
      const targetDate = dateFilter === 'today' || !dateFilter ? getTodayDateString() : dateFilter;
      filter.date = targetDate;
    } else if (dateFilter && dateFilter !== 'all') {
      filter.date = dateFilter === 'today' ? getTodayDateString() : dateFilter;
    }

    const total = await Attendance.countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, pages);
    const entries = await Attendance.find(filter)
      .sort({ date: -1, loggedInAt: -1 })
      .skip((safePage - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      entries: entries.map((entry) => serializeAttendance(entry)),
      total,
      page: safePage,
      limit,
      pages,
      date: startDate || endDate ? 'range' : filter.date || 'all',
      startDate: startDate || null,
      endDate: endDate || null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load attendance' });
  }
});

router.post('/admin/attendance/:attendanceId/breaks', requireAdmin, async (req, res) => {
  try {
    const attendanceId = req.params.attendanceId;
    const type = String(req.body?.type || '').toLowerCase();
    const note = String(req.body?.note || '').trim();
    if (!['start', 'end'].includes(type)) {
      return res.status(400).json({ error: 'Invalid break type' });
    }

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) return res.status(404).json({ error: 'Attendance entry not found' });

    attendance.breaks = Array.isArray(attendance.breaks) ? attendance.breaks : [];
    attendance.breaks.push({ at: new Date(), type, note, by: req.user?.sub || req.user?._id || null });

    await attendance.save();
    res.json({ entry: serializeAttendance(attendance) });
  } catch (err) {
    console.error('Failed to record break:', err);
    res.status(500).json({ error: 'Failed to record break' });
  }
});

router.post('/admin/attendance/:attendanceId/movements', requireAdmin, async (req, res) => {
  try {
    const attendanceId = req.params.attendanceId;
    const type = String(req.body?.type || '').toLowerCase();
    const note = String(req.body?.note || '').trim();
    if (!['out', 'in'].includes(type)) {
      return res.status(400).json({ error: 'Invalid movement type' });
    }

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) return res.status(404).json({ error: 'Attendance entry not found' });

    attendance.movements = Array.isArray(attendance.movements) ? attendance.movements : [];
    attendance.movements.push({ at: new Date(), type, note, by: req.user?.sub || req.user?._id || null });

    await attendance.save();
    res.json({ entry: serializeAttendance(attendance) });
  } catch (err) {
    console.error('Failed to record movement:', err);
    res.status(500).json({ error: 'Failed to record movement' });
  }
});

// Get today's attendance for the logged-in mfg operator
router.get('/mfg/attendance/me', requireMfg, async (req, res) => {
  try {
    const todayStr = getTodayDateString();
    const attendance = await Attendance.findOne({ user: req.user.sub, date: todayStr });
    if (!attendance) return res.status(404).json({ error: 'No attendance record found for today' });
    return res.json({ entry: serializeAttendance(attendance) });
  } catch (err) {
    console.error('Failed to load attendance for operator:', err);
    res.status(500).json({ error: 'Failed to load attendance' });
  }
});

// Get attendance history for the logged-in mfg operator
router.get('/mfg/attendance/history', requireMfg, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const attendance = await Attendance.find({ user: req.user.sub })
      .sort({ date: -1 })
      .limit(limit);
    return res.json({ entries: attendance.map(serializeAttendance) });
  } catch (err) {
    console.error('Failed to load attendance history:', err);
    res.status(500).json({ error: 'Failed to load attendance history' });
  }
});

router.post('/mfg/attendance/me/breaks', requireMfg, async (req, res) => {
  try {
    const todayStr = getTodayDateString();
    const type = String(req.body?.type || '').toLowerCase();
    const note = String(req.body?.note || '').trim();
    if (!['start', 'end'].includes(type)) {
      return res.status(400).json({ error: 'Invalid break type' });
    }

    const attendance = await Attendance.findOne({ user: req.user.sub, date: todayStr });
    if (!attendance) return res.status(404).json({ error: 'No attendance record found for today' });

    attendance.breaks = Array.isArray(attendance.breaks) ? attendance.breaks : [];
    attendance.breaks.push({ at: new Date(), type, note, by: req.user?.sub || null });

    await attendance.save();
    return res.json({ entry: serializeAttendance(attendance) });
  } catch (err) {
    console.error('Failed to record break (mfg):', err);
    res.status(500).json({ error: 'Failed to record break' });
  }
});

router.post('/mfg/attendance/me/movements', requireMfg, async (req, res) => {
  try {
    const todayStr = getTodayDateString();
    const type = String(req.body?.type || '').toLowerCase();
    const note = String(req.body?.note || '').trim();
    if (!['out', 'in'].includes(type)) {
      return res.status(400).json({ error: 'Invalid movement type' });
    }

    const attendance = await Attendance.findOne({ user: req.user.sub, date: todayStr });
    if (!attendance) return res.status(404).json({ error: 'No attendance record found for today' });

    attendance.movements = Array.isArray(attendance.movements) ? attendance.movements : [];
    attendance.movements.push({ at: new Date(), type, note, by: req.user?.sub || null });

    await attendance.save();
    return res.json({ entry: serializeAttendance(attendance) });
  } catch (err) {
    console.error('Failed to record movement (mfg):', err);
    res.status(500).json({ error: 'Failed to record movement' });
  }
});

// Set operator name for multi-operator logins (e.g., "Ajesh & Ashik" -> "Ajesh")
router.post('/mfg/attendance/me/operator-name', requireMfg, async (req, res) => {
  try {
    const todayStr = getTodayDateString();
    const operatorName = String(req.body?.operatorName || '').trim();
    if (!operatorName) {
      return res.status(400).json({ error: 'Operator name is required' });
    }

    const attendance = await Attendance.findOne({ user: req.user.sub, date: todayStr });
    if (!attendance) return res.status(404).json({ error: 'No attendance record found for today' });

    attendance.operatorName = operatorName;
    await attendance.save();
    return res.json({ entry: serializeAttendance(attendance) });
  } catch (err) {
    console.error('Failed to set operator name:', err);
    res.status(500).json({ error: 'Failed to set operator name' });
  }
});

// GET /api/auth/mfg/me
router.get('/mfg/me', requireMfg, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select('_id name email loginId mfgRole workCenter permissions role createdAt isActive');
    if (!user || user.role !== 'mfg' || user.isActive === false) {
      return res.status(404).json({ error: 'Operator not found' });
    }
    res.json({
      operator: {
        id: user._id,
        name: user.name,
        email: user.email,
        loginId: user.loginId || null,
        role: user.mfgRole || 'operator',
        workCenter: user.workCenter || '',
        permissions: Array.isArray(user.permissions) ? user.permissions : [],
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
