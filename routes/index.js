const express = require('express');
const router = express.Router();

const util = require('../controllers/util');
const { loginHandler, registerHandler, logoutHandler } = require('../controllers/handler');
//------------------------------Route--------------------------------------------

//Hien thi trang web chinh khi truy cap
router.get('/', function (req, res) {
    const notify = req.flash('error');
    res.render('index', { notify: notify });
});

router.get('/chat', util.checkSession, function (req, res) {
    let user = req.session.username;
    res.render('chat', { user: user });
});

router.get('/register', function (req, res) {
    const notify = req.flash('error');
    res.render('register', { notify: notify });
});

router.post('/', loginHandler);

router.post('/register', registerHandler);

router.get('/logout', logoutHandler);

module.exports = router;
