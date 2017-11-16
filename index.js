const java = require('java');
const _ = require('underscore');
java.asyncOptions = {
  'asyncSuffix': 'Async',     // Don't generate node-style methods taking callbacks
  'syncSuffix': 'Sync',              // Sync methods use the base name(!!)
  'promiseSuffix': 'Promise',   // Generate methods returning promises, using the suffix Promise.
  'promisify': require('when/node').lift
};
java.classpath.push('./jars/nimtps-all.jar');
java.options.push('-Dfile.encoding=UTF-8');
/**
 * TPS Element Class set
 * <ul>
 *   <li>com.nim.tps.MutableTPSElement
 *   <li>com.nim.tps.StaticTemplateLibrary
 *   <li>com.nim.tps.TPSElement
 *   <li>com.nim.tps.TemplateLibrary
 *   <li>com.nim.tps.attrio.tpsdouble
 *   <li>com.nim.tps.attrio.tpsfloat
 *   <li>com.nim.tps.attrio.tpsint
 *   <li>com.nim.tps.attrio.tpslong
 *   <li>com.nim.tps.attrio.tpsstr
 *   <li>com.nim.tps.attrio.tpsuint
 * </ul>
 */
const Long = java.import('java.lang.Long');
const MutableTPSElement = java.import('com.nim.tps.MutableTPSElement');
const tpsstr = java.import('com.nim.tps.attrio.tpsstr');
const tpslong = java.import('com.nim.tps.attrio.tpslong');

async function buildIdendTps({ip, lang, mdn, credential, 'client-guid': clientGuid}){
  const idenTps = new MutableTPSElement('iden');
  await Promise.all([
    tpsstr.setPromise(idenTps , 'ip-address', ip),
    tpsstr.setPromise(idenTps , 'language', lang),
    tpsstr.setPromise(idenTps , 'credential', credential),
    tpsstr.setPromise(idenTps , 'client-guid', clientGuid),
    new Promise((resolve, reject) => {
      if (_.isString(mdn) && !_.isEmpty(mdn)) {
        tpslong.setPromise(idenTps , 'mdn', new Long(mdn)).then(resolve, reject);
      } else {
        resolve();
      }
    })
  ]);
  return idenTps;
}
(async () => {
  /**
   * Assume
   * 1. apikey: 24611
   */
  const idenTps = await buildIdendTps({
    ip: '192.168.84.233',
    lang: 'zh-cn',
    mdn: '9999990012', // As for apikey=24611, the field should be null.
    credential: 'tAO+lTVRKdtcVmX9hj1NTqfvz/FCx/vMtx4BfElp',
    'client-guid': 'dc5b30a4ff374279802a06b26cef9b77'
  }); //TODO: from http request
  idenTps.toStringPromise().then(console.dir);
})();
