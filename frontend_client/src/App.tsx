import { useState } from "react";
import { socket } from "./socket";

function App() {
  const [username, setUsername] = useState("");
  const [sessionId, setSessionId] = useState("");

  const createSession = () => {
    if (!username) return;
    socket.emit("create_session", { username });
  };

  const joinSession = () => {
    if (!username || !sessionId) return;
    socket.emit("join_session", { sessionId, username });
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 p-6 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold text-white text-center mb-6">
          Guessing Game
        </h1>

        <input
          type="text"
          placeholder="Enter username"
          className="w-full p-3 rounded-lg bg-gray-800 text-white mb-4 outline-none"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <button
          onClick={createSession}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg mb-4"
        >
          Create Game
        </button>

        <div className="text-center text-gray-400 mb-4">OR</div>

        <input
          type="text"
          placeholder="Enter session ID"
          className="w-full p-3 rounded-lg bg-gray-800 text-white mb-4 outline-none"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
        />

        <button
          onClick={joinSession}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg"
        >
          Join Game
        </button>
      </div>
    </div>
  );
}

export default App;