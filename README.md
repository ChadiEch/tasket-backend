# TaskFlow Backend API (Backend-only)

A comprehensive Node.js backend API for the TaskFlow task management system. This is a backend-only API built with Express.js, PostgreSQL, Sequelize ORM, and Socket.IO for real-time features. The frontend should be served separately.

## 🚀 Features

### Core API Features
- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Task Management**: Full CRUD operations for tasks with status tracking
- **Department Management**: Organize employees and tasks by departments
- **Employee Management**: User profiles with role-based permissions
- **Data Validation**: Comprehensive input validation and sanitization
- **Security**: Rate limiting, CORS, helmet security headers
- **Database**: PostgreSQL with Sequelize ORM (SQLite for development)

### Real-time Features (NEW)
- **WebSocket Server**: Socket.IO integration for real-time communication
- **Live Task Updates**: Broadcast task changes to connected clients
- **User Presence**: Track online users and department activity
- **Real-time Notifications**: Instant alerts for task assignments
- **Room Management**: Department and task-specific communication channels
- **Collaborative Features**: Typing indicators and live updates

### Testing & Quality (NEW)
- **Comprehensive Test Suite**: Unit and integration tests with Jest
- **API Testing**: Supertest for endpoint testing
- **Model Testing**: Sequelize model validation and relationship tests
- **Mocking Support**: Database mocking and test utilities
- **Coverage Reports**: Detailed test coverage analysis

## 🛠️ Technology Stack

### Backend Core
- **Express.js**: Fast, unopinionated web framework
- **Node.js**: JavaScript runtime environment
- **Sequelize**: Promise-based ORM for database operations

### Database
- **PostgreSQL**: Production database
- **SQLite**: Development and testing database

### Real-time Communication
- **Socket.IO**: WebSocket server for real-time features
- **Event-driven Architecture**: Pub/sub pattern for live updates

### Security & Middleware
- **JWT**: JSON Web Tokens for authentication
- **bcryptjs**: Password hashing
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request throttling

### Testing Framework
- **Jest**: JavaScript testing framework
- **Supertest**: HTTP assertion library
- **In-memory Database**: SQLite for isolated testing

### Development Tools
- **Nodemon**: Auto-restart development server
- **Morgan**: HTTP request logger
- **dotenv**: Environment variable management

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Setup Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb tasket_db
   
   # Or using psql
   psql -U postgres
   CREATE DATABASE tasket_db;
   ```

3. **Environment Configuration**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env with your database credentials
   nano .env
   ```

4. **Database Migration & Seeding**
   ```bash
   # Seed database with sample data
   node scripts/seed.js
   ```

5. **Start Server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only integration tests
npm run test:integration
```

### Test Structure
```
tests/
├── setup.js              # Test environment setup
├── auth.test.js          # Authentication API tests
├── tasks.test.js         # Task management tests
├── departments.test.js   # Department API tests
└── models.test.js        # Sequelize model tests
```

### Testing Features
- **API Integration Tests**: Complete endpoint testing with Supertest
- **Authentication Testing**: JWT token validation and user sessions
- **Database Testing**: Model validation and relationship testing
- **Mock Data**: Comprehensive test utilities and fixtures
- **Coverage Reports**: HTML and text coverage reports
- **Isolated Testing**: In-memory SQLite for fast, isolated tests

### Test Database
Tests use an in-memory SQLite database for fast, isolated testing:
- Automatic setup and teardown
- No external database dependencies
- Fast test execution
- Parallel test support

5. **Start Server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## ☁️ Deployment

This is a backend-only API designed for deployment to platforms like Railway, Render, or any Node.js hosting platform. It does not include a built-in frontend and should be deployed separately from the frontend application.

### Railway Deployment

1. Create a new Railway project
2. Connect your GitHub repository
3. Railway will automatically detect this as a Node.js application
4. The application will start with `npm start` which runs `node server.js`
5. Set the required environment variables in the Railway dashboard

### Environment Variables for Deployment

```env
# Database (use Railway PostgreSQL database)
DATABASE_URL=postgresql://user:password@host:port/database

# JWT Configuration (generate a secure secret)
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Server Configuration
NODE_ENV=production

# CORS Configuration (your frontend URL)
FRONTEND_URL=https://your-frontend-domain.com
```

## 🔧 Environment Variables

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tasket_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

## 🔌 WebSocket Real-time Features

### WebSocket Server
The API includes a Socket.IO server for real-time communication:

```javascript
// Server runs on the same port as HTTP server
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
});
```

### Authentication
WebSocket connections require JWT authentication:
```javascript
// Client-side authentication
socket.emit('authenticate', jwtToken);

