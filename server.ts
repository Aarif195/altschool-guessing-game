import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { gameSessions, GameSession } from "./src/store/gameStore";
import { emitGameState, startGameTimer } from "./src/helpers/gameHelper";
import { registerGameHandlers } from "./src/handlers/gameHandler";

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

  registerGameHandlers(io, socket);
 
});



const PORT = process.env.PORT || 5500;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
