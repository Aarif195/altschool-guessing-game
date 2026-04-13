import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { gameSessions, GameSession } from "./src/store/gameStore";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is running");
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  socket.emit("create_session", { username: "testUser" });

  socket.on("create_session", ({ username }) => {
    const sessionId = Math.random().toString(36).substring(2, 8);

    const newSession = {
      id: sessionId,
      players: [
        {
          id: socket.id,
          username,
          score: 0,
          attemptsLeft: 3,
        },
      ],
      gameMaster: socket.id,
      status: "waiting",
      question: null,
      answer: null,
      timer: null,
    } as GameSession;

    gameSessions[sessionId] = newSession;

    socket.join(sessionId);

    socket.emit("session_created", newSession);

    console.log("Session created:", sessionId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5500;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});