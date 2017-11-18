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
const java = require('./lib/java');
const json2tps = require('./lib/json2tps');
const calcServletName = require('./lib/calcServletName');
const loadTpslib = require('./lib/loadTpslib');
const buildIdendTps = require('./lib/buildIdendTps');
const sampleReq = require('./tests/geocode-req-1.json');
/**
 * Assume
 * 1. apikey: 24611
 */
(async () => {
  const request = {
    iden: {
      ip: '192.168.84.233',
      lang: 'zh-cn',
      mdn: '9999990012', // As for apikey=24611, the field should be null.
      credential: 'tAO+lTVRKdtcVmX9hj1NTqfvz/FCx/vMtx4BfElp',
      'client-guid': 'dc5b30a4ff374279802a06b26cef9b77',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.89 Safari/537.36'
    },
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
      tpslib: '5a5139403cce4a4719428b304739567dab9e11de',
      host: '192.168.84.234'
    },
    body: sampleReq
  }; //TODO: from http request
  const [servletName, tpslib, idenTps, bodyTps] = await Promise.all([
    calcServletName(request.body),
    loadTpslib(request.servlet),
    buildIdendTps(request.iden),
    json2tps(request.body)
  ]);
  request.servlet.name = servletName;
  console.dir(tpslib);
  console.log('Servlet Name:', request.servlet.name);
  const [idenStr, bodyStr] = await Promise.all([
    idenTps.toStringPromise(),
    bodyTps.toStringPromise()
  ]);
  console.log('tps req iden', idenStr);
  console.log('tps req body', bodyStr);
})();
