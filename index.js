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
RegExp.quote = require("regexp-quote")
const java = require('./lib/java');
const J2Ttransformer = require('./lib/json2tps');
const tps2json = require('./lib/tps2json');
const loadTpslib = require('./lib/loadTpslib');
const send = require('./lib/sender');
const sameleIden = require('./tests/iden-1.json')
const sampleReq = require('./tests/geocode-req-2.json');
/**
 * Assume
 * 1. apikey: 24611
 */
(async () => {
  await java.waitUtilJvm;
  const request = {
    servlet: {
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
      name: undefined,
      tpslib: 'tpslib.txt',
      host: '192.168.84.234'
    }
  }; //TODO: from http request
  const j2tIden = new J2Ttransformer(sameleIden);
  const j2tReq = new J2Ttransformer(sampleReq);
  const [tpslib, servletName, bodyTps, idenTps] = await Promise.all([
    loadTpslib(request.servlet),
    j2tReq.servletName,
    j2tReq.tps,
    j2tIden.tps
  ]);
  request.servlet.name = servletName;
  const [idenStr, bodyStr] = await Promise.all([idenTps.toStringPromise(), bodyTps.toStringPromise()]);
  console.log('Servlet Name:', request.servlet.name);
  console.log('tps req iden', idenStr);
  console.log('tps req body', bodyStr);
  //
  const json = await tps2json(bodyTps);
  console.log('json res body', JSON.stringify(json, null, 2));
  //
  await send(servletName, tpslib, idenTps, bodyTps);
  console.log('End');
})();
