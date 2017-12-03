const cluster = require('cluster');
const debug = require('debug');
const _ = require('underscore');
const fs = require('fs');
const stripJsonComments = require('strip-json-comments');
const {promisify} = require('util');
const path = require('path');
const pckg = require('../package.json');

const fsReadFile = promisify(fs.readFile);

_.extendOwn(exports, {
  jsonLoad(filepath){
    const log = exports.debug('config-load');
    return fsReadFile(filepath).then(jsonStr => {
      log(path.relative('.', filepath));
      return JSON.parse(stripJsonComments(jsonStr.toString()));
    })
  },
  debug(category){
    if (cluster.isWorker) {
      return debug(`${pckg.name}[${cluster.worker.process.pid}/${cluster.worker.id}]:${category}`);
    }
    return debug(`${pckg.name}:${category}`);
  }
});
