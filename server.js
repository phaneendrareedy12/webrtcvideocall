const express = require('express')
const { Socket } = require('socket.io')
const mongoose = require('mongoose')
const axios = require('axios')
const uuid = require('react-uuid')

const io = require('socket.io')({
    path: '/webrtc'
})

const app = express()
app.use(express.json())
const port = 8080


app.get('/', (req, res) => res.send('Hello WebRTC!!'))

//Mongo DB connection
mongoose.connect('mongodb://localhost:27017/webrtc', {
    useNewUrlParser:true,
    useUnifiedTopology:true
}, err => {
    if(!err) {
        console.log('connected to mongo db ........')
    } else {
        console.log('error connnecting mongo db....')
    }
})

const offerAnswerSchema = {
    type:String,
    sdp:String,
    timestamp:Date,
    deviceid:String
}

const monModelOfferAnswer = mongoose.model('signalingdata',offerAnswerSchema)

app.post('/saveOfferAnswer', async(req,res) => {

    const dataToSave = new monModelOfferAnswer({
        type:req.body.sdp.type,
        sdp:req.body.sdp.sdp,
        timestamp:new Date(),
        deviceid:uuid()
    })

    const val = await dataToSave.save()
    console.log('res josn ***')
    console.log(val)
    res.json(val)
})

const iceCandidatesSchema = {
    candidate:String,
    sdpMid:String,
    sdpMLineIndex:String,
    usernameFragment:String,
    timestamp:Date
}

const monIceCandidates = mongoose.model('iceCandidates',iceCandidatesSchema)

app.post('/saveIceCandidates', async(req,res) => {

    const dataToSave = new monIceCandidates({
        candidate:req.body.candidate,
        sdpMid:req.body.sdpMid,
        sdpMLineIndex:req.body.sdpMLineIndex,
        usernameFragment:req.body.usernameFragment,
        timestamp:new Date()
    })

    const val = await dataToSave.save()
    console.log('res josn ***')
    console.log(val)
    res.json(val)
})

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
        axios.post('http://localhost:8080/saveOfferAnswer', data)
        .then(response => {
            console.log("post called successfully")
        })
        .catch(error => {
            console.log("error occurred while calling post method which saves answer offer data into DB")
        }) 
    }) 

    socket.on('candidate', data => {
        console.log(data)
        socket.broadcast.emit('candidate', data)
        axios.post('http://localhost:8080/saveIceCandidates', data)
        .then(response => {
            console.log("post called successfully")
        })
        .catch(error => {
            console.log("error occurred while calling post method which saves ice candidates data into DB")
        }) 
    })
})