# Agentic Calendar Assistant

A full-stack AI-powered calendar assistant application with chat interface.

## Tech Stack

### Frontend
- Next.js 16.3.0
- React 19
- TypeScript
- Tailwind CSS

### Backend
- Node.js
- Express
- PostgreSQL
- TypeScript
- OpenRouter AI SDK

## Setup

### Prerequisites
- Node.js 24+
- PostgreSQL installed and running

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd agentic-calendar-assistant
```

2. Install dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

3. Configure environment variables

**Backend `.env`:**
```
DATABASE_URL=postgresql://user:password@localhost:5432/calendar_assistant
SESSION_SECRET=your-secret-key
OPENROUTER_API_KEY=your-api-key
```

**Frontend `.env`:**
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

4. Set up the database

Run the SQL migrations in pgAdmin or use the migration script:
```bash
cd backend
npm run migrate
```

### Running the Application

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Project Structure

```
agentic-calendar-assistant/
├── backend/
│   ├── src/
│   │   ├── db/          # Database connection
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   ├── repositories/# Database queries
│   │   └── middleware/  # Express middleware
│   └── sql/            # Database migrations
├── frontend/
│   └── src/
│       ├── app/        # Next.js pages
│       ├── components/ # React components
│       └── lib/        # Utilities
```

## License

MIT
