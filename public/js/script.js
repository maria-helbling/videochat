//URL of my web server + socket connection
const url = 'localhost:3000';
const socket = io.connect(url);
//media connection variables
const { RTCPeerConnection, RTCSessionDescription } = window;
let peerConnection = new RTCPeerConnection();
let isAlreadyCalling = false
//get device media inputs
navigator.getUserMedia(
    {video:true, audio:true},
    stream =>{
        const localVideo = document.getElementById("local-video");
        if (localVideo) {
            localVideo.srcObject = stream;
        }
        stream.getTracks().forEach(track =>peerConnection.addTrack(track, stream))
    },
    error => {
        console.warn(error.message);
    }
)

socket.on('connection', socket =>{
    const existingSocket = activeSockets.find(
        existingSocket => existingSocket === socket.id
    )
    console.log('we are connected ' + socket.id)

    if (!existingSocket) {
        activeSockets.push(socket.id)

        socket.emit("update-user-list", {
            users: activeSockets.filter(
              existingSocket => existingSocket !== socket.id
            )
        });

        socket.broadcast.emit('update-user-list', {
            users: [socket.id]
        })
    }
})

socket.on('update-user-list', ({users})=>{
    updateUserList(users);
})

socket.on('remove-user', ({socketId})=>{
    const elToRemove = document.getElementById(socketId)
    if (elToRemove) {
        elToRemove.remove()
    }
})

socket.on('call-made', async data => {
    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer)
    )
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(new RTCSessionDescription(answer))

    socket.emit('make-answer', {
        answer,
        to: data.socket
    })
})

socket.on('answer-made', async data =>{
    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.answer)
    )

    if (!isAlreadyCalling){
        callUser(data.socket)
        isAlreadyCalling = true
    }
})

const unselectUsersFromList = () =>{
    const alreadySelectedUser = document.querySelectorAll('.active-user.active-user--selected')
    alreadySelectedUser.forEach(el => {
        el.setAttribute('class', 'active-user')
    })
}
const updateUserList=(socketIds) => {
    const activeUserContainer = document.getElementById("active-user-container")

    socketIds.forEach(element => {
        const alreadyExistingUser = document.getElementById(element)
        if (!alreadyExistingUser) {
            const userContainerEl = createUserItemContainer(element)
            activeUserContainer.appendChild(userContainerEl)
        }
    });
}

const createUserItemContainer = (socketId) => {
    const userContainerEl = document.createElement('div')
    const usernameEl = document.createElement('p')

    userContainerEl.setAttribute('class', 'active-user')
    userContainerEl.setAttribute('id', socketId)
    usernameEl.setAttribute('class', 'username')
    usernameEl.innerHTML = `Socket: ${socketId}`
    userContainerEl.appendChild(usernameEl)

    userContainerEl.addEventListener('click', ()=>{
        //unselectUsersFromList();
        userContainerEl.setAttribute('class', 'active-user--selected')
        const talkingWithInfo = document.getElementById('talking-with-info')
        talkingWithInfo.innerHTML = `Talking with: ${socketId}`
        callUser(socketId)
    })
    return userContainerEl
}

const callUser = async (socketId) => {
    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer))
    
    socket.emit('call-user', {
        offer,
        to:socketId
    })
}



peerConnection.ontrack = function({streams: [stream]}){
    const remoteVideo = document.getElementById('remote-video')
    if (remoteVideo){
        remoteVideo.srcObject = stream
    }
}