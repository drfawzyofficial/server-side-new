const User = require('../models/User');

// User management controller
const getUsers = async (req, res) => {
  try {
    // Simulate database delay for demonstration
    setTimeout(async () => {
      try {
        const users = await User.find({}, 'fullname email role isActive createdAt lastLogin').sort({ createdAt: -1 });
        
        res.json({
          success: true,
          data: {
            users: users.map(user => ({
              id: user._id.toString(),
              fullname: user.fullname,
              email: user.email,
              role: user.role,
              isActive: user.isActive,
              createdAt: user.createdAt,
              lastLogin: user.lastLogin
            })),
            total: users.length
          }
        });
      } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
          success: false,
          error: 'DatabaseError',
          message: 'Database connection failed'
        });
      }
    }, 1000);
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch users'
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id, 'fullname email role isActive createdAt lastLogin');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User Not Found',
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          fullname: user.fullname,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch user'
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { fullname, email, password, role = 'user' } = req.body;
    
    // Validation
    if (!fullname || fullname.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Full name must be at least 2 characters long'
      });
    }
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Valid email is required'
      });
    }
    
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Password must be at least 6 characters long'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User Already Exists',
        message: 'An account with this email already exists'
      });
    }
    
    // Create new user
    const newUser = new User({
      fullname: fullname.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      role: role
    });
    
    const savedUser = await newUser.save();
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: savedUser._id.toString(),
          fullname: savedUser.fullname,
          email: savedUser.email,
          role: savedUser.role,
          isActive: savedUser.isActive,
          createdAt: savedUser.createdAt
        }
      }
    });
    
  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: firstError.message
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'User Already Exists',
        message: 'An account with this email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create user'
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullname, email, role, isActive } = req.body;
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User Not Found',
        message: 'User not found'
      });
    }
    
    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email Already Exists',
          message: 'An account with this email already exists'
        });
      }
    }
    
    // Update user data
    if (fullname) user.fullname = fullname.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: {
          id: user._id.toString(),
          fullname: user.fullname,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          updatedAt: user.updatedAt
        }
      }
    });
    
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: firstError.message
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Email Already Exists',
        message: 'An account with this email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update user'
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User Not Found',
        message: 'User not found'
      });
    }
    
    await User.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete user'
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
