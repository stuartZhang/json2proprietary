const debug = require('debug');
const path = require('path');
const fs = require('fs');
const {exec} = require('child_process');

const {fsAccess, fsReadFile, fsWriteFile, fsMkdir, fsStat} = require('./fs');
const java = require('./java');

const StaticTemplateLibrary = java.import('com.nim.tps.StaticTemplateLibrary');

const logger = {
  loader: debug('tpslib-loader')
};
const tpslibPromises = new Map();
const WORK_DIR = path.resolve('./tpslib-compiler');
const OUTPUT_DIR = path.resolve('./conf/tpslib');
const outputDirPromise = fsMkdir(OUTPUT_DIR).then(() => {
  logger.loader(`Make the output directory: ${OUTPUT_DIR}`);
}, err => {
  if (err.code === 'EEXIST') {
    return Promise.resolve();
  }
  return Promise.reject(err);
});
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
  async check(){
    const stats = await fsStat(this.srcPath);
    if (!stats.isFile()) {
      throw new Error(`tpslib ${this.srcPath} isn't a file.`);
    }
  }
  compile(){
    return new Promise((resolve, reject) => {
      exec(`python libcom.py -t -d ${OUTPUT_DIR} ${this.srcPath}`, {cwd: WORK_DIR}, (err, stdout, stderr) => {
        if (err) {
          return reject(err);
        }
        if (stderr) {
          return reject(stderr);
        }
        const outputPath = path.resolve(OUTPUT_DIR, stdout.trim());
        logger.loader(`Compile ${path.relative('.', this.srcPath)} to ${path.relative('.', outputPath)}`);
        resolve(outputPath);
      });
    });
  }
}
class Manifest{
  constructor(tpslib){
    this.tpslib = tpslib;
  }
  async read(){
    try {
      await fsAccess(Manifest.MANIFEST_PATH, fs.constants.F_OK);
    } catch (error) {
      return {};
    }
    let content = await fsReadFile(Manifest.MANIFEST_PATH);
    content = JSON.parse(content);
    return content;
  }
  async check(){
    const content = await this.read();
    if (content[this.tpslib]) {
      return path.resolve(OUTPUT_DIR, content[this.tpslib]);
    }
    return null;
  }
  async write(filePath){
    const content = await this.read();
    content[this.tpslib] = path.basename(filePath);
    await fsWriteFile(Manifest.MANIFEST_PATH, JSON.stringify(content, null, 2));
  }
}
Manifest.MANIFEST_PATH = path.resolve(OUTPUT_DIR, 'manifest.txt');

module.exports = function loadTpslib({tpslib}){
  if (!tpslibPromises.has(tpslib)) {
    tpslibPromises.set(tpslib, (async () => {
      await outputDirPromise;
      const manifest = new Manifest(tpslib);
      let filePath = await manifest.check(tpslib);
      if (filePath == null) {
        filePath = await Compiler.compile(path.resolve('./conf', tpslib));
        await manifest.write(filePath);
      }
      return StaticTemplateLibrary.loadResourcePromise(filePath);
    })());
  }
  return tpslibPromises.get(tpslib);
};