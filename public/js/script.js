//URL of my web server + socket connection
//https://mhvideochat.herokuapp.com/
const url = 'localhost:3000';
const socket = io.connect(url);
//media connection variables
const { RTCPeerConnection, RTCSessionDescription } = window;
const peerConnection = new RTCPeerConnection();

let isAlreadyCalling = false
let getCalled = false
const existingCalls = []


// socket.on('connection', socket =>{
//     const existingSocket = activeSockets.find(
//         existingSocket => existingSocket === socket.id
//     )
//     console.log('we are connected ' + socket.id)

//     if (!existingSocket) {
//         activeSockets.push(socket.id)

//         socket.emit("update-user-list", {
//             users: activeSockets.filter(
//               existingSocket => existingSocket !== socket.id
//             )
//         });

//         socket.broadcast.emit('update-user-list', {
//             users: [socket.id]
//         })
//     }
// })


//removes selected user formating
const unselectUsersFromList = () =>{
    const alreadySelectedUser = document.querySelectorAll('.active-user.active-user--selected')
    alreadySelectedUser.forEach(el => {
        el.setAttribute('class', 'active-user')
    })
}

//updates active user list when new users connect to site
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
//add new user to page in a p tag
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
//call a user client has picked from list
const callUser = async (socketId) => {
    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer))
    console.log(offer)
    socket.emit('call-user', {
        offer,
        to:socketId
    })
}

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
    //give the user a chance to reject the call
    if (getCalled) {
        const confirmed = confirm(`User ${data.socket} wants to call you, do you accept?`)
        if (!confirmed){
            socket.emit('reject-call', {
                from:data.socket
            })
        return
        }
    }
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(new RTCSessionDescription(answer))

    socket.emit('make-answer', {
        answer,
        to: data.socket
    })
    getCalled=true;
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

socket.on('call-rejected', data=>{
    alert(`user ${data.socket} rejected your call`);
    unselectUsersFromList();
})

peerConnection.ontrack = function({streams: [stream]}){
    const remoteVideo = document.getElementById('remote-video')
    if (remoteVideo){
        remoteVideo.srcObject = stream
    }
}

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