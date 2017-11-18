const {promisify} = require('util');
const _ = require('underscore');
const fs = require('fs');
const java = require('java');
const path = require('path');
const traverse = require('traverse');
const stripJsonComments = require('strip-json-comments');
//
const sampleReq = require('./tests/geocode-req-1.json');
//
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
//
const fsStat = promisify(fs.stat);
const fsReadFile = promisify(fs.readFile);
//
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
const calcServletName = (() => {
  const mappingPromise = fsReadFile(path.resolve('./conf/query2servletName.json')).then(jsonStr => {
    return JSON.parse(stripJsonComments(jsonStr.toString()));
  });
  return async function calcServletName({query}){
    const keys = Object.keys(query);
    console.assert(keys.length === 1, `Too many querys ${keys.join()} in the same request.`);
    const [queryName] = keys;
    const servletName = (await mappingPromise)[queryName];
    console.assert(servletName, `miss the servlet name for query name ${queryName}`);
    return servletName;
  };
})();
const loadTpslib = (() => {
  const tpslibPromises = new Map();
  return function loadTpslib({tpslib}){
    if (!tpslibPromises.has(tpslib)) {
      const filePath = path.resolve('./conf', tpslib);
      tpslibPromises.set(tpslib, fsStat(filePath).then(stats => {
        if (!stats.isFile()) {
          throw new Error(`tpslib ${filePath} isn't a file.`);
        }
        return StaticTemplateLibrary.loadResourcePromise(filePath);
      }));
    }
    return tpslibPromises.get(tpslib);
  };
})();
const json2tps = (() => {
  const tpsAttrTypes = fsReadFile(path.resolve('./conf/tpsAttr2type.json')).then(jsonStr => {
    return JSON.parse(stripJsonComments(jsonStr.toString()));
  });
  return function json2tps(body){
    return Promise.all(traverse(body).reduce(function(promises, value){
      // console.log('json2tps', JSON.stringify(this.path).replace(/"/g, "\\\""));
      if (this.key !== undefined) {
        if (_.isObject(this.node) || _.isArray(this.node)) {
          this.node.tps = new MutableTPSElement(this.key);
          if (this.parent.node.tps == null) {
            this.parent.node.tps = this.node.tps;
          } else {
            promises.push(this.parent.node.tps.attachPromise(this.node.tps));
          }
        } else { // 叶子
          promises.push(tpsAttrTypes.then(dataTypes => {
            switch (dataTypes[JSON.stringify(this.path)]) {
            case 'long':
              return tpslong.setPromise(this.parent.node.tps , this.key, new Long(String(this.node)));
            case 'string':
            default:
              return tpsstr.setPromise(this.parent.node.tps , this.key, String(this.node));
            }
          }));
        }
      }
      return promises;
    }, [])).then(() => body.tps);
  };
})();
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
          servlet.command.geocode-query=geocode,usa
          servlet.command.reverse-geocode-query=reverse-geocode,usa
          servlet.command.nav-query=nav,usa
          servlet.command.proxpoi-query=proxpoi,usa
          servlet.command.send-place-message-query=send-place-message
          servlet.command.send-message-query=send-message
          servlet.command.search-query=search
      */
      name: undefined,
      tpslib: '5a5139403cce4a4719428b304739567dab9e11de',
      host: '192.168.84.234'
    },
    body: sampleReq
  }; //TODO: from http request
  const [servletName, tpslib, idenTps, bodyTps] = await Promise.all([
    calcServletName(request.body),
    loadTpslib(request.servlet),
    buildIdendTps(request.iden),
    json2tps(request.body)
  ]);
  request.servlet.name = servletName;
  console.dir(tpslib);
  console.log('Servlet Name:', request.servlet.name);
  const [idenStr, bodyStr] = await Promise.all([
    idenTps.toStringPromise(),
    bodyTps.toStringPromise()
  ]);
  console.log('tps req iden', idenStr);
  console.log('tps req body', bodyStr);
})();
