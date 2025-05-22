const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// İŞTE BU SATIRI EKLE
app.use(express.static("client"));

io.on("connection", (socket) => {
  console.log("Kullanıcı bağlandı:", socket.id);

  // Her 5 saniyede bir ping/pong kontrolü
  const pingInterval = setInterval(() => {
    socket.emit("ping");
  }, 2000);

  socket.on("pong", () => {
    console.log("Pong from:", socket.id);
  });

  socket.on("join", ({ room, username }) => {
    socket.join(room);
    socket.to(room).emit("new-user", { id: socket.id, username });
    socket.data = { username, room };
  });

  socket.on("offer", ({ room, offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id, username: socket.data.username });
  });

  socket.on("answer", ({ room, answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ room, candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

  socket.on("chat-message", ({ room, message, username }) => {
    socket.to(room).emit("chat-message", { username, message });
  });

  socket.on("disconnect", () => {
    const room = socket.data.room;
    if (room) {
      socket.to(room).emit("user-left", socket.id);
    }
    console.log("Kullanıcı ayrıldı:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server çalışıyor: http://localhost:${PORT}`);
});