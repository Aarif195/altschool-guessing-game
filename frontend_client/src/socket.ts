import { io } from "socket.io-client";

const BACKEND_URL = "https://altschool-guessing-game.onrender.com";

export const socket = io(BACKEND_URL);
