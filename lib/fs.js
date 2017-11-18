const {promisify} = require('util');
const fs = require('fs');

const fsReadFile = promisify(fs.readFile);
const fsStat = promisify(fs.stat);

module.exports = {fsReadFile, fsStat};
