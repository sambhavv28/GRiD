const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function scrapeInternshalaJobs() {
  const cookiesPath = path.join(__dirname, 'internshalaCookies.json');
  const cookies = JSON.parse(fs.readFileSync(cookiesPath));

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setCookie(...cookies);
  await page.goto('https://internshala.com/internships/', { waitUntil: 'networkidle2' });

  const jobs = await page.$$eval('.individual_internship', (cards) =>
    cards.slice(0, 10).map((card) => {
      const titleEl = card.querySelector('a.job_title_href');
      const companyEl = card.querySelector('.company');
      const locationEl = card.querySelector('.location_link');

      const title = titleEl?.innerText.trim() || '';
      const link = titleEl?.getAttribute('href')
        ? 'https://internshala.com' + titleEl.getAttribute('href')
        : '';
      const company = companyEl?.innerText.trim() || '';
      const location = locationEl?.innerText.trim() || '';

      return {
        id: 'is-' + Math.random().toString(36).substring(7),
        title,
        company,
        location,
        link,
        description: `${title} at ${company} (${location})`,
        source: 'external',
      };
    })
  );

  await browser.close();

  console.log(`✅ Final Scraped Internshala Jobs: ${jobs.length}`);
  console.log('🧪 Sample Job:', jobs[0]);

  return jobs;
}

module.exports = scrapeInternshalaJobs;
