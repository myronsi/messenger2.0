const BASE_URL = "http://127.0.0.1:8000";
let currentChatId = null;

// Проверка авторизации при загрузке страницы
window.onload = () => {
    const savedUsername = localStorage.getItem("username");

    if (savedUsername) {
        console.log("Пользователь уже авторизован:", savedUsername);
        initChats(savedUsername);
    } else {
        console.log("Требуется авторизация");
        document.getElementById("login-section").style.display = "block";
        document.getElementById("register-section").style.display = "block";
        document.getElementById("chats-section").style.display = "none";
        document.getElementById("chat-section").style.display = "none";
    }
};

// Регистрация
document.getElementById("register-btn").onclick = async () => {
    const username = document.getElementById("register-username").value;
    const password = document.getElementById("register-password").value;
    const response = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const message = await response.json();
    document.getElementById("register-message").textContent = message.message || message.detail;
};

// Авторизация
document.getElementById("login-btn").onclick = async () => {
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const message = await response.json();
    if (response.ok) {
        document.getElementById("login-message").textContent = "Успешный вход!";
        localStorage.setItem("username", username); // Сохраняем пользователя
        initChats(username);
    } else {
        document.getElementById("login-message").textContent = message.detail;
    }
};

// Логаут
document.getElementById("logout-btn").onclick = () => {
    localStorage.removeItem("username"); // Удаляем данные пользователя
    document.getElementById("login-section").style.display = "block"; // Показываем экран логина
    document.getElementById("register-section").style.display = "block";
    document.getElementById("chats-section").style.display = "none";
    document.getElementById("chat-section").style.display = "none";
};

