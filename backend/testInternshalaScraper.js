const fs = require('fs');

const puppeteer = require('puppeteer');

async function scrapeInternshalaJobs() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('https://internshala.com/internships/', {
    waitUntil: 'networkidle2', // wait until all requests settle
    timeout: 30000
  });

  // 🔍 Save full HTML to a file for debugging
  const htmlContent = await page.content();
  fs.writeFileSync('internshala_dump.html', htmlContent);
  console.log('✅ Saved HTML snapshot to internshala_dump.html');

  await browser.close();
}

scrapeInternshalaJobs();
