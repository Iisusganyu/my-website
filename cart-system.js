// cart-system.js - РАБОЧАЯ ВЕРСИЯ с правильной синхронизацией с БД
class CartSystem {
    constructor() {
        this.currentUser = null;
        this.cartKeyPrefix = 'cart_';
        this.promoKeyPrefix = 'promo_';
        this.guestCartKey = 'guest_cart';
        this.guestPromoKey = 'guest_promo';
        this.cart = [];
        this.activePromo = null;
        this._quantityHandlersSetup = false;
    }

    // Инициализация системы
    init() {
        console.log('Cart system initialized (DB SYNC ENABLED)');

        // Получаем текущего пользователя
        this.getCurrentUser();

        // Загружаем корзину текущего пользователя
        this.loadCart();

        // Инициализируем промокоды
        this.initializePromoCodes();

        // Настраиваем обработчики
        this.setupAddToCartButtons();
        this.setupPromoCodeHandlers();
        this.setupCartItemButtons();
        this.setupProductQuantityControls();

        // Обновляем отображение
        this.updateCartDisplay();

        // Обновляем кнопки товаров
        this.updateProductButtons();

        // Слушаем события изменения авторизации
        window.addEventListener('storage', (e) => {
            if (e.key === 'currentUser') {
                this.handleUserChange();
            }
        });

        // Проверяем авторизацию каждые 5 секунд
        setInterval(() => this.checkUserChange(), 5000);
    }

    // Проверка изменения пользователя
    checkUserChange() {
        const storedUser = localStorage.getItem('currentUser');
        const currentUserStr = this.currentUser ? JSON.stringify(this.currentUser) : 'null';

        if (storedUser !== currentUserStr) {
            console.log('User change detected via interval check');
            this.handleUserChange();
        }
    }

    // Получение текущего пользователя
    getCurrentUser() {
        const userData = localStorage.getItem('currentUser');
        if (userData && userData !== 'null') {
            try {
                this.currentUser = JSON.parse(userData);
                console.log('Current user:', this.currentUser?.username, 'ID:', this.currentUser?.id);
            } catch (e) {
                this.currentUser = null;
                console.error('Error parsing currentUser data:', e);
            }
        } else {
            this.currentUser = null;
            console.log('No user logged in (guest)');
        }
    }

    // Получение ключа для корзины
    getCartKey() {
        if (this.currentUser?.username) {
            return `${this.cartKeyPrefix}${this.currentUser.username}`;
        }
        return this.guestCartKey;
    }

    // Получение ключа для промокода
    getPromoKey() {
        if (this.currentUser?.username) {
            return `${this.promoKeyPrefix}${this.currentUser.username}`;
        }
        return this.guestPromoKey;
    }

    // Загрузка корзины
    async loadCart() {
        const cartKey = this.getCartKey();
        const cartData = localStorage.getItem(cartKey);
        const promoData = localStorage.getItem(this.getPromoKey());

        // Если в localStorage есть данные - загружаем
        if (cartData) {
            try {
                this.cart = JSON.parse(cartData);
                console.log('Cart loaded from localStorage:', cartKey, this.cart);
            } catch (e) {
                console.error('Ошибка парсинга корзины из localStorage:', e);
                this.cart = [];
                localStorage.removeItem(cartKey); // Удаляем поврежденные данные
            }
        } else {
            this.cart = [];
            console.log('Новая корзина создана для:', cartKey);
        }

        // Загружаем промокод
        if (promoData) {
            try {
                this.activePromo = JSON.parse(promoData);
                console.log('Promo loaded:', this.activePromo?.code);
            } catch (e) {
                console.error('Ошибка парсинга промокода:', e);
                this.activePromo = null;
                localStorage.removeItem(this.getPromoKey());
            }
        }

        // Если пользователь авторизован, загружаем из БД
        if (this.currentUser?.id) {
            await this.loadFromDatabase();
        }
    }

