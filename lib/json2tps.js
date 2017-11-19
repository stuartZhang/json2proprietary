const debug = require('debug');
const path = require('path');
const traverse = require('traverse');
const stripJsonComments = require('strip-json-comments');
const _ = require('underscore');

const {fsReadFile, fsStat} = require('./fs');
const java = require('./java');

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
const tpsAttrTypes = fsReadFile(path.resolve('./conf/tpsAttr2type.json')).then(jsonStr => {
  return JSON.parse(stripJsonComments(jsonStr.toString()));
});
module.exports = function json2tps(body){
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
        promises.push(tpsAttrTypes.then(dataTypes => this.path.reduce((subDataTypes, key) => {
          if (subDataTypes == null || !isNaN(key)) {
            return subDataTypes;
          }
          if (subDataTypes[key] == null) {
            const frac = '(?:\\w|-|\\+|\\.|\\*|=)+';
            const regex = new RegExp(`^${RegExp.quote(`${key}[?(@.`)}(${frac})="(${frac})"${RegExp.quote(')]')}$`); // $.book[?(@.price = 10)]
            for (const dataType of Object.keys(subDataTypes)) {
              const match = regex.exec(dataType);
              if (match && this.parent.node[match[1]] === match[2]) {
                return subDataTypes[dataType];
              }
            }
          }
          return subDataTypes[key];
        }, dataTypes)).then(dataType => {
          switch (dataType) {
          case 'uint': //FIXME: 不正确的编码 1 变成了 129
            return tpsuint.setPromise(this.parent.node.tps, this.key, new Long(String(this.node)));
          case 'int':
            return tpsint.setPromise(this.parent.node.tps, this.key, Number(this.node));
          case 'long':
            return tpslong.setPromise(this.parent.node.tps, this.key, new Long(String(this.node)));
          case 'float':
            return tpsfloat.setPromise(this.parent.node.tps, this.key, Number(this.node));
          case 'double':
            return tpsdouble.setPromise(this.parent.node.tps, this.key, Number(this.node));
          case 'binary-base64':
            return this.parent.node.tps.setAttrPromise(this.key,
              java.newArray('byte', Array.from(Buffer.from(String(this.node),
                dataType.split(/-/)[1]).values())));
          case 'string':
          default:
            console.assert(!_.isObject(dataType), `Incorrect data type: ${JSON.stringify(dataType)}`);
            return tpsstr.setPromise(this.parent.node.tps, this.key, String(this.node));
          }
        }));
      }
    }
    return promises;
  }, [])).then(() => body.tps);
};