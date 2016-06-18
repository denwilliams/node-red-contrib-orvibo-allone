var Orvibo = require('node-orvibo');
var TEN_MINS = 600000;

function registerOrviboNodes(RED) {

  // NOTE: major flaw in node-orvibo's design is that you can't un-listen or dispose!
  // It actually calls socket.bind on a static object shared between all orvibo
  // instances, and this socket is shared between all.
  // So, we will call listen on an Orvibo instance, then dispose immediately.
  // The static socket will still be bound to and listening in the background.
  // Note: this will still cause memory leaks as the constructor calls .on
  // and there is no way to call removeListener, so every "new Orvibo" will
  // stay resident in memory forever!
  // NOTE: you also cannot use the same Orvibo instance forever. It stops working
  // after a while, calling subscribe again does nothing. Calling listen again throws
  // and address in use error. Creating a new Orvibo instance works.
  new Orvibo().listen();

  /* ---------------------------------------------------------------------------
   * CONFIG node
   * -------------------------------------------------------------------------*/
  function OrviboNodeConfig(config) {
    RED.nodes.createNode(this, config);

    var subscriber;

    // Configuration options passed by Node Red
    this.name = config.name;

    // Config node state
    var device = {
      macAddress: config.mac,
      macPadding: '202020202020',
      type: 'AllOne',
      ip: config.ip,
      name: 'Allone',
      password: '888888',
      icon: '00'
    };

    // Add the device then dispose. We will create a new instance each call.
    new Orvibo().addDevice(device);

    // Define functions called by nodes
    var node = this;

    this.emitIR = function (irCode) {
      // Note: because of the way node-orvibo works this will cause memory leaks
      var orvibo = new Orvibo();
      function subcribeHandler(_device) {
        if (device.macAddress !== _device.macAddress) return;
        orvibo.removeListener('subscribed', subcribeHandler);
        orvibo.emitIR(device, irCode);
        orvibo = null;
      }
      orvibo.on('subscribed', subcribeHandler);
      orvibo.subscribe(device);
    };
  }
  RED.nodes.registerType("orvibo", OrviboNodeConfig);


  /* ---------------------------------------------------------------------------
   * EMITIR node
   * -------------------------------------------------------------------------*/
  function OrviboNodeEmitIR(config) {
    RED.nodes.createNode(this, config);

    // Save settings in local node
    this.device = config.device;
    this.deviceNode = RED.nodes.getNode(this.device);
    this.name = config.name;
    this.code = config.code;

    var node = this;
    if (this.deviceNode) {

      // Input handler, called on incoming flow
      this.on('input', function(msg) {

        // If no key is given in the config, then we us the key in the msg.
        var code = (node.code) ? node.code : msg.payload;
        if (!code) {
          node.error('No code given. Specify either in the config or via msg.payload!');
          return;
        }

        // Put data to the device.
        node.deviceNode.emitIR(String(code));
      });

    } else {
      this.error(RED._("orvibo.errors.missing-config"));
    }
  }
  RED.nodes.registerType("orvibo-emitir", OrviboNodeEmitIR);

}

module.exports = registerOrviboNodes;
