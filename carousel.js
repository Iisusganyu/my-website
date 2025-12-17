// carousel.js
document.addEventListener('DOMContentLoaded', function () {
    // Находим все элементы карусели
    const carouselWrapper = document.querySelector('.carousel');
    const carouselItems = document.querySelectorAll('.carousel-item');
    const prevBtn = document.querySelector('.carousel-btn.prev');
    const nextBtn = document.querySelector('.carousel-btn.next');
    const dots = document.querySelectorAll('.carousel-dot');
   
    // Текущий активный слайд
    let currentSlide = 1; // Центральный слайд
    const totalSlides = carouselItems.length;

    // Функция для обновления позиций слайдов
    function updateCarousel(animate = true) {
        // Удаляем все классы позиционирования
        carouselItems.forEach(item => {
            item.classList.remove('left', 'center', 'right');
            item.style.transition = animate ? 'all 0.5s ease' : 'none';
        });

        // Расставляем слайды по позициям
        // Левый слайд
        const leftIndex = (currentSlide - 1 + totalSlides) % totalSlides;
        carouselItems[leftIndex].classList.add('left');

        // Центральный слайд
        carouselItems[currentSlide].classList.add('center');

        // Правый слайд
        const rightIndex = (currentSlide + 1) % totalSlides;
        carouselItems[rightIndex].classList.add('right');

        // Обновляем точки навигации
        dots.forEach((dot, index) => {
            dot.classList.remove('active');
            if (index === currentSlide) {
                dot.classList.add('active');
            }
        });
    }

    // Функция для перехода к следующему слайду
    function nextSlide() {
        currentSlide = (currentSlide + 1) % totalSlides;
        updateCarousel();
    }

    // Функция для перехода к предыдущему слайду
    function prevSlide() {
        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
        updateCarousel();
    }

    // Функция для перехода к конкретному слайду
    function goToSlide(index) {
        currentSlide = index;
        updateCarousel();
    }

    // Добавляем обработчики событий на кнопки
    if (prevBtn) {
        prevBtn.addEventListener('click', prevSlide);
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', nextSlide);
    }

    // Добавляем обработчики событий на точки
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => goToSlide(index));
    });

    // Добавляем обработчики для клавиатуры
    document.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowLeft') {
            prevSlide();
        } else if (event.key === 'ArrowRight') {
            nextSlide();
        }
    });

    // Инициализируем карусель (без анимации при загрузке)
    updateCarousel(false);
});