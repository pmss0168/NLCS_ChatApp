//Socketio lang nghe o server port 3000
const socket = io('http://localhost:3000/chat');

let message = document.getElementById('messageInput');
let chatFrame = document.getElementById('chatFrame');
let chatInput = document.getElementById('chatInput');
// let currentTime = new Date().toLocaleDateString([], {
//     hour: '2-digit',
//     minute: '2-digit',
// });
const account = JSON.parse(sessionStorage.getItem('account').valueOf());
const currentUser = document.getElementById('currentUser');
let receiver = '';

//Kiểm tra user đã đăng nhập vào server hay chưa
socket.on('checkUser', function (status) {
    if (!status) {
        socket.emit('logoutUser', account.user);
        sessionStorage.removeItem('account');
        window.location = '/';
    }
});
setInterval(function () {
    socket.emit('checkUser', account.user);
}, 1000);

//Join vào phòng của chính user đó khi đăng nhập thành công
socket.emit('joinUserRoom', account.user);

//----------------------Chat--------------------------
//Xu ly ham gui tin nhan len cho toan bo moi nguoi
socket.on('sendMessage', function (msgObj) {
    if (sessionStorage.getItem('account') && receiver !== '') {
        renderMessage(msgObj);
    }
});
socket.on('receiveMessage', function (msgObj) {
    if (
        sessionStorage.getItem('account') &&
        receiver != '' &&
        receiver == msgObj.sender &&
        msgObj.receiver == account.user
    ) {
        renderMessage(msgObj);
    }
});

chatInput.addEventListener('submit', function (e) {
    e.preventDefault();
    let check = true;
    if (sessionStorage.getItem('account') === null || message.value.trim() === '') {
        check = false;
    }
    if (message.value && check && receiver !== '') {
        //Gui tin nhan len server lang nghe
        socket.emit('sendMessage', {
            message: message.value,
            sender: account.user,
            receiver: receiver,
        });
    }
    message.value = '';
});

socket.on('loadMessage', function (data) {
    $('#chatFrame').html('');
    data.forEach((element) => {
        renderMessage(element);
    });
});

//Ham render tin nhan
function renderMessage(msgObj) {
    //Them tin nhan vao chatFrame
    let chatCell = document.createElement('div');
    let div = document.createElement('div');
    let userChat = document.createElement('h5');
    let text = document.createElement('p');
    let time = document.createElement('p');
    if (msgObj.sender !== account.user) {
        chatCell.classList.add('chatContent', 'otherChat');
        userChat.innerText = msgObj.sender;
    } else {
        chatCell.classList.add('chatContent', 'mineChat');
        userChat.innerText = 'Bạn';
    }
    text.textContent = msgObj.message;
    time.classList.add('time');
    time.textContent = moment(msgObj.time).format('hh:mm A DD MMM YYYY');
    chatCell.appendChild(userChat);
    div.appendChild(text);
    div.classList.add('item');
    chatCell.appendChild(div);
    chatCell.appendChild(time);
    chatFrame.appendChild(chatCell);
    chatFrame.scrollTop = chatFrame.scrollHeight;
}
//Ham lay nguoi nhan tin nhan
function getReceiver(data) {
    receiver = data;
    if (receiver == 'all') {
        currentUser.textContent = 'Tất cả';
    } else if (receiver != 'all') {
        currentUser.textContent = receiver;
    }
    socket.emit('loadMessage', receiver, account.user);
}

//Hien thi thong tin nguoi dung khi dang nhap onl tren server
socket.on('showUser', function (userOnl) {
    let user = document.getElementById('userName');
    $('#userName').html('');
    // user.innerHTML += `
    // <button value="all" class="userItem" onclick='getReceiver(this.value)'>
    //     <img src="images/home.png" alt="" style="width: 50px; height: 50px" />
    //     <p style='min-width=60px; test-align=center'>Tất cả</p>
    // </button>
    // `;
    for (let e of userOnl) {
        if (e !== account.user) {
            let divUserName = `
            <button value="${e}" class="userItem" onclick='getReceiver(this.value)'>
                <img src="images/user.png" alt="" style="width: 50px; height: 50px" />
                <p style='min-width=60px; test-align=center'>${e}</p>
            </button>
            `;
            user.innerHTML += divUserName;
        }
    }
    user.scrollTop = user.scrollHeight;
});

//----------------------Typing--------------------------
socket.on('typingMsg', function (Obj) {
    if (receiver != '' && receiver == Obj.sender && Obj.receiver == account.user) {
        let typing = document.getElementById('typing');
        typing.style.display = 'block';
        typing.textContent = Obj.sender + ' is typing...';
    }
});
message.addEventListener('focus', function () {
    socket.emit('typingMsg', { sender: account.user, receiver: receiver });
});
socket.on('stopTyping', function () {
    let typing = document.getElementById('typing');
    typing.style.display = 'none';
});
message.addEventListener('blur', function () {
    socket.emit('stopTyping');
});

//----------------------Logout--------------------------

// let logoutBtn = document.getElementById('logoutBtn');
// logoutBtn.addEventListener('click', function () {
//     socket.emit('logoutUser', account.user);
//     sessionStorage.removeItem('account');
//     window.location = '/';
// });

window.addEventListener('unload', function () {
    if (this.sessionStorage.getItem('account')) {
        socket.emit('logoutUser', account.user);
        sessionStorage.removeItem('account');
    }
});
