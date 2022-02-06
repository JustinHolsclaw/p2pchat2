import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import Peer from 'peerjs';

type PeerMessage = {
  senderId: string
  lamportClock: number
  message: string
  chatLog: string[]
  connectionList?: string[]
};

function App() {
  const [localClientId, setLocalClientId] = useState<string>('')
  const [notificationBarText, setnotificationBarText] = useState<string>('welcome')
  const [chatLog, setChatLog] = useState<string[]>([''])
  const [lamportClock, setLamportClock] = useState<number>(0)
  const [listOfConnections, setListOfConnections] = useState<Peer.DataConnection[]>([])
  const [listOfConnectionIds, setListOfConnectionIds] = useState<string[]>([])
  const peerInstance = useRef<Peer>()
  var inputBoxConnectionId = ''
  var inputBoxChatMessage = ''

  useEffect(() => {
    function randId(): string {
      let roomLength = 6
      let lowChar = "A".charCodeAt(0)
      let highChar = "Z".charCodeAt(0)
      let possibleChars = highChar - lowChar + 1
      let randChar = () => {
        let r = Math.round(Math.random() * possibleChars) + lowChar
        return String.fromCharCode(r)
      }
      return [...new Array(roomLength).keys()].map(randChar).join("");
    }

    var myId: string = randId();
    var peer = new Peer(myId, {
      host: '45.79.192.219',
      port: 9000,
      path: '/myapp'
    });

    peer.on('open', function (id) {
      console.log("connection successful, your id: " + id)
      setLocalClientId(id)
    });

    useEffect(() =>{
      peer.on('open', (id) =>{
        console.log("Connection successful, my id is: "+id)}
    )
      peer.on('connection', (conn)=>{
        setListOfConnections(prev => [...prev, conn])
        console.log("Now connected to new peer: "+ conn.peer)
      })
  }, [peer])

  const addPeer = () => {
    const conn = peer.connect(localClientId)
    conn.on('data', function (data: PeerMessage) {
        setLamportClock(lamportClock > data.lamportClock ? lamportClock + 1 : data.lamportClock + 1);
        setChatLog([...data.chatLog, generateChatString(data)])
        console.log(data.chatLog)
        if (data.connectionList) {
          setListOfConnectionIds([...data.connectionList])
        }
        createConnectionToId(data.senderId)
      });
  }

  
  /////Old connection stuff
    peer.on('connection', function (conn) {
      
    });

    peerInstance.current = peer;
  }, []);

  useEffect(() => {
    listOfConnectionIds.forEach(connectionId => {
      //check if we have a connection to this id
      if (listOfConnections.find(connection => connection.peer === connectionId) === undefined) {
        //if we don't, we create one
        createConnectionToId(connectionId)
      }
    });
  }, [listOfConnectionIds]);

  function onConnectionIdChange(e: React.ChangeEvent<HTMLInputElement>) {
    inputBoxConnectionId = e.target.value
  }
  function onChatChange(e: React.ChangeEvent<HTMLInputElement>) {
    inputBoxChatMessage = e.target.value
  }

  function onSubmitConnectionRequest() {
    createConnectionToId(inputBoxConnectionId)
  }

  function createConnection (connection: Peer.DataConnection){
     if (connection) setListOfConnections(currentConnectionList => ([...currentConnectionList, connection as Peer.DataConnection]))
     connection.on('open', function () {
    
      var message: PeerMessage = { senderId: localClientId, lamportClock: lamportClock, message: `${localClientId} has entered the chat` }
      setChatLog(currentChatLog => ([...currentChatLog, parseMessage(message)]))
      connection?.send(message);
     })
     connection.on('data', function (data: PeerMessage) {
      setLamportClock(lamportClock > data.lamportClock ? lamportClock + 1 : data.lamportClock + 1); //make lamport larger
      setChatLog(currentChatLog => ([...currentChatLog, parseMessage(data)]))
      if (listOfConnections.find(connection => connection.peer.toString() === data.senderId.toString())){
        console.log('connection already exists')
      }
      else {
        createConnectionToId(data.senderId)
        console.log(listOfConnections)
      }
    });
  }

  function createConnectionToId(id: string) {
    setLamportClock(currentLamportClock => (currentLamportClock + 1))
    var connection = peer?.connect(id);
    createConnection(connection as Peer.DataConnection)
    setnotificationBarText("successfully connected to: " + id)
    
  }

  //NOT THIS THING
  function onSubmitChat() {
    const newLamportClock = lamportClock + 1
    setLamportClock(newLamportClock)
    var message: PeerMessage = { senderId: localClientId, lamportClock: newLamportClock, message: inputBoxChatMessage, chatLog: chatLog, connectionList: undefined }
    setChatLog([...chatLog, generateChatString(message)])
    for (let i = 0; i < listOfConnections.length; i++) {
      listOfConnections[i].send(message);
    }
  }

  function generateChatString(message: PeerMessage) {
    return `${message.senderId} at L(${message.lamportClock}): ${message.message}`
  }

  return (
    <div className="container">
      <h1>ID: {localClientId}</h1>
      <p>{notificationBarText}</p>
      <div>
        <label>
          Connect to id:
          <input type="text" name="name" onChange={onConnectionIdChange} />
        </label>
        <input className="btn btn-primary" type="submit" value="Submit" onClick={onSubmitConnectionRequest}></input>
      </div>
      <div>
        <h4>Current Connections</h4>
        {listOfConnections.map(connection => {
          return <p>{connection.peer}</p>
        })}
      </div>
      <div>
        <h2>Chat</h2>
        {chatLog.map((message, index) => {
          return <p key={index}>{message}</p>
        })}
      </div>
      {listOfConnections.length == 0 ?
        <p>not connected</p> :
        <div>
          <label>
            Chat:
            <input type="text" name="name" onChange={onChatChange} />
          </label>
          <input className="btn btn-primary" type="submit" value="Submit" onClick={onSubmitChat}></input>
        </div>
      }
    </div>
  );
}

export default App;