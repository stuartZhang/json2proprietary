const {promisify} = require('util');
const fs = require('fs');

const fsReadFile = promisify(fs.readFile);
const fsStat = promisify(fs.stat);
const fsMkdir = promisify(fs.mkdir);

module.exports = {fsReadFile, fsStat, fsMkdir};
