import type { Request, Response } from "express";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import { Server } from 'socket.io';
import http from 'http'

const app = express();
const PORT = 3001;
const onlineUsers = new Map();

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

  let currentUserEmail: any = null;

  // 1. KHI USER BÁO DANH
  socket.on('user_joined', (user) => {
    currentUserEmail = user.email;

    // Ép user này tham gia vào một "phòng riêng" có tên là Email của họ
    socket.join(user.email);

    // Lưu vào danh sách online
    onlineUsers.set(user.email, { ...user, socketId: socket.id });

    // Báo cho mọi người khác là user này mới vào
    socket.broadcast.emit('announce_new_user', user);

    // Phát lại danh sách online MỚI NHẤT cho toàn bộ server cập nhật
    io.emit('update_online_users', Array.from(onlineUsers.values()));
  });

  // 2. KHI GỬI TIN NHẮN TỔNG (TEAM CHAT)
  socket.on('send_message', (data) => {
    io.emit('receive_message', data);
  });

  // 3. KHI GỬI TIN NHẮN RIÊNG (PRIVATE CHAT)
  socket.on('send_private_message', (data) => {
    // data bao gồm: { user: user_gui, toEmail: 'nguoinhan@...', text: '...' }

    // Gửi đích danh cho người nhận (Dựa vào room email)
    io.to(data.toEmail).emit('receive_private_message', data);

    // Gửi ngược lại cho chính người gửi (để hiển thị lên màn hình của mình)
    io.to(data.user.email).emit('receive_private_message', data);
  });

  // 4. KHI USER THOÁT WEB
  socket.on('disconnect', () => {
    if (currentUserEmail) {
      onlineUsers.delete(currentUserEmail);
      // Cập nhật lại danh sách online cho những người còn lại
      io.emit('update_online_users', Array.from(onlineUsers.values()));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
