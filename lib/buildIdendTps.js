const path = require('path');
const _ = require('underscore');

const java = require('./java');

const Long = java.import('java.lang.Long');
const MutableTPSElement = java.import('com.nim.tps.MutableTPSElement');
const tpsstr = java.import('com.nim.tps.attrio.tpsstr');
const tpslong = java.import('com.nim.tps.attrio.tpslong');

module.exports = function buildIdendTps({ip, lang, mdn, credential, 'client-guid': clientGuid, 'user-agent': userAgent}){
  const idenTps = new MutableTPSElement('iden');
  return Promise.all([
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
  ]).then(() => idenTps);
};
