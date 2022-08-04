import { useEffect, useRef, useState } from 'react'

import io from 'socket.io-client'

//configure socket io client , we could see same namespace (/webRTCPeers), path(/webrtc) in server as well , both(client & server) should match to establish connection
const socket = io(
  '/webRTCPeers',
  {
    path: '/webrtc'
  }
)

function App() {

  const localVideoRef = useRef()
  const remoteVideoRef = useRef()
  const pc = useRef(new RTCPeerConnection(null))
  const textRef = useRef()
  const [offerVisible, setOfferVisible] = useState(true)
  const [answerVisible, setAnswerVisible] = useState(true)
  const [status, setStatus] = useState('Make a call now')

  // useEffect is a hook, this completely react concept , as per our code this will execute once client starts
  useEffect(() => {

    socket.on('connection-success', success => {
      console.log(success)
    })

    // This will be executed when server emits sdp package , we could see same in server as well . 
    socket.on('sdp', data => {
      console.log(data)
      pc.current.setRemoteDescription(new RTCSessionDescription(data.sdp))
      textRef.current.value = JSON.stringify(data.sdp)

      if (data.sdp.type === 'offer') {
        setOfferVisible(false)
        setAnswerVisible(true)
        setStatus('Incoming call .....')
      } else {
        setStatus('Call established')
      }
    })

    /// This will be executed when server emits cadidate package , we could see same in server as well .
    socket.on('candidate', candidate => {
      console.log(candidate)
      //candidates.current = [...candidates.current, candidate]
      pc.current.addIceCandidate(new RTCIceCandidate(candidate))
    })

    const contraints = {
      audio: false,
      video: true
    }

    navigator.mediaDevices.getUserMedia(contraints)
      .then(stream => {
        localVideoRef.current.srcObject = stream

        stream.getTracks().forEach(track => {
          _pc.addTrack(track, stream)
        })
      })
      .catch(e => console.log("Exception while accesing user media..", e))


    const _pc = new RTCPeerConnection(null)

    _pc.onicecandidate = e => {
      if (e.candidate) {
        console.log(JSON.stringify(e.candidate))
        sendToPeer('candidate', e.candidate)
      }
    }

    _pc.oniceconnectionstatechange = e => {
      console.log(e)
    }

    _pc.ontrack = e => {
      remoteVideoRef.current.srcObject = e.streams[0]
    }

    pc.current = _pc

  }, [])

  //common method to emit all the evenets.
  const sendToPeer = (eventType, payload) => {
    socket.emit(eventType, payload)
  }

  // Will be called by both createOffer & createAnswer
  const processSDP = sdp => {
    console.log(JSON.stringify(sdp))
    //set Remote disctpion
    pc.current.setLocalDescription(sdp)

    //send the SDP to server
    sendToPeer('sdp', { sdp })
  }

  // We will send(emit) the offer sdp and ice cadiates details to Signaling server
  const createOffer = () => {
    pc.current.createOffer({
      offerToReceiveAudio: 1,
      offerToReceiveVideo: 1
    }).then(sdp => {
      //send the SDP to server
      processSDP(sdp)

      setOfferVisible(false)
      setStatus('Calling ......')
    }).catch(e => console.log())
  }

  // We will send(emit) the answer and ice candidates details to Signaling server
  const createAnswer = () => {
    pc.current.createAnswer({
      offerToReceiveAudio: 1,
      offerToReceiveVideo: 1
    }).then(sdp => {
      //send the answer sdp to the offering peer
      processSDP(sdp)
      setAnswerVisible(false)
      setStatus('Call established')
    }).catch(e => console.log())
  }


   /*flow will start here , once call button clicked createOffer function will be called , so that offer sdp and ice cadidates will be shared to opposite peer through Signaling server,
   opposite will click on answer button and createAnswer method will be called , so that answer sdp and icecadiates will be shared to opposite peer and connection will be established.
   */
  const showHideButtons = () => {
    if (offerVisible) {
      return (
        <div>
          <button onClick={createOffer}>Call</button>
        </div>
      )
    } else if (answerVisible) {
      return (
        <div>
          <button onClick={createAnswer}>Answer</button>
        </div>
      )
    }
  }

  //HTML to show video in the screen
  return (
    <div style={{ margin: 10 }}>
      <video
        style={{
          width: 240, height: 240, margin: 5, backgroundColor: 'black'
        }}
        ref={localVideoRef} autoPlay></video>
      <video
        style={{
          width: 240, height: 240, margin: 5, backgroundColor: 'black'
        }}
        ref={remoteVideoRef} autoPlay></video>
      <br />
      <br />
      {showHideButtons()}
      <div>{status}</div>
      <textarea ref={textRef} />
    </div>
  );
}

export default App;
