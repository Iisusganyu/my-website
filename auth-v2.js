// auth-v2.js - исправленная версия с работой через сервер (ПРАВИЛЬНЫЕ ПУТИ)
document.addEventListener('DOMContentLoaded', function () {
    console.log('Auth system initialized (SERVER VERSION - API PATHS)');

    // Инициализация системы пользователей
    initializeUsers();

    // Проверяем авторизацию сразу
    checkLoggedIn();

    // Настройка переключения вкладок
    if (document.querySelector('.auth-page')) {
        setupAuthTabs();
        setupFormValidation();
        setupFormHandlers();
    }
});

// Инициализация хранилища пользователей
function initializeUsers() {
    if (!localStorage.getItem('currentUser')) {
        localStorage.setItem('currentUser', JSON.stringify(null));
    }

    // Удаляем старый users из localStorage если он есть
    if (localStorage.getItem('users')) {
        console.log('Removing old users from localStorage');
        localStorage.removeItem('users');
    }
}

// Настройка переключения вкладок
function setupAuthTabs() {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');

    if (tabs.length === 0) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const tabName = this.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            forms.forEach(f => f.classList.remove('active'));

            this.classList.add('active');
            const form = document.getElementById(`${tabName}Form`);
            if (form) {
                form.classList.add('active');
            }

            clearErrors();
        });
    });
}

// Настройка валидации форм
function setupFormValidation() {
    // Валидация пароля при регистрации
    const registerPassword = document.getElementById('registerPassword');
    if (registerPassword) {
        registerPassword.addEventListener('input', function () {
            validatePassword(this.value);
        });
    }

    // Валидация подтверждения пароля
    const confirmPassword = document.getElementById('confirmPassword');
    if (confirmPassword) {
        confirmPassword.addEventListener('input', function () {
            validatePasswordMatch();
        });
    }
}

// Валидация пароля
function validatePassword(password) {
    const lengthCheck = document.getElementById('lengthCheck');
    const letterCheck = document.getElementById('letterCheck');
    const numberCheck = document.getElementById('numberCheck');

    if (!lengthCheck || !letterCheck || !numberCheck) return;

    // Проверка длины
    if (password.length >= 8) {
        lengthCheck.style.color = '#4CAF50';
        lengthCheck.innerHTML = '✓ Минимум 8 символов';
    } else {
        lengthCheck.style.color = '#ff4444';
        lengthCheck.innerHTML = 'Минимум 8 символов';
    }

    // Проверка букв
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
        letterCheck.style.color = '#4CAF50';
        letterCheck.innerHTML = '✓ Заглавная и строчная буквы';
    } else {
        letterCheck.style.color = '#ff4444';
        letterCheck.innerHTML = 'Заглавная и строчная буквы';
    }

    // Проверка цифр
    if (/\d/.test(password)) {
        numberCheck.style.color = '#4CAF50';
        numberCheck.innerHTML = '✓ Хотя бы одна цифра';
    } else {
        numberCheck.style.color = '#ff4444';
        numberCheck.innerHTML = 'Хотя бы одна цифра';
    }
}

// Проверка совпадения паролей
function validatePasswordMatch() {
    const password = document.getElementById('registerPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const errorElement = document.getElementById('confirmPasswordError');

    if (!errorElement) return true;

    if (password !== confirmPassword) {
        errorElement.textContent = 'Пароли не совпадают';
        return false;
    } else {
        errorElement.textContent = '';
        return true;
    }
}

// Настройка обработчиков форм
function setupFormHandlers() {
    // Форма входа
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            loginUser();
        });
    }

    // Форма регистрации
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function (e) {
            e.preventDefault();
            registerUser();
        });
    }
}

// Очистка ошибки
function clearErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(el => {
        el.textContent = '';
    });
}

// РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЯ - ОТПРАВКА НА СЕРВЕР (API ПУТЬ)
async function registerUser() {
    console.log('=== РЕГИСТРАЦИЯ: Отправка на api/register.php ===');

    const username = document.getElementById('registerUsername')?.value.trim();
    const email = document.getElementById('registerEmail')?.value.trim();
    const password = document.getElementById('registerPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const termsAgree = document.getElementById('termsAgree')?.checked;

    // Очистка ошибок
    clearErrors();

    // Валидация
    let isValid = true;

    if (!username || username.length < 3) {
        document.getElementById('registerUsernameError').textContent = 'Имя должно содержать минимум 3 символа';
        isValid = false;
    }

    if (!validateEmail(email)) {
        document.getElementById('registerEmailError').textContent = 'Введите корректный email';
        isValid = false;
    }

    if (!password || password.length < 8) {
        document.getElementById('registerPasswordError').textContent = 'Пароль должен содержать минимум 8 символов';
        isValid = false;
    }

    if (password !== confirmPassword) {
        document.getElementById('confirmPasswordError').textContent = 'Пароли не совпадают';
        isValid = false;
    }

    if (!termsAgree) {
        alert('Необходимо согласиться с условиями использования');
        isValid = false;
    }

    if (!isValid) {
        console.log('Валидация не пройдена');
        return;
    }

    // Показываем индикатор загрузки
    const submitBtn = document.querySelector('#registerForm button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Регистрация...';
    submitBtn.disabled = true;

    try {
        console.log('Отправка данных на api/register.php:', { username, email });

        // ОТПРАВЛЯЕМ ЗАПРОС НА api/register.php
        const response = await fetch('api/register.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password
            })
        });

        const result = await response.json();
        console.log('Ответ от сервера:', result);

        if (result.success) {
            console.log('Регистрация успешна, пользователь ID:', result.user.id);

            // Сохраняем пользователя в localStorage для фронтенда
            const userForSession = {
                id: result.user.id,
                username: result.user.username,
                email: result.user.email
            };

            localStorage.setItem('currentUser', JSON.stringify(userForSession));

            // ОЧИЩАЕМ гостевую корзину
            clearGuestCart();

            // СИНХРОНИЗИРУЕМ КОРЗИНУ - ДОБАВЬТЕ ЭТОТ КОД
            if (window.cartSystem) {
                console.log('Синхронизируем корзину для нового пользователя...');
                window.cartSystem.userId = result.user.id;
                window.cartSystem.isGuest = false;
                window.cartSystem.cart = []; // Новая корзина для нового пользователя
                window.cartSystem.updateCartDisplay();
                window.cartSystem.updateProductButtons();
            }

            // Обновляем кнопку входа
            updateLoginButton(result.user.username);

            // Показываем уведомление
            showNotification('Регистрация успешна! Добро пожаловать, ' + result.user.username + '!');

            // Перенаправление на главную страницу
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            console.log('Ошибка от сервера:', result.error);
            // Показываем ошибку от сервера
            if (result.error.includes('имя') || result.error.includes('username')) {
                document.getElementById('registerUsernameError').textContent = result.error;
            } else if (result.error.includes('email') || result.error.includes('почта')) {
                document.getElementById('registerEmailError').textContent = result.error;
            } else {
                alert(result.error || 'Ошибка при регистрации');
            }
        }
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        alert('Ошибка соединения с сервером. Проверьте консоль для деталей.');
    } finally {
        // Восстанавливаем кнопку
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// ВХОД ПОЛЬЗОВАТЕЛЯ - ОТПРАВКА НА СЕРВЕР (API ПУТЬ)
async function loginUser() {
    console.log('=== ВХОД: Отправка на api/login.php ===');

    const username = document.getElementById('loginUsername')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    const rememberMe = document.getElementById('rememberMe')?.checked;

    // Очистка ошибок
    clearErrors();

    // Валидация
    if (!username || !password) {
        document.getElementById('loginUsernameError').textContent = 'Заполните все поля';
        return;
    }

    // Показываем индикатор загрузки
    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Вход...';
    submitBtn.disabled = true;

    try {
        console.log('Отправка данных на api/login.php:', { username });

        // ОТПРАВЛЯЕМ ЗАПРОС НА api/login.php
        const response = await fetch('api/login.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const result = await response.json();
        console.log('Ответ от сервера:', result);

        if (result.success) {
            console.log('Вход успешен, пользователь:', result.user.username);

            // Сохраняем данные пользователя
            const userForSession = {
                id: result.user.id,
                username: result.user.username,
                email: result.user.email
            };

            localStorage.setItem('currentUser', JSON.stringify(userForSession));

            // Если "Запомнить меня"
            if (rememberMe) {
                sessionStorage.setItem('rememberedUser', username);
            }

            // ОЧИЩАЕМ гостевую корзину при входе
            clearGuestCart();

            // СИНХРОНИЗИРУЕМ КОРЗИНУ - ДОБАВЬТЕ ЭТОТ КОД
            if (window.cartSystem) {
                console.log('Синхронизируем корзину пользователя...');
                window.cartSystem.userId = result.user.id;
                window.cartSystem.isGuest = false;

                // Загружаем корзину пользователя из БД
                try {
                    await window.cartSystem.loadUserCart();
                    window.cartSystem.updateCartDisplay();
                    window.cartSystem.updateProductButtons();
                    console.log('Корзина синхронизирована');
                } catch (cartError) {
                    console.error('Ошибка синхронизации корзины:', cartError);
                }
            }

            // Обновляем кнопку входа
            updateLoginButton(result.user.username);

            // Показываем уведомление
            showNotification('Вход выполнен! Добро пожаловать, ' + result.user.username + '!');

            // Перенаправление на главную страницу
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            console.log('Ошибка входа:', result.error);
            document.getElementById('loginUsernameError').textContent = result.error || 'Неверное имя пользователя или пароль';
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        alert('Ошибка соединения с сервером');
    } finally {
        // Восстанавливаем кнопку
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Очистка гостевой корзины
function clearGuestCart() {
    localStorage.removeItem('guest_cart');
    localStorage.removeItem('guest_promo');
    console.log('Гостевая корзина очищена');
}

// Функция для проверки авторизации
// Функция для проверки авторизации
function checkLoggedIn() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (currentUser && currentUser.id) {
        console.log('Пользователь авторизован:', currentUser.username, 'ID:', currentUser.id);

        // Проверяем, существует ли пользователь в БД
        fetch('api/check-user.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUser.id
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateLoginButton(currentUser.username);
                } else {
                    console.log('Пользователь не найден в БД, очищаем localStorage');
                    localStorage.removeItem('currentUser');
                    updateLoginButton(null);
                }
            })
            .catch(error => {
                console.error('Ошибка проверки пользователя:', error);
            });
    } else {
        console.log('Пользователь не авторизован');
        updateLoginButton(null);
    }
}

// Функция для обновления кнопки входа
function updateLoginButton(username) {
    const loginButtons = document.querySelectorAll('.login-btn');

    console.log('Обновляем кнопку входа. Пользователь:', username);

    loginButtons.forEach(btn => {
        if (username) {
            btn.textContent = username;
            btn.style.backgroundColor = '';
            btn.style.color = '';

            if (btn.tagName === 'A') {
                btn.removeAttribute('href');
            }

            btn.classList.add('user-logged-in');

            btn.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                showUserMenu(btn, username);
            };
        } else {
            btn.textContent = 'Вход';
            btn.style.backgroundColor = '';
            btn.style.color = '';
            btn.classList.remove('user-logged-in');

            if (btn.tagName === 'A') {
                btn.href = 'auth.html';
            }

            btn.onclick = null;
        }
    });
}

// Показать меню пользователя
function showUserMenu(button, username) {
    const existingMenu = document.querySelector('.user-menu');
    if (existingMenu) {
        existingMenu.remove();
        return;
    }

    const menu = document.createElement('div');
    menu.className = 'user-menu';
    menu.innerHTML = `
        <div class="user-menu-simple">
            <div class="user-menu-username">${username}</div>
            <button class="user-menu-logout-btn">Выйти из аккаунта</button>
        </div>
    `;

    const rect = button.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = (rect.bottom + 5) + 'px';
    menu.style.right = (window.innerWidth - rect.right - 10) + 'px';
    menu.style.zIndex = '1000';

    document.body.appendChild(menu);

    menu.querySelector('.user-menu-logout-btn').addEventListener('click', function (e) {
        e.stopPropagation();
        logoutUser();
    });

    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target) && e.target !== button) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 10);
}

