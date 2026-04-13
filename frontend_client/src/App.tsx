import { useEffect } from "react";
import { socket } from "./socket";

function App() {
  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected:", socket.id);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return <h1>Guessing Game Frontend</h1>;
}

export default App;