const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

// POST /api/apply
router.post('/', authenticateToken, async (req, res) => {
  const userId = req.user.uid;
  const opportunityId = parseInt(req.body.opportunityId);

  if (!opportunityId || isNaN(opportunityId)) {
    return res.status(400).json({ message: "Invalid or missing opportunityId" });
  }

  try {
    const opportunity = await pool.query(
      'SELECT source FROM opportunities WHERE id = $1',
      [opportunityId]
    );

    if (opportunity.rows.length === 0) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    if (opportunity.rows[0].source !== 'exclusive') {
      return res.status(400).json({ message: 'Invalid opportunity source' });
    }

    const check = await pool.query(
      'SELECT * FROM applications WHERE user_id = $1 AND opportunity_id = $2',
      [userId, opportunityId]
    );

    if (check.rows.length > 0) {
      return res.status(409).json({ message: 'You have already applied for this opportunity.' });
    }
    const userEmail = req.user.email; 
    await pool.query(
      'INSERT INTO applications (user_id, opportunity_id, source, user_email) VALUES ($1, $2, $3, $4)',
      [userId, opportunityId, opportunity.rows[0].source, userEmail]
    );

    res.status(201).json({ message: 'Application submitted successfully!' });
  } catch (err) {
    console.error('❌ Error applying:', err);
    res.status(500).json({ message: 'Server error while applying.' });
  }
});

// GET /api/apply/admin-view
// GET /api/apply/admin-view
router.get('/admin-view', authenticateToken, async (req, res) => {
  const userId = req.user.uid;

  try {
    const result = await pool.query(
      `
      SELECT 
        applications.id,
        applications.user_id,
        applications.user_email,
        applications.opportunity_id,
        applications.source,
        applications.created_at,
        opportunities.title AS opportunity_title
      FROM applications
      JOIN opportunities ON applications.opportunity_id = opportunities.id
      WHERE ($1::boolean IS TRUE OR applications.user_id = $2)
      ORDER BY applications.created_at DESC
      `,
      [req.isAdmin, userId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching applicants:', err);
    res.status(500).json({ message: 'Failed to fetch applicants' });
  }
});

// GET /api/apply/user-view
router.get('/user-view', authenticateToken, async (req, res) => {
  const userId = req.user.uid;

  try {
    const result = await pool.query(`
      SELECT 
        applications.id,
        applications.user_id,
        applications.user_email,
        applications.opportunity_id,
        applications.created_at,
        opportunities.title AS opportunity_title
      FROM applications
      JOIN opportunities ON applications.opportunity_id = opportunities.id
      WHERE applications.user_id = $1
      ORDER BY applications.created_at DESC
    `, [userId]);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching user applications:', err);
    res.status(500).json({ message: 'Failed to fetch user applications' });
  }
});

// GET /api/apply/my
router.get('/my', authenticateToken, async (req, res) => {
  const userId = req.user.uid;

  try {
    const result = await pool.query(`
      SELECT 
        applications.id,
        applications.opportunity_id,
        applications.created_at,
        opportunities.title AS opportunity_title
      FROM applications
      JOIN opportunities ON applications.opportunity_id = opportunities.id
      WHERE applications.user_id = $1
      ORDER BY applications.created_at DESC
    `, [userId]);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching user applications:', err);
    res.status(500).json({ message: 'Failed to fetch applications' });
  }
});



module.exports = router;