// ВЫХОД ПОЛЬЗОВАТЕЛЯ (API ПУТЬ)
async function logoutUser() {
    console.log('=== ВЫХОД ===');

    try {
        // Сохраняем корзину если есть
        if (window.cartSystem && typeof window.cartSystem.saveCart === 'function') {
            await window.cartSystem.saveCart();
        }

        // Удаляем меню если открыто
        const existingMenu = document.querySelector('.user-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        // ОТПРАВЛЯЕМ ЗАПРОС НА api/logout.php
        const response = await fetch('api/logout.php');
        const result = await response.json();

        if (result.success) {
            // Очищаем данные пользователя
            localStorage.removeItem('currentUser');
            sessionStorage.removeItem('rememberedUser');

            // СБРАСЫВАЕМ КОРЗИНУ СИСТЕМЫ
            if (window.cartSystem) {
                window.cartSystem.userId = null;
                window.cartSystem.isGuest = true;
                window.cartSystem.currentUser = null;
                window.cartSystem.cart = [];

                // Загружаем гостевую корзину
                window.cartSystem.loadGuestCart();

                window.cartSystem.updateCartDisplay();
                window.cartSystem.updateProductButtons();
            }

            // Обновляем кнопку
            updateLoginButton(null);

            // Показываем уведомление
            showNotification('Вы вышли из аккаунта');

            // Перенаправляем
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        }
    } catch (error) {
        console.error('Ошибка выхода:', error);
        // Fallback
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('rememberedUser');

        if (window.cartSystem) {
            window.cartSystem.userId = null;
            window.cartSystem.isGuest = true;
            window.cartSystem.currentUser = null;
            window.cartSystem.cart = [];
            window.cartSystem.updateCartDisplay();
            window.cartSystem.updateProductButtons();
        }

        updateLoginButton(null);
        showNotification('Вы вышли из аккаунта');
    }
}

// Валидация email
function validateEmail(email) {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Показать уведомление
function showNotification(message) {
    if (window.cartSystem && typeof window.cartSystem.showNotification === 'function') {
        window.cartSystem.showNotification(message);
    } else {
        alert(message);
    }
}

// Экспорт функций
window.authSystem = {
    login: loginUser,
    register: registerUser,
    logout: logoutUser,
    isLoggedIn: () => {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        return user && user.username;
    },
    getCurrentUser: () => JSON.parse(localStorage.getItem('currentUser')),
    checkLoggedIn: checkLoggedIn,
    updateLoginButton: updateLoginButton,
    clearGuestCart: clearGuestCart
};