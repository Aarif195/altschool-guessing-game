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

  if (session.timer) {
    clearTimeout(session.timer);
  }

  let timeLeft = 60;

  const interval = setInterval(() => {
    if (session.status !== "in-progress") {
      clearInterval(interval);
      return;
    }

    timeLeft--;

    // SEND TIMER TO FRONTEND
    io.to(sessionId).emit("timer_update", timeLeft);

    if (timeLeft <= 0) {
      clearInterval(interval);

      session.status = "ended";

      const currentIndex = session.players.findIndex(
        (p) => p.id === session.gameMaster,
      );
      const nextIndex = (currentIndex + 1) % session.players.length;

      session.gameMaster = session.players[nextIndex].id;

      io.to(sessionId).emit("new_game_master", {
        gameMaster: session.gameMaster,
      });

      

      io.to(sessionId).emit("game_ended", {
        winner: null,
        answer: session.answer,
        players: session.players,
        reason: "timeout",
      });

      emitGameState(io, sessionId);

      console.log(`Game ended by timeout: ${sessionId}`);
    }
  }, 1000);
};
