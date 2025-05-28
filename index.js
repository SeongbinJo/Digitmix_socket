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

const usersInRoom = {} // { roomId: [ { socket.id, email } ] }

io.on(`connection`, (socket) => {
    console.log(`유저 연결됨 : `, socket.id)

    socket.on(`create_room`, ({ roomId, userEmail }) => {
        console.log(`creat_room 실행, roomID: ${roomId}, userEmail: ${userEmail}`)
        socket.join(roomId)
        socket.roomId = roomId

        // 생성한 roomId로 배열 생성
        if (!usersInRoom[roomId]) usersInRoom[roomId] = []

        usersInRoom[roomId].push({
            socketId: socket.id,
            email: userEmail
        }) 

        io.to(roomId).emit(`room_user_list_createRoom`, usersInRoom[roomId])

        socket.emit(`room_created`, roomId)

        console.log(`방 생성됨 : `, roomId)
    })

    socket.on(`join_room`, ({ roomId, userEmail }) => {
        const room = io.sockets.adapter.rooms

        if (room.has(roomId)) {
            socket.join(roomId)
            socket.roomId = roomId // 소켓에 roomId 저장장

            // 유저 목록 갱신
            if (!usersInRoom[roomId]) usersInRoom[roomId] = []
            usersInRoom[roomId].push({
                socketId: socket.id,
                email: userEmail
            })

            // 참가 성공을 알림
            socket.emit(`join_room_success`, { roomId, userEmail })

            // 나를 포함한 같은 방의 모든 유저에게 전송
            io.to(roomId).emit(`room_user_list_joinRoom`, usersInRoom[roomId])
            console.log(`접속한 방의 유저: ${usersInRoom[roomId]}`)

            console.log(`유저(Email: ${userEmail}, socket.id: ${socket.id})가 방 ${roomId}에 참가함.`)
        } else {
            console.log(`${roomId} 방이 존재하지 않음.`)
            socket.emit(`room_not_found`, roomId)
        }
    })

    socket.on(`quit_room`, ({ roomId, userEmail }) => {
        if (roomId && usersInRoom[roomId]) {
            usersInRoom[roomId] = usersInRoom[roomId].filter(
                (user) => user.socketId !== socket.id
            )

            socket.to(roomId).emit(`other_user_quitRoom`, userEmail)
            // socket.to(roomId).emit(`room_user_list_quitRoom`, usersInRoom[roomId])
            console.log(`유저(${userEmail}) 방 나감`)
        }
    })

    socket.on(`remove_room`, ({ roomId, userEmail }) => {
        if (roomId && usersInRoom[roomId]) {
            // 방의 유저들 내보내기
            usersInRoom[roomId] = []

            // 방에있던 유저들에게 방에 아무도 없음을 알림.
            io.to(roomId).emit(`room_user_list_removeRoom`)

            // 방 삭제
            delete usersInRoom[roomId]

            console.log(`방장이 방을 삭제했음.`)
        }
    })

    socket.on(`send_camera_position`, ({ roomId, userEmail, cameraPos }) => {
        if( roomId && usersInRoom[roomId]) {
            socket.to(roomId).emit(`user_moved_position`, { roomId, userEmail, cameraPos })
        }
    })

    socket.on(`send_message`, ({ roomId, message }) => {
        socket.to(roomId).emit(`receive_message`, {
            message,
            sender: socket.id
        })
    })

    socket.on(`disconnect`, () => {
        const roomId = socket.roomId

        if (roomId && usersInRoom[roomId]) {
            usersInRoom[roomId] = usersInRoom[roomId].filter(
                (user) => user.socketId !== socket.id
            )

            io.to(roomId).emit(`room_user_list_disconnect`, usersInRoom[roomId])
            console.log(`방 나간 후, 유저 연결 종료 :`, socket.id)
        } else {
            console.log(`소속된 방이 없으므로 그냥 유저 연결 종료 :`, socket.id)
        }
    })
})

server.listen(3001, () => {
    console.log(`소켓 서버 실행 중..`)
})