const mysql = require('mysql');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Vajl0nchjmen@',
    database: 'chatapp',
});
const util = require('../controllers/util');
//------------------------------Handler--------------------------------------------

const loginHandler = (req, res) => {
    let user = req.body.user;
    let pass = req.body.pass;
    let sql = `select username, password from users where username=?`;
    db.query(sql, user, function (err, data) {
        if (err) throw err;
        if (data.length == 0) {
            req.flash('error', 'Tài khoản hoặc mật khẩu không chính xác');
            res.redirect('/');
        } else if (data.length > 0) {
            let hashPassword = util.hash(pass);
            if (hashPassword == data[0].password) {
                req.session.username = user;
                res.redirect('/chat');
            } else {
                req.flash('error', 'Tài khoản hoặc mật khẩu không chính xác');
                res.redirect('/');
            }
        }
    });
};

const registerHandler = (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    let passwordCheck = req.body.passwordCheck;
    if (password !== passwordCheck) {
        req.flash('error', 'Mật khẩu không trùng khớp');
        res.redirect('/register');
    } else {
        let sql = `select username, password from users where username=?`;
        db.query(sql, username, function (err, data) {
            if (err) throw err;
            if (data.length == 0) {
                let hashPassword = util.hash(password);
                util.addUser(username, hashPassword);
                res.redirect('/');
            } else if (data.length > 0) {
                req.flash('error', 'Tài khoản đã tồn tại');
                res.redirect('/register');
            }
        });
    }
};

const logoutHandler = (req, res) => {
    let user = req.session.username;
    req.session.destroy();
    res.redirect('/');
};

module.exports = {
    loginHandler,
    registerHandler,
    logoutHandler,
};
