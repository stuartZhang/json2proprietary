const debug = require('debug');
const traverse = require('traverse');
const _ = require('underscore');

const {attrTypeDict, servletNameDict} = require('./confLoad');
const java = require('./java');

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
module.exports = class Transformer{
  static getAttrType(paths, obj){
    return attrTypeDict.then(dataTypes => paths.reduce((subDataTypes, key) => {
      if (subDataTypes == null || !isNaN(key)) {
        return subDataTypes;
      }
      if (subDataTypes[key] == null) {
        const frac = '(?:\\w|-|\\+|\\.|\\*|=)+';
        const regex = new RegExp(`^${RegExp.quote(`${key}[?(@.`)}(${frac})="(${frac})"${RegExp.quote(')]')}$`); // $.book[?(@.price = 10)]
        for (const dataType of Object.keys(subDataTypes)) {
          const match = regex.exec(dataType);
          if (match && obj[match[1]] === match[2]) {
            return subDataTypes[dataType];
          }
        }
      }
      return subDataTypes[key];
    }, dataTypes));
  }
  static get [Symbol.species]() {
    return this;
  }
  constructor(json){
    this.json = json;
    this[Symbol.toStringTag] = 'JSON-2-TPS Transformer';
  }
  get servletName(){
    console.assert(this.json.hasOwnProperty('query'), `Improper json src: ${JSON.stringify(this.json)}`);
    const keys = Object.keys(this.json.query);
    console.assert(keys.length === 1, `Too many querys ${keys.join()} in the same request.`);
    const [queryName] = keys;
    return servletNameDict.then(mapping => {
      const servletName = mapping[queryName];
      console.assert(!_.isEmpty(servletName), `miss the servlet name for query name ${queryName}`);
      return servletName;
    });
  }
  get tps(){
    return traverse(this.json).reduce(function(promise, value){ // 串行处理所有TPS元素与属性
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
            promise = promise.then(() => {
              return Promise.all([this.parent.node.tps, this.node.tps]).then(([parent, child]) => {
                return parent.attachPromise(child);
              });
            });
          }
        } else { // 叶子
          promise = promise.then(() => {
            return Transformer.getAttrType(this.path, this.parent.node).then(dataType => {
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
            });
          });
        }
      }
      return promise;
    }, Promise.resolve()).then(async () => this.json.tps);
  }
};
