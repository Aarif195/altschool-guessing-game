import { useEffect, useState } from "react";
import { socket } from "./socket";

type Player = {
  id: string;
  username: string;
  score: number;
  attemptsLeft: number;
};

type GameSession = {
  id: string;
  players: Player[];
  gameMaster: string;
  status: "waiting" | "in-progress" | "ended";
  question: string | null;
  answer: string | null;
  timer: number | null;
};

type Message = {
  type: "system" | "player" | "game";
  text: string;
};

function App() {
  const [session, setSession] = useState<GameSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [username, setUsername] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const createSession = () => {
    if (!username) return;
    socket.emit("create_session", { username });
  };

  const joinSession = () => {
    if (!username || !sessionId) return;
    socket.emit("join_session", { sessionId, username });
  };

  useEffect(() => {
    socket.on("session_created", (data) => {
      setSession(data);

      setMessages((prev) => [
        ...prev,
        { type: "system", text: `Session created: ${data.id}` },
      ]);
    });

    socket.on("player_joined", (players) => {
      setSession((prev) =>
        prev ? { ...prev, players } : prev
      );

      setMessages((prev) => [
        ...prev,
        { type: "system", text: "A player joined the game" },
      ]);
    });

    socket.on("game_started", () => {
      setMessages((prev) => [
        ...prev,
        { type: "game", text: "Game started!" },
      ]);
    });

    socket.on("question_set", ({ question }) => {
      setSession((prev) =>
        prev ? { ...prev, question } : prev
      );

      setMessages((prev) => [
        ...prev,
        { type: "game", text: `Question: ${question}` },
      ]);
    });

    socket.on("game_ended", ({ winner, answer, reason }) => {
      setMessages((prev) => [
        ...prev,
        {
          type: "game",
          text: winner
            ? `Winner: ${winner}`
            : `Game ended. No winner. Answer: ${answer}`,
        },
      ]);
    });

    // SYSTEM ERROR HANDLING
    socket.on("error", (msg) => {
      setError(msg);

      setTimeout(() => setError(null), 3000);
    });

    // SESSION INFO FEEDBACK
    socket.on("session_created", (data) => {
      setSession(data);
      setInfo("Session created successfully");

      setTimeout(() => setInfo(null), 3000);
    });

    return () => {
      socket.off("session_created");
      socket.off("player_joined");
      socket.off("game_started");
      socket.off("question_set");
      socket.off("game_ended");
    };
  }, []);


  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 flex items-center justify-center">
      {/* POLISH: FEEDBACK MESSAGES */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded">
          {error}
        </div>
      )}

      {info && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded">
          {info}
        </div>
      )}
      {!session ? (
        // LOBBY
        <div className="w-full max-w-md bg-gray-900 p-6 rounded-2xl shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-6">
            Guessing Game
          </h1>

          <input
            type="text"
            placeholder="Enter username"
            className="w-full p-3 rounded-lg bg-gray-800 mb-4 outline-none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <button
            onClick={createSession}
            className="w-full bg-blue-600 py-3 rounded-lg mb-4"
          >
            Create Game
          </button>

          <div className="text-center text-gray-400 mb-4">OR</div>

          <input
            type="text"
            placeholder="Enter session ID"
            className="w-full p-3 rounded-lg bg-gray-800 mb-4 outline-none"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
          />

          <button
            onClick={joinSession}
            className="w-full bg-green-600 py-3 rounded-lg"
          >
            Join Game
          </button>
        </div>
      ) : (
        // CHAT UI
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* LEFT: Players */}
          <div className="bg-gray-900 p-4 rounded-xl">
            <h2 className="font-bold mb-3">Players</h2>

            {session.players.map((p) => (
              <div key={p.id} className="text-sm mb-2">
                {p.username} — {p.score} pts ({p.attemptsLeft} tries)
              </div>
            ))}
          </div>

          {/* MIDDLE: Chat */}
          <div className="bg-gray-900 p-4 rounded-xl md:col-span-2 flex flex-col">

            <h2 className="font-bold mb-3">
              Session: {session.id}
            </h2>

            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`text-sm p-2 rounded ${m.type === "system"
                    ? "bg-gray-800"
                    : "bg-gray-700"
                    }`}
                >
                  {m.text}
                </div>
              ))}
            </div>

            {/* GAME CONTROLS */}
            <div className="border-t border-gray-700 pt-3 space-y-3">

              {/* Only show when game is in progress */}
              {session.status === "in-progress" && (
                <>
                  {/* QUESTION DISPLAY */}
                  {session.question && (
                    <div className="bg-gray-800 p-2 rounded text-sm">
                      <strong>Question:</strong> {session.question}
                    </div>
                  )}

                  {/* ANSWER INPUT */}
                  <input
                    type="text"
                    placeholder="Type your answer..."
                    className="w-full p-2 rounded bg-gray-800 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        socket.emit("submit_answer", {
                          sessionId: session.id,
                          answer: (e.target as HTMLInputElement).value,
                        });

                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                </>
              )}

              {/* GAME MASTER CONTROLS */}
              {session.gameMaster === socket.id && session.status === "waiting" && (
                <div className="space-y-2">

                  <button
                    onClick={() =>
                      socket.emit("start_game", { sessionId: session.id })
                    }
                    className="w-full bg-blue-600 py-2 rounded"
                  >
                    Start Game
                  </button>

                  <input
                    type="text"
                    placeholder="Set question"
                    className="w-full p-2 rounded bg-gray-800 outline-none"
                    id="qInput"
                  />

                  <input
                    type="text"
                    placeholder="Set answer"
                    className="w-full p-2 rounded bg-gray-800 outline-none"
                    id="aInput"
                  />

                  <button
                    onClick={() => {
                      const q = (document.getElementById("qInput") as HTMLInputElement).value;
                      const a = (document.getElementById("aInput") as HTMLInputElement).value;

                      socket.emit("set_question", {
                        sessionId: session.id,
                        question: q,
                        answer: a,
                      });
                    }}
                    className="w-full bg-green-600 py-2 rounded"
                  >
                    Set Question
                  </button>
                </div>
              )}

            </div>


          </div>
        </div>
      )}
    </div>
  );
}

export default App;