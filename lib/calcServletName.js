const path = require('path');
const stripJsonComments = require('strip-json-comments');
const _ = require('underscore');

const {fsReadFile, fsStat} = require('./fs');

const mappingPromise = fsReadFile(path.resolve('./conf/query2servletName.json')).then(jsonStr => {
  return JSON.parse(stripJsonComments(jsonStr.toString()));
});
module.exports = function calcServletName({query}){
  const keys = Object.keys(query);
  console.assert(keys.length === 1, `Too many querys ${keys.join()} in the same request.`);
  const [queryName] = keys;
  return mappingPromise.then(mapping => {
    const servletName = mapping[queryName];
    console.assert(servletName, `miss the servlet name for query name ${queryName}`);
    return servletName;
  });
};
