const tpsConnect = require('../lib');

const sameleIden = require('./iden-1.json');
const sampleReq = require('./geocode-req-2.json');

(async () => {
  console.log('request', sameleIden, sampleReq);
  const res = await tpsConnect(sameleIden, sampleReq);
  console.log('response', res);
})();
