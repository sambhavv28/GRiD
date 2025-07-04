
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

let cachedJobs = null;
let lastScraped = 0;

async function scrapeLinkedInJobs(keyword = 'intern') {
  const now = Date.now();
  if (cachedJobs && now - lastScraped < 60 * 60 * 1000) {
    console.log('⏱ Using cached LinkedIn jobs');
    return cachedJobs;
  }

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Disable unnecessary resource loading
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resource = req.resourceType();
    if (['stylesheet', 'font', 'image'].includes(resource)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  // Load cookies from JSON
  const cookiesPath = path.join(__dirname, 'linkedinCookies.json');
  const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
  await page.setCookie(...cookies);

  const url = `https://www.linkedin.com/jobs/search/?keywords=${keyword}&location=India`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // Wait for the job cards to appear
  await page.waitForSelector('.base-search-card', { timeout: 10000 });

  const jobs = await page.evaluate(() => {
    const jobCards = Array.from(document.querySelectorAll('.base-search-card'));
    return jobCards.slice(0, 10).map(card => ({
      id: 'li-' + Math.random().toString(36).substring(7),
      title: card.querySelector('.base-search-card__title')?.innerText.trim() || '',
      company: card.querySelector('.base-search-card__subtitle')?.innerText.trim() || '',
      location: card.querySelector('.job-search-card__location')?.innerText.trim() || '',
      link: card.querySelector('a.base-card__full-link')?.href || '',
      source: 'external'
    }));
  });

  await browser.close();

  // Cache results
  cachedJobs = jobs;
  lastScraped = Date.now();

  console.log(`✅ LinkedIn scraped: ${jobs.length} jobs`);
  return jobs;
}

module.exports = scrapeLinkedInJobs;
