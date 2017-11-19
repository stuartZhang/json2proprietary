const _ = require('underscore');
const path = require('path');
const stripJsonComments = require('strip-json-comments');

const {fsReadFile, fsStat} = require('./fs');

const tpsAttrTypes = fsReadFile(path.resolve('./conf/tpsAttr2type.json')).then(jsonStr => {
  return JSON.parse(stripJsonComments(jsonStr.toString()));
});

_.extendOwn(exports, {
  getAttrType(paths, obj){
    return tpsAttrTypes.then(dataTypes => paths.reduce((subDataTypes, key) => {
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
});
