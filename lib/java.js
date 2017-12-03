const _ = require('underscore');
const {promisify} = require('util');
const {debug} = require('./utils');
const {javaClasspaths} = require('./confLoad');
const java = require('java');
java.asyncOptions = {
  'asyncSuffix': 'Async',     // Don't generate node-style methods taking callbacks
  'syncSuffix': 'Sync',              // Sync methods use the base name(!!)
  'promiseSuffix': 'Promise',   // Generate methods returning promises, using the suffix Promise.
  'promisify': require('when/node').lift
};
java.classpath.push(...javaClasspaths);
java.options.push('-Dfile.encoding=UTF-8');

const logger = {
  jvm: debug('jvm')
};

let startTime;
java.registerClient(() => {
  startTime = _.now();
  logger.jvm('Prepare for JVM');
}, () => {
  logger.jvm('JVM Ready. Elapse Time: %fms', _.now() - startTime);
});
java.waitUtilJvm = new Promise(resolve => java.ensureJvm(resolve));
module.exports = java;