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
RegExp.quote = require("regexp-quote");
const _ = require('underscore');
const java = require('./lib/java');
const J2Ttransformer = require('./lib/json2tps');
const tps2json = require('./lib/tps2json');
const {compile} = require('./lib/confLoad');
const send = require('./lib/sender');
const sameleIden = require('./tests/iden-1.json');
const sampleReq = require('./tests/geocode-req-2.json');
/**
 * Assume
 * 1. apikey: 24611
 */
(async () => {
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
    host: 'aabdea8e46a51e37190abaacd351acdf062ffffc.amadorsoft.com',
    // host: '192.168.85.10',
    port: 8129,
    timeout: 30 * 1000,
    tpslib: 'tpslib.txt',
    servletName: undefined
  };
  // Build a TPS request
  const j2tIden = new J2Ttransformer(sameleIden); //TODO: from http request
  const j2tReq = new J2Ttransformer(sampleReq); //TODO: from http request
  const [tpslib, servletName, bodyTps, idenTps] = await Promise.all([
    compile(mux.tpslib),
    j2tReq.servletName,
    j2tReq.tps,
    j2tIden.tps
  ]);
  _.extendOwn(mux, {servletName, tpslib});
  const [idenStr, bodyStr] = await Promise.all([idenTps.toStringPromise(), bodyTps.toStringPromise()]);
  console.log('Servlet Name:', servletName);
  console.log('tps req iden', idenStr);
  console.log('tps req body', bodyStr);
  // Build a JSON respose
  const json = await tps2json(bodyTps);
  console.log('json res body', JSON.stringify(json, null, 2));
  // Send a TPS request
  await send(mux, idenTps, bodyTps);
  console.log('End');
})();
