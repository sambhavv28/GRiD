const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function scrapeNaukriJobs(keyword = 'remote', pagesToScrape = 1) {
  const browser = await puppeteer.launch({ headless: true }); // Show browser for debug
  const page = await browser.newPage();

  const jobs = [];

  for (let pageNum = 1; pageNum <= pagesToScrape; pageNum++) {
    const url = `https://www.naukri.com/${keyword}-jobs-${pageNum}`;
    console.log(`🔍 Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    try {
      await page.waitForSelector('.cust-job-tuple.layout-wrapper', { timeout: 15000 });
    } catch (err) {
      console.log(`⚠️ No jobs found on page ${pageNum}`);
      continue;
    }

    const scraped = await page.evaluate(() => {
      const cards = document.querySelectorAll('.cust-job-tuple.layout-wrapper');
      return Array.from(cards).map(card => {
        const title = card.querySelector('a.title')?.innerText.trim() || '';
        const company = card.querySelector('.comp-name span')?.innerText.trim() || '';
        const location = card.querySelector('.locWdth')?.innerText.trim() || '';
        const link = card.querySelector('a.title')?.href || '';

        return {
          id: 'nk-' + Math.random().toString(36).substring(2, 9),
          title,
          company,
          location,
          link,
          source: 'external',
          description: `${title} at ${company}`
        };
      });
    });

    console.log(`✅ Page ${pageNum} scraped: ${scraped.length} jobs`);
    jobs.push(...scraped);
  }

  await browser.close();
  console.log(`✅ Final Naukri Jobs: ${jobs.length}`);
  return jobs;
}

module.exports = scrapeNaukriJobs;
