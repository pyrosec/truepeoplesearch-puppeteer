#!/usr/bin/env node
'use strict'

const { PuppeteerCLI, createLogger } = require('base-puppeteer');

const logger = createLogger(require('../package').name);
const path = require('path');

const cli = new PuppeteerCLI({
  programName: 'truepeoplesearch',
  puppeteerClassPath: path.join(__dirname, '../lib/truepeoplesearch'),
  logger
});
 
  
(async () => {
  await cli.runCLI();
})().catch((err) => {
  logger.error(err.stack);
  process.exit(1);
});
