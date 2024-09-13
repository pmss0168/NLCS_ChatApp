//------------------------------Lay cac library--------------------------------------------
const express = require('express');
const session = require('express-session');
const http = require('http');
const path = require('path');
const socketio = require('socket.io');
const mysql = require('mysql');
const moment = require('moment');
const crypto = require('crypto');
const flash = require('connect-flash');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const port = process.env.PORT || 3000;
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Vajl0nchjmen@',
    database: 'chatapp',
});

const util = require('./controllers/util');
const chatNamespace = io.of('/chat');

//De nguoi dung co the su dung toan bo nhung hinh anh, file, thu muc co trong ./public
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(
    session({
        secret: 'thisismysecretkey',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false },
    }),
);
app.use(flash());

//Hien thi trang web chinh khi truy cap
app.set('view engine', 'ejs');
app.set('views', './views');

//------------------------------Use route--------------------------------------------
app.use(require('./routes'));

//------------------------------Socket main--------------------------------------------

chatNamespace.on('connection', function (socket) {
    socket.on('joinUserRoom', function (user) {
        socket.join(user);
    });
    socket.on('disconnect', function () {});

    //Xu ly su kien load message
    socket.on('loadMessage', async function (receiver, sender) {
        let sqlLoadMessage = `select * from messages where (sender=? and receiver=?) or (sender=? and receiver=?) order by id_message asc`;
        db.query(
            sqlLoadMessage,
            [sender, receiver, receiver, sender],
            await function (err, data) {
                if (err) throw err;
                // console.log(data);
                socket.emit('loadMessage', data);
            },
        );
    });

    //Su kien load trang accept
    socket.on('loadAcceptFriendPage', async function (user) {
        let sql = `
        select username
        from users
        where username <> ? and (username  in(  
            select friend_request
            from friends
            where friend_accept = ? and isAccept = 0
        ));
        `;
        db.query(
            sql,
            [user, user],
            await function (err, data) {
                if (err) throw err;
                // console.log(data);
                socket.emit('loadAcceptFriendPage', data);
            },
        );
    });

    //Hien thi trang them cuoc tro chuyen
    socket.on('loadAddFriendPage', async function (user) {
        let sql = `
        select username
        from users
        where username <> ? and (username not in(  
            select friend_request
            from friends
            where friend_accept = ?
        ) and username not in (
            select friend_accept
            from friends
            where friend_request = ?
        ));
        `;
        db.query(
            sql,
            [user, user, user],
            await function (err, data) {
                if (err) throw err;
                // console.log(data);
                socket.emit('loadAddFriendPage', data);
            },
        );
    });

    //Xu ly them cuoc cho chuyen moi
    socket.on('acceptFriendChat', async function (friend, user) {
        let sql = `UPDATE friends SET isAccept = 1 WHERE (friend_request = ?) and (friend_accept = ?);`;
        db.query(
            sql,
            [friend, user],
            await function (err, data) {
                if (err) throw err;
            },
        );
        socket.to(friend).emit('acceptFriendChat');
    });

    //Xu ly them cuoc cho chuyen moi
    socket.on('addFriendChat', async function (friend, user) {
        let sql = `INSERT INTO friends (friend_request, friend_accept) VALUES (?, ?);`;
        db.query(
            sql,
            [user, friend],
            await function (err, data) {
                if (err) throw err;
            },
        );
        socket.to(friend).emit('addFriendChat');
    });

    //Xu ly hien thi nguoi dung
    socket.on('showUser', async function (user) {
        let sql = `
        select username
        from users
        where username <> ? and (username  in(  
            select friend_request
            from friends
            where friend_accept = ? and isAccept = 1
        ) or username  in (
            select friend_accept
            from friends
            where friend_request = ? and isAccept = 1
        ));
        `;
        db.query(
            sql,
            [user, user, user],
            await function (err, data) {
                if (err) throw err;
                socket.emit('showUser', data);
            },
        );
    });

    //Su kien thong bao tin nhan moi
    socket.on('loadNotification', async function (user, listConversation) {
        // console.log(listConversation);
        if (listConversation == null) {
            let sql = `select distinct sender from messages where receiver = ? and notification = 1;`;
            db.query(
                sql,
                user,
                await function (err, data) {
                    if (err) throw err;
                    // console.log(data);
                    socket.emit('loadNotification', data);
                },
            );
        } else if (listConversation != null) {
            let dataResult = [];
            let sql = `select distinct sender from messages where receiver = ? and notification = 1;`;
            db.query(
                sql,
                user,
                await function (err, data) {
                    if (err) throw err;
                    for (let element of listConversation) {
                        for (let item of data) {
                            if (element.username === item.sender) {
                                dataResult.push(item);
                            }
                        }
                    }
                    // console.log(dataResult);
                    socket.emit('loadNotification', dataResult);
                },
            );
        }
    });
    socket.on('notificationMsg', function (sender, receiver) {
        socket.to(receiver).emit('notificationMsg', sender, receiver);
    });
    socket.on('removeNotification', async function (sender, receiver) {
        let sql = `UPDATE messages SET notification = '0' WHERE (sender = ? and receiver = ?);`;
        db.query(
            sql,
            [receiver, sender],
            await function (err, data) {
                if (err) throw err;
            },
        );
        socket.emit('removeNotification', sender, receiver);
    });

    //Xu ly gui message gui tu client
    socket.on('sendMessage', async function (msgObj) {
        msgObj.created_time = moment().format('YYYY/MM/DD HH:mm:ss');
        let sqlInsertMsg = `insert into messages(sender, receiver, created_time, message) values(?, ?, ?, ?)`;
        db.query(
            sqlInsertMsg,
            [msgObj.sender, msgObj.receiver, msgObj.created_time, msgObj.message],
            await function (err, data) {
                if (err) throw err;
            },
        );
        //Gui lai message cho toan bo nguoi dung dang online
        socket.emit('sendMessage', msgObj);
        socket.to(msgObj.receiver).emit('receiveMessage', msgObj);
    });

    //Xu ly tim kiem nguoi dung
    socket.on('searchUser', async function (seeker, userSearch) {
        // console.log(seeker + ',' + userSearch);
        let sql = `
        select username
        from users
        where username <> ? and (username  in(  
            select friend_request
            from friends
            where friend_accept = ? and friend_request like ? and isAccept = 1
        ) or username  in (
            select friend_accept
            from friends
            where friend_request = ? and friend_accept like ? and isAccept = 1
        ));
        `;
        db.query(
            sql,
            [seeker, seeker, '%' + userSearch + '%', seeker, '%' + userSearch + '%'],
            await function (err, data) {
                if (err) throw err;
                // console.log(data);
                socket.emit('showUser', data);
                socket.emit('searchUser', data);
            },
        );
    });

    socket.on('searchAddConversation', async function (seeker, userSearch) {
        let sql = `
        select username
        from users
        where username like ? and username <> ? and (username not in(  
            select friend_request
            from friends
            where friend_accept = ?
        ) and username not in (
            select friend_accept
            from friends
            where friend_request = ?
        ));
        `;
        db.query(
            sql,
            ['%' + userSearch + '%', seeker, seeker, seeker],
            await function (err, data) {
                if (err) throw err;
                // console.log(data);
                socket.emit('loadAddFriendPage', data);
            },
        );
    });

    //Xu ly su kien go du lieu
    socket.on('typingMsg', function (Obj) {
        socket.to(Obj.receiver).emit('typingMsg', Obj);
    });
    socket.on('stopTyping', function (Obj) {
        socket.to(Obj.receiver).emit('stopTyping', Obj);
    });
});

server.listen(port, async function () {
    console.log('Server running at port ' + port);
});
