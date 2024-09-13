const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const mysql = require('mysql');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Vajl0nchjmen@',
    database: 'chatapp',
});
//--------------------Function Handle--------------------------
function hash(data) {
    let hash = crypto.createHash('sha512').update(data).digest('hex');
    return hash;
}
function addUser(username, hashPassword) {
    let sqlInsertUser = `insert into users(username, password) values(?, ?)`;
    db.query(sqlInsertUser, [username, hashPassword], function (error, result) {
        if (error) throw error;
    });
}
function checkSession(req, res, next) {
    if (req.session && req.session.username) {
        // Session tồn tại
        next(); // Tiếp tục xử lý route
    } else {
        // Session không tồn tại
        res.redirect('/');
    }
}

module.exports = {
    hash,
    addUser,
    checkSession,
};
