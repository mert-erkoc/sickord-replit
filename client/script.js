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
  addUserToList("me", `${username} (Ben)`);

  socket.emit("join", { room, username });

  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    localStream = stream;

    // volume 
    document.getElementById("volumeSlider").addEventListener("input", (e) => {
      const volume = parseFloat(e.target.value);
      document.querySelectorAll("audio").forEach((audio) => {
        audio.volume = volume;
      });
    });
  });
}

// User Adding to UI
const userVolumes = new Map(); // User Volumes

function addUserToList(id, username) {
  const userList = document.getElementById("userList");
  const userDiv = document.createElement("div");
  userDiv.id = `user-${id}`;
  userDiv.textContent = `${username} katıldı`;
  userDiv.addEventListener("contextmenu", (e) => showVolumeMenu(e, id));
  userList.appendChild(userDiv);
  userVolumes.set(id, 1); // Defaul Volume
}

function showVolumeMenu(e, userId) {
  e.preventDefault();
  const menu = document.getElementById("volumeMenu");
  const volumeSlider = menu.querySelector(".user-volume");
  const volumeValue = menu.querySelector(".volume-value");

  // Current Volumes
  volumeSlider.value = userVolumes.get(userId);
  volumeValue.textContent = `${Math.round(volumeSlider.value * 100)}%`;

  // Set Menu
  menu.style.left = `${e.pageX}px`;
  menu.style.top = `${e.pageY}px`;
  menu.classList.remove("hidden");

  // Listen for Volume Change
  const updateVolume = () => {
    const volume = parseFloat(volumeSlider.value);
    userVolumes.set(userId, volume);
    volumeValue.textContent = `${Math.round(volume * 100)}%`;

    // Update Audio Volume
    const audio = document.getElementById(`audio-${userId}`);
    if (audio) {
      audio.volume = volume;
    }
  };

  volumeSlider.oninput = updateVolume;

  // 
  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.classList.add("hidden");
      document.removeEventListener("click", closeMenu);
      volumeSlider.oninput = null;
    }
  };

  setTimeout(() => {
    document.addEventListener("click", closeMenu);
  }, 0);
}

function removeUserFromList(id) {
  const el = document.getElementById(`user-${id}`);
  if (el) el.remove();
}

function createPeerConnection(id, remoteUsername) {
  if (peers[id]) {
    console.log("Var olan bağlantı kapatılıyor:", id);
    peers[id].close();
  }

  console.log("Peer bağlantısı oluşturuluyor:", id);
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
    ],
    iceTransportPolicy: "all",
    bundlePolicy: "balanced",
    rtcpMuxPolicy: "require",
  });

  pc.oniceconnectionstatechange = () => {
    console.log("ICE Bağlantı durumu:", pc.iceConnectionState);
    if (
      pc.iceConnectionState === "failed" ||
      pc.iceConnectionState === "disconnected"
    ) {
      console.log("Bağlantı yeniden kurulmaya çalışılıyor...");
      pc.restartIce();
    }
  };

  // Connection state change
  pc.onconnectionstatechange = () => {
    console.log("Bağlantı durumu:", pc.connectionState);
    if (pc.connectionState === "failed") {
      console.log("Bağlantı yeniden başlatılıyor...");
      createPeerConnection(id, remoteUsername);
    }
  };

  // Local stream
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });
  }

  pc.ontrack = (event) => {
    console.log("Ses track'i alındı:", id);
    const audioId = `audio-${id}`;
    const existingAudio = document.getElementById(audioId);
    if (existingAudio) {
      existingAudio.remove();
    }

    if (event.streams && event.streams[0]) {
      const audio = new Audio();
      audio.id = audioId;
      audio.autoplay = true;
      audio.playsInline = true;
      audio.volume = userVolumes.get(id) || 1.0;
      audio.srcObject = event.streams[0];

      audio.onloadedmetadata = () => {
        console.log("Ses meta verisi yüklendi:", id);
        audio.play().catch((e) => console.error("Ses çalma hatası:", e));
      };

      document.body.appendChild(audio);
      console.log("Ses elementi eklendi:", id);
    }
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("ICE candidate gönderiliyor:", event.candidate);
      socket.emit("ice-candidate", {
        room,
        candidate: event.candidate,
        to: id,
      });
    }
  };

  return pc;
}

// When the new user joins
socket.on("new-user", async ({ id, username }) => {
  addUserToList(id, username);

  const pc = createPeerConnection(id, username);
  peers[id] = pc;

  try {
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      voiceActivityDetection: true,
      iceRestart: true,
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

// We got Offer
socket.on("offer", async ({ from, offer, username }) => {
  addUserToList(from, username);
  const pc = createPeerConnection(from, username);
  peers[from] = pc;
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit("answer", { room, answer, to: from });
});

// We got Answer
socket.on("answer", async ({ from, answer }) => {
  await peers[from].setRemoteDescription(new RTCSessionDescription(answer));
});

// ICE candidate came
socket.on("ice-candidate", async ({ from, candidate }) => {
  if (candidate && peers[from]) {
    await peers[from].addIceCandidate(new RTCIceCandidate(candidate));
  }
});

// User Left
socket.on("user-left", (id) => {
  if (peers[id]) {
    peers[id].close();
    delete peers[id];
  }
  removeUserFromList(id);
});

// Mic On/Off
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

function sendMessage() {
  const input = document.getElementById("messageInput");
  const message = input.value.trim();
  if (message) {
    socket.emit("chat-message", { room, message, username }); // Aktif odadaki mesajı gönder
    input.value = ""; // Girdi alanını temizle
  }
}

// Chat Listen
socket.on("chat-message", ({ username, message }) => {
  addMessage(username, message); // Tüm mesajları göster
});

function addMessage(username, message) {
  const messages = document.getElementById("messages");
  const messageDiv = document.createElement("div");
  messageDiv.className = "message";
  messageDiv.textContent = `${username}: ${message}`;
  messages.appendChild(messageDiv);
  messages.scrollTop = messages.scrollHeight;
}

// Enter Sends
document.getElementById("messageInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

function disconnectFromRoom() {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
  }
  for (let id in peers) {
    peers[id].close();
    delete peers[id];
  }
  if (room) {
    socket.emit("leave-room", { room });
  }
  // Reset the UI
  document.getElementById("chatroom").classList.add("hidden");
  document.getElementById("login").classList.remove("hidden");
  document.getElementById("userList").innerHTML = "";
  document.getElementById("roomInput").value = "";
  // Reset the Messages
  document.getElementById("messages").innerHTML = ""; // Mesaj kutusunu temizle
  room = "";
  username = "";
}
