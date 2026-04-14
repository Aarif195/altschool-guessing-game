import { useEffect } from "react";
import { socket } from "./socket";

function App() {
  useEffect(() => {
    if (socket.connected) {
      console.log("Connected:", socket.id);
    }

    socket.on("connect", () => {
      console.log("Connected:", socket.id);
    });
  }, []);

   return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <h1 className="text-3xl font-bold">Guessing Game</h1>
    </div>
  );
}

export default App;