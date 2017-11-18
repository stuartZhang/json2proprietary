const path = require('path');

const {fsReadFile, fsStat} = require('./fs');
const java = require('./java');

const StaticTemplateLibrary = java.import('com.nim.tps.StaticTemplateLibrary');
const tpslibPromises = new Map();

module.exports = function loadTpslib({tpslib}){
  if (!tpslibPromises.has(tpslib)) {
    const filePath = path.resolve('./conf', tpslib);
    tpslibPromises.set(tpslib, fsStat(filePath).then(stats => {
      if (!stats.isFile()) {
        throw new Error(`tpslib ${filePath} isn't a file.`);
      }
      return StaticTemplateLibrary.loadResourcePromise(filePath);
    }));
  }
  return tpslibPromises.get(tpslib);
};