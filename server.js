const express = require('express')
const { Socket } = require('socket.io')

const io = require('socket.io')({
    path: '/webrtc'
})

const app = express()
const port = 8080

app.get('/', (req, res) => res.send('Hello WebRTC!!'))

const sever = app.listen(port, () => {
   console.log(`WebRTC App is listening to port ${port}`)
})

io.listen(sever)

const webRTCNamespace = io.of("/webRTCPeers")

webRTCNamespace.on('connection', socket => {
    console.log(socket.id)

    socket.emit('connection-success',{
        status: 'connection-success',
        socketId: socket.id
    })

    socket.on('disconnect', () => {
        console.log(`${socket.id} has disconnected`)
    })

    socket.on('sdp', data => {
        console.log(data)
        socket.broadcast.emit('sdp', data)
    }) 

    socket.on('candidate', data => {
        console.log(data)
        socket.broadcast.emit('candidate', data)
    })
})