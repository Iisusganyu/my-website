// omdb-api.js - без иконок FontAwesome
console.log("OMDb API скрипт запущен");

const API_KEY = '54555393';

async function loadMovieInfo() {
    console.log("=== ЗАГРУЗКА ДАННЫХ ===");

    try {
        let movieTitle = '';
        const productTitle = document.querySelector('.product-title');
        if (productTitle) {
            movieTitle = productTitle.textContent.trim();
        }

        if (!movieTitle) return;

        let searchTitle = movieTitle.replace(/\(\d{4}\)/, '').trim();
        const englishTitle = convertToEnglish(searchTitle);
        const apiData = await fetchOMDbData(englishTitle);

        if (!apiData || apiData.Response !== "True") {
            return;
        }

        displayMovieInfo(apiData);

    } catch (error) {
        console.error("Ошибка:", error);
    }
}

function convertToEnglish(russianTitle) {
    const titleMap = {
        "голодные игры": "The Hunger Games",
        "меню": "The Menu",
        "его три дочери": "His Three Daughters",
        "дьявол носит прада": "The Devil Wears Prada",
        "крик": "Scream",
        "опасная игра слоун": "Miss Sloane",
        "интерстеллар": "Interstellar",
        "богемская рапсодия": "Bohemian Rhapsody",
        "круэлла": "Cruella",
        "дом gucci": "House of Gucci",
        "вечность": "Eternity",
        "это всё агата": "Agatha",
        "дивергент": "Divergent",
        "война миров z": "World War Z",
        "тайна 7 сестёр": "What Happened to Monday",
        "доктор стрэндж": "Doctor Strange",
        "ужасающий 3": "Terrifier 3",
        "пять ночей с фредди": "Five Nights at Freddy's"
    };

    const lowerTitle = russianTitle.toLowerCase().trim();

    for (const [rus, eng] of Object.entries(titleMap)) {
        if (lowerTitle.includes(rus)) {
            return eng;
        }
    }

    return russianTitle;
}

async function fetchOMDbData(title) {
    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('HTTP ошибка: ' + response.status);
        }
        return await response.json();
    } catch (error) {
        return null;
    }
}

function displayMovieInfo(apiData) {
    const oldInfo = document.querySelector('.omdb-info-block');
    if (oldInfo) oldInfo.remove();

    const infoBlock = document.createElement('div');
    infoBlock.className = 'omdb-info-block';
    infoBlock.style.cssText = 'background: linear-gradient(135deg, #1a1a1a, #0a0a0a); border: 2px solid #e50914; border-radius: 12px; padding: 25px; margin: 30px 0; color: white;';

    // Заголовок БЕЗ иконки
    const header = document.createElement('div');
    header.textContent = 'Дополнительная информация';
    header.style.cssText = 'font-weight: bold; font-size: 18px; color: #e50914; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #333;';

    const content = document.createElement('div');
    content.style.cssText = 'display: grid; gap: 20px;';

    // 1. Страна БЕЗ иконки
    if (apiData.Country && apiData.Country !== 'N/A') {
        content.appendChild(createInfoItem(
            'Страна производства',
            apiData.Country,
            '#4CAF50'
        ));
    }

    // 2. Награды БЕЗ иконки
    if (apiData.Awards && apiData.Awards !== 'N/A') {
        content.appendChild(createInfoItem(
            'Награды',
            formatAwards(apiData.Awards),
            '#FFC107'
        ));
    }

    // 3. Рейтинг БЕЗ иконки
    if (apiData.imdbRating && apiData.imdbRating !== 'N/A') {
        content.appendChild(createInfoItem(
            'Рейтинг IMDb',
            apiData.imdbRating + '/10',
            '#FF9800'
        ));
    }

    // Если нет данных - не создаем блок
    if (content.children.length === 0) {
        return;
    }

    const keyInfo = document.createElement('div');
    keyInfo.textContent = 'Данные из OMDb API';
    keyInfo.style.cssText = 'text-align: center; margin-top: 15px; padding-top: 15px; border-top: 1px solid #333; font-size: 11px; color: #666;';

    infoBlock.appendChild(header);
    infoBlock.appendChild(content);
    infoBlock.appendChild(keyInfo);

    const productInfo = document.querySelector('.product-info');
    if (productInfo) {
        const priceSection = productInfo.querySelector('.price-section');
        if (priceSection) {
            productInfo.insertBefore(infoBlock, priceSection);
        } else {
            productInfo.appendChild(infoBlock);
        }
    }
}

// Упрощенная функция БЕЗ иконок
function createInfoItem(label, value, borderColor) {
    const item = document.createElement('div');
    item.style.cssText = 'padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; border-left: 4px solid ' + borderColor + ';';

    const labelSpan = document.createElement('div');
    labelSpan.textContent = label;
    labelSpan.style.cssText = 'font-size: 12px; color: #999; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;';

    const valueSpan = document.createElement('div');
    valueSpan.textContent = value;
    valueSpan.style.cssText = 'font-weight: bold; font-size: 16px; color: #fff; line-height: 1.4;';

    item.appendChild(labelSpan);
    item.appendChild(valueSpan);

    return item;
}

function formatAwards(awardsText) {
    let text = awardsText;

    if (text.includes('total')) {
        text = text.replace(' total', '');
    }

    if (text.length > 80) {
        const winsMatch = text.match(/(\d+)\s*wins?/i);
        const nominationsMatch = text.match(/(\d+)\s*nominations?/i);

        if (winsMatch && nominationsMatch) {
            return winsMatch[1] + ' побед, ' + nominationsMatch[1] + ' номинаций';
        } else {
            return text.substring(0, 77) + '...';
        }
    }

    text = text.replace('Won', 'Побед');
    text = text.replace('wins', 'побед');
    text = text.replace('nominations', 'номинаций');

    return text;
}

document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
        loadMovieInfo();
    }, 1000);
});

window.updateMovieInfo = loadMovieInfo;