    // Загрузка корзины из базы данных
    async loadFromDatabase() {
        if (!this.currentUser?.id) {
            console.log('Пользователь не авторизован, пропускаем загрузку из БД');
            return;
        }

        console.log('Загрузка корзины из БД для user_id:', this.currentUser.id);

        try {
            const response = await fetch('api/cart.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'get',
                    user_id: this.currentUser.id
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Ответ от БД:', result);

            if (result.success && Array.isArray(result.cart)) {
                if (result.cart.length > 0) {
                    console.log('Товаров в БД:', result.cart.length);

                    // Преобразуем данные из БД
                    const dbCart = result.cart.map(item => ({
                        id: this.generateProductIdFromMovieId(item.movie_id),
                        title: item.title || `Фильм ${item.movie_id}`,
                        price: parseFloat(item.price) || 499,
                        image: item.image_url || this.getDefaultImageByMovieId(item.movie_id),
                        quantity: parseInt(item.quantity) || 1,
                        movie_id: item.movie_id,
                        db_id: item.id
                    }));

                    console.log('Преобразованная корзина из БД:', dbCart);

                    // Заменяем локальную корзину данными из БД
                    this.cart = dbCart;
                    console.log('Корзина загружена из БД');
                } else {
                    console.log('В БД пустая корзина');
                    this.cart = [];
                }

                // Сохраняем в localStorage
                localStorage.setItem(this.getCartKey(), JSON.stringify(this.cart));
                console.log('Корзина сохранена в localStorage');

                // Обновляем отображение
                this.updateCartDisplay();
                this.updateProductButtons();
            } else {
                console.warn('Некорректный ответ от БД:', result);
            }
        } catch (error) {
            console.warn('Ошибка загрузки из БД, используем localStorage:', error.message);
        }
    }

    // Объединение корзин
    mergeCarts(dbCart) {
        // Если в БД есть товары, используем их
        if (dbCart.length > 0) {
            this.cart = dbCart;
            console.log('Cart merged with DB data');
        }
        // Сохраняем объединенную корзину
        this.saveCart();
    }

    // Генерация ID товара из movie_id
    generateProductIdFromMovieId(movieId) {
        const mapping = {
            1: 'hunger-games',
            2: 'menu',
            3: 'three-daughters',
            4: 'devil-wears-prada',
            5: 'scream',
            6: 'sloane',
            7: 'interstellar',
            8: 'bohemian-rhapsody',
            9: 'cruella',
            10: 'house-of-gucci',
            11: 'eternity',
            12: 'agatha-all',
            13: 'divergent',
            14: 'world-war-z',
            15: '7-sisters',
            16: 'doctor-strange',
            17: 'terrifier-3',
            18: 'five-nights'
        };

        return mapping[movieId] || `movie-${movieId}`;
    }

    // Получение изображения по movie_id
    getDefaultImageByMovieId(movieId) {
        if (movieId >= 1 && movieId <= 18) {
            return `images/poster${movieId}.jpg`;
        }
        return 'images/poster1.jpg';
    }

    // Сохранение корзины
    saveCart() {
        const cartKey = this.getCartKey();
        localStorage.setItem(cartKey, JSON.stringify(this.cart));

        // Сохраняем активный промокод
        const promoKey = this.getPromoKey();
        if (this.activePromo) {
            localStorage.setItem(promoKey, JSON.stringify(this.activePromo));
        } else {
            localStorage.removeItem(promoKey);
        }

        console.log('Корзина сохранена в localStorage:', cartKey);
        console.log('Товаров в корзине:', this.cart.length);
        this.updateCartDisplay();

        // Если пользователь авторизован, синхронизируем с БД
        if (this.currentUser?.id) {
            console.log('Начинаем синхронизацию с БД...');
            this.syncCartToDatabase();
        } else {
            console.log('Пользователь не авторизован, синхронизация с БД не требуется');
        }
    }

    // Синхронизация корзины с БД
    async syncCartToDatabase() {
        if (!this.currentUser?.id) return;

        console.log('Синхронизация всей корзины с БД для user:', this.currentUser.id);
        console.log('Товаров в корзине для синхронизации:', this.cart.length);

        // Если корзина пуста - очищаем в БД
        if (this.cart.length === 0) {
            console.log('Корзина пуста, очищаем в БД');
            await this.clearCartInDatabase();
            return;
        }

        try {
            // Обновляем каждый товар
            for (const item of this.cart) {
                const movieId = this.extractMovieId(item.id);
                if (movieId) {
                    console.log('Синхронизация товара:', {
                        title: item.title,
                        movieId: movieId,
                        quantity: item.quantity
                    });
                    await this.syncItemToDatabase(item.id, movieId, item.quantity);
                }
            }

            console.log('Вся корзина синхронизирована с БД');
        } catch (error) {
            console.error('Ошибка синхронизации корзины с БД:', error);
        }
    }

    // Очистка корзины в БД
    async clearCartInDatabase() {
        if (!this.currentUser?.id) return;

        try {
            const response = await fetch('api/cart.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'clear',
                    user_id: this.currentUser.id
                })
            });

