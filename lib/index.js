RegExp.quote = require("regexp-quote");
const _ = require('underscore');

const java = require('./java');
const {compile} = require('./confLoad');
const J2Ttransformer = require('./json2tps');
const send = require('./sender');
const tps2json = require('./tps2json');

module.exports = async function tpsConnect(iden, request){
  await java.waitUtilJvm;
  const mux = {
    host: 'aabdea8e46a51e37190abaacd351acdf062ffffc.amadorsoft.com',
    // host: '192.168.85.10',
    port: 8129,
    timeout: 30 * 1000,
    tpslib: 'tpslib.txt',
    servletName: undefined
  };
  // Build a TPS request
  const j2tIden = new J2Ttransformer(iden);
  const j2tReq = new J2Ttransformer(request);
  const [tpslib, servletName, bodyTps, idenTps] = await Promise.all([
    compile(mux.tpslib),
    j2tReq.servletName,
    j2tReq.tps,
    j2tIden.tps
  ]);
  _.extendOwn(mux, {servletName, tpslib});
  // Send a TPS request
  const resTps = await send(mux, idenTps, bodyTps);
  // Build a JSON respose
  const resJson = await tps2json(resTps);
  return resJson;
};
