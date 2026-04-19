import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import User from '../models/User.js';

// Generate JWT for Admin
const generateAdminToken = (id) => {
  return jwt.sign({ id, role: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Generate JWT for User
const generateUserToken = (id, role = 'customer') => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register new admin (Only for initial setup or seed)
// @route   POST /api/admin/register
// @access  Public
export const registerAdmin = async (req, res) => {
  const { name, email, password, adminSecretKey, secretKey } = req.body;
  const providedSecret = adminSecretKey || secretKey;

  if (!email || !password || !providedSecret) {
    return res.status(400).json({ message: 'Please add all fields including admin secret key' });
  }

  // Validate admin secret key
  if (providedSecret !== process.env.ADMIN_REGISTRATION_SECRET) {
    return res.status(403).json({ message: 'Invalid admin registration secret key' });
  }

  // Check if admin exists
  const adminExists = await Admin.findOne({ email });

  if (adminExists) {
    return res.status(400).json({ message: 'Admin already exists' });
  }

  // Create admin
  const admin = await Admin.create({
    name: typeof name === 'string' ? name : undefined,
    email,
    password,
  });

  if (admin) {
    res.status(201).json({
      _id: admin.id,
      email: admin.email,
      token: generateAdminToken(admin.id),
    });
  } else {
    res.status(400).json({ message: 'Invalid admin data' });
  }
};

// @desc    Authenticate a admin
// @route   POST /api/admin/login
// @access  Public
export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  // Check for admin email
  const admin = await Admin.findOne({ email });

  if (admin && (await admin.comparePassword(password))) {
    res.json({
      _id: admin.id,
      email: admin.email,
      token: generateAdminToken(admin.id),
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
};

// @desc    Get admin data
// @route   GET /api/admin/me
// @access  Private
export const getMe = async (req, res) => {
  const admin = await Admin.findById(req.admin.id).select('-password');
  if (!admin) {
    return res.status(404).json({ message: 'Admin not found' });
  }
  res.status(200).json({
    _id: admin.id,
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
    profileImage: admin.profileImage,
    address: admin.address,
    createdAt: admin.createdAt,
  });
};

// @desc    Update admin profile
// @route   PUT /api/admin/profile
// @access  Private
export const updateAdminProfile = async (req, res) => {
  const admin = await Admin.findById(req.admin.id);

  if (!admin) {
    return res.status(404).json({ message: 'Admin not found' });
  }

  if (req.body.name !== undefined) admin.name = req.body.name;
  if (req.body.phone !== undefined) admin.phone = req.body.phone;
  if (req.body.address !== undefined) admin.address = req.body.address;

  if (req.body.currentPassword && req.body.newPassword) {
    const isMatch = await admin.comparePassword(req.body.currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    admin.password = req.body.newPassword;
  }

  const updated = await admin.save();

  res.json({
    _id: updated.id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    profileImage: updated.profileImage,
    address: updated.address,
    token: generateAdminToken(updated.id),
  });
};

// @desc    Upload admin profile image
// @route   POST /api/admin/profile/upload
// @access  Private
export const uploadAdminProfileImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const admin = await Admin.findById(req.admin.id);
  if (!admin) {
    return res.status(404).json({ message: 'Admin not found' });
  }

  const imageUrl = `/uploads/profiles/${req.file.filename}`;
  admin.profileImage = imageUrl;
  await admin.save();

  res.json({ profileImage: imageUrl });
};

// @desc    Register new user (Customer/Vendor/Employee)
// @route   POST /api/users/register
// @access  Public
export const registerUser = async (req, res) => {
  const { firstName, lastName, email, password, phone, role } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: 'Please fill all required fields' });
  }

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: 'User with this email already exists' });
  }

  try {
    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phone: phone || '',
      role: role || 'customer'
    });

    if (user) {
      // Update last login
      await user.updateLastLogin();

      res.status(201).json({
        _id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        token: generateUserToken(user.id, user.role),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Check for user email
  const user = await User.findOne({ email });

  if (user && (await user.comparePassword(password))) {
    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        message: `Account is ${user.status}. Please contact support.`
      });
    }

    // Update last login
    await user.updateLastLogin();

    res.json({
      _id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phone: user.phone,
      token: generateUserToken(user.id, user.role),
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
};

// @desc    Get user profile
// @route   GET /api/users/me
// @access  Private (User)
export const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');

  if (user) {
    res.json({
      _id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      status: user.status,
      emailVerified: user.emailVerified,
      preferences: user.preferences,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private (User)
export const updateUserProfile = async (req, res) => {
  const user = await User.findById(req.user.id);

  if (user) {
    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    user.phone = req.body.phone || user.phone;
    user.address = req.body.address || user.address;
    user.preferences = req.body.preferences || user.preferences;

    // Don't allow email change without verification
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser.id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone,
      token: generateUserToken(updatedUser.id, updatedUser.role),
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (Admin)
export const getUsers = async (req, res) => {
  const { role, status } = req.query;
  let query = {};

  if (role) query.role = role;
  if (status) query.status = status;

  const users = await User.find(query).select('-password').sort({ createdAt: -1 });
  res.json(users);
};

// @desc    Update user status (Admin only)
// @route   PUT /api/users/:id/status
// @access  Private (Admin)
export const updateUserStatus = async (req, res) => {
  const { status } = req.body;

  if (!['active', 'inactive', 'suspended'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  const user = await User.findById(req.params.id);

  if (user) {
    user.status = status;
    await user.save();

    res.json({
      message: `User status updated to ${status} successfully`,
      user: {
        _id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private (Admin)
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.deleteOne();
    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
