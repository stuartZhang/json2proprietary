const _ = require('underscore');

const java = require('./java');

const ByteArrayOutputStream = java.import('java.io.ByteArrayOutputStream');
const Socket = java.import('java.net.Socket');
const Packer = java.import('com.nim.tps.Packer');
const InboundPacket = java.import('com.nim.teslanet.InboundPacket');
const MuxInputStream = java.import('com.nim.teslanet.MuxInputStream');
const MuxOutputStream = java.import('com.nim.teslanet.MuxOutputStream');
const ProxyUtilityInputStream = java.import('com.nim.util.stream.ProxyUtilityInputStream');
const ProxyUtilityOutputStream = java.import('com.nim.util.stream.ProxyUtilityOutputStream');

const mux = {
  host: 'aabdea8e46a51e37190abaacd351acdf062ffffc.amadorsoft.com',
  port: 8129,
  timeout: 30 * 1000,
  token: 'PrMkzpTrr4urjZpmG0S36Ghmu/dcLUucuXjR8ZAO'
};

module.exports = async function send(servletName, tpslib, idenTps, bodyTps) {
  //
  const tpslibId = await tpslib.getIDPromise();
  const outputStream = new ByteArrayOutputStream();
  const mos = new MuxOutputStream(null, new ProxyUtilityOutputStream(outputStream));
  const baos = new ByteArrayOutputStream();
  // Send iden!
  await baos.writePromise(java.newArray('byte', Array.from(tpslibId)));
  const pack = await Packer.packPromise(tpslib, idenTps);
  console.log('pack', pack); //FIXME: Stop here, because of the tpslib-compiler absence.
  //
  const socket = new Socket(mux.host, mux.port);
  await socket.setSoTimeoutPromise(mux.timeout);

};
