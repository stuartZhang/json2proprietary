const tpsConnect = require('../lib');

const sameleIden = require('./iden-1.json');
const sampleReq = require('./geocode-req-2.json');

(async () => {
  console.log('Iden', JSON.stringify(sameleIden, null, 2), '\nRequest', JSON.stringify(sampleReq, null, 2));
  const res = await tpsConnect(sameleIden, sampleReq);
  console.log('Response', JSON.stringify(res, null, 2));
})();
