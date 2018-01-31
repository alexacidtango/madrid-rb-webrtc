/**
* Cable
* @class Cable
*/

var deps = [];

modulejs.define('Cable', deps, function () {
  var Cable = {
    node: [],

    init: function() {
      var that = this
      window.App || (window.App = {});
      window.App.cable = ActionCable.createConsumer("/cable");
    }
  };

  return Cable;
});
