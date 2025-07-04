// File: backend/server.js

// 1. Load environment variables from .env file
require('dotenv').config();

// 2. Import necessary modules
const express = require('express');
const { Pool } = require('pg');
const admin = require('firebase-admin');
const cors = require('cors');
const applicationRoute = require('./routes/applications');


// 3. Initialize Express app
const app = express();
const port = process.env.PORT || 3001;

// 4. Configure CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 5. Middleware to parse JSON request bodies
app.use(express.json());
app.use('/api/apply', applicationRoute);

// 6. Initialize Firebase Admin SDK
try {
  const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  process.exit(1);
}

// 7. Firebase Authentication Middleware (inlined here)
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.warn('Authentication: No token provided');
    return res.sendStatus(401);
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    req.isAdmin = decodedToken.role === 'admin';
    console.log('Authentication: Token verified for user:', req.user.uid);
    next();
  } catch (error) {
    console.error('Authentication: Invalid token', error.message);
    return res.sendStatus(403);
  }
};

console.log("✅ DB_PASSWORD loaded:", process.env.DB_PASSWORD);

// 8. Initialize PostgreSQL Pool
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  client.query('SELECT NOW()', (err, result) => {
    release();
    if (err) {
      return console.error('Error executing query', err.stack);
    }
    console.log('Database connected successfully at:', result.rows[0].now);
  });
});

// 9. Route Registrations
const opportunityRoutes = require('./routes/opportunities');
const applicationRoutes = require('./routes/applications');
const adminRoutes = require('./routes/admin');

app.use('/api/opportunities', opportunityRoutes);
app.use('/api/apply', applicationRoutes);
app.use('/api/exclusive-opportunities', adminRoutes);

// 10. Quiz Routes (protected with authentication)
app.get('/api/check-quiz-completion', authenticateToken, async (req, res) => {
  const userId = req.user.uid;
  const submissionType = 'career_quiz';

  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM submissions WHERE user_id = $1 AND submission_type = $2',
      [userId, submissionType]
    );

    const hasCompleted = parseInt(result.rows[0].count) > 0;
    console.log(`User ${userId}: Quiz completion status - ${hasCompleted}`);
    res.json({ hasCompleted });

  } catch (error) {
    console.error('Error checking quiz completion:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/submit-quiz', authenticateToken, async (req, res) => {
  const userId = req.user.uid;
  const { careerPathResults } = req.body;
  const submissionType = 'career_quiz';

  if (!careerPathResults) {
    return res.status(400).json({ message: 'Missing careerPathResults in request body.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO submissions (user_id, submission_type, career_path_results)
       VALUES ($1, $2, $3)
       RETURNING id, submission_date`,
      [userId, submissionType, careerPathResults]
    );

    console.log(`Quiz submitted successfully for user ${userId}. Submission ID: ${result.rows[0].id}`);
    res.status(201).json({
      message: 'Quiz results submitted successfully and points credited!',
      submissionId: result.rows[0].id,
      submissionDate: result.rows[0].submission_date
    });

  } catch (error) {
    console.error('Error submitting quiz:', error.message);
    if (error.code === '23505') {
      return res.status(409).json({ message: 'You have already completed this quiz. Points have been credited.' });
    }
    res.status(500).json({ message: 'Internal server error during submission.' });
  }
});

// 11. Start the server
app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
  console.log(`CORS is configured for origin: ${process.env.NODE_ENV === 'production' ? 'Your Production Frontend URL' : '*'}`);
});

// File: backend/server.js

// ... (existing code for imports, app setup, CORS, Firebase, authenticateToken, etc.) ...

// 10. Quiz Routes (protected with authentication)
app.get('/api/check-quiz-completion', authenticateToken, async (req, res) => {
  const userId = req.user.uid;
  const submissionType = 'career_quiz';

  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM submissions WHERE user_id = $1 AND submission_type = $2',
      [userId, submissionType]
    );

    const hasCompleted = parseInt(result.rows[0].count) > 0;
    console.log(`User ${userId}: Quiz completion status - ${hasCompleted}`);
    res.json({ hasCompleted });

  } catch (error) {
    console.error('Error checking quiz completion:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/submit-quiz', authenticateToken, async (req, res) => {
  const userId = req.user.uid;
  const { careerPathResults } = req.body;
  const submissionType = 'career_quiz';

  if (!careerPathResults) {
    return res.status(400).json({ message: 'Missing careerPathResults in request body.' });
  }

  try {
    // MODIFIED: Use INSERT ... ON CONFLICT DO UPDATE to handle existing submissions
    const result = await pool.query(
      `INSERT INTO submissions (user_id, submission_type, career_path_results)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, submission_type) DO UPDATE
       SET career_path_results = EXCLUDED.career_path_results,
           submission_date = NOW()
       RETURNING id, submission_date`,
      [userId, submissionType, careerPathResults]
    );

    console.log(`Quiz submitted/updated successfully for user ${userId}. Submission ID: ${result.rows[0].id}`);
    res.status(201).json({
      message: 'Quiz results submitted successfully and points credited!',
      submissionId: result.rows[0].id,
      submissionDate: result.rows[0].submission_date
    });

  } catch (error) {
    console.error('Error submitting quiz (PostgreSQL):', error.message);
    res.status(500).json({ message: 'Internal server error during submission.' });
  }
});

// NEW API Endpoint: Get user's saved quiz results from PostgreSQL
app.get('/api/user/quiz-results', authenticateToken, async (req, res) => {
  const userId = req.user.uid;
  const submissionType = 'career_quiz';

  try {
    const result = await pool.query(
      'SELECT career_path_results FROM submissions WHERE user_id = $1 AND submission_type = $2',
      [userId, submissionType]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Quiz results not found for this user.' });
    }

    res.json(result.rows[0].career_path_results);
  } catch (error) {
    console.error('Error fetching user quiz results (PostgreSQL):', error.message);
    res.status(500).json({ message: 'Internal server error fetching quiz results.' });
  }
});




// ... (existing code for app.use('/api/opportunities', ...), app.use('/api/apply', ...),
//      app.use('/api/exclusive-opportunities', ...), and server start) ...