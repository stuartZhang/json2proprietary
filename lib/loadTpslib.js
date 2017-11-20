const debug = require('debug');
const path = require('path');
const {exec} = require('child_process');

const {fsReadFile, fsStat} = require('./fs');
const java = require('./java');

const logger = {
  loader: debug('tpslib-loader')
};
const StaticTemplateLibrary = java.import('com.nim.tps.StaticTemplateLibrary');
const tpslibPromises = new Map();
const outputDir = path.resolve('./conf/tpslib');
const workDir =  path.resolve('./tpslib-compiler');

module.exports = function loadTpslib({tpslib}){
  if (!tpslibPromises.has(tpslib)) {
    const srcPath = path.resolve('./conf', tpslib);
    tpslibPromises.set(tpslib, fsStat(srcPath).then(stats => new Promise((resolve, reject) => {
      if (!stats.isFile()) {
        return reject(`tpslib ${srcPath} isn't a file.`);
      }
      exec(`python libcom.py -t -d ${outputDir} ${srcPath}`, {cwd: workDir}, (err, stdout, stderr) => {
        if (err) {
          return reject(err);
        }
        if (stderr) {
          return reject(stderr);
        }
        const outputPath = path.resolve('./conf/tpslib', stdout.trim());
        // path.relative()
        logger.loader(`Compile ${path.relative('.', srcPath)} to ${path.relative('.', outputPath)}`);
        resolve(outputPath);
      });
    })).then(filePath => {
      return StaticTemplateLibrary.loadResourcePromise(filePath);
    }));
  }
  return tpslibPromises.get(tpslib);
};