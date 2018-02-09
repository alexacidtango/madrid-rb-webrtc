/**
* Webrtc
* @class Webrtc
*/

// BROADCAST TYPES
var JOIN_ROOM = "JOIN_ROOM";
var EXCHANGE = "EXCHANGE";
var REMOVE_USER = "REMOVE_USER";


// CONFIG
var iceCreds = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

var currentUser = null;

// HTML Elements
var selfView = [];
var remoteViewContainer = [];
var joinBtnContainer = [];
var leaveBtnContainer = [];

// GLOBAL OBJECTS
var pcPeers = {};
var localStream = void 0;

var pc = null;

var deps = [
  "Cable"
];

modulejs.define('Webrtc', deps, function (Cable) {
  var Webrtc = {

    init: function() {
      var that = this;

      var constraints = {
        audio: true,
        video: true
      };


      currentUser = document.getElementById("currentUser").getAttribute("data-user");
      selfView = document.getElementById("selfView");
      remoteViewContainer = document.getElementById("remoteViewContainer");
      joinBtnContainer = document.getElementById("joinBtnContainer");
      leaveBtnContainer = document.getElementById("leaveBtnContainer");

      joinBtnContainer.style.display = "block";
      leaveBtnContainer.style.display = "none";

      iceCreds = JSON.parse(document.getElementById("webrtc_conf").getAttribute("data-ice-servers"));
      console.log(iceCreds);

      $(document).on('click', '#joinSession', that.joinSession);
      $(document).on('click', '#leaveSession', that.leaveSession);

      navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        localStream = stream;
        selfView.srcObject = stream;
        selfView.muted = true;
      }).catch(that.logError);

    },

    joinSession: function() {
      var that = this;
      Cable.init();
      App.session = App.cable.subscriptions.create("SessionChannel", {
        connected: function() {
          var that = this;
          return Webrtc.connectUser(currentUser);
        },
        received: function received(data) {
          console.log("received", data);
          if (data.from === currentUser) return;
          switch (data.type) {
            case JOIN_ROOM:
              return Webrtc.joinRoom(data);
            case EXCHANGE:
              if (data.to !== currentUser) return;
              return Webrtc.exchange(data);
            case REMOVE_USER:
              return Webrtc.removeUser(data);
            default:
              return;
          }
        }
      });

      joinBtnContainer.style.display = "none";
      leaveBtnContainer.style.display = "block";
    },

    leaveSession: function() {
      var that = this;
      for (user in pcPeers) {
        pcPeers[user].close();
      }
      pcPeers = {};

      App.session.unsubscribe();

      remoteViewContainer.innerHTML = "";

      that.broadcastData({
        type: REMOVE_USER,
        from: currentUser
      });

      joinBtnContainer.style.display = "block";
      leaveBtnContainer.style.display = "none";
    },

    connectUser: function(userId) {
      var that = this;
      that.broadcastData({
        type: JOIN_ROOM,
        from: currentUser
      });
    },

    joinRoom: function(data) {
      var that = this;
      that.createPC(data.from, true);
    },

    removeUser: function(data) {
      console.log("removing user", data.from);
      var video = document.getElementById("remoteView+" + data.from);
      video && video.remove();
      delete pcPeers[data.from];
    },

    createPC: function(userId, isOffer) {
      console.log(iceCreds);
      pc = new RTCPeerConnection(iceCreds);

      pcPeers[userId] = pc;
      pc.addStream(localStream);

      isOffer && pc.createOffer().then(function (offer) {
        pc.setLocalDescription(offer);
        Webrtc.broadcastData({
          type: EXCHANGE,
          from: currentUser,
          to: userId,
          sdp: JSON.stringify(pc.localDescription)
        });
      }).catch(Webrtc.logError);

      pc.onicecandidate = function (event) {
        event.candidate && Webrtc.broadcastData({
          type: EXCHANGE,
          from: currentUser,
          to: userId,
          candidate: JSON.stringify(event.candidate)
        });
      };

      pc.onaddstream = function (event) {
        var element = document.createElement("video");
        element.id = "remoteView+" + userId;
        element.autoplay = "autoplay";
        element.srcObject = event.stream;
        remoteViewContainer.appendChild(element);
      };

      pc.oniceconnectionstatechange = function (event) {
        if (pc.iceConnectionState == "disconnected") {
          console.log("Disconnected:", userId);
          Webrtc.broadcastData({
            type: REMOVE_USER,
            from: userId
          });
        }
      };

      return pc;
    },

    exchange: function(data) {
      var that = this;
      var pc = void 0;

      if (!pcPeers[data.from]) {
        pc = that.createPC(data.from, false);
      } else {
        pc = pcPeers[data.from];
      }

      if (data.candidate) {
        pc.addIceCandidate(new RTCIceCandidate(JSON.parse(data.candidate))).then(function () {
          return console.log("Ice candidate added");
        }).catch(Webrtc.logError);
      }

      if (data.sdp) {
        console.log(data.sdp);
        sdp = JSON.parse(data.sdp);
        pc.setRemoteDescription(new RTCSessionDescription(sdp)).then(function () {
          if (sdp.type === "offer") {
            pc.createAnswer().then(function (answer) {
              pc.setLocalDescription(answer);
              Webrtc.broadcastData({
                type: EXCHANGE,
                from: currentUser,
                to: data.from,
                sdp: JSON.stringify(pc.localDescription)
              });
            });
          }
        }).catch(Webrtc.logError);
      }
    },

    broadcastData: function(data) {
      console.log(data);
      $.ajax({
        url: "sessions",
        type: "post",
        data: data
      });
    },

    logError: function(error) {
      return console.warn("Whoops! Error:", error);
    }
  }

  Webrtc.init();
  return Webrtc;
});
