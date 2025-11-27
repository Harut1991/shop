# Shop Admin Panel

A full-stack shop management system with admin panel, built with React, Node.js, and SQLite.

## Features

- **User Authentication**: Login and registration system
- **Three User Roles**:
  - **Super Admin**: Full access, can manage all users and change roles
  - **Admin**: Can manage products and view users
  - **User**: Regular user (can be extended for customer features)
- **User Management**: Super admins can view, update roles, and delete users
- **Product Management**: Admins can create, update, and delete products

## Tech Stack

- **Backend**: Node.js, Express, SQLite3
- **Frontend**: React, React Router
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs

## Setup Instructions

### Quick Start

1. Install backend dependencies:
   ```bash
   npm install
   ```

2. Install frontend dependencies:
   ```bash
   cd client
   npm install
   cd ..
   ```

3. Run both backend and frontend together:
   ```bash
   npm run dev
   ```

This will start:
- Frontend app on `http://localhost:3000/`
- Backend API accessible at `http://localhost:3000/api` (proxied from backend on port 5000)

### Alternative: Run Separately

**Backend only:**
```bash
npm run dev:backend
```

**Frontend only:**
```bash
npm run dev:frontend
```

**Production:**
```bash
npm start  # Backend only
```

## Default Credentials

**Super Admin:**
- Username: `superadmin`
- Password: `admin123`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (protected)

### Admin (Admin & Super Admin)
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/role` - Update user role (Super Admin only)
- `DELETE /api/admin/users/:id` - Delete user (Super Admin only)

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)

## Database

The SQLite database (`shop.db`) will be automatically created when you first run the server. It includes:

- **users** table: Stores user information and roles
- **products** table: Stores product information

## Project Structure

```
shop/
├── server.js              # Backend server
├── package.json           # Backend dependencies
├── shop.db               # SQLite database (created automatically)
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── context/      # Auth context
│   │   ├── pages/        # Page components
│   │   └── App.js        # Main app component
│   └── package.json      # Frontend dependencies
└── README.md
```

## Security Notes

- Change the `JWT_SECRET` in production
- Use environment variables for sensitive data
- Implement rate limiting in production
- Add input validation and sanitization
- Use HTTPS in production

