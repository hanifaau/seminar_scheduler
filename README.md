# Seminar Scheduler

AI-powered seminar scheduling application with Anthropic Claude integration.

## Features

- **Smart Scheduling**: AI-optimized seminar schedules with conflict resolution
- **Content Generation**: Generate descriptions, summaries, outlines, and titles
- **Chatbot Assistant**: Interactive AI assistant for seminar inquiries
- **Seminar Analysis**: AI-powered quality assessment and recommendations

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:

```
ANTHROPIC_AUTH_TOKEN=your_actual_api_key_here
PORT=3000
NODE_ENV=development
```

### 3. Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Health Check
```
GET /health
```

### Smart Scheduling
```
POST /api/schedule/optimize
Content-Type: application/json

{
  "seminars": [
    { "id": "1", "title": "AI in Healthcare", "duration": 60 },
    { "id": "2", "title": "Machine Learning Basics", "duration": 90 }
  ],
  "constraints": {
    "rooms": ["Room A", "Room B"],
    "timeSlots": ["9:00-10:00", "10:00-11:00"]
  },
  "preferences": {
    "maxConcurrent": 2
  }
}
```

### Content Generation
```
POST /api/content/generate
Content-Type: application/json

{
  "type": "description|summary|outline|title",
  "topic": "Introduction to AI",
  "context": { "audience": "beginners", "duration": 60 }
}
```

### Chatbot Assistant
```
POST /api/chat
Content-Type: application/json

{
  "message": "What seminars are available today?",
  "conversationHistory": [],
  "seminarContext": {}
}
```

### Seminar Analysis
```
POST /api/seminar/analyze
Content-Type: application/json

{
  "seminarData": {
    "title": "Advanced AI Techniques",
    "description": "...",
    "duration": 90
  }
}
```

## Example Usage

```javascript
// Generate seminar description
const response = await fetch('http://localhost:3000/api/content/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'description',
    topic: 'Introduction to Machine Learning',
    context: { audience: 'beginners', duration: 60 }
  })
});

const data = await response.json();
console.log(data.content);
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_AUTH_TOKEN` | Your Anthropic API key | Yes |
| `PORT` | Server port | No (default: 3000) |
| `NODE_ENV` | Environment mode | No (default: development) |
