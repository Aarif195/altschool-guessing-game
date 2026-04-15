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
  const isGameActive = session?.status === "in-progress";
  const isGameEnded = session?.status === "ended";
  // const isWaiting = session?.status === "waiting";
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [winner, setWinner] = useState<string | null>(null);

  const createSession = () => {
    if (!username) return;
    socket.emit("create_session", { username });
  };

  const joinSession = () => {

    console.log("[JOIN CLICKED]", { username, sessionId, socketId: socket.id });

    if (!username || !sessionId) return;
    socket.emit("join_session", { sessionId, username });

    console.log("[JOIN EMIT SENT]");


  };

  const copySessionId = () => {
    if (!session?.id) return;
    navigator.clipboard.writeText(session.id);
    setInfo("Session ID copied");

    setTimeout(() => setInfo(null), 2000);
  };

  const leaderboard = session?.players
    ? [...session.players].sort((a, b) => b.score - a.score)
    : [];

  useEffect(() => {
    socket.on("session_created", (data) => {
      setSession(data);

      setMessages((prev) => [
        ...prev,
        { type: "system", text: `Session created: ${data.id}` },
      ]);
    });


    socket.on("game_state", (data) => {
      setSession(data);
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
      setWinner(null);

      setMessages((prev) => [
        ...prev,
        { type: "game", text: "Game started!" },
      ]);
    });

    // socket.on("question_set", ({ question }) => {
    //   setSession((prev) =>
    //     prev ? { ...prev, question } : prev
    //   );

    //   setMessages((prev) => [
    //     ...prev,
    //     { type: "game", text: `Question: ${question}` },
    //   ]);
    // });


    socket.on("question_set", ({ question }) => {
      setMessages((prev) => [
        ...prev,
        { type: "game", text: `Question: ${question}` },
      ]);
    });

    socket.on("game_ended", ({ winner, answer }) => {
      setWinner(winner || null);

      setMessages((prev) => [
        ...prev,
        {
          type: "game",
          text: winner
            ? `Winner: ${winner}`
            : `No winner. Answer: ${answer}`,
        },
      ]);

      setTimeout(() => {
        setSession((prev) =>
          prev ? { ...prev, status: "waiting", question: null } : prev
        );
      }, 3000);

    });


    socket.on("game_ended", ({ winner, answer }) => {
      console.log("🔥 GAME ENDED RECEIVED:", winner, answer);
    });

    socket.on("timer_update", (time: number) => {
      setTimeLeft(time);
    });



    // SYSTEM ERROR HANDLING
    socket.on("error", (msg) => {
      setError(msg);

      setTimeout(() => setError(null), 3000);
    });


    // SESSION INFO FEEDBACK
    // socket.on("session_created", (data) => {
    //   setSession(data);
    //   setInfo("Session created successfully");

    //   setTimeout(() => setInfo(null), 3000);
    // });

    socket.on("new_game_master", ({ gameMaster }) => {
      setSession((prev) =>
        prev ? { ...prev, gameMaster } : prev
      );

      setMessages((prev) => [
        ...prev,
        { type: "system", text: "New game master selected" },
      ]);
    });

    return () => {
      socket.off("session_created");
      socket.off("player_joined");
      socket.off("game_started");
      socket.off("question_set");
      socket.off("game_ended");
      socket.off("timer_update");
      socket.off("new_game_master");
      socket.off("game_state");
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
            className="w-full bg-blue-600 py-3 rounded-lg mb-4 cursor-pointer"
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
            className="w-full bg-green-600 py-3 rounded-lg cursor-pointer"
          >
            Join Game
          </button>
        </div>
      ) : (
        // CHAT UI
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* LEFT: Players */}
          <div className="bg-gray-900 p-4 rounded-xl">

            <div className="mb-3">
              <h2 className="font-bold">Leaderboard</h2>
              <p className="text-xs text-gray-400">
                Highest score leads the game
              </p>
            </div>

            {leaderboard.map((p, index) => (
              <div
                key={p.id}
                className={`text-sm mb-2 p-2 rounded ${index === 0 ? "bg-yellow-600" : "bg-gray-800"
                  }`}
              >
                <div className="flex justify-between">
                  <span>
                    {index === 0 ? "👑 " : ""}
                    {p.username}
                  </span>

                  <span>{p.score} pts</span>
                </div>

                <div className="text-xs text-gray-400">
                  {p.attemptsLeft} attempts left
                </div>
              </div>
            ))}

          </div>

          {/* MIDDLE: Chat */}
          <div className="bg-gray-900 p-4 rounded-xl md:col-span-2 flex flex-col">

            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">
                Session: {session.id}
              </h2>

              {isGameActive && (
                <span className="text-xs text-yellow-400">
                  ⏱ {timeLeft}s
                </span>
              )}

              <button
                onClick={copySessionId}
                className="text-xs bg-gray-700 px-2 py-1 rounded cursor-pointer"
              >
                Copy ID
              </button>

              {/* LIVE STATUS (FIXED PLACEMENT) */}
              {isGameActive && (
                <span className="text-xs text-yellow-400 ml-2">
                  Live Game Running...
                </span>
              )}
            </div>

            {/* GAME END SCREEN */}
            {isGameEnded && (
              <div className="bg-green-700 p-4 rounded mb-3 text-center">
                <h3 className="font-bold text-lg">Game Ended</h3>

                {winner ? (
                  <p className="mt-2 text-xl font-bold">
                    🎉 {winner} won!
                  </p>
                ) : (
                  <p className="mt-2 text-sm">
                    No winner this round
                  </p>
                )}
              </div>
            )}

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

              {/* ONLY IN-GAME SECTION */}
              {session.question && (
                <>
                  {session.question && (
                    <div className="bg-gray-800 p-2 rounded text-sm">
                      <strong>Question:</strong> {session.question}
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder="Type your answer..."
                    disabled={!isGameActive}
                    className={`w-full p-2 rounded outline-none ${isGameActive
                      ? "bg-gray-800"
                      : "bg-gray-700 opacity-50 cursor-not-allowed"
                      }`}
                    onKeyDown={(e) => {
                      if (!isGameActive) return;

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
              {session.gameMaster === socket.id &&
                session.status === "waiting" && (
                  <div className="space-y-2">

                    <button
                      onClick={() =>
                        socket.emit("start_game", { sessionId: session.id })
                      }
                      className="w-full bg-blue-600 py-2 rounded cursor-pointer"
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

                        if (!q || !a) {
                          setError("Question and answer required");
                          return;
                        }

                        socket.emit("set_question", {
                          sessionId: session.id,
                          question: q,
                          answer: a,
                        });
                      }}
                      className="w-full bg-green-600 py-2 rounded cursor-pointer"
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