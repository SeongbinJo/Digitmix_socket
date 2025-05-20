const express = require(`express`) // node.js 에서 웹 서버를 만들기 위한 express 프레임워크 가져옴
const http = require(`http`) // express를 http 서버로 감싸기 위해 HTTP 모듈 가져옴
const { Server } = require(`socket.io`) // 실시간 통신을 위해 socket.io - Server 가져옴옴
const cors = require(`cors`) // CORS를 설정하기 위한 모듈. CORS - Cross Origin Resource Sharing, React 프론트와 통신하기위해 필요

const app = express()

app.use(cors())

const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: import.meta.env.SIDEPAGE6_DOMAIN,
    },
})

io.on(`connection`, (socket) => {
    console.log(`유저 연결됨 : `, socket.id)

    socket.on(`create_room`, (roomId) => {
        socket.join(roomId)
        console.log(`방 생성됨 : `, roomId)
        socket.emit(`room_created`, roomId)
    })

    socket.on(`join_room`, (roomId) => {
        const room = io.sockets.adapter.rooms

        if (room.has(roomId)) {
            socket.join(roomId)
            console.log(`${socket.id}가 방 ${roomId}에 참가함.`)
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