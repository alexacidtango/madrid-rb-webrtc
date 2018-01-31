/**
* Session
* @class Session
*/
var deps = [
  "Cable"
];

modulejs.define('Session', deps, function (Cable) {
  var Session = {
    init: function() {
      // BROADCAST TYPES
      var JOIN_ROOM = "JOIN_ROOM";
      var EXCHANGE = "EXCHANGE";
      var REMOVE_USER = "REMOVE_USER";

      var that = this;
      Cable.init();
      App.session = App.cable.subscriptions.create("SessionChannel", this);
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
      Session.init();
    },
    leaveSession: function() {
      for (user in pcPeers) {
        pcPeers[user].close();
      }
      pcPeers = {};

      App.session.unsubscribe();

      remoteViewContainer.innerHTML = "";

      broadcastData({
        type: REMOVE_USER,
        from: currentUser
      });

      joinBtnContainer.style.display = "block";
      leaveBtnContainer.style.display = "none";
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
        var element = document.createElement("video");
        element.id = "remoteView+" + userId;
        element.autoplay = "autoplay";
        element.srcObject = event.stream;
        remoteViewContainer.appendChild(element);
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
    }
  };
  return Session;
});
