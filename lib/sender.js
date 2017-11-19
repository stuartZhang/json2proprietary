const _ = require('underscore');

const java = require('./java');

const Socket = java.import('java.net.Socket');

const mux = {
  host: '192.168.84.233',
  port: 8888,
  timeout: 30 * 1000
};

module.exports = async function send(servletName, tpslib, idenTps, bodyTps) {
  const socket = new Socket(mux.host, mux.port);
  await socket.setSoTimeoutPromise(mux.timeout);
};
