const {promisify} = require('util');
const fs = require('fs');

const fsReadFile = promisify(fs.readFile);
const fsStat = promisify(fs.stat);
const fsMkdir = promisify(fs.mkdir);
const fsWriteFile = promisify(fs.writeFile);
const fsAccess = promisify(fs.access);

module.exports = {fsAccess, fsReadFile, fsWriteFile, fsStat, fsMkdir};
