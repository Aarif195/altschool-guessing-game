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

//   Session created
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

//   other users
socket.on("join_session", ({ sessionId, username }) => {
  const session = gameSessions[sessionId];

  if (!session) {
    return socket.emit("error", "Session not found");
  }

  if (session.status !== "waiting") {
    return socket.emit("error", "Game already in progress");
  }

  const playerExists = session.players.find(p => p.id === socket.id);
  if (playerExists) return;

  const newPlayer = {
    id: socket.id,
    username,
    score: 0,
    attemptsLeft: 3,
  };

  session.players.push(newPlayer);

  socket.join(sessionId);

  io.to(sessionId).emit("player_joined", session.players);

  console.log(`Player joined session ${sessionId}`);
});

// Start game
socket.on("start_game", ({ sessionId }) => {
  const session = gameSessions[sessionId];

  if (!session) {
    return socket.emit("error", "Session not found");
  }

  if (session.gameMaster !== socket.id) {
    return socket.emit("error", "Only game master can start the game");
  }

  if (session.players.length < 3) {
    return socket.emit("error", "At least 3 players required");
  }

  session.status = "in-progress";
  startGameTimer(sessionId);

  io.to(sessionId).emit("game_started");

  console.log(`Game started in session ${sessionId}`);
});

// Game Master sets question & answer
socket.on("set_question", ({ sessionId, question, answer }) => {
  const session = gameSessions[sessionId];

  if (!session) {
    return socket.emit("error", "Session not found");
  }

  if (session.gameMaster !== socket.id) {
    return socket.emit("error", "Only game master can set question");
  }

  if (session.status !== "in-progress") {
    return socket.emit("error", "Game not started");
  }

  session.question = question;
  session.answer = answer.toLowerCase();

  // reset attempts for all players
  session.players.forEach(player => {
    player.attemptsLeft = 3;
  });

  io.to(sessionId).emit("question_set", {
    question: session.question,
  });

  console.log(`Question set for session ${sessionId}`);
});

// Players submit answers
socket.on("submit_answer", ({ sessionId, answer }) => {
  const session = gameSessions[sessionId];

  if (!session) {
    return socket.emit("error", "Session not found");
  }

  if (session.status !== "in-progress") {
    return socket.emit("error", "Game not active");
  }

  const player = session.players.find(p => p.id === socket.id);

  if (!player) {
    return socket.emit("error", "Player not in session");
  }

  if (player.attemptsLeft <= 0) {
    return socket.emit("error", "No attempts left");
  }

  player.attemptsLeft--;

  const normalizedAnswer = answer.toLowerCase();

  if (normalizedAnswer === session.answer) {
    session.status = "ended";

    player.score += 10;

    io.to(sessionId).emit("game_ended", {
      winner: player.username,
      answer: session.answer,
      players: session.players,
    });

    console.log(`Winner: ${player.username}`);
    return;
  }

  socket.emit("wrong_answer", {
    attemptsLeft: player.attemptsLeft,
  });
});

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

});

// Game timer
const startGameTimer = (sessionId: string) => {
  const session = gameSessions[sessionId];
  if (!session) return;

  session.timer = setTimeout(() => {
    if (session.status !== "in-progress") return;

    session.status = "ended";

    io.to(sessionId).emit("game_ended", {
      winner: null,
      answer: session.answer,
      players: session.players,
      reason: "timeout",
    });

    console.log(`Game ended by timeout: ${sessionId}`);
  }, 60000);
};

const PORT = process.env.PORT || 5500;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});