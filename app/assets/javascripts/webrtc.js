/**
* Webrtc
* @class Webrtc
*/
var deps = [
  "Cable"
];

modulejs.define('Webrtc', deps, function (Cable) {
  var Webrtc = {
    currentUser: null,
    selfView: [],
    remoteViewContainer: [],
    joinBtnContainer: [],
    leaveBtnContainer: [],

    init: function() {
      var that = this;

      // CONFIG
      var iceCreds = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
      // var iceCreds = JSON.parse(document.getElementById("xirsys-creds").dataset.xirsys);
      // iceCreds = JSON.parse(iceCreds)["v"];

      var constraints = {
        audio: false,
        video: true
      };

      // GLOBAL OBJECTS
      var pcPeers = {};
      var localStream = void 0;

      that.currentUser = document.getElementById("currentUser");
      that.selfView = document.getElementById("selfView");
      that.remoteViewContainer = document.getElementById("remoteViewContainer");
      that.joinBtnContainer = document.getElementById("joinBtnContainer");
      that.leaveBtnContainer = document.getElementById("leaveBtnContainer");

      $(document).on('click', '#joinSession', that.joinSession);
      $(document).on('click', '#leaveSession', that.leaveSession);

      navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        localStream = stream;
        console.log(that.selfView);
        that.selfView.srcObject = stream;
        that.selfView.muted = true;
      }).catch(that.logError);

    },
    connected: function() {
      return connectUser(currentUser);
    },

    received: function received(data) {
      console.log("received", data);
      if (data.from === currentUser) return;
      switch (data.type) {
        case JOIN_ROOM:
          return joinRoom(data);
        case EXCHANGE:
          if (data.to !== currentUser) return;
          return exchange(data);
        case REMOVE_USER:
          return removeUser(data);
        default:
          return;
      }
    },

    joinSession: function() {
      var that = this;
      Cable.init();
      App.session = App.cable.subscriptions.create("SessionChannel", this);
      Webrtc.joinBtnContainer.style.display = "none";
      Webrtc.leaveBtnContainer.style.display = "block";
    },

    leaveSession: function() {
      for (user in pcPeers) {
        pcPeers[user].close();
      }
      pcPeers = {};

      App.session.unsubscribe();

      Webrtc.remoteViewContainer.innerHTML = "";

      broadcastData({
        type: REMOVE_USER,
        from: currentUser
      });

      Webrtc.joinBtnContainer.style.display = "block";
      Webrtc.leaveBtnContainer.style.display = "none";
    },

    connectUser: function(userId) {
      broadcastData({
        type: JOIN_ROOM,
        from: currentUser
      });
    },

    joinRoom: function(data) {
      createPC(data.from, true);
    },

    removeUser: function(data) {
      console.log("removing user", data.from);
      var video = document.getElementById("remoteView+" + data.from);
      video && video.remove();
      delete pcPeers[data.from];
    },

    createPC: function(userId, isOffer) {
      var pc = new RTCPeerConnection(iceCreds);
      pcPeers[userId] = pc;
      pc.addStream(localStream);

      isOffer && pc.createOffer().then(function (offer) {
        pc.setLocalDescription(offer);
        broadcastData({
          type: EXCHANGE,
          from: currentUser,
          to: userId,
          sdp: JSON.stringify(pc.localDescription)
        });
      }).catch(logError);

      pc.onicecandidate = function (event) {
        event.candidate && broadcastData({
          type: EXCHANGE,
          from: currentUser,
          to: userId,
          candidate: JSON.stringify(event.candidate)
        });
      };

      pc.onaddstream = function (event) {
        console.log(event);
        var element = document.createElement("video");
        element.id = "remoteView+" + userId;
        element.autoplay = "autoplay";
        element.srcObject = event.stream;
        Webrtc.remoteViewContainer.appendChild(element);
      };

      pc.oniceconnectionstatechange = function (event) {
        if (pc.iceConnectionState == "disconnected") {
          console.log("Disconnected:", userId);
          broadcastData({
            type: REMOVE_USER,
            from: userId
          });
        }
      };

      return pc;
    },

    exchange: function(data) {
      var pc = void 0;

      if (!pcPeers[data.from]) {
        pc = createPC(data.from, false);
      } else {
        pc = pcPeers[data.from];
      }

      if (data.candidate) {
        pc.addIceCandidate(new RTCIceCandidate(JSON.parse(data.candidate))).then(function () {
          return console.log("Ice candidate added");
        }).catch(logError);
      }

      if (data.sdp) {
        sdp = JSON.parse(data.sdp);
        pc.setRemoteDescription(new RTCSessionDescription(sdp)).then(function () {
          if (sdp.type === "offer") {
            pc.createAnswer().then(function (answer) {
              pc.setLocalDescription(answer);
              broadcastData({
                type: EXCHANGE,
                from: currentUser,
                to: data.from,
                sdp: JSON.stringify(pc.localDescription)
              });
            });
          }
        }).catch(logError);
      }
    },

    broadcastData: function(data) {
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
