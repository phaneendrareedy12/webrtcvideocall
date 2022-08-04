//Express server - minimalist web framework for Node.js
const express = require('express')
//Socket.IO is a library that enables communication between a client and a server.
const { Socket } = require('socket.io')
// mongoose library will be used to connect to Monogo DB
const mongoose = require('mongoose')
// axios library will be used cosume rest calls (like GET, POST, PUT etc..)
const axios = require('axios')
// to genetae unique id on every peer communication, we will replace device id in future
const uuid = require('react-uuid')

//configure socket io, same path should be on client as well
const io = require('socket.io')({
    path: '/webrtc'
})

const app = express()
app.use(express.json())
const port = 8081 // Siganling server will run on this port

//Get app to test if our server is up or not , This api doen't have any purpose other than checking whether server is up or not
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

//Javascript object which will be attached mandoDB model to save offer and answer details
const offerAnswerSchema = {
    type:String,
    sdp:String,
    timestamp:Date,
    deviceid:String
}


const monModelOfferAnswer = mongoose.model('signalingdata',offerAnswerSchema)

// Post API to save offer and answer details to MongoDB
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

//Javascript object which will be attached mandoDB model to save ice candidates
const iceCandidatesSchema = {
    candidate:String,
    sdpMid:String,
    sdpMLineIndex:String,
    usernameFragment:String,
    timestamp:Date
}

const monIceCandidates = mongoose.model('iceCandidates',iceCandidatesSchema)

// Post API to save ice candidates details to MongoDB
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
    // server flow will start from here , we could see this in console
   console.log(`WebRTC App is listening to port ${port}`)
})

//here express socket io will listen to express server
io.listen(sever)

// Webrtc name space , we could see same namespace (/webRTCPeers) in client as well , both (client & server) should match to establish connection
const webRTCNamespace = io.of("/webRTCPeers")

//All webrtc related communication will happen here 
webRTCNamespace.on('connection', socket => {
    console.log(socket.id)

    socket.emit('connection-success',{
        status: 'connection-success',
        socketId: socket.id
    })

    // Once peer disconnected this event will fire
    socket.on('disconnect', () => {
        console.log(`${socket.id} has disconnected`)
    })

    // On every sdp(both offer & answer) package event this will be executed and will emit the details. so that opposite peer will subscribe to the event and get the details. This is where offer and answer details will be shared between peers
    socket.on('sdp', data => {
        console.log(data)
        // Once offer/answer recived bordcast the message . opposite peer will subscribe to this event we get the details
        socket.broadcast.emit('sdp', data)

        //Call post /saveOfferAnswer api, Save the data to DB 
        axios.post('http://localhost:8080/saveOfferAnswer', data)
        .then(response => {
            console.log("post called successfully")
        })
        .catch(error => {
            console.log("error occurred while calling post method which saves answer offer data into DB")
        }) 
    }) 

    //Lot of ice candiates will be shared while sharing offer and answer details . This will receive ice cadidate info and emit the details so the opposite peer will get them by subscribing to it
    socket.on('candidate', data => {
        console.log(data)
        socket.broadcast.emit('candidate', data)

        //Call post /saveIceCandidates api, Save the data to DB 
        axios.post('http://localhost:8080/saveIceCandidates', data)
        .then(response => {
            console.log("post called successfully")
        })
        .catch(error => {
            console.log("error occurred while calling post method which saves ice candidates data into DB")
        }) 
    })
})