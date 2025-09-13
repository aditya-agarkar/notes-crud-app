# Notes CRUD App

A modern notes application with a FastAPI backend and Next.js frontend.

## Features

- ✨ Create, read, update, and delete notes
- 🔍 Search functionality
- 📱 Responsive design
- 🎨 Modern UI with table layout
- 🔄 Real-time updates

## Tech Stack

- **Backend**: FastAPI + Supabase
- **Frontend**: Next.js + CSS Modules
- **Deployment**: Fly.io (backend) + Vercel (frontend)
- **CI/CD**: GitHub Actions

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend (.env)
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key
FRONTEND_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Deployment

- **Backend**: Deployed to Fly.io at `https://aditya-notes-api.fly.dev`
- **Frontend**: Deployed to Vercel at `https://aditya-notes-frontend.vercel.app`

## CI/CD

Automatic deployment on push to `main` branch:
- Tests run for both frontend and backend
- Backend deploys to Fly.io
- Frontend deploys to Vercel