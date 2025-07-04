const express = require('express');
const router = express.Router();
const pool = require('../db');
const scrapeLinkedInJobs = require('../scrapers/linkedinScraper');
const scrapeInternshalaJobs = require('../scrapers/internshalaScraper');
const scrapeNaukriJobs = require('../scrapers/scrapeNaukriJobs'); // ✅ ADD THIS




router.get('/', async (req, res) => {
  try {
    // Fetch exclusive jobs from database
    const dbResult = await pool.query('SELECT * FROM opportunities ORDER BY deadline ASC');
    const exclusiveJobs = dbResult.rows.map(job => ({ ...job, source: 'exclusive' }));
    
    // 🔍 Scrape external jobs (real-time)
    const [linkedinJobsRaw, internshalaJobsRaw, naukriJobsRaw] = await Promise.all([
      scrapeLinkedInJobs(),
      scrapeInternshalaJobs(),
      scrapeNaukriJobs()
    ]);

    // ✅ Basic validation: fallback to empty array if scrape failed
    const linkedinJobs = Array.isArray(linkedinJobsRaw) ? linkedinJobsRaw : [];
    const internshalaJobs = Array.isArray(internshalaJobsRaw) ? internshalaJobsRaw : [];
    const naukriJobs = Array.isArray(naukriJobsRaw) ? naukriJobsRaw : [];

    console.log('✅ LinkedIn Jobs:', linkedinJobs);
    console.log('✅ Internshala Jobs:', internshalaJobs);
    console.log('✅ Naukri Jobs:', naukriJobs);

    // ⚠️ Filter out incomplete entries
    const filteredLinkedIn = linkedinJobs.filter(job =>
      job.title && job.location && job.link
    );
    const filteredInternshala = internshalaJobs.filter(job =>
      job.title && job.location && job.link
    );

    filteredLinkedIn.forEach(job => {
  job.description = job.description || `${job.title} at ${job.company}`;
});
filteredInternshala.forEach(job => {
  job.description = job.description || `${job.title} at ${job.company}`;
});


    const allJobs = [...filteredLinkedIn, ...filteredInternshala, ...naukriJobs, ...exclusiveJobs];
    console.log('🚀 Total jobs sent to frontend:', allJobs.length);

    res.status(200).json(allJobs);
  } catch (err) {
    console.error('❌ Error fetching jobs:', err);
    res.status(500).json({ message: 'Server error while fetching opportunities' });
  }
});

module.exports = router;
