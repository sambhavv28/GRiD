const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

// 🛡️ Admin check middleware
router.use(authenticateToken);
router.use((req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({ message: "Access denied: Admins only" });
  }
  console.log("🔐 Admin access granted");
  next();
});

// 🔍 GET all opportunities (admin)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM opportunities ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching opportunities:', err);
    res.status(500).json({ message: "Server error" });
  }
});

// ➕ POST add new opportunity
router.post('/', async (req, res) => {
  const { title, description, location, deadline, link } = req.body;
  try {
    await pool.query(
      `INSERT INTO opportunities (title, description, location, deadline, link, source)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [title, description, location, deadline, link, 'exclusive']
    );
    res.status(201).json({ message: "Opportunity added successfully" });
  } catch (err) {
    console.error('Error adding opportunity:', err);
    res.status(500).json({ message: "Failed to add opportunity" });
  }
});

// ✏️ PUT update opportunity
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const { title, description, location, deadline, link } = req.body;
  try {
    await pool.query(
      `UPDATE opportunities SET title=$1, description=$2, location=$3, deadline=$4, link=$5 WHERE id=$6`,
      [title, description, location, deadline, link, id]
    );
    res.json({ message: "Opportunity updated successfully" });
  } catch (err) {
    console.error('Error updating opportunity:', err);
    res.status(500).json({ message: "Failed to update opportunity" });
  }
});

// ❌ DELETE opportunity
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM opportunities WHERE id = $1', [id]);
    res.json({ message: "Opportunity deleted successfully" });
  } catch (err) {
    console.error('Error deleting opportunity:', err);
    res.status(500).json({ message: "Failed to delete opportunity" });
  }
});

module.exports = router;
