const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const colors = [
    { background: '#e0f7fa', text: '#00695c' },
    { background: '#fff3e0', text: '#ff6f00' },
    { background: '#e8f5e9', text: '#2e7d32' },
    { background: '#fce4ec', text: '#d81b60' },
    { background: '#f3e5f5', text: '#8e24aa' },
    { background: '#e3f2fd', text: '#0288d1' },
];

const users = [];

function getRandomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
}

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('Un usuario se ha conectado');

    const userColor = getRandomColor();

    socket.on('set username', (username) => {
        socket.username = username;
        socket.userColor = userColor;
        users.push(username);
        socket.emit('chat message', {
            msg: '¡Te has unido al chat!',
            color: userColor,
            username: 'Sistema'
        });
        io.emit('user list', users);
    });

    socket.on('chat message', (msg) => {
        const mentionRegex = /@(\w+)/g;
        const mentions = [];
        let match;
        while ((match = mentionRegex.exec(msg)) !== null) {
            mentions.push(match[1]);
        }

        io.emit('chat message', {
            msg: msg,
            color: socket.userColor,
            username: socket.username || 'Anónimo',
            mentions: mentions
        });

        // Notify mentioned users
        mentions.forEach(mentionedUser => {
            io.sockets.sockets.forEach(s => {
                if (s.username === mentionedUser) {
                    s.emit('notification', {
                        msg: `${socket.username || 'Anónimo'} te ha mencionado en el chat`,
                        color: socket.userColor
                    });
                }
            });
        });
    });

    socket.on('send image', (imageData) => {
        io.emit('chat message', {
            msg: `<img src="${imageData}" style="max-width: 300px; border-radius: 10px;" />`,
            color: socket.userColor,
            username: socket.username || 'Anónimo'
        });
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
        const index = users.indexOf(socket.username);
        if (index > -1) {
            users.splice(index, 1);
            io.emit('user list', users);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
