const debug = require('debug');
const path = require('path');
const traverse = require('traverse');
const stripJsonComments = require('strip-json-comments');
const _ = require('underscore');

const {fsReadFile, fsStat} = require('./fs');
const java = require('./java');

const Integer = java.import('java.lang.Integer');
const Long = java.import('java.lang.Long');
const Float = java.import('java.lang.Float');
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
const tpsAttrTypes = fsReadFile(path.resolve('./conf/tpsAttr2type.json')).then(jsonStr => {
  return JSON.parse(stripJsonComments(jsonStr.toString()));
});
module.exports = function json2tps(body){
  return Promise.all(traverse(body).reduce(function(promises, value){
    if (this.notRoot) {
      logger.jsonpath(JSON.stringify(this.path).replace(/"/g, "\\\""));
      if (_.isArray(this.node)) {
        this.node.tps = this.parent.node.tps;
      } else if (_.isObject(this.node)) {
        const key = _.isArray(this.parent.node) ? this.parent.key : this.key;
        this.node.tps = new MutableTPSElement(key);
        if (this.parent.node.tps == null) {
          this.parent.node.tps = this.node.tps;
        } else {
          promises.push(this.parent.node.tps.attachPromise(this.node.tps));
        }
      } else { // 叶子
        promises.push(tpsAttrTypes.then(dataTypes => {
          const dataType = dataTypes[JSON.stringify(this.path)];
          switch (dataType) {
          case 'uint':
            return tpsuint.setPromise(this.parent.node.tps, this.key, new Long(String(this.node)));
          case 'int':
            return tpsint.setPromise(this.parent.node.tps, this.key, new Integer(String(this.node)));
          case 'long':
            return tpslong.setPromise(this.parent.node.tps, this.key, new Long(String(this.node)));
          case 'double':
            return tpsdouble.setPromise(this.parent.node.tps, this.key, Number(this.node));
          case 'float':
            return tpsfloat.setPromise(this.parent.node.tps, this.key, new Float(String(this.node)));
          case 'binary-base64':
            return this.parent.node.tps.setAttrPromise(this.key,
              java.newArray('byte', Array.from(Buffer.from(String(this.node),
                dataType.split(/-/)[1]).values())));
          case 'string':
          default:
            return tpsstr.setPromise(this.parent.node.tps, this.key, String(this.node));
          }
        }));
      }
    }
    return promises;
  }, [])).then(() => body.tps);
};