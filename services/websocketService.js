const jwt = require('jsonwebtoken');
const { Employee } = require('../models');

class WebSocketService {
  constructor(io) {
    this.io = io;
    this.authenticatedUsers = new Map(); // Map socket.id to user data
    this.userSockets = new Map(); // Map user.id to socket.id
    this.setupSocketEvents();
  }

  setupSocketEvents() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', async (token) => {
        try {
          await this.authenticateSocket(socket, token);
        } catch (error) {
          console.error('Socket authentication failed:', error);
          socket.emit('auth_error', { message: 'Authentication failed' });
          socket.disconnect();
        }
      });

      // Handle joining rooms
      socket.on('join_room', (room) => {
        const user = this.authenticatedUsers.get(socket.id);
        if (user) {
          socket.join(room);
          console.log(`User ${user.name} joined room: ${room}`);
          socket.emit('joined_room', { room });
        }
      });

      // Handle leaving rooms
      socket.on('leave_room', (room) => {
        const user = this.authenticatedUsers.get(socket.id);
        if (user) {
          socket.leave(room);
          console.log(`User ${user.name} left room: ${room}`);
          socket.emit('left_room', { room });
        }
      });

      // Handle task updates
      socket.on('task_update', (taskData) => {
        const user = this.authenticatedUsers.get(socket.id);
        if (user) {
          this.broadcastTaskUpdate(taskData, user);
        }
      });

      // Handle task comments
      socket.on('task_comment', (commentData) => {
        const user = this.authenticatedUsers.get(socket.id);
        if (user) {
          this.broadcastTaskComment(commentData, user);
        }
      });

      // Handle typing indicators
      socket.on('typing_start', (data) => {
        const user = this.authenticatedUsers.get(socket.id);
        if (user && data.taskId) {
          socket.to(`task_${data.taskId}`).emit('user_typing', {
            userId: user.id,
            userName: user.name,
            taskId: data.taskId
          });
        }
      });

      socket.on('typing_stop', (data) => {
        const user = this.authenticatedUsers.get(socket.id);
        if (user && data.taskId) {
          socket.to(`task_${data.taskId}`).emit('user_stopped_typing', {
            userId: user.id,
            taskId: data.taskId
          });
        }
      });

      // Handle user presence
      socket.on('user_online', () => {
        const user = this.authenticatedUsers.get(socket.id);
        if (user) {
          this.broadcastUserPresence(user, 'online');
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error from ${socket.id}:`, error);
      });
    });
  }

  async authenticateSocket(socket, token) {
    if (!token) {
      throw new Error('No token provided');
    }

    // Remove 'Bearer ' prefix if present
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    try {
      const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
      const user = await Employee.findByPk(decoded.id, {
        attributes: ['id', 'name', 'email', 'role', 'department_id'],
        include: ['department']
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Store user data
      this.authenticatedUsers.set(socket.id, user);
      this.userSockets.set(user.id, socket.id);

      // Join user to their department room
      if (user.department_id) {
        socket.join(`department_${user.department_id}`);
      }

      // Join user to their personal room
      socket.join(`user_${user.id}`);

      // Emit authentication success
      socket.emit('authenticated', {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department ? user.department.name : null
        }
      });

      // Broadcast user online status
      this.broadcastUserPresence(user, 'online');

      console.log(`User authenticated: ${user.name} (${user.email})`);

    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  handleDisconnection(socket) {
    const user = this.authenticatedUsers.get(socket.id);
    
    if (user) {
      console.log(`User disconnected: ${user.name} (${socket.id})`);
      
      // Broadcast user offline status
      this.broadcastUserPresence(user, 'offline');
      
      // Clean up user data
      this.authenticatedUsers.delete(socket.id);
      this.userSockets.delete(user.id);
    } else {
      console.log(`Client disconnected: ${socket.id}`);
    }
  }

  // Broadcast methods
  broadcastTaskUpdate(taskData, user) {
    const eventData = {
      task: taskData,
      updatedBy: {
        id: user.id,
        name: user.name
      },
      timestamp: new Date().toISOString()
    };

    // Broadcast to department room
    if (taskData.department_id) {
      this.io.to(`department_${taskData.department_id}`).emit('task_updated', eventData);
    }

    // Broadcast to task-specific room
    if (taskData.id) {
      this.io.to(`task_${taskData.id}`).emit('task_updated', eventData);
    }

    // Notify assigned user
    if (taskData.assigned_to && taskData.assigned_to !== user.id) {
      this.io.to(`user_${taskData.assigned_to}`).emit('task_assigned', eventData);
    }

    console.log(`Task update broadcasted by ${user.name}`);
  }

  broadcastTaskComment(commentData, user) {
    const eventData = {
      comment: commentData,
      author: {
        id: user.id,
        name: user.name
      },
      timestamp: new Date().toISOString()
    };

    // Broadcast to task-specific room
    if (commentData.task_id) {
      this.io.to(`task_${commentData.task_id}`).emit('task_comment_added', eventData);
    }

    console.log(`Task comment broadcasted by ${user.name}`);
  }

  broadcastUserPresence(user, status) {
    const presenceData = {
      userId: user.id,
      userName: user.name,
      status: status,
      timestamp: new Date().toISOString()
    };

    // Broadcast to department room
    if (user.department_id) {
      this.io.to(`department_${user.department_id}`).emit('user_presence', presenceData);
    }

    console.log(`User presence update: ${user.name} is ${status}`);
  }

  broadcastNotification(userId, notification) {
    const eventData = {
      notification,
      timestamp: new Date().toISOString()
    };

    // Special handling for 'all' to broadcast to all connected users
    if (userId === 'all') {
      this.io.emit('notification', eventData);
      console.log('Notification sent to all users');
    } else {
      this.io.to(`user_${userId}`).emit('notification', eventData);
      console.log(`Notification sent to user ${userId}`);
    }
  }

  // Public methods for controllers to use
  notifyTaskCreated(task, createdBy) {
    this.broadcastTaskUpdate(task, createdBy);
  }

  notifyTaskUpdated(task, updatedBy) {
    this.broadcastTaskUpdate(task, updatedBy);
  }

  notifyTaskDeleted(taskId, departmentId, deletedBy) {
    const eventData = {
      taskId,
      deletedBy: {
        id: deletedBy.id,
        name: deletedBy.name
      },
      timestamp: new Date().toISOString()
    };

    if (departmentId) {
      this.io.to(`department_${departmentId}`).emit('task_deleted', eventData);
    }

    this.io.to(`task_${taskId}`).emit('task_deleted', eventData);
  }

  notifyCommentAdded(comment, author) {
    this.broadcastTaskComment(comment, author);
  }

  // Get online users in a department
  getOnlineUsersInDepartment(departmentId) {
    const room = this.io.sockets.adapter.rooms.get(`department_${departmentId}`);
    if (!room) return [];

    const onlineUsers = [];
    room.forEach(socketId => {
      const user = this.authenticatedUsers.get(socketId);
      if (user) {
        onlineUsers.push({
          id: user.id,
          name: user.name,
          role: user.role
        });
      }
    });

    return onlineUsers;
  }

  // Get total connected users
  getConnectedUsersCount() {
    return this.authenticatedUsers.size;
  }

  // Send direct message to specific user
  sendDirectMessage(userId, message) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('direct_message', message);
      return true;
    }
    return false;
  }
}

module.exports = WebSocketService;