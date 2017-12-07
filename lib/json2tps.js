const traverse = require('traverse');
const _ = require('underscore');

const {attrTypeDict, servletNameDict} = require('./confLoad');
const java = require('./java');
const {debug} = require('./utils');

const Long = java.import('java.lang.Long');

const logger = {
  'jsonpath': debug('json-path')
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
  static get [Symbol.species](){
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
    const manifest = new Map();
    return traverse(this.json).reduce(function(promise, value){ // 串行处理所有TPS元素与属性
      if (this.notRoot) {
        logger.jsonpath(JSON.stringify(this.path).replace(/"/g, '\\"'));
        if (_.isArray(this.node)) { // search-filter: {pair: []}
          manifest.set(this.node, manifest.get(this.parent.node));
        } else if (_.isObject(this.node)) {
          let key = this.key; // result-style: {}
          if (_.isArray(this.parent.node)) {
            key = this.parent.key; // pair: [{}, {}, ...]
          }
          manifest.set(this.node, java.newInstancePromise('com.nim.tps.MutableTPSElement', key));
          if (manifest.has(this.parent.node)) {
            promise = promise.then(() => Promise.all([
              manifest.get(this.parent.node),
              manifest.get(this.node)
            ]).then(([parent, child]) => parent.attachPromise(child)));
          } else { // root元素
            manifest.set(this.parent.node, manifest.get(this.node));
          }
        } else { // 叶子
          promise = promise.then(() => Transformer.getAttrType(this.path, this.parent.node).then(dataType => {
            switch (dataType) {
            case 'uint':
              return manifest.get(this.parent.node).then(element => java.callStaticMethodPromise('com.nim.tps.attrio.tpsuint', 'set', element, this.key, new Long(String(this.node))));
            case 'int':
              return manifest.get(this.parent.node).then(element => java.callStaticMethodPromise('com.nim.tps.attrio.tpsint', 'set', element, this.key, Number(this.node)));
            case 'long':
              return manifest.get(this.parent.node).then(element => java.callStaticMethodPromise('com.nim.tps.attrio.tpslong', 'set', element, this.key, new Long(String(this.node))));
            case 'float':
              return manifest.get(this.parent.node).then(element => java.callStaticMethodPromise('com.nim.tps.attrio.tpsfloat', 'set', element, this.key, Number(this.node)));
            case 'double':
              return manifest.get(this.parent.node).then(element => java.callStaticMethodPromise('com.nim.tps.attrio.tpsdouble', 'set', element, this.key, Number(this.node)));
            case 'binary-base64':
              return manifest.get(this.parent.node).then(element => element.setAttrPromise(this.key,
                java.newArray('byte', Array.from(Buffer.from(String(this.node),
                  dataType.split(/-/)[1]).values()))));
            case 'string':
            default:
              console.assert(!_.isObject(dataType), `Incorrect data type: ${JSON.stringify(dataType)}`);
              return manifest.get(this.parent.node).then(element => java.callStaticMethodPromise('com.nim.tps.attrio.tpsstr', 'set', element, this.key, String(this.node)));
            }
          }));
        }
      }
      return promise;
    }, Promise.resolve()).then(() => manifest.get(this.json));
  }
};
