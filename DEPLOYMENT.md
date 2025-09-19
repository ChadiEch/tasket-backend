# Deployment Guide - TaskFlow Backend API

This is a **backend-only API** and should be deployed separately from any frontend application.

## Supported Deployment Platforms

- Railway (Recommended)
- Render
- Heroku
- Any Node.js hosting platform
- Docker (if needed)

## Environment Variables

You must set the following environment variables for production deployment:

```env
# Database Configuration (provided by hosting platform)
DATABASE_URL=postgresql://username:password@hostname:port/database

# JWT Configuration (generate a secure secret)
JWT_SECRET=your-super-secret-jwt-key-at-least-64-bytes-long
JWT_EXPIRES_IN=7d

# Server Configuration
NODE_ENV=production

# Frontend URL (your frontend application URL)
FRONTEND_URL=https://your-frontend-domain.com
```

## Railway Deployment (Recommended)

1. Create a new Railway project
2. Connect your GitHub repository
3. Railway will automatically detect this as a Node.js application
4. Set the required environment variables in the Railway dashboard
5. The application will start with `node server.js`

## Render Deployment

1. Create a new Render web service
2. Connect your GitHub repository
3. Set the build command to `npm ci`
4. Set the start command to `node server.js`
5. Add the required environment variables

## Heroku Deployment

1. Create a new Heroku app
2. Connect your GitHub repository
3. Set the required environment variables in the Heroku dashboard
4. Heroku will automatically detect this as a Node.js application
5. The application will start with `npm start` which runs `node server.js`

## Manual Deployment

1. Clone the repository
2. Run `npm ci` to install dependencies
3. Set the required environment variables
4. Run `node server.js` to start the server

## Notes

- This is a backend-only API with no built-in frontend
- The frontend should be served separately
- Database migrations are handled automatically on startup
- WebSocket connections are available on the same port as the HTTP server