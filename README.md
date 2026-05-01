# TaskFlow — Team Task Manager

A full-stack team task management app with role-based access control, kanban boards, and real-time collaboration features.

## 🚀 Live Demo
**[https://your-app.railway.app](https://your-app.railway.app)** ← Update after deployment

## ✨ Features

### Authentication
- Secure signup/login with JWT tokens (7-day expiry)
- Bcrypt password hashing
- Protected routes on both frontend and backend

### Project Management
- Create, edit, delete projects with custom colors
- Invite team members by email
- Role-based access: **Admin** (full control) vs **Member** (view/edit tasks)
- Project owner protection (owners can't be removed or demoted)

### Task Management
- Kanban board with 4 columns: **To Do → In Progress → Review → Done**
- Filter tasks by priority and assignee
- Task priorities: Low, Medium, High, Urgent
- Due dates with overdue detection
- Task assignment to project members
- Comments on tasks (with delete)
- Click-through task detail panel

### Dashboard
- Personal stats (projects, active tasks, completed, overdue)
- My assigned tasks (sorted by priority & due date)
- Overdue alerts
- Project progress bars
- Recent activity feed

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Tailwind CSS, Vite |
| Backend | Node.js, Express.js |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT + Bcrypt |
| Validation | express-validator |
| Deployment | Railway |

## 📡 REST API

### Auth
```
POST /api/auth/signup    { name, email, password }
POST /api/auth/login     { email, password }
GET  /api/auth/me        → current user
```

### Projects
```
GET    /api/projects                        → list my projects
POST   /api/projects                        → create project
GET    /api/projects/:id                    → project + members
PUT    /api/projects/:id                    → update (admin)
DELETE /api/projects/:id                    → delete (owner)
POST   /api/projects/:id/members            → invite member (admin)
PUT    /api/projects/:id/members/:uid       → change role (admin)
DELETE /api/projects/:id/members/:uid       → remove member (admin)
```

### Tasks
```
GET    /api/projects/:id/tasks              → list tasks (filter: status, priority, assignee)
POST   /api/projects/:id/tasks              → create task
GET    /api/projects/:id/tasks/:tid         → task + comments
PUT    /api/projects/:id/tasks/:tid         → update task
DELETE /api/projects/:id/tasks/:tid         → delete (admin or creator)
POST   /api/projects/:id/tasks/:tid/comments    → add comment
DELETE /api/projects/:id/tasks/:tid/comments/:cid → delete comment
```

### Dashboard
```
GET /api/dashboard  → stats, my tasks, overdue, projects, activity
```

## 🛠️ Local Development

```bash
# Clone the repo
git clone https://github.com/your-username/taskflow.git
cd taskflow

# Install server deps
npm install

# Install client deps
cd client && npm install && cd ..

# Set up environment
cp .env.example .env
# Edit .env with your JWT_SECRET

# Run both (in separate terminals)
npm run dev              # server on :5000
cd client && npm run dev # client on :5173 (proxies API to :5000)
```

## 🚂 Deploy to Railway

### Step 1: Prepare
```bash
git init
git add .
git commit -m "Initial commit"
gh repo create taskflow --public --push  # or push to GitHub manually
```

### Step 2: Deploy
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your repo
3. Add environment variables:
   - `JWT_SECRET` = (generate a random 64-char string)
   - `NODE_ENV` = `production`
   - `DB_DIR` = `/data`
4. Add a **Volume** mounted at `/data` (for persistent SQLite storage)
5. Deploy!

### Step 3: Add Persistent Volume
In Railway dashboard → Your service → Volumes → Add Volume → Mount at `/data`

This ensures your SQLite database persists across deployments.

## 🔐 Role-Based Access Control

| Action | Member | Admin |
|--------|--------|-------|
| View project & tasks | ✅ | ✅ |
| Create tasks | ✅ | ✅ |
| Update task status | ✅ | ✅ |
| Delete own tasks | ✅ | ✅ |
| Delete any task | ❌ | ✅ |
| Invite members | ❌ | ✅ |
| Change member roles | ❌ | ✅ |
| Remove members | ❌ | ✅ |
| Edit project settings | ❌ | ✅ |
| Delete project | ❌ | Owner only |

## 📂 Project Structure
```
taskflow/
├── server/
│   ├── index.js          # Express app entry
│   ├── db.js             # SQLite setup & schema
│   ├── middleware.js      # JWT auth + role checks
│   └── routes/
│       ├── auth.js
│       ├── projects.js
│       ├── tasks.js
│       └── dashboard.js
├── client/
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       ├── context/AuthContext.jsx
│       ├── components/
│       │   ├── Layout.jsx
│       │   ├── TaskModal.jsx
│       │   ├── TaskDetail.jsx
│       │   └── ui.jsx
│       └── pages/
│           ├── AuthPage.jsx
│           ├── DashboardPage.jsx
│           ├── ProjectsPage.jsx
│           └── ProjectDetailPage.jsx
├── railway.toml
└── package.json
```

## 🎥 Demo Video
[Watch 3-minute walkthrough](https://your-video-link) ← Update link

---
Built with ❤️ using Node.js + React + SQLite
