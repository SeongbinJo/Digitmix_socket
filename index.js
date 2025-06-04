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

const usersInRoom = {
    users: [],
    boxes: []
}
// 구조
// usersInRoom = {
//   roomId1: {
//     users: [ { socketId, email }, ... ],
//     boxes: [ ... ] // 방에 하나만 존재해야 하는 boxes 배열
//   },
//   roomId2: {
//     users: [ ... ],
//     boxes: [ ... ]
//   }
// }

io.on(`connection`, (socket) => {
    console.log(`유저 연결됨 : `, socket.id)

    socket.on(`create_room`, ({ roomId, userEmail, boxes }) => {
        console.log(`creat_room 실행, roomID: ${roomId}, userEmail: ${userEmail}`)
        socket.join(roomId)
        socket.roomId = roomId

        // 생성한 roomId로 배열 생성
        if (!usersInRoom[roomId]) {
            usersInRoom[roomId] = {
                users: [],
                boxes: boxes
            }
        }

        usersInRoom[roomId].users.push({
            socketId: socket.id,
            email: userEmail
        })

        io.to(roomId).emit(`room_user_list_createRoom`, usersInRoom[roomId].users)

        socket.emit(`room_created`, roomId)

        console.log(`방 생성됨 : `, roomId)
        console.log(`생성된 방의 boxes: `, boxes.length)
    })

    socket.on(`join_room`, ({ roomId, userEmail }) => {
        const room = io.sockets.adapter.rooms

        if (room.has(roomId)) {
            socket.join(roomId)
            socket.roomId = roomId // 소켓에 roomId 저장장

            if (!usersInRoom[roomId]) {
                // usersInRoom[roomId] = []
                return
            }

            // 유저 목록 갱신
            usersInRoom[roomId].users.push({
                socketId: socket.id,
                email: userEmail
            })

            // 참가 성공을 알림
            socket.emit(`join_room_success`, { roomId, userEmail, boxes: usersInRoom[roomId].boxes })

            // 나를 포함한 같은 방의 모든 유저에게 전송
            io.to(roomId).emit(`room_user_list_joinRoom`, { users: usersInRoom[roomId].users, boxes: usersInRoom[roomId].boxes })
            console.log(`접속한 방의 유저: ${usersInRoom[roomId]}`)

            console.log(`유저(Email: ${userEmail}, socket.id: ${socket.id})가 방 ${roomId}에 참가함.`)
        } else {
            console.log(`${roomId} 방이 존재하지 않음.`)
            socket.emit(`room_not_found`, roomId)
        }
    })

    socket.on(`quit_room`, ({ roomId, userEmail }) => {
        if (roomId && usersInRoom[roomId]) {
            usersInRoom[roomId] = usersInRoom[roomId].users.filter(
                (user) => user.socketId !== socket.id
            )

            socket.leave(roomId)

            socket.to(roomId).emit(`other_user_quitRoom`, userEmail)
            console.log(`유저(${userEmail}) 방 나감`)
        }
    })

    socket.on("remove_room", ({ roomId, userEmail }) => {
        if (roomId && usersInRoom[roomId]) {
            usersInRoom[roomId] = []

            io.to(roomId).emit("room_user_list_removeRoom")

            const users = usersInRoom[roomId]
            users.forEach((user) => {
                const targetSocket = io.sockets.sockets.get(user.socketId)
                if (targetSocket) {
                    targetSocket.leave(roomId)
                }
            })

            delete usersInRoom[roomId]

            console.log(`방장이 방을 삭제함`)
        }
    })

    socket.on(`send_camera_position`, ({ roomId, userEmail, cameraPos }) => {
        if (roomId && usersInRoom[roomId]) {
            socket.to(roomId).emit(`user_moved_position`, { roomId, userEmail, cameraPos })
        }
    })

    socket.on(`created_block`, ({ roomId, createdBoxInfo }) => {
        if (roomId && usersInRoom[roomId].boxes) {
            const updatedBoxes = usersInRoom[roomId].boxes
            updatedBoxes.push(createdBoxInfo)
            usersInRoom[roomId].boxes = updatedBoxes
            console.log(`블럭이 생성됨: `, createdBoxInfo)

            socket.to(roomId).emit(`users_created_block`, { createdBoxInfo })
        } else {
            console.log(`뿌에에엙!! roomID: ${roomId}`)
        }
    })

    socket.on(`deleted_block`, ({ roomId, deletedBoxInfo }) => {
        if (roomId && usersInRoom[roomId].boxes) {
            const updatedBoxes = usersInRoom[roomId].boxes.filter(
                box => box.id !== deletedBoxInfo.id
            )
            usersInRoom[roomId].boxes = updatedBoxes

            console.log(`블럭이 삭제됨: `, deletedBoxInfo)

            socket.to(roomId).emit(`users_deleted_block`, { deletedBoxInfo })
        } else {
            console.log(`블럭 삭제 실패! 잘못된 roomId(${roomId}) 또는 box(${deletedBoxInfo}) 상태.`)
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
            usersInRoom[roomId] = usersInRoom[roomId].users.filter(
                (user) => user.socketId !== socket.id
            )

            io.to(roomId).emit(`room_user_list_disconnect`, usersInRoom[roomId].users)

            if (!usersInRoom[roomId].users) {
                delete usersInRoom[roomId]
                console.log(`방을 나간 후 유저가 없으므로 방을 삭제합니다.`)
            }
            console.log(`방 나간 후, 유저 연결 종료 :`, socket.id)
        } else {
            console.log(`소속된 방이 없으므로 그냥 유저 연결 종료 :`, socket.id)
        }
    })
})

server.listen(3001, () => {
    console.log(`소켓 서버 실행 중..`)
})