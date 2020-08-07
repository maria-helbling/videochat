const express = require("express")
const app = express();
// Express App Setup
const PORT = process.env.PORT || 3000;
// Sets up the Express app to handle data parsing.
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// serve static assets(files) from the public directory
app.use(express.static("public"));

app.get('/', (req, res) => {
    res.send('<h1>Hello!!!</hi>')
})

var server
server = app.listen(PORT, function () {
    console.log("Server listening on PORT " + PORT);
});
//socket.io setup
var io = require('socket.io')(server);
let activeSockets = []
io.on('connection', socket => {
    console.log('Client connected...')

    const existingSocket = activeSockets.find(
        existingSocket => existingSocket === socket.id
    );

    if (!existingSocket) {
        activeSockets.push(socket.id);


        socket.emit("update-user-list", {
            users: activeSockets.filter(existingSocket => existingSocket !== socket.id)
        });

        socket.broadcast.emit("update-user-list", {
            users: [socket.id]
        });
    }

    socket.on('call-user', data => {
        socket.to(data.to).emit('call-made', {
            offer: data.offer,
            socket: socket.id
        })
    })

    socket.on('make-answer', data => {
        socket.to(data.to).emit('answer-made', {
            socket: socket.id,
            answer: data.answer
        })
    })

    socket.on("reject-call", data => {
        socket.to(data.from).emit("call-rejected", {
            socket: socket.id
        });
    });
    
    socket.on('disconnect', () => {
        activeSockets = activeSockets.filter(existingSocket => existingSocket !== socket.id)
        socket.broadcast.emit('remove-user', {
            socketId: socket.id
        })
    })

})