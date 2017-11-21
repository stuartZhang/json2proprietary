const debug = require('debug');
const traverse = require('traverse');
const _ = require('underscore');

const java = require('./java');
const {getAttrType} = require('./utils');

java.import('com.nim.tps.MutableTPSElement');
java.import('com.nim.tps.attrio.tpsuint');
java.import('com.nim.tps.attrio.tpsint');
java.import('com.nim.tps.attrio.tpslong');
java.import('com.nim.tps.attrio.tpsfloat');
java.import('com.nim.tps.attrio.tpsdouble');
java.import('com.nim.tps.attrio.tpsstr');
const Long = java.import('java.lang.Long');

const logger = {
  jsonpath: debug('json-path')
};
module.exports = async function json2tps(body){

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
        this.node.tps = java.newInstancePromise('com.nim.tps.MutableTPSElement', key);
        if (this.parent.node.tps == null) { // root元素
          this.parent.node.tps = this.node.tps;
        } else {
          promises.push(Promise.all([this.parent.node.tps, this.node.tps]).then(([parent, child]) => {
            return parent.attachPromise(child);
          }));
        }
      } else { // 叶子
        promises.push(getAttrType(this.path, this.parent.node).then(dataType => {
          switch (dataType) {
          case 'uint':
            return this.parent.node.tps.then(element => {
              return java.callStaticMethodPromise('com.nim.tps.attrio.tpsuint', 'set', element, this.key, new Long(String(this.node)));
            });
          case 'int':
            return this.parent.node.tps.then(element => {
              return java.callStaticMethodPromise('com.nim.tps.attrio.tpsint', 'set', element, this.key, Number(this.node));
            });
          case 'long':
            return this.parent.node.tps.then(element => {
              return java.callStaticMethodPromise('com.nim.tps.attrio.tpslong', 'set', element, this.key, new Long(String(this.node)));
            });
          case 'float':
            return this.parent.node.tps.then(element => {
              return java.callStaticMethodPromise('com.nim.tps.attrio.tpsfloat', 'set', element, this.key, Number(this.node));
            });
          case 'double':
            return this.parent.node.tps.then(element => {
              return java.callStaticMethodPromise('com.nim.tps.attrio.tpsdouble', 'set', element, this.key, Number(this.node));
            });
          case 'binary-base64':
            return this.parent.node.tps.then(element => {
              return element.setAttrPromise(this.key,
                java.newArray('byte', Array.from(Buffer.from(String(this.node),
                  dataType.split(/-/)[1]).values())));
            });
          case 'string':
          default:
            console.assert(!_.isObject(dataType), `Incorrect data type: ${JSON.stringify(dataType)}`);
            return this.parent.node.tps.then(element => {
              return java.callStaticMethodPromise('com.nim.tps.attrio.tpsstr', 'set', element, this.key, String(this.node));
            });
          }
        }));
      }
    }
    return promises;
  }, [])).then(async () => body.tps);
};