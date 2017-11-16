const java = require('java');
const path = require('path');
const fs = require('fs');
const {promisify} = require('util');
const _ = require('underscore');
const fsStat = promisify(fs.stat);
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
const StaticTemplateLibrary = java.import('com.nim.tps.StaticTemplateLibrary');
const MutableTPSElement = java.import('com.nim.tps.MutableTPSElement');
const tpsstr = java.import('com.nim.tps.attrio.tpsstr');
const tpslong = java.import('com.nim.tps.attrio.tpslong');

async function buildIdendTps({ip, lang, mdn, credential, 'client-guid': clientGuid, 'user-agent': userAgent}){
  const idenTps = new MutableTPSElement('iden');
  await Promise.all([
    tpsstr.setPromise(idenTps , 'ip-address', ip),
    tpsstr.setPromise(idenTps , 'language', lang),
    tpsstr.setPromise(idenTps , 'credential', credential),
    tpsstr.setPromise(idenTps , 'client-guid', clientGuid),
    tpsstr.setPromise(idenTps , 'user-agent', userAgent),
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
async function loadTpslib({tpslib}){
  tpslib = path.resolve('./conf', tpslib);
  const stats = await fsStat(tpslib);
  if (!stats.isFile()) {
    throw new Error(`tpslib ${tpslib} isn't a file.`);
  }
  return StaticTemplateLibrary.loadResourcePromise(tpslib);
}
/**
 * Assume
 * 1. apikey: 24611
 */
(async () => {
  const request = {
    iden: {
      ip: '192.168.84.233',
      lang: 'zh-cn',
      mdn: '9999990012', // As for apikey=24611, the field should be null.
      credential: 'tAO+lTVRKdtcVmX9hj1NTqfvz/FCx/vMtx4BfElp',
      'client-guid': 'dc5b30a4ff374279802a06b26cef9b77',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.89 Safari/537.36'
    },
    servlet: {
      /*
        servlet name:
          asr=asr-reco
          event=proxpoi,global
          geocode=geocode,global
          map=map,global
          movie=proxpoi,global
          navigation=nav,global
          proxpoi=proxpoi,global
          com.nim.nbwa.servlet.vectortile=vector-tile,global
          proxpoi.scheme=atlasbook-standard-2
          pronun=pronun
          singlesearch.scheme=tcs-nbwa-single-search
          singlesearch.geocode.scheme=tcs-nbwa-geocode-search
          traffic=proxpoi,sb
          traffic.notify=traffic-notify,global
          traffic.scheme=traffic-incident
          reverseGeocode=reverse-geocode,global
          sendPlace=send-place-message
          sendMessage=send-message
          weather=proxpoi,global
          metadata=metadata
          siinglesearch=search
      */
      name: 'geocode,global',
      tpslib: '5a5139403cce4a4719428b304739567dab9e11de',
      host: '192.168.84.234'
    }
  }; //TODO: from http request
  const [idenTps, tpslib] = await Promise.all([
    buildIdendTps(request.iden),
    loadTpslib(request.servlet)
  ]);
  idenTps.toStringPromise().then(console.log);
  console.dir(tpslib);
})();
