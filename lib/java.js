const {promisify} = require('util');
const java = require('java');
java.asyncOptions = {
  'asyncSuffix': 'Async',     // Don't generate node-style methods taking callbacks
  'syncSuffix': 'Sync',              // Sync methods use the base name(!!)
  'promiseSuffix': 'Promise',   // Generate methods returning promises, using the suffix Promise.
  'promisify': require('when/node').lift
};
java.classpath.push('./jars/nimtps-all.jar');
java.options.push('-Dfile.encoding=UTF-8');
java.registerClient(() => {
  console.log('Prepare for JVM');
}, () => {
  console.log('JVM Ready');
});
java.waitUtilJvm = new Promise(resolve => java.ensureJvm(resolve));
module.exports = java;