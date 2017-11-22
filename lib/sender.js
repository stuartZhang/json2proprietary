const _ = require('underscore');
const debug = require('debug');

const java = require('./java');

const ByteArrayOutputStream = java.import('java.io.ByteArrayOutputStream');
const Socket = java.import('java.net.Socket');
const Packer = java.import('com.nim.tps.Packer');
const InboundPacket = java.import('com.nim.teslanet.InboundPacket');
const MuxInputStream = java.import('com.nim.teslanet.MuxInputStream');
const MuxOutputStream = java.import('com.nim.teslanet.MuxOutputStream');
const ProxyUtilityInputStream = java.import('com.nim.util.stream.ProxyUtilityInputStream');
const ProxyUtilityOutputStream = java.import('com.nim.util.stream.ProxyUtilityOutputStream');

const logger = {
  sender: debug('tps-sender')
};

async function buildIden(tpslib, idenTps){
  const [tpslibId, idenBody] = await Promise.all([
    tpslib.getIDPromise(),
    Packer.packPromise(tpslib, idenTps)
  ]);
  const baos = new ByteArrayOutputStream();
  await baos.writePromise(java.newArray('byte', Array.from(tpslibId)));
  await baos.writePromise(java.newArray('byte', Array.from(idenBody)));
  const iden = await baos.toByteArrayPromise();
  return java.newArray('byte', Array.from(iden));
}
async function buildRequest(tpslib, bodyTps){
  let packer;
  try {
    packer = new Packer(tpslib);
    await packer.startPromise(bodyTps);
    const valueLen = await packer.valuelenPromise();
    const bs = java.newArray('byte', new Array(2 + valueLen).fill(0)); // no compression
    await packer.valueintoPromise(bs, 2);
    return bs;
  } finally {
    if (packer) {
      await packer.closePromise();
    }
  }
}
module.exports = async function send({host, port, timeout, servletName, tpslib}, idenTps, bodyTps) {
  logger.sender('communicate with %s:%d', host, port);
  let [iden, request] = await Promise.all([
    buildIden(tpslib, idenTps),   // Build iden!
    buildRequest(tpslib, bodyTps) // Build Request
  ]);
  // Create output streams
  const outputStream = new ByteArrayOutputStream();
  const mos = new MuxOutputStream(null, new ProxyUtilityOutputStream(outputStream));
  let socket;
  try {
    socket = new Socket(host, port);
    const [, sockOutput, sockInput] = await Promise.all([
      socket.setSoTimeoutPromise(timeout),
      socket.getOutputStreamPromise(),
      socket.getInputStreamPromise().then(async is => {
        const mis = new MuxInputStream(new ProxyUtilityInputStream(is));
        await mis.setTemplateLibraryPromise(tpslib);
        return mis;
      })
    ]);
    // Send iden!
    await mos.outputPromise("iden!", iden);
    iden = await outputStream.toByteArrayPromise();
    iden = java.newArray('byte', Array.from(iden));
    await sockOutput.writePromise(iden);
    // Clear output stream so iden! isn't sent twice
    await outputStream.resetPromise();
    // Send request
    await mos.outputPromise(servletName, request);
    request = await outputStream.toByteArrayPromise();
    request = java.newArray('byte', Array.from(request));
    await sockOutput.writePromise(request);
    // Get response
    const ibp = await sockInput.inputPromise();
    const isErr = await ibp.isErrorPromise();
    let response;
    if (isErr) {
      response = await ibp.getServerErrorPromise();
    } else {
      response = await ibp.getReplyPromise();
    }
    return response;
  } finally {
    if (socket) {
      await socket.closePromise();
    }
  }
};
