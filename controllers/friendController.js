const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');

// Send friend request
const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.userId;
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Receiver ID is required'
      });
    }

    if (senderId === receiverId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Request',
        message: 'You cannot send a friend request to yourself'
      });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Check if request already exists
    const existingRequest = await FriendRequest.getExistingRelationship(senderId, receiverId);
    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        if (existingRequest.sender.toString() === senderId) {
          return res.status(400).json({
            success: false,
            error: 'Request Exists',
            message: 'You already sent a friend request to this user'
          });
        } else {
          return res.status(400).json({
            success: false,
            error: 'Request Exists',
            message: 'This user already sent you a friend request'
          });
        }
      } else if (existingRequest.status === 'accepted') {
        return res.status(400).json({
          success: false,
          error: 'Already Friends',
          message: 'You are already friends with this user'
        });
      }
    }

    // Create friend request
    const friendRequest = new FriendRequest({
      sender: senderId,
      receiver: receiverId,
      status: 'pending'
    });

    await friendRequest.save();

    // Populate sender for response
    await friendRequest.populate('sender', 'fullname email');

    res.status(201).json({
      success: true,
      message: 'Friend request sent successfully',
      data: { friendRequest }
    });

  } catch (error) {
    console.error('Error sending friend request:', error);
    
    if (error.name === 'MongoServerError' && error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate Request',
        message: 'Friend request already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to send friend request'
    });
  }
};

// Get pending friend requests
const getPendingRequests = async (req, res) => {
  try {
    const userId = req.userId;

    const pendingRequests = await FriendRequest.findPendingForUser(userId);

    res.json({
      success: true,
      data: { pendingRequests }
    });

  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch pending requests'
    });
  }
};

// Get sent friend requests
const getSentRequests = async (req, res) => {
  try {
    const userId = req.userId;

    const sentRequests = await FriendRequest.find({
      sender: userId,
      status: 'pending'
    }).populate('receiver', 'fullname email').sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { sentRequests }
    });

  } catch (error) {
    console.error('Error fetching sent requests:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch sent requests'
    });
  }
};

// Accept friend request
const acceptFriendRequest = async (req, res) => {
  try {
    const userId = req.userId;
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Request ID is required'
      });
    }

    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Friend request not found'
      });
    }

    if (friendRequest.receiver.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only accept requests sent to you'
      });
    }

    if (friendRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Invalid Status',
        message: 'Friend request is not pending'
      });
    }

    friendRequest.status = 'accepted';
    friendRequest.updatedAt = new Date();
    await friendRequest.save();

    await friendRequest.populate('sender', 'fullname email');

    res.json({
      success: true,
      message: 'Friend request accepted',
      data: { friendRequest }
    });

  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to accept friend request'
    });
  }
};

// Decline friend request
const declineFriendRequest = async (req, res) => {
  try {
    const userId = req.userId;
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Request ID is required'
      });
    }

    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Friend request not found'
      });
    }

    if (friendRequest.receiver.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only decline requests sent to you'
      });
    }

    friendRequest.status = 'declined';
    friendRequest.updatedAt = new Date();
    await friendRequest.save();

    res.json({
      success: true,
      message: 'Friend request declined'
    });

  } catch (error) {
    console.error('Error declining friend request:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to decline friend request'
    });
  }
};

// Cancel friend request
const cancelFriendRequest = async (req, res) => {
  try {
    const userId = req.userId;
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Request ID is required'
      });
    }

    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Friend request not found'
      });
    }

    if (friendRequest.sender.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only cancel requests sent by you'
      });
    }

    friendRequest.status = 'cancelled';
    friendRequest.updatedAt = new Date();
    await friendRequest.save();

    res.json({
      success: true,
      message: 'Friend request cancelled'
    });

  } catch (error) {
    console.error('Error cancelling friend request:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to cancel friend request'
    });
  }
};

// Get friends list
const getFriends = async (req, res) => {
  try {
    const userId = req.userId;

    const friendsData = await FriendRequest.findFriends(userId);
    
    const friends = friendsData.map(request => {
      // Return the other user in the friendship
      if (request.sender._id.toString() === userId) {
        return {
          userId: request.receiver._id,
          fullname: request.receiver.fullname,
          email: request.receiver.email,
          addedAt: request.updatedAt
        };
      } else {
        return {
          userId: request.sender._id,
          fullname: request.sender.fullname,
          email: request.sender.email,
          addedAt: request.updatedAt
        };
      }
    });

    res.json({
      success: true,
      data: { friends }
    });

  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch friends'
    });
  }
};

// Remove friend
const removeFriend = async (req, res) => {
  try {
    const userId = req.userId;
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Friend ID is required'
      });
    }

    const friendRequest = await FriendRequest.findOne({
      $or: [
        { sender: userId, receiver: friendId, status: 'accepted' },
        { sender: friendId, receiver: userId, status: 'accepted' }
      ]
    });

    if (!friendRequest) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Friendship not found'
      });
    }

    await FriendRequest.findByIdAndDelete(friendRequest._id);

    res.json({
      success: true,
      message: 'Friend removed successfully'
    });

  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to remove friend'
    });
  }
};

module.exports = {
  sendFriendRequest,
  getPendingRequests,
  getSentRequests,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  getFriends,
  removeFriend
};

