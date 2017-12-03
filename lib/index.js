const _ = require('underscore');
_.defaults(RegExp, {quote: require("regexp-quote")});
/**
 * TPS Element Class set
 * <ul>
 *   <li>com.nim.tps.MutableTPSElement
 *   <li>com.nim.tps.StaticTemplateLibrary
 *   <li>com.nim.tps.TPSElement
 *   <li>com.nim.tps.TemplateLibrary
 *   <li>com.nim.tps.attrio.tpsdouble
 *   <li>com.nim.tps.attrio.tpsfloat
 *   <li>com.nim.tps.attrio.tpsint
 *   <li>com.nim.tps.attrio.tpslong
 *   <li>com.nim.tps.attrio.tpsstr
 *   <li>com.nim.tps.attrio.tpsuint
 * </ul>
 */
const java = require('./java');
const {compile} = require('./confLoad');
const J2Ttransformer = require('./json2tps');
const send = require('./sender');
const tps2json = require('./tps2json');
const {debug} = require('./utils');

const logger = {
  tpsDetails: debug('tps-details')
};
const host = process.env.NAVBUILDER_TPS_SERVER_HOST || '192.168.85.10';

module.exports = async function tpsConnect(iden, request){
  await java.waitUtilJvm;
  /*
    servlet name:
      servlet.command.geocode-query=geocode,usa
      servlet.command.reverse-geocode-query=reverse-geocode,usa
      servlet.command.nav-query=nav,usa
      servlet.command.proxpoi-query=proxpoi,usa
      servlet.command.send-place-message-query=send-place-message
      servlet.command.send-message-query=send-message
      servlet.command.search-query=search
  */
  const mux = {
    host,
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
  Promise.all([idenTps.toStringPromise(), bodyTps.toStringPromise()]).then(([idenStr, reqStr]) => {
    logger.tpsDetails('\nIden: %sReq: %s', idenStr, reqStr);
  });
  const resTps = await send(mux, idenTps, bodyTps);
  resTps.toStringPromise().then(resStr => {
    logger.tpsDetails('res: %s', resStr);
  });
  // Build a JSON respose
  const resJson = await tps2json(resTps);
  return resJson;
};
