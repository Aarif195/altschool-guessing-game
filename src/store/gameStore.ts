type Player = {
  id: string; // socket.id
  username: string;
  score: number;
  attemptsLeft: number;
};

type GameSession = {
  id: string;
  players: Player[];
  gameMaster: string; // socket.id
  status: "waiting" | "in-progress" | "ended";
  question: string | null;
  answer: string | null;
  timer: NodeJS.Timeout | null;
};

export const gameSessions: Record<string, GameSession> = {};