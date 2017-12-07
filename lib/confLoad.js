const _ = require('underscore');
const path = require('path');
const fs = require('fs');
const {exec} = require('child_process');
const {promisify} = require('util');
const {debug, jsonLoad} = require('./utils');

const logger = {
  'compile': debug('tpslib-compile')
};
const fsStat = promisify(fs.stat);
const fsMkdir = promisify(fs.mkdir);
const javaClasspaths = [path.resolve(__dirname, '../jars/driver-all.jar')];
const WORK_DIR = path.resolve(__dirname, '../compiler');
const confBase = path.resolve(__dirname, '../conf');
const OUTPUT_DIR = path.join(confBase, 'tpslib');
const attrTypeDict = path.join(confBase, 'tpsAttr2type.json');
const servletNameDict = path.join(confBase, 'query2servletName.json');

_.extendOwn(exports, {
  javaClasspaths,
  'attrTypeDict': jsonLoad(attrTypeDict),
  'servletNameDict': jsonLoad(servletNameDict),
  compile(tpslib){
    if (!tpslibPromises.has(tpslib)) {
      tpslibPromises.set(tpslib, Compiler.compile(path.join(confBase, tpslib))
        .then(filePath => require('./java').callStaticMethodPromise(
          'com.nim.tps.StaticTemplateLibrary', 'loadResource', filePath)));
    }
    return tpslibPromises.get(tpslib);
  }
});

const outputDirPromise = fsMkdir(OUTPUT_DIR).then(() => {
  logger.compile(`Make the output directory: ${OUTPUT_DIR}`);
}, err => {
  if (err.code === 'EEXIST') {
    return Promise.resolve();
  }
  return Promise.reject(err);
});
const tpslibPromises = new Map();
class Compiler{
  static async compile(srcPath){
    const compiler = new Compiler(srcPath);
    await compiler.check();
    const filePath = await compiler.compile();
    return filePath;
  }
  constructor(srcPath){
    this.srcPath = srcPath;
  }
  check(){
    return fsStat(this.srcPath).then(stats => {
      if (!stats.isFile()) {
        throw new Error(`tpslib ${this.srcPath} isn't a file.`);
      }
    });
  }
  compile(){
    return outputDirPromise.then(() => new Promise((resolve, reject) => {
      exec(`python libcom.py -t -d ${OUTPUT_DIR} ${this.srcPath}`, {'cwd': WORK_DIR}, (err, stdout, stderr) => {
        if (err) {
          return reject(err);
        }
        if (stderr) {
          return reject(stderr);
        }
        const outputPath = path.join(OUTPUT_DIR, stdout.trim());
        logger.compile(`Compile ${path.relative('.', this.srcPath)} to ${path.relative('.', outputPath)}`);
        return resolve(outputPath);
      });
    }));
  }
}
