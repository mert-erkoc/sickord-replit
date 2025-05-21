const socket = io();
let localStream;
let peers = {};
let room = "";
let username = "";

function joinRoom() {
  room = document.getElementById("roomInput").value;
  username = document.getElementById("username").value || "Bilinmeyen";

  if (!room) return alert("Oda adı giriniz");

  document.getElementById("login").classList.add("hidden");
  document.getElementById("chatroom").classList.remove("hidden");
  document.getElementById("roomTitle").textContent = `Oda: ${room}`;

  socket.emit("join", { room, username });

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    localStream = stream;

    // Ses seviyesi kontrolü
    document.getElementById("volumeSlider").addEventListener("input", e => {
      const volume = parseFloat(e.target.value);
      document.querySelectorAll("audio").forEach(audio => {
        audio.volume = volume;
      });
    });
  });
}

// Kullanıcı arayüzüne eklenir
function addUserToList(id, username) {
  const userList = document.getElementById("userList");
  const userDiv = document.createElement("div");
  userDiv.id = `user-${id}`;
  userDiv.textContent = `${username} katıldı`;
  userList.appendChild(userDiv);
}

function removeUserFromList(id) {
  const el = document.getElementById(`user-${id}`);
  if (el) el.remove();
}

function createPeerConnection(id, remoteUsername) {
    console.log("Peer bağlantısı oluşturuluyor:", id);
    const pc = new RTCPeerConnection({
        iceServers: [
            { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
            {
                urls: "turn:openrelay.metered.ca:80",
                username: "openrelayproject",
                credential: "openrelayproject"
            }
        ],
        iceCandidatePoolSize: 10,
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        sdpSemantics: 'unified-plan'
    });

    pc.oniceconnectionstatechange = () => {
        console.log("ICE Bağlantı durumu:", pc.iceConnectionState);
        if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
            console.log("Bağlantı yeniden kurulmaya çalışılıyor...");
            pc.restartIce();
        }
    };

    // Bağlantı durumunu izle
    pc.onconnectionstatechange = () => {
        console.log("Bağlantı durumu:", pc.connectionState);
        if (pc.connectionState === "failed") {
            console.log("Bağlantı yeniden başlatılıyor...");
            createPeerConnection(id, remoteUsername);
        }
    };

    // Yerel ses akışını ekle
    localStream.getTracks().forEach(track => {
      const sender = pc.addTrack(track, localStream);
      console.log("Local track added:", track.kind);
    });

    pc.ontrack = event => {
      console.log("Remote track received:", event.track.kind);
      const stream = event.streams[0];
      
      const audioId = `audio-${id}`;
      let audio = document.getElementById(audioId);
      
      if (!audio) {
        audio = document.createElement("audio");
        audio.id = audioId;
        audio.autoplay = true;
        audio.controls = true;
        document.body.appendChild(audio);
      }
      
      audio.srcObject = stream;
    };

    pc.onicecandidate = event => {
      if (event.candidate) {
        console.log("ICE candidate gönderiliyor:", event.candidate);
        socket.emit("ice-candidate", { room, candidate: event.candidate, to: id });
      }
    };

    return pc;
  }


// Yeni kullanıcı geldiğinde
socket.on("new-user", async ({ id, username }) => {
  addUserToList(id, username);

  const pc = createPeerConnection(id, username);
  peers[id] = pc;

  try {
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      voiceActivityDetection: true,
      iceRestart: true
    });
    await pc.setLocalDescription(offer);
    socket.emit("offer", { room, offer, to: id });
  } catch (error) {
    console.error("Offer oluşturma hatası:", error);
    setTimeout(() => {
      if (pc.connectionState !== "connected") {
        pc.restartIce();
      }
    }, 3000);
  }
});

// Teklif aldık
socket.on("offer", async ({ from, offer, username }) => {
  addUserToList(from, username);
  const pc = createPeerConnection(from, username);
  peers[from] = pc;
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit("answer", { room, answer, to: from });
});

// Cevap aldık
socket.on("answer", async ({ from, answer }) => {
  await peers[from].setRemoteDescription(new RTCSessionDescription(answer));
});

// ICE candidate geldi
socket.on("ice-candidate", async ({ from, candidate }) => {
  if (candidate && peers[from]) {
    await peers[from].addIceCandidate(new RTCIceCandidate(candidate));
  }
});

// Kullanıcı ayrıldı
socket.on("user-left", id => {
  if (peers[id]) {
    peers[id].close();
    delete peers[id];
  }
  removeUserFromList(id);
});

// Mikrofon aç/kapat
function toggleMic() {
    const button = document.querySelector("button[onclick='toggleMic()']");
    const track = localStream.getAudioTracks()[0];

    if (track.enabled) {
      track.enabled = false;
      button.classList.remove("mic-on");
      button.classList.add("mic-off");
      button.textContent = "🔇 Mikrofon Kapalı";
    } else {
      track.enabled = true;
      button.classList.remove("mic-off");
      button.classList.add("mic-on");
      button.textContent = "🎤 Mikrofon Açık";
    }
  }