// Инициализация чатов
async function initChats(username) {
    document.getElementById("login-section").style.display = "none";
    document.getElementById("register-section").style.display = "none";
    document.getElementById("chats-section").style.display = "block";

    const response = await fetch(`${BASE_URL}/chats/list/${username}`);
    const { chats } = await response.json();

    const chatsList = document.getElementById("chats-list");
    chatsList.innerHTML = ""; // Очистка списка
    if (Array.isArray(chats)) {
        chats.forEach(chat => {
            const chatItem = document.createElement("div");
            chatItem.className = "chat-item";
            chatItem.textContent = chat.name;
            chatItem.onclick = () => openChat(chat.id, chat.name, username);
            chatsList.appendChild(chatItem);
        });
    } else {
        console.error("Ошибка: chats не является массивом", chats);
    }

    document.getElementById("create-chat-btn").onclick = async () => {
        const targetUser = document.getElementById("chat-username").value;
        const response = await fetch(`${BASE_URL}/chats/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user1: username, user2: targetUser })
        });

        const message = await response.json();
        if (response.ok) {
            alert("Чат создан!");
            initChats(username);
        } else {
            alert(message.detail);
        }
    };
}

// Открытие чата
async function openChat(chatId, chatName, username) {
    let selectedMessageId = null; // Хранение ID выбранного сообщения

    // Показ контекстного меню
    const chatWindow = document.getElementById("chat-window");
    const menu = document.getElementById("context-menu");

    chatWindow.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        console.log("Контекстное меню вызвано");

        const messageElement = event.target.closest(".message");
        if (!messageElement) {
            console.log("Не найдено сообщение под курсором");
            return;
        }

        selectedMessageId = messageElement.dataset.messageId;
        console.log(`Выбрано сообщение с ID: ${selectedMessageId}`);

        // Позиционирование контекстного меню
        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;
        let x = event.clientX;
        let y = event.clientY;

        if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth;
        if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight;

        menu.style.top = `${y}px`;
        menu.style.left = `${x}px`;
        menu.classList.remove("hidden");
    });

    // Скрытие меню при клике вне его
    document.addEventListener("click", (event) => {
        if (!menu.contains(event.target)) {
            console.log("Клик вне контекстного меню, скрываем меню");
            menu.classList.add("hidden");
        }
    });

    // Обработка кнопки "Редактировать"
    document.getElementById("edit-btn").onclick = () => {
        if (!selectedMessageId) {
            alert("Сообщение не выбрано");
            return;
        }
        const contentElement = document.querySelector(`[data-message-id='${selectedMessageId}'] span`);
        editMessage(selectedMessageId, contentElement);
        menu.classList.add("hidden");
    };

    // Обработка кнопки "Удалить"
    document.getElementById("delete-btn").onclick = () => {
        if (!selectedMessageId) {
            alert("Сообщение не выбрано");
            return;
        }
        const messageElement = document.querySelector(`[data-message-id='${selectedMessageId}']`);
        deleteMessage(selectedMessageId, messageElement);
        menu.classList.add("hidden");
    };

    // Логика для отображения чата
    document.getElementById("back-to-chats-btn").onclick = () => {
        document.getElementById("chat-section").style.display = "none"; // Скрываем чат
        document.getElementById("chats-section").style.display = "block"; // Показываем список чатов
        currentChatId = null; // Сбрасываем текущий chatId
    };

    document.getElementById("chats-section").style.display = "none";
    document.getElementById("chat-section").style.display = "block";
    document.getElementById("chat-name").textContent = chatName;
    currentChatId = chatId;

    const response = await fetch(`${BASE_URL}/messages/history/${chatId}`);
    const { history } = await response.json();

    chatWindow.innerHTML = ""; // Очищаем окно чата
    history.forEach(msg => {
        const msgDiv = document.createElement("div");
        msgDiv.className = "message";
        msgDiv.dataset.messageId = msg.id; // Привязываем ID сообщения

        const content = document.createElement("span");
        content.textContent = `${msg.timestamp} - ${msg.sender}: ${msg.content}`;
        msgDiv.appendChild(content);

        chatWindow.appendChild(msgDiv);
    });

    // WebSocket для получения новых сообщений
    ws = new WebSocket(`ws://127.0.0.1:8000/ws/${username}`);
    ws.onopen = () => console.log("WebSocket подключён");
    ws.onmessage = (event) => {
        const msgDiv = document.createElement("div");
        msgDiv.className = "message";
        msgDiv.textContent = event.data;
        chatWindow.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    };
    ws.onerror = (error) => console.error("WebSocket ошибка:", error);
    ws.onclose = () => console.log("WebSocket отключён");

    // Отправка сообщений
    document.getElementById("send-btn").onclick = () => {
        const messageInput = document.getElementById("message-input");
        const message = `${currentChatId}:${messageInput.value}`;
        ws.send(message);
        console.log("Отправлено сообщение:", message);
        messageInput.value = "";
    };
    document.getElementById("back-to-chats-btn").onclick = () => {
        document.getElementById("chat-section").style.display = "none"; // Скрываем чат
        document.getElementById("chats-section").style.display = "block"; // Показываем список чатов
        currentChatId = null; // Сбрасываем текущий chatId
        ws.close();
    }; 
}

// Редактирование сообщения
async function editMessage(messageId, contentElement) {
    const newContent = prompt("Введите новое сообщение:", contentElement.textContent.split(": ")[1]);
    if (!newContent) return;

    try {
        const response = await fetch(`${BASE_URL}/messages/edit/${messageId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: newContent }),
        });

        if (response.ok) {
            alert("Сообщение обновлено!");
            contentElement.textContent = contentElement.textContent.split(": ")[0] + `: ${newContent}`;
        } else {
            const error = await response.json();
            console.error("Ошибка от сервера:", error);
            alert(`Ошибка: ${JSON.stringify(error)}`);
        }
    } catch (err) {
        console.error("Ошибка сети:", err);
        alert("Ошибка сети. Проверьте подключение к серверу.");
    }
}

// Удаление сообщения
async function deleteMessage(messageId, messageElement) {
    const confirmDelete = confirm("Вы уверены, что хотите удалить это сообщение?");
    if (!confirmDelete) return;

    const response = await fetch(`${BASE_URL}/messages/delete/${messageId}`, { method: "DELETE" });

    if (response.ok) {
        alert("Сообщение удалено!");
        messageElement.remove(); // Удаляем сообщение из DOM
    } else {
        const error = await response.json();
        alert("Ошибка: " + error.detail);
    }
}