import { Server } from "socket.io";
import { gameSessions } from "../store/gameStore";

export const emitGameState = (io: Server, sessionId: string) => {
  const session = gameSessions[sessionId];
  if (!session) return;

  io.to(sessionId).emit("game_state", {
    id: session.id,
    status: session.status,
    players: session.players,
    question: session.question,
    gameMaster: session.gameMaster,
  });
};

export const startGameTimer = (io: Server, sessionId: string) => {
  const session = gameSessions[sessionId];
  if (!session) return;

  // Clear existing timer to prevent multiple concurrent timers
  if (session.timer) {
    clearTimeout(session.timer);
  }

  session.timer = setTimeout(() => {
    if (session.status !== "in-progress") return;

    session.status = "ended";

    io.to(sessionId).emit("game_ended", {
      winner: null,
      answer: session.answer,
      players: session.players,
      reason: "timeout",
    });

    emitGameState(io, sessionId);

    console.log(`Game ended by timeout: ${sessionId}`);
  }, 60000);
};