const _ = require('underscore');
const path = require('path');
const stripJsonComments = require('strip-json-comments');
//
const {fsReadFile, fsStat} = require('./fs');
const java = require('./java');
//
const tpsAttrTypes = fsReadFile(path.resolve('./conf/tpsAttr2type.json')).then(jsonStr => {
  return JSON.parse(stripJsonComments(jsonStr.toString()));
});
module.exports = async function tps2json(nodeTps, json = {}, paths = []){
  const key = await nodeTps.getNamePromise();
  paths.push(key);
  console.log('tps2json', JSON.stringify(paths));

};
