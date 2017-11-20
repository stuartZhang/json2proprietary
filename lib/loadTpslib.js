const debug = require('debug');
const path = require('path');
const fs = require('fs');
const {exec} = require('child_process');

const {fsMkdir, fsStat} = require('./fs');
const java = require('./java');

const StaticTemplateLibrary = java.import('com.nim.tps.StaticTemplateLibrary');

const logger = {
  loader: debug('tpslib-loader')
};
const tpslibPromises = new Map();
const OUTPUT_DIR = path.resolve('./conf/tpslib');
const WORK_DIR = path.resolve('./tpslib-compiler');
const outputDirPromise = fsMkdir(OUTPUT_DIR).then(() => {
  logger.loader(`Make the output directory: ${OUTPUT_DIR}`);
}, err => {
  if (err.code === 'EEXIST') {
    return Promise.resolve();
  }
  return Promise.reject(err);
});
async function checkSrcFile(srcPath){
  const stats = await fsStat(srcPath);
  if (!stats.isFile()) {
    throw new Error(`tpslib ${srcPath} isn't a file.`);
  }
}
function compile(srcPath){
  return new Promise((resolve, reject) => {
    exec(`python libcom.py -t -d ${OUTPUT_DIR} ${srcPath}`, {cwd: WORK_DIR}, (err, stdout, stderr) => {
      if (err) {
        return reject(err);
      }
      if (stderr) {
        return reject(stderr);
      }
      const outputPath = path.resolve(OUTPUT_DIR, stdout.trim());
      process.nextTick(() => {
        logger.loader(`Compile ${path.relative('.', srcPath)} to ${path.relative('.', outputPath)}`);
        resolve(outputPath);
      });
    });
  });
}
module.exports = function loadTpslib({tpslib}){
  if (!tpslibPromises.has(tpslib)) {
    tpslibPromises.set(tpslib, (async () => {
      await outputDirPromise;
      const srcPath = path.resolve('./conf', tpslib);
      await checkSrcFile(srcPath);
      const filePath = await compile(srcPath);
      return StaticTemplateLibrary.loadResourcePromise(filePath);
    })());
  }
  return tpslibPromises.get(tpslib);
};