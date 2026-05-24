import type { Request, Response } from "express";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import { Server } from 'socket.io';
import http from 'http'

const app = express();
const PORT = 3001;

dotenv.config();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DB_URL = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_USER_PASSWORD}@${process.env.DB_CLUSTER_PATH}`;
const connect = mongoose.connect(DB_URL, { family: 4, dbName: process.env.DB_NAME });

const server = http.createServer(app);

connect.then((db) => {
  console.log("Connect server success");
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('⚡ Một user vừa kết nối:', socket.id);

  socket.on('user_joined', (userName) => {
    socket.broadcast.emit('announce_new_user', userName);
  });

  // Lắng nghe tin nhắn từ 1 người và phát lại cho TẤT CẢ mọi người
  socket.on('send_message', (data) => {
    io.emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('❌ User đã ngắt kết nối:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
