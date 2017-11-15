const _ = require('underscore');
const java = require('java');
java.asyncOptions = {
  'asyncSuffix': 'Async',     // Don't generate node-style methods taking callbacks
  'syncSuffix': "Sync",              // Sync methods use the base name(!!)
  'promiseSuffix': "Promise",   // Generate methods returning promises, using the suffix Promise.
  'promisify': require("when/node").lift
};
java.classpath.push('./jars/base-test.jar');
java.options.push('-Dfile.encoding=UTF-8');
// const javaLangSystem = java.import('java.lang.System');
// javaLangSystem.out.printlnSync('Hello World! 世界你好！');
const TpsConDriver = java.import('com.amo.driver.TpsConDriver');
const startTime = _.now();
async function handle(value) {
  try {
    const res = await TpsConDriver.sendPromise(value);
    console.log('Elaps Time:', _.now() - startTime)
    return console.log('js output: ' + res);
  } catch (err) {
    console.error(err);
  }
}
Promise.all([handle("中文"), handle("2")]).then(() => {
  handle("输出");
});
