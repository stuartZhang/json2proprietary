const debug = require('debug');
const traverse = require('traverse');
const _ = require('underscore');

const java = require('./java');
const {getAttrType} = require('./utils');

const Long = java.import('java.lang.Long');
const MutableTPSElement = java.import('com.nim.tps.MutableTPSElement');
const tpsuint = java.import('com.nim.tps.attrio.tpsuint');
const tpsint = java.import('com.nim.tps.attrio.tpsint');
const tpslong = java.import('com.nim.tps.attrio.tpslong');
const tpsdouble = java.import('com.nim.tps.attrio.tpsdouble');
const tpsfloat = java.import('com.nim.tps.attrio.tpsfloat');
const tpsstr = java.import('com.nim.tps.attrio.tpsstr');

const logger = {
  jsonpath: debug('json-path')
};
module.exports = function json2tps(body){
  const promiseMap = new Map();
  return Promise.all(traverse(body).reduce(function(promises, value){
    if (this.notRoot) {
      logger.jsonpath(JSON.stringify(this.path).replace(/"/g, "\\\""));
      if (_.isArray(this.node)) { // search-filter: {pair: []}
        this.node.tps = this.parent.node.tps;
      } else if (_.isObject(this.node)) {
        let key = this.key; // result-style: {}
        if (_.isArray(this.parent.node)) {
          key = this.parent.key; // pair: [{}, {}, ...]
        }
        this.node.tps = new MutableTPSElement(key);
        if (this.parent.node.tps == null) { // root元素
          this.parent.node.tps = this.node.tps;
        } else {
          promises.push(this.parent.node.tps.attachPromise(this.node.tps));
        }
      } else { // 叶子
        promises.push(getAttrType(this.path, this.parent.node).then(dataType => {
          let promise;
          switch (dataType) {
          case 'uint':
            promise = tpsuint.setPromise(this.parent.node.tps, this.key, new Long(String(this.node)));
            break;
          case 'int':
            promise = tpsint.setPromise(this.parent.node.tps, this.key, Number(this.node));
            break;
          case 'long':
            promise = tpslong.setPromise(this.parent.node.tps, this.key, new Long(String(this.node)));
            break;
          case 'float':
            promise = tpsfloat.setPromise(this.parent.node.tps, this.key, Number(this.node));
            break;
          case 'double':
            promise = tpsdouble.setPromise(this.parent.node.tps, this.key, Number(this.node));
            break;
          case 'binary-base64':
            promise = this.parent.node.tps.setAttrPromise(this.key,
              java.newArray('byte', Array.from(Buffer.from(String(this.node),
                dataType.split(/-/)[1]).values())));
            break;
          case 'string':
          default:
            console.assert(!_.isObject(dataType), `Incorrect data type: ${JSON.stringify(dataType)}`);
            promise = tpsstr.setPromise(this.parent.node.tps, this.key, String(this.node));
            break;
          }
          if (promiseMap.has(this.parent.node.tps)) { // 串行处理TPS元素的属性
            const tmp = promise;
            promise = promiseMap.get(this.parent.node.tps).then(() => tmp);
          }
          promiseMap.set(this.parent.node.tps, promise);
        }));
      }
    }
    return promises;
  }, [])).then(() => {
    promiseMap.clear();
    return body.tps;
  });
};