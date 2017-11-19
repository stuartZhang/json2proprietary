const _ = require('underscore');
const path = require('path');
const stripJsonComments = require('strip-json-comments');
//
const {fsReadFile, fsStat} = require('./fs');
const java = require('./java');
//
const tpsuint = java.import('com.nim.tps.attrio.tpsuint');
const tpsint = java.import('com.nim.tps.attrio.tpsint');
const tpslong = java.import('com.nim.tps.attrio.tpslong');
const tpsdouble = java.import('com.nim.tps.attrio.tpsdouble');
const tpsfloat = java.import('com.nim.tps.attrio.tpsfloat');
const tpsstr = java.import('com.nim.tps.attrio.tpsstr');
//
const tpsAttrTypes = fsReadFile(path.resolve('./conf/tpsAttr2type.json')).then(jsonStr => {
  return JSON.parse(stripJsonComments(jsonStr.toString()));
});
module.exports = async function tps2json(nodeTps, json = {}, paths = []){
  const key = await nodeTps.getNamePromise();
  paths.push(key);
  let obj;
  if (json[key] == null) {
    json[key] = obj = {};
  } else if (!_.isArray(json[key])) {
    json[key] = [json[key], obj = {}];
  } else {
    json[key].push(obj = {});
  }
  await Promise.all([
    nodeTps.enumAttrsPromise().then(async attrNamesTps => { // 串行处理属性
      while (await attrNamesTps.hasMoreElementsPromise()) {
        const attrName = await attrNamesTps.nextElementPromise();
        await tpsAttrTypes.then(dataTypes => [...paths, attrName].reduce((subDataTypes, key) => {
          if (subDataTypes == null) {
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
        }, dataTypes)).then(async dataType => {
          let value;
          switch (dataType) {
          case 'uint':
            value = await tpsuint.getPromise(nodeTps, attrName);
            obj[attrName] = Number(value.longValue);
            break;
          case 'int':
            obj[attrName] = await tpsint.getPromise(nodeTps, attrName);
            break;
          case 'long':
            value = await tpslong.getPromise(nodeTps, attrName);
            obj[attrName] = Number(value.longValue);
            break;
          case 'float':
            obj[attrName] = await tpsfloat.getPromise(nodeTps, attrName);
            break;
          case 'double':
            obj[attrName] = await tpsdouble.getPromise(nodeTps, attrName);
            break;
          case 'binary-base64':
            value = await nodeTps.getAttrPromise(attrName);
            obj[attrName] = new Buffer(value.buffer).toString(dataType.split(/-/)[1]);
            break;
          case 'string':
          default:
            console.assert(!_.isObject(dataType), `Incorrect data type: ${JSON.stringify(dataType)}`);
            obj[attrName] = await tpsstr.getPromise(nodeTps, attrName);
            break;
          }
        });
      }
    }),
    nodeTps.enumChildrenPromise().then(async childrenTps => { // 并行处理子节点
      const promises = [];
      while (await childrenTps.hasMoreElementsPromise()) {
        const promise = childrenTps.nextElementPromise();
        promises.push(promise.then(childTps => {
          return tps2json(childTps, obj, paths.slice(0));
        }));
        await promise;
      }
      await Promise.all(promises);
    })
  ]);
  return json;
};
