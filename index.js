const java = require('java');
java.asyncOptions = {
  'asyncSuffix': 'Async',     // Don't generate node-style methods taking callbacks
  'syncSuffix': "Sync",              // Sync methods use the base name(!!)
  'promiseSuffix': "Promise",   // Generate methods returning promises, using the suffix Promise.
  'promisify': require("when/node").lift
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
const MutableTPSElement = java.import('com.nim.tps.MutableTPSElement');
const tpsstr = java.import('com.nim.tps.attrio.tpsstr');
//
async function buildIdendTps(){
  const idenTps = new MutableTPSElement("iden");
  await tpsstr.setPromise(idenTps , "ip-address", '192.168.84.233'); //TODO: from http request
  await tpsstr.setPromise(idenTps , "language", 'zh-cn'); //TODO: from http request
  return idenTps;
}
(async () => {    
  const idenTps = await buildIdendTps();
  const str = await idenTps.toStringPromise();
  console.dir(str);
})();
