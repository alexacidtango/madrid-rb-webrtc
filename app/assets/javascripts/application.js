//= require rails-ujs
//= require jquery
//= require jquery_ujs
//= require modulejs
//= require turbolinks
//= require action_cable
//= require webrtc
//= require cable

function init() {
  modulejs.require('Webrtc');
};

$(document).on('page:load', init);
$(document).ready(init);