const tpsConnect = require('../lib');
const sameleIden = require('./iden-1.json');
let sampleReq, res;
(async () => {
  sampleReq = require('./ssb-req-1.json');
  console.log('Iden', JSON.stringify(sameleIden, null, 2), '\nRequest', JSON.stringify(sampleReq, null, 2));
  res = await tpsConnect(sameleIden, sampleReq);
  console.log('Response', JSON.stringify(res, null, 2));
  //
  sampleReq = require('./ssb-req-2.json');
  console.log('Iden', JSON.stringify(sameleIden, null, 2), '\nRequest', JSON.stringify(sampleReq, null, 2));
  res = await tpsConnect(sameleIden, sampleReq);
  console.log('Response', JSON.stringify(res, null, 2));
  //
  sampleReq = require('./ssb-req-3.json');
  console.log('Iden', JSON.stringify(sameleIden, null, 2), '\nRequest', JSON.stringify(sampleReq, null, 2));
  res = await tpsConnect(sameleIden, sampleReq);
  console.log('Response', JSON.stringify(res, null, 2));
})();