            const result = await response.json();
            if (!result.success) {
                console.warn('Failed to clear cart in DB:', result.error);
            }
        } catch (error) {
            console.error('Error clearing cart in DB:', error);
        }
    }

    // Извлечение movie_id из product_id - ИСПРАВЛЕННАЯ ВЕРСИЯ
    extractMovieId(productId) {
        console.log('extractMovieId вызван с:', productId);

        if (!productId) {
            console.log('productId пустой, возвращаем null');
            return null;
        }

        // Если productId уже число
        if (!isNaN(productId) && parseInt(productId) >= 1 && parseInt(productId) <= 18) {
            console.log('productId уже число:', parseInt(productId));
            return parseInt(productId);
        }

        // Полный маппинг всех возможных productId
        const mapping = {
            // Правильные ID из data-product-id
            'hunger-games': 1,
            'menu': 2,
            'three-daughters': 3,
            'devil-wears-prada': 4,
            'scream': 5,
            'sloane': 6,
            'interstellar': 7,
            'bohemian-rhapsody': 8,
            'cruella': 9,
            'house-of-gucci': 10,
            'eternity': 11,
            'eternals': 11,
            'agatha-all': 12,
            'divergent': 13,
            'world-war-z': 14,
            '7-sisters': 15,
            'doctor-strange': 16,
            'terrifier-3': 17,
            'five-nights': 18,

            // Альтернативные написания (на всякий случай)
            'its-all-agatha': 12,
            'miss-sloane': 6,
            'doctor-strange-multiverse-of-madness': 16,
            'seven-sisters': 15,
            'five-nights-at-freddys': 18,
            'world-war-z': 14,

            // Для отладки - прямые соответствия с названиями страниц
            'product1': 1,
            'product2': 2,
            'product3': 3,
            'product4': 4,
            'product5': 5,
            'product6': 6,
            'product7': 7,
            'product8': 8,
            'product9': 9,
            'product10': 10,
            'product11': 11,
            'product12': 12,
            'product13': 13,
            'product14': 14,
            'product15': 15,
            'product16': 16,
            'product17': 17,
            'product18': 18
        };

        // Приводим к нижнему регистру для надежности
        const lowerId = productId.toLowerCase().trim();
        console.log('Ищем в маппинге:', lowerId);

        // Проверяем прямое соответствие
        if (mapping[lowerId] !== undefined) {
            console.log('Найдено в маппинге:', lowerId, '→', mapping[lowerId]);
            return mapping[lowerId];
        }

        // Пробуем извлечь число из строки (например, "product-1" → 1)
        const match = lowerId.match(/product[-_]?(\d+)/) || lowerId.match(/(\d+)/);
        if (match && match[1]) {
            const num = parseInt(match[1]);
            if (num >= 1 && num <= 18) {
                console.log('Извлечено число из строки:', num);
                return num;
            }
        }

        console.error('Не найдено соответствие для:', productId);
        console.error('Возвращаем null');
        return null;
    }

    // Синхронизация товара с БД
    async syncItemToDatabase(productId, movieId, quantity) {
        if (!this.currentUser?.id || !movieId) {
            console.log('Не могу синхронизировать: нет user_id или movie_id');
            return;
        }

        try {
            // Всегда используем 'update' действие, оно само добавит или обновит
            const response = await fetch('api/cart.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'update', // ВСЕГДА update, а не add/remove
                    user_id: this.currentUser.id,
                    movie_id: movieId,
                    quantity: quantity
                })
            });

            const result = await response.json();

            if (!result.success) {
                console.warn('Не удалось синхронизировать товар с БД:', result.error);
            } else {
                console.log('Товар синхронизирован с БД');
            }
        } catch (error) {
            console.error('Ошибка сети при синхронизации:', error);
        }
    }

    // Обработка изменения пользователя
    async handleUserChange() {
        console.log('User change detected');

        // Сохраняем текущую корзину перед сменой пользователя
        this.saveCart();

        // Получаем нового пользователя
        this.getCurrentUser();

        // Загружаем корзину нового пользователя
        await this.loadCart();

        // Обновляем отображение
        this.updateCartDisplay();
        this.updateProductButtons();
        this.setupProductQuantityControls();

        console.log('Switched to cart for:', this.currentUser?.username || 'guest');
    }

    // Очистка гостевой корзины
    clearGuestCart() {
        localStorage.removeItem(this.guestCartKey);
        localStorage.removeItem(this.guestPromoKey);

        // Если сейчас гость, очищаем текущую корзину
        if (!this.currentUser && this.cart) {
            this.cart = [];
            this.activePromo = null;
            this.saveCart();
        }

        console.log('Guest cart cleared');
    }

    // Инициализация промокодов
    initializePromoCodes() {
        this.PROMO_CODES = {
            'OSCAR2025': {
                discount: 0.2,
                name: 'Скидка 20% по промокоду OSCAR2025'
            },
            'MOVIE10': {
                discount: 0.1,
                name: 'Скидка 10% по промокоду MOVIE10'
            }
        };
    }

    // Настройка обработчиков для кнопок "Добавить в корзину"
    setupAddToCartButtons() {
        document.addEventListener('click', async (e) => {
            const button = e.target.closest('.buy-btn');

            if (button && !button.classList.contains('in-cart')) {
                e.preventDefault();
                e.stopPropagation();

                // Блокируем кнопку на время добавления
                button.disabled = true;
                const originalText = button.textContent;
                button.textContent = 'Добавляем...';

                try {
                    const product = this.getProductData(button);

                    if (product) {
                        await this.addToCart(product);
                        this.showNotification('Товар добавлен в корзину!');
                    } else {
                        console.error('Failed to retrieve product data.');
                        this.showNotification('Ошибка: Не удалось получить данные о товаре.', 'error');
                    }
                } catch (error) {
                    console.error('Error during addToCart process:', error);
                    this.showNotification('Критическая ошибка добавления товара в корзину', 'error');
                } finally {
                    // Разблокируем кнопку
                    button.disabled = false;
                    button.textContent = originalText;
                }
            }
        });
    }

    // Получение данных о товаре
    getProductData(button) {
        const productCard = button.closest('.product-card') || button.closest('.movie-card') || button.closest('.price-section');
        if (!productCard) {
            console.error('Не удалось найти карточку товара');
            return null;
        }

        // Получаем заголовок товара
        const productTitle = productCard.querySelector('h1, h2, h3')?.textContent.trim();

        // Получаем цену
        let productPrice = 499;
        const priceElement = productCard.querySelector('.price, .movie-price');
        if (priceElement) {
            const priceText = priceElement.textContent;
            const priceMatch = priceText.match(/\d+/);
            if (priceMatch) {
                productPrice = parseInt(priceMatch[0]);
            }
        }

        // Получаем ID товара
        let productId = button.dataset.productId || productCard.dataset.productId;

        // Если ID нет, генерируем из названия
        if (!productId && productTitle) {
            productId = this.generateProductId(productTitle);
        }

        // Получаем изображение
        const productImage = productCard.querySelector('img')?.src || this.getDefaultImage(productTitle);

        return {
            id: productId || 'product-' + Date.now(),
            title: productTitle || 'Фильм',
            price: productPrice,
            image: productImage,
            quantity: 1
        };
    }

    // Генерация ID товара
    generateProductId(title) {
        if (!title) return 'product-' + Date.now();

        const mapping = {
            'голодные игры': 'hunger-games',
            'меню': 'menu',
            'его три дочери': 'three-daughters',
            'дьявол носит прада': 'devil-wears-prada',
            'крик': 'scream',
            'опасная игра слоун': 'sloane',
            'интерстеллар': 'interstellar',
            'богемская рапсодия': 'bohemian-rhapsody',
            'круэлла': 'cruella',
            'дом gucci': 'house-of-gucci',
            'вечность': 'eternity',
            'это всё агата': 'agatha-all',
            'дивергент': 'divergent',
            'война миров z': 'world-war-z',
            'тайна 7 сестёр': '7-sisters',
            'доктор стрендж': 'doctor-strange',
            'ужасающий 3': 'terrifier-3',
            'пять ночей с фредди': 'five-nights'
        };

        const lowerTitle = title.toLowerCase();
        for (const [key, value] of Object.entries(mapping)) {
            if (lowerTitle.includes(key)) {
                return value;
            }
        }

        // Если не нашли в маппинге, создаем из названия
        return title.toLowerCase()
            .replace(/[^a-z0-9а-яё]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    // Получение изображения по умолчанию
    getDefaultImage(title) {
        if (!title) return 'images/poster1.jpg';

        const mapping = {
            'голодные игры': 'images/poster1.jpg',
            'меню': 'images/poster2.jpg',
            'его три дочери': 'images/poster3.jpg',
            'дьявол носит прада': 'images/poster4.jpg',
            'крик': 'images/poster5.jpg',
            'опасная игра слоун': 'images/poster6.jpg',
            'интерстеллар': 'images/poster7.jpg',
            'богемская рапсодия': 'images/poster8.jpg',
            'круэлла': 'images/poster9.jpg',
            'дом gucci': 'images/poster10.jpg',
            'вечность': 'images/poster11.jpg',
            'это всё агата': 'images/poster12.jpg',
            'дивергент': 'images/poster13.jpg',
            'война миров z': 'images/poster14.jpg',
            'тайна 7 сестёр': 'images/poster15.jpg',
            'доктор стрендж': 'images/poster16.jpg',
            'ужасающий 3': 'images/poster17.jpg',
            'пять ночей с фредди': 'images/poster18.jpg'
        };

        const lowerTitle = title.toLowerCase();
        for (const [key, image] of Object.entries(mapping)) {
            if (lowerTitle.includes(key)) {
                return image;
            }
        }

        return 'images/poster1.jpg';
    }

    // Добавление товара в корзину
    async addToCart(product) {
        console.log('addToCart вызван для:', product.title);
        console.log('Product ID:', product.id);

        const existingItem = this.cart.find(item => item.id === product.id);

        if (existingItem) {
            existingItem.quantity += 1;
            console.log('Увеличено количество:', product.title, '→', existingItem.quantity);
        } else {
            this.cart.push({
                ...product,
                quantity: 1,
                addedAt: new Date().toISOString()
            });
            console.log('Добавлен новый товар:', product.title);
        }

        // Сохраняем в БД если пользователь авторизован
        if (this.currentUser?.id) {
            const movieId = this.extractMovieId(product.id);
            console.log('Extracted movieId:', movieId);

            if (movieId) {
                const quantity = existingItem ? existingItem.quantity : 1;
                console.log('Синхронизация с БД:', { movieId, quantity });
                await this.syncItemToDatabase(product.id, movieId, quantity);
            } else {
                console.error('Не удалось определить movieId для:', product.id);
                this.showNotification(`Ошибка: не удалось сохранить "${product.title}" в БД`, 'error');
            }
        }

        this.saveCart();
        this.updateProductButtons(); // ТОЛЬКО это, НЕ вызывайте setupProductQuantityControls()!

        this.showNotification(`${product.title} добавлен в корзину!`);
        return true;
    }

    // Удаление товара из корзины
    async removeFromCart(productId) {
        const index = this.cart.findIndex(item => item.id === productId);
        if (index !== -1) {
            const itemName = this.cart[index].title;
            this.cart.splice(index, 1);

            // Удаляем из БД если пользователь авторизован
            if (this.currentUser?.id) {
                const movieId = this.extractMovieId(productId);
                if (movieId) {
                    await this.syncItemToDatabase(productId, movieId, 0);
                }
            }

            this.saveCart();
            this.showNotification(`${itemName} удален из корзины`);
            this.updateProductButtons();
            this.setupProductQuantityControls();
            return true;
        }
        return false;
    }

    // Обновление количества товара
    async updateQuantity(productId, change) {
        console.log('=== updateQuantity START ===');
        console.log('productId:', productId);
        console.log('change:', change);

        const item = this.cart.find(item => item.id === productId);
        if (!item) {
            console.log('Товар не найден в корзине. Поиск по productId:', productId);
            console.log('Все товары в корзине:', this.cart.map(item => ({ id: item.id, title: item.title })));
            return false;
        }

        console.log('Текущее количество:', item.quantity);
        item.quantity += change;
        console.log('Новое количество:', item.quantity);

        if (item.quantity <= 0) {
            console.log('Удаляем товар из корзины');
            return await this.removeFromCart(productId);
        }

        // Синхронизируем с БД если пользователь авторизован
        if (this.currentUser?.id) {
            const movieId = this.extractMovieId(productId);
            if (movieId) {
                console.log('Синхронизация с БД:', { movieId, quantity: item.quantity });
                await this.syncItemToDatabase(productId, movieId, item.quantity);
            }
        }

        this.saveCart();
        this.updateProductButtons();
        this.setupProductQuantityControls();

        console.log('✅ Количество обновлено');
        return true;
    }

    // Очистка корзины
    async clearCart() {
        console.log('=== ОЧИСТКА КОРЗИНЫ ===');

        // Удаляем из БД если пользователь авторизован
        if (this.currentUser?.id) {
            await this.clearCartInDatabase();
        }

        // Очищаем локальную корзину
        this.cart = [];
        this.activePromo = null;

        // УДАЛЯЕМ из localStorage
        const cartKey = this.getCartKey();
        const promoKey = this.getPromoKey();

        localStorage.removeItem(cartKey);
        localStorage.removeItem(promoKey);

        console.log('Корзина полностью очищена из localStorage:', cartKey);

        // Обновляем отображение
        this.updateCartDisplay();
        this.updateProductButtons();

        this.showNotification('Корзина очищена');
    }

    // Полная очистка корзины (удаляет из localStorage и БД)
    async clearCartCompletely() {
        console.log('=== ПОЛНАЯ ОЧИСТКА КОРЗИНЫ ===');

        // Удаляем из localStorage
        const cartKey = this.getCartKey();
        const promoKey = this.getPromoKey();

        localStorage.removeItem(cartKey);
        localStorage.removeItem(promoKey);

        // Очищаем локальные данные
        this.cart = [];
        this.activePromo = null;

        // Очищаем БД если пользователь авторизован
        if (this.currentUser?.id) {
            await this.clearCartInDatabase();
        }

        console.log('Корзина полностью очищена');

        // Обновляем отображение
        this.updateCartDisplay();
        this.updateProductButtons();

        this.showNotification('Корзина полностью очищена');
    }

    // Настройка обработчиков для промокода
    setupPromoCodeHandlers() {
        const applyPromoBtn = document.getElementById('applyPromoBtn');
        const promoCodeInput = document.getElementById('promoCodeInput');
        const removePromoBtn = document.getElementById('removePromoBtn');

        if (applyPromoBtn) {
            applyPromoBtn.addEventListener('click', () => {
                const code = promoCodeInput ? promoCodeInput.value : '';
                if (code) {
                    this.applyPromoCode(code);
                    if (promoCodeInput) promoCodeInput.value = '';
                }
            });
        }

        if (promoCodeInput) {
            promoCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const code = promoCodeInput.value;
                    if (code) {
                        this.applyPromoCode(code);
                        promoCodeInput.value = '';
                    }
                }
            });
        }

        if (removePromoBtn) {
            removePromoBtn.addEventListener('click', () => {
                this.clearPromoCode();
            });
        }
    }

    // Применение промокода
    applyPromoCode(code) {
        const promoCode = code.toUpperCase().trim();

        if (this.PROMO_CODES[promoCode]) {
            const promoData = {
                code: promoCode,
                discount: this.PROMO_CODES[promoCode].discount,
                name: this.PROMO_CODES[promoCode].name,
                appliedAt: new Date().toISOString()
            };

            this.activePromo = promoData;
            this.saveCart();

            this.updateCartDisplay();
            this.showNotification(`Промокод "${promoCode}" применен! Скидка ${promoData.discount * 100}%`);
            return true;
        } else {
            this.showNotification('Неверный промокод', 'error');
            return false;
        }
    }

    // Очистка промокода
    clearPromoCode() {
        this.activePromo = null;
        this.saveCart();

        this.updateCartDisplay();
        this.showNotification('Промокод удален');

        const removePromoBtn = document.getElementById('removePromoBtn');
        if (removePromoBtn) {
            removePromoBtn.style.display = 'none';
        }
    }

    // Настройка кнопок управления количеством на странице продукта - ИСПРАВЛЕННАЯ ВЕРСИЯ
    setupProductQuantityControls() {
        console.log('setupProductQuantityControls вызван');

        // Убедимся, что обработчик не добавляется повторно
        if (this._quantityHandlersSetup) {
            console.log('Обработчики уже настроены, пропускаем');
            return;
        }

        this._quantityHandlersSetup = true;

        document.addEventListener('click', async (e) => {
            const minusBtn = e.target.closest('.product-quantity-control .minus-btn, .quantity-control .minus-btn');
            const plusBtn = e.target.closest('.product-quantity-control .plus-btn, .quantity-control .plus-btn');

            if (minusBtn || plusBtn) {
                e.preventDefault();
                e.stopPropagation();

                // Блокируем кнопку, чтобы предотвратить многократные клики
                const clickedBtn = minusBtn || plusBtn;
                if (clickedBtn._processing) {
                    console.log('Кнопка уже обрабатывается, пропускаем');
                    return;
                }

                clickedBtn._processing = true;

                console.log('Клик по кнопке:', minusBtn ? 'минус' : 'плюс');

                // Получаем productId
                let productId = minusBtn?.dataset.productId || plusBtn?.dataset.productId;
                console.log('productId из data-атрибута:', productId);

                // Если нет в data-атрибуте, пытаемся получить из родительской карточки
                if (!productId) {
                    const productCard = e.target.closest('.product-card') || e.target.closest('.movie-card');
                    productId = productCard?.dataset.productId;
                    console.log('productId из карточки:', productId);
                }

                if (!productId) {
                    console.error('Не удалось определить productId');
                    clickedBtn._processing = false;
                    return;
                }

                console.log('Обновление количества для:', productId);

                try {
                    // Обновляем количество (только один раз!)
                    if (minusBtn) {
                        await this.updateQuantity(productId, -1);
                    } else if (plusBtn) {
                        await this.updateQuantity(productId, 1);
                    }
                } catch (error) {
                    console.error('Ошибка при обновлении количества:', error);
                } finally {
                    // Сбрасываем флаг через задержку
                    setTimeout(() => {
                        clickedBtn._processing = false;
                    }, 500);
                }
            }
        });
    }

    // Расчет общей суммы
    getTotalPrice() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    // Получение общего количества товаров
    getTotalItems() {
        return this.cart.reduce((total, item) => total + item.quantity, 0);
    }

    // Обновление отображения корзины
    updateCartDisplay() {
        this.updateCartBadge();
        this.updateCartPage();
    }

    // Обновление бейджа корзины
    updateCartBadge() {
        const cartBadges = document.querySelectorAll('.cart-badge');
        const totalItems = this.getTotalItems();

        cartBadges.forEach(badge => {
            badge.textContent = totalItems;
            badge.style.display = totalItems > 0 ? 'flex' : 'none';
        });
    }

    // Обновление страницы корзины
    updateCartPage() {
        const cartContainer = document.querySelector('.cart-container');
        if (!cartContainer) return;

        const cartEmptyMessage = document.querySelector('.cart-empty-message');
        const cartContent = document.querySelector('.cart-content');
        const cartItems = document.querySelector('.cart-items');

        // Показ/скрытие сообщения о пустой корзине
        if (this.cart.length === 0) {
            if (cartEmptyMessage) cartEmptyMessage.style.display = 'block';
            if (cartContent) cartContent.style.display = 'none';
            return;
        }

        if (cartEmptyMessage) cartEmptyMessage.style.display = 'none';
        if (cartContent) cartContent.style.display = 'grid';

        // Обновление списка товаров
        if (cartItems) {
            cartItems.innerHTML = this.cart.map((item) => `
                <div class="cart-item" data-id="${item.id}">
                    <div class="cart-item-image">
                        <img src="${item.image}" alt="${item.title}">
                    </div>
                    <div class="cart-item-info">
                        <h3>${item.title}</h3>
                        <p class="cart-item-quality">${this.formatPrice(item.price)} за шт.</p>
                    </div>
                    <div class="cart-item-controls">
                        <div class="quantity-control">
                            <button class="quantity-btn minus-btn" data-product-id="${item.id}">-</button>
                            <span class="quantity-display">${item.quantity}</span>
                            <button class="quantity-btn plus-btn" data-product-id="${item.id}">+</button>
                        </div>
                        <button class="cart-item-remove" data-product-id="${item.id}">Удалить</button>
                    </div>
                    <div class="cart-item-price">
                        <span class="price">${this.formatPrice(item.price * item.quantity)}</span>
                    </div>
                </div>
            `).join('');

            // Настраиваем кнопки для только что добавленных элементов
            this.setupCartItemButtons();
        }

        // Обновление сумм
        this.updateCartSummary();
    }

    // Настройка кнопок в корзине
    setupCartItemButtons() {
        // Удаляем старые обработчики
        document.querySelectorAll('.cart-items .minus-btn, .cart-items .plus-btn, .cart-items .cart-item-remove').forEach(btn => {
            btn.onclick = null;
        });

        // Добавляем обработчик на контейнер корзины
        const cartItems = document.querySelector('.cart-items');
        if (cartItems) {
            cartItems.onclick = async (e) => {
                const minusBtn = e.target.closest('.minus-btn');
                const plusBtn = e.target.closest('.plus-btn');
                const removeBtn = e.target.closest('.cart-item-remove');

                if (minusBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const productId = minusBtn.getAttribute('data-product-id');
                    await this.updateQuantity(productId, -1);
                } else if (plusBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const productId = plusBtn.getAttribute('data-product-id');
                    await this.updateQuantity(productId, 1);
                } else if (removeBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const productId = removeBtn.getAttribute('data-product-id');
                    await this.removeFromCart(productId);
                }
            };
        }
    }

    // Обновление итоговой суммы
    updateCartSummary() {
        const totalPriceElement = document.querySelector('.total-price');
        const discountRow = document.querySelector('.summary-row.discount');
        const finalPriceElement = document.querySelector('.final-price');
        const promoMessage = document.getElementById('promoMessage');

        if (!totalPriceElement || !finalPriceElement) return;

        const totalPrice = this.getTotalPrice();
        let discount = 0;
        let finalPrice = totalPrice;

        if (this.activePromo) {
            discount = Math.round(totalPrice * this.activePromo.discount);
            finalPrice = totalPrice - discount;

            if (discountRow) {
                discountRow.style.display = 'flex';
                discountRow.querySelector('span:last-child').textContent = `-${this.formatPrice(discount)}`;
            }

            if (promoMessage) {
                promoMessage.textContent = `Применен промокод: ${this.activePromo.code}`;
                promoMessage.style.color = '#4CAF50';
            }

            const removePromoBtn = document.getElementById('removePromoBtn');
            if (removePromoBtn) removePromoBtn.style.display = 'inline-block';

            const promoCodeInput = document.getElementById('promoCodeInput');
            const applyPromoBtn = document.getElementById('applyPromoBtn');
            if (promoCodeInput) promoCodeInput.style.display = 'none';
            if (applyPromoBtn) applyPromoBtn.style.display = 'none';
        } else {
            if (discountRow) {
                discountRow.style.display = 'none';
            }

            if (promoMessage) {
                promoMessage.textContent = '';
            }

            const removePromoBtn = document.getElementById('removePromoBtn');
            if (removePromoBtn) removePromoBtn.style.display = 'none';

            const promoCodeInput = document.getElementById('promoCodeInput');
            const applyPromoBtn = document.getElementById('applyPromoBtn');
            if (promoCodeInput) promoCodeInput.style.display = 'inline-block';
            if (applyPromoBtn) applyPromoBtn.style.display = 'inline-block';
        }

        totalPriceElement.textContent = this.formatPrice(totalPrice);
        finalPriceElement.textContent = this.formatPrice(finalPrice);
    }

    // Обновление кнопок на страницах продуктов - ИСПРАВЛЕННАЯ ВЕРСИЯ
    updateProductButtons() {
        console.log('updateProductButtons вызван');
        console.log('Товаров в корзине:', this.cart.length);

        document.querySelectorAll('.buy-btn').forEach(button => {
            const productCard = button.closest('.product-card') || button.closest('.movie-card') || button.closest('.price-section');

            if (!productCard) {
                console.log('Не найдена карточка товара для кнопки');
                return;
            }

            // Получаем productId разными способами
            let productId = button.dataset.productId || productCard.dataset.productId;

            // Если нет в data-атрибутах, пытаемся получить из заголовка
            if (!productId) {
                const productTitle = productCard.querySelector('h1, h2, h3')?.textContent.trim();
                if (productTitle) {
                    productId = this.generateProductId(productTitle);
                    console.log('Сгенерировали productId из заголовка:', productId);
                }
            }

            if (!productId) {
                console.log('Не удалось определить productId для кнопки');
                return;
            }

            console.log('Ищем товар с ID:', productId, 'в корзине');

            // Ищем товар в корзине
            const itemInCart = this.cart.find(item => {
                console.log('Сравниваем:', item.id, 'с', productId);
                return item.id === productId;
            });

            console.log('Найден в корзине:', itemInCart ? 'Да' : 'Нет');

            if (itemInCart) {
                // Товар в корзине - показываем контролы количества
                console.log('Показываем контролы для:', productId, 'количество:', itemInCart.quantity);
                button.style.display = 'none';

                let quantityControl = productCard.querySelector('.product-quantity-control');
                if (!quantityControl) {
                    console.log('Создаем контролы количества');
                    quantityControl = document.createElement('div');
                    quantityControl.className = 'product-quantity-control';
                    quantityControl.innerHTML = `
                    <div class="quantity-control">
                        <button class="quantity-btn minus-btn" data-product-id="${productId}">-</button>
                        <span class="quantity-display">${itemInCart.quantity}</span>
                        <button class="quantity-btn plus-btn" data-product-id="${productId}">+</button>
                    </div>
                    <span class="in-cart-text">В корзине</span>
                `;

                    const priceSection = productCard.querySelector('.price-section') || productCard.querySelector('.movie-info');
                    if (priceSection) {
                        console.log('Вставляем контролы после кнопки');
                        button.after(quantityControl);
                    }
                }

                quantityControl.style.display = 'flex';
                const quantityDisplay = quantityControl.querySelector('.quantity-display');
                if (quantityDisplay) {
                    quantityDisplay.textContent = itemInCart.quantity;
                }

                // Настраиваем кнопки
                this.setupProductQuantityControls();
            } else {
                // Товара нет в корзине - показываем обычную кнопку
                console.log('Показываем кнопку "Добавить" для:', productId);
                button.style.display = 'block';
                button.innerHTML = 'Добавить в корзину';
                button.classList.remove('in-cart');

                const quantityControl = productCard.querySelector('.product-quantity-control');
                if (quantityControl) {
                    quantityControl.style.display = 'none';
                }
            }
        });

        console.log('updateProductButtons завершен');
    }

    // Форматирование цены
    formatPrice(price) {
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
    }

    // Показ уведомления
    showNotification(message, type = 'success') {
        const existingNotification = document.querySelector('.cart-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        notification.textContent = message;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ff4444' : '#4CAF50'};
            color: white;
            padding: 15px 25px;
            border-radius: 5px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 1000;
            animation: slideIn 0.3s ease;
            font-family: Arial, sans-serif;
            font-size: 16px;
            font-weight: bold;
        `;

        document.body.appendChild(notification);

        if (!document.querySelector('#cart-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'cart-notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }
}

// Инициализация системы корзины
document.addEventListener('DOMContentLoaded', () => {
    const cartSystem = new CartSystem();
    window.cartSystem = cartSystem;
    cartSystem.init();
});