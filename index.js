import express from "express"
import http from "http"
import { Server } from "socket.io"
import cors from "cors"
import dotenv from "dotenv"

dotenv.config()

const app = express()

app.use(cors())

const server = http.createServer(app)

// process.env.SIDEPAGE6_DOMAIN
const io = new Server(server, {
    cors: {
        origin: `*`,
    },
})

io.on(`connection`, (socket) => {
    console.log(`유저 연결됨 : `, socket.id)

    socket.on(`create_room`, (roomId) => {
        socket.join(roomId)
        console.log(`방 생성됨 : `, roomId)
        socket.emit(`room_created`, roomId)
    })

    socket.on(`join_room`, ({ roomId, userEmail }) => {
        const room = io.sockets.adapter.rooms

        if (room.has(roomId)) {
            socket.join(roomId)
            console.log(`유저(Email: ${userEmail}, socket.id: ${socket.id})가 방 ${roomId}에 참가함.`)
        } else {
            console.log(`${roomId} 방이 존재하지 않음.`)
            socket.emit(`room_not_found`, roomId)
        }


    })

    socket.on(`send_message`, ({ roomId, message }) => {
        socket.to(roomId).emit(`receive_message`, {
            message,
            sender: socket.id
        })
    })

    socket.on(`disconnect`, () => {
        console.log(`유저 연결 종료 :`, socket.id)
    })
})

server.listen(3001, () => {
    console.log(`소켓 서버 실행 중..`)
})