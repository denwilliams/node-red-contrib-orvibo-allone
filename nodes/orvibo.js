var Orvibo = require('node-orvibo');
var TEN_MINS = 600000;

function registerOrviboNodes(RED) {

  /* ---------------------------------------------------------------------------
   * CONFIG node
   * -------------------------------------------------------------------------*/
  function OrviboNodeConfig(config) {
    RED.nodes.createNode(this, config);

    // Configuration options passed by Node Red
    this.name = config.name;

    // Config node state
    var orvibo = new Orvibo();
    var device = {
      macAddress: config.mac,
      macPadding: '202020202020',
      type: 'AllOne',
      ip: config.ip,
      name: 'Allone',
      password: '888888',
      icon: '00'
    };

    var subscriber = setInterval(function() {
      orvibo.subscribe(device);
    }, TEN_MINS);

    // Define functions called by nodes
    var node = this;
    this.emitIR = function (irCode) {
      orvibo.emitIR(device, irCode);
    };

    // Define config node event listeners
    node.on("close", function(done){
      clearInterval(subscriber);
      node.remote = null;
      done();
    });
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
