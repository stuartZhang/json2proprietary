const path = require('path');
const traverse = require('traverse');
const stripJsonComments = require('strip-json-comments');
const _ = require('underscore');

const {fsReadFile, fsStat} = require('./fs');
const java = require('./java');

const Long = java.import('java.lang.Long');
const MutableTPSElement = java.import('com.nim.tps.MutableTPSElement');
const tpsstr = java.import('com.nim.tps.attrio.tpsstr');
const tpslong = java.import('com.nim.tps.attrio.tpslong');

const tpsAttrTypes = fsReadFile(path.resolve('./conf/tpsAttr2type.json')).then(jsonStr => {
  return JSON.parse(stripJsonComments(jsonStr.toString()));
});
module.exports = function json2tps(body){
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