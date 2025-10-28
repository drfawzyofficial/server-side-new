const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateUser, requireAdmin } = require('../middleware/auth');

// User management routes (require authentication and admin role)
router.get('/users', authenticateUser, requireAdmin, userController.getUsers);
router.get('/users/:id', authenticateUser, requireAdmin, userController.getUserById);
router.post('/users', authenticateUser, requireAdmin, userController.createUser);
router.put('/users/:id', authenticateUser, requireAdmin, userController.updateUser);
router.delete('/users/:id', authenticateUser, requireAdmin, userController.deleteUser);

module.exports = router;
