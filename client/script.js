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
        iceCandidatePoolSize: 10
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

    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
      console.log("Track added:", track);
    });
  
    pc.onicecandidate = event => {
      if (event.candidate) {
        console.log("ICE candidate gönderiliyor:", event.candidate);
        socket.emit("ice-candidate", { room, candidate: event.candidate, to: id });
      }
    };
  
    pc.ontrack = event => {
      console.log("Yeni track geldi!");  // 💥 BURASI çok önemli
      const audio = document.createElement("audio");
      audio.srcObject = event.streams[0];
      audio.autoplay = true;
      document.body.appendChild(audio);
    };
  
    return pc;
  }
  

// Yeni kullanıcı geldiğinde
socket.on("new-user", ({ id, username }) => {
  addUserToList(id, username);

  const pc = createPeerConnection(id, username);
  peers[id] = pc;

  pc.createOffer().then(offer => {
    pc.setLocalDescription(offer);
    socket.emit("offer", { room, offer, to: id });
  });
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