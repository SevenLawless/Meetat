# Meetat - Project Management for Startups

A production-ready web application for managing projects, tasks, and team collaboration with real-time updates.

## Features

- **Multi-tenant Projects**: Create projects with missions and tasks
- **Task Management**: Full CRUD with assignments, @mentions, comments, attachments, tags
- **Real-time Notifications**: WebSocket-powered notifications for mentions, assignments, status changes
- **Personal To-Do List**: Private task list independent of project tasks
- **Ads Tracking**: Campaign management with metrics and analytics charts
- **Audit Logging**: Complete audit trail for admin users
- **Role-based Access**: Admin and user roles with appropriate permissions

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router, Recharts, Lucide Icons
- **Backend**: Node.js, Express, mysql2, JWT, WebSocket (ws)
- **Database**: MySQL 8.x
- **Real-time**: WebSocket for notifications and live updates

## Prerequisites

- Node.js 18+ 
- MySQL 8.x (MySQL Workbench recommended)
- npm or yarn

## Setup Instructions

### 1. Database Setup

1. Open MySQL Workbench
2. Connect to your MySQL server
3. Run the schema file to create the database:

```sql
-- Open and run database/schema.sql
```

Or run directly:
```bash
mysql -u root -p < database/schema.sql
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
# Copy env.example to .env and update with your settings
copy env.example .env

# Edit .env with your MySQL credentials:
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=meetat
# JWT_SECRET=your_secure_secret_key

# Start the backend server
npm run dev
```

The backend will run on http://localhost:3001

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run on http://localhost:5173

## Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| DB_HOST | MySQL host | localhost |
| DB_PORT | MySQL port | 3306 |
| DB_USER | MySQL username | root |
| DB_PASSWORD | MySQL password | - |
| DB_NAME | Database name | meetat |
| JWT_SECRET | JWT signing secret | - |
| JWT_EXPIRES_IN | Token expiration | 24h |
| PORT | Server port | 3001 |
| UPLOAD_DIR | File upload directory | uploads |
| MAX_FILE_SIZE | Max upload size (bytes) | 10485760 |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/members` - Add member
- `DELETE /api/projects/:id/members/:userId` - Remove member

### Missions
- `GET /api/missions/project/:projectId` - List missions
- `POST /api/missions` - Create mission
- `PUT /api/missions/:id` - Update mission
- `DELETE /api/missions/:id` - Delete mission

### Tasks
- `GET /api/tasks/mission/:missionId` - List tasks
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/attachments` - Upload attachment

### Comments
- `GET /api/comments/task/:taskId` - List comments
- `POST /api/comments/task/:taskId` - Add comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment

### Notifications
- `GET /api/notifications` - List notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `POST /api/notifications/dismiss` - Bulk dismiss

### Personal Todos
- `GET /api/todos` - List todos
- `POST /api/todos` - Create todo
- `PUT /api/todos/:id` - Update todo
- `PUT /api/todos/:id/toggle` - Toggle completion
- `DELETE /api/todos/:id` - Delete todo

### Campaigns & Ads
- `GET /api/campaigns/project/:projectId` - List campaigns
- `POST /api/campaigns` - Create campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign
- `POST /api/campaigns/:id/metrics` - Bulk ingest metrics
- `GET /api/campaigns/project/:projectId/aggregate` - Get aggregated metrics

### Audit Logs (Admin only)
- `GET /api/audit` - Query audit logs
- `GET /api/audit/stats` - Get audit statistics

## WebSocket Events

Connect to `/ws?token=<jwt_token>` for real-time updates.

### Incoming Events
- `notification` - New notification received
- `task_created` - Task created in project
- `task_updated` - Task updated
- `task_deleted` - Task deleted
- `comment_added` - New comment on task
- `sync` - Missed events on reconnection

### Outgoing Messages
- `subscribe_project` - Subscribe to project updates
- `unsubscribe_project` - Unsubscribe from project
- `sync` - Request missed events with lastEventId

## Default Users

After running the schema, the first user to register will be assigned the admin role.

## Project Structure

```
meetat3/
├── backend/
│   ├── src/
│   │   ├── config/         # Database & environment config
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Auth, audit, upload
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Helper functions
│   │   ├── websocket/      # WebSocket server
│   │   └── index.js        # Entry point
│   ├── uploads/            # File storage
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React contexts
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client
│   │   └── main.jsx        # Entry point
│   └── package.json
└── database/
    └── schema.sql          # MySQL schema
```

## License

MIT

