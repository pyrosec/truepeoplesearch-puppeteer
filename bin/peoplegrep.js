#!/usr/bin/env node
const path = require("path");
const fs = require("fs-extra");
const { EventEmitter } = require("events");
const { createLogger } = require("base-puppeteer");
const { getGender } = require('gender-detection-from-name');

const logger = createLogger("peoplegrep");

async function getDirectoriesInCwd() {
  const cwd = process.cwd();
  const items = await fs.readdir(cwd);
  const result = [];
  for (const item of items) {
    const fullPath = path.join(cwd, item);
    if ((await fs.lstat(fullPath)).isDirectory()) result.push(item);
  }
  return result;
}

function walkData(emitter) {
  const ee = emitter || new EventEmitter();
  const promise = (async () => {
    const cwd = process.cwd();
    const directories = await getDirectoriesInCwd();
    if (directories.length) {
      for (const directory of directories) {
        process.chdir(path.join(cwd, directory));
        await walkData(ee);
      }
    } else {
      const indexPath = path.join(cwd, "index.json");
      if (await fs.exists(indexPath)) {
        const index = JSON.parse(await fs.readFile(indexPath, "utf8"));
        index.forEach((v) => ee.emit("data", v));
      }
    }
    process.chdir(cwd);
    if (!emitter) ee.emit("end");
  })().catch((err) => {
    ee.emit("error", err);
  });
  if (emitter) return promise;
  else return ee;
}

const yargs = require("yargs");

const getAge = (person) => {
  const recordAge = (person.age || '').match(/Age\s(\d+)/);
  if (!recordAge) return null;
  return Number(recordAge[1]);
};

const format = (person) => {
  const age = getAge(person);
  return [person.label, age, (person.addresses[0] || {}).value, (person.phoneNumbers[0] || {}).value]
    .filter(Boolean)
    .join(":");
};

const ln = (v) => {
  console.log(v);
  return v;
};

const getGenderFromPerson = (person) => {
  return getGender(person.label.split(/\s+/)[0], 'en')[0].toUpperCase();
};

const getStateFromPerson = (person) => {
  const address = (person.addresses[0] || {}).value || '';
  const split = address.split(/\s/g)
  return split[split.length - 2]
}
  

(async () => {
  const { age, state, gender } = yargs.argv;
  const ee = walkData();
  let count = 0;
  const [min, max] = (age || '1-1000').split("-").map(Number);
  ee.on("data", (person) => {
    if (gender) {
      if (getGenderFromPerson(person) !== gender) return;
    }
    if (age) {
      const recordAge = getAge(person);
      if (!recordAge) return;
      if (recordAge < min || recordAge > max) return;
    }
    if (state) {
      if (getStateFromPerson(person) !== state) return;
    }
    count++;
    console.log(format(person));
  });
  ee.on("error", (err) => logger.error(err.stack));
})().catch((err) => {
  logger.error(err.stack);
});