// Server validates and joins user to rooms
socket.on('authenticated', (userData) => {
  console.log('Authenticated:', userData);
});
```

### Real-time Events

#### Task Events
- `task_updated`: Broadcast when tasks are modified
- `task_deleted`: Notify when tasks are removed
- `task_assigned`: Alert users of new task assignments
- `task_comment_added`: New comments on tasks

#### User Events
- `user_presence`: Online/offline status updates
- `user_typing`: Typing indicators for collaborative editing
- `notification`: System notifications and alerts

#### Room Management
- **Department Rooms**: `department_{id}` for team communication
- **Task Rooms**: `task_{id}` for task-specific updates
- **User Rooms**: `user_{id}` for personal notifications

### WebSocket API Usage

```javascript
// Join a room
socket.emit('join_room', 'department_1');

// Listen for task updates
socket.on('task_updated', (data) => {
  console.log('Task updated:', data.task);
  console.log('Updated by:', data.updatedBy.name);
});

// Emit task update
socket.emit('task_update', taskData);
```

### WebSocket Service
The `WebSocketService` class handles:
- User authentication and session management
- Room joining/leaving logic
- Event broadcasting to appropriate users
- Connection state management
- Error handling and reconnection

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new employee
- `POST /api/auth/login` - Employee login
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update current user profile

### Tasks
- `GET /api/tasks` - Get all tasks (filtered by user role)
- `GET /api/tasks/:id` - Get specific task
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Departments
- `GET /api/departments` - Get all departments
- `GET /api/departments/:id` - Get specific department
- `POST /api/departments` - Create department (Admin only)
- `PUT /api/departments/:id` - Update department (Admin only)
- `DELETE /api/departments/:id` - Delete department (Admin only)

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get specific employee
- `POST /api/employees` - Create employee (Admin only)
- `PUT /api/employees/:id` - Update employee (Admin only)
- `DELETE /api/employees/:id` - Delete employee (Admin only)

## 🔐 Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Roles
- **Admin**: Full access to all resources
- **Manager**: Can manage tasks and view department data
- **Employee**: Can view and update assigned tasks

## 📊 Database Schema

### Tables
- **departments**: Company departments with managers and budgets
- **employees**: User accounts with roles and department assignments
- **tasks**: Task records with assignments, status, and metadata
- **task_comments**: Comments and updates on tasks

### Relationships
- Employees belong to departments
- Tasks are assigned to employees and belong to departments
- Departments can have manager employees
- Tasks can have multiple comments from employees

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production Deployment

1. **Environment Setup**
   - Set `NODE_ENV=production`
   - Configure production database
   - Set secure JWT secret

2. **Database Migration**
   ```bash
   node scripts/seed.js
   ```

3. **Start Production Server**
   ```bash
   npm start
   ```

## 📝 Sample Data

The seed script creates sample data including:
- 4 departments (Engineering, Marketing, Sales, HR)
- 5 employees with different roles
- 5 sample tasks with various statuses

### Default Login Credentials
- **Admin**: admin@company.com / admin123
- **Employee**: john.doe@company.com / password123
- **Manager**: jane.smith@company.com / password123

## 🔍 API Testing

### Using cURL
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}'

# Get tasks (with token)
curl -X GET http://localhost:5000/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Using Postman
Import the API endpoints and test with the provided sample credentials.

## 🚀 Deployment

This is a backend-only API that can be deployed to platforms like Railway without Docker.

## 🛠️ Development

### Project Structure
```
tasket-backend/
├── config/
│   └── database.js          # Database configuration
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── taskController.js    # Task management
│   ├── departmentController.js
│   └── employeeController.js
├── middleware/
│   └── auth.js              # Authentication middleware
├── models/
│   ├── Department.js        # Department model
│   ├── Employee.js          # Employee model
│   ├── Task.js              # Task model
│   ├── TaskComment.js       # Comment model
│   └── index.js             # Model associations
├── routes/
│   ├── auth.js              # Auth routes
│   ├── tasks.js             # Task routes
│   ├── departments.js       # Department routes
│   └── employees.js         # Employee routes
├── scripts/
│   └── seed.js              # Database seeding
├── server.js                # Main server file
├── package.json
└── README.md
```

### Adding New Features
1. Create model in `models/`
2. Add controller in `controllers/`
3. Define routes in `routes/`
4. Update associations in `models/index.js`
5. Add validation middleware

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the ISC License.