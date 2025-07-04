const scrapeNaukriJobs = require('./scrapeNaukriJobs');

scrapeNaukriJobs().then(jobs => {
  console.log(jobs);
}).catch(console.error);
