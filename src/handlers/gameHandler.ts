import { Server, Socket } from "socket.io";
import { gameSessions, GameSession } from "../store/gameStore";
import { emitGameState, startGameTimer } from "../helpers/gameHelper";

export const registerGameHandlers = (io: Server, socket: Socket) => {
  // Create Session
  socket.on("create_session", ({ username }) => {
    const sessionId = Math.random().toString(36).substring(2, 8);
    const newSession: GameSession = {
      id: sessionId,
      players: [{ id: socket.id, username, score: 0, attemptsLeft: 3 }],
      gameMaster: socket.id,
      status: "waiting",
      question: null,
      answer: null,
      timer: null,
    };

    gameSessions[sessionId] = newSession;
    socket.join(sessionId);
    socket.emit("session_created", newSession);
    console.log("Session created:", sessionId);
  });

  // Join Session
  socket.on("join_session", ({ sessionId, username }) => {
    const session = gameSessions[sessionId];

    if (!session) return socket.emit("error", "Session not found");

    if (session.status === "in-progress")
      return socket.emit("error", "Game already started");
    if (session.status === "ended")
      return socket.emit("error", "Game already ended");

    if (session.players.some((p) => p.id === socket.id)) {
      return socket.emit("error", "Already in session");
    }

    console.log("[JOIN REQUEST RECEIVED]", {
      socketId: socket.id,
      sessionId,
      username,
    });

    session.players.push({
      id: socket.id,
      username,
      score: 0,
      attemptsLeft: 3,
    });

    console.log("[JOIN REQUEST RECEIVED]", {
      socketId: socket.id,
      sessionId,
      username,
    });

    socket.join(sessionId);
    emitGameState(io, sessionId);
    io.to(sessionId).emit("player_joined", session.players);
    console.log("JOIN EVENT FIRED", sessionId, username);
    console.log("PLAYERS:", session.players);
    console.log("[EMIT PLAYERS]", session.players.length);
  });

  // Start Game
  socket.on("start_game", ({ sessionId }) => {
    const session = gameSessions[sessionId];

    if (!session || session.gameMaster !== socket.id) return;

    if (session.players.length < 3)
      return socket.emit("error", "At least 3 players required");

    if (!session.question || !session.answer) {
      return socket.emit("error", "Set question and answer first");
    }

    session.status = "in-progress";
    startGameTimer(io, sessionId);
    emitGameState(io, sessionId);
    io.to(sessionId).emit("game_started");
  });

  // Set Question
  socket.on("set_question", ({ sessionId, question, answer }) => {
    const session = gameSessions[sessionId];
    // if (
    //   !session ||
    //   session.gameMaster !== socket.id ||
    //   session.status !== "in-progress"
    // )
    //   return;

    if (!session || session.gameMaster !== socket.id) return;

    if (!question || !answer) {
      console.log(" Empty question/answer blocked");
      return;
    }

    session.question = question;
    session.answer = answer.trim().toLowerCase();
    session.players.forEach((p) => (p.attemptsLeft = 3));

    console.log("✅ STORED QUESTION:", session.question);
    console.log("✅ STORED ANSWER:", session.answer);

    emitGameState(io, sessionId);

    io.to(sessionId).emit("question_set", { question: session.question });
    emitGameState(io, sessionId);
  });

  // Submit Answer
  socket.on("submit_answer", ({ sessionId, answer }) => {
    const session = gameSessions[sessionId];
    const player = session?.players.find((p) => p.id === socket.id);
    if (
      !session ||
      session.status !== "in-progress" ||
      !player ||
      player.attemptsLeft <= 0
    )
      return;

    player.attemptsLeft--;

    const normalize = (text: string) =>
      text.replace(/\s+/g, " ").trim().toLowerCase();

    console.log("USER:", normalize(answer));
    console.log("CORRECT:", normalize(session.answer || ""));

    if (normalize(answer) === normalize(session.answer || "")) {
      session.status = "ended";
      player.score += 10;

      //  Rotate game master after round ends
      const currentIndex = session.players.findIndex(
        (p) => p.id === session.gameMaster,
      );
      const nextIndex = (currentIndex + 1) % session.players.length;

      if (session.players.length === 0) return;

      const safeIndex = nextIndex % session.players.length;

      if (!session.players[safeIndex]) return;

      session.gameMaster = session.players[safeIndex].id;

      // session.gameMaster = session.players[nextIndex].id;

      io.to(sessionId).emit("new_game_master", {
        gameMaster: session.gameMaster,
      });

      io.to(sessionId).emit("game_ended", {
        winner: player.username,
        answer: session.answer,
        players: session.players,
      });
      emitGameState(io, sessionId);
    } else {
      socket.emit("wrong_answer", { attemptsLeft: player.attemptsLeft });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    for (const sessionId in gameSessions) {
      const session = gameSessions[sessionId];
      const playerIndex = session.players.findIndex((p) => p.id === socket.id);

      if (playerIndex !== -1) {
        session.players.splice(playerIndex, 1);
        io.to(sessionId).emit("player_left", session.players);

        if (session.players.length === 0) {
          delete gameSessions[sessionId];
        } else if (session.gameMaster === socket.id) {
          session.gameMaster = session.players[0].id;
          io.to(sessionId).emit("new_game_master", {
            gameMaster: session.gameMaster,
          });
        }
        break;
      }
    }
  });
};
