const API_KEY = '08c196bf460351c5935e9e9f2b4096af'; 
const BASE_URL = 'https://api.openweathermap.org/data/2.5/';

let map, marker, weatherChart;
let currentUnits = 'metric';

// DOM Elements
const ui = {
    input: document.getElementById('cityInput'),
    searchBtn: document.getElementById('searchBtn'),
    locationBtn: document.getElementById('locationBtn'),
    loading: document.getElementById('loadingOverlay'),
    forecastScroll: document.getElementById('forecastScroll')
};

// Start App
window.addEventListener('load', () => {
    initMap();
    initDate();
    autoDetectLocation();
    
    // Event Listeners
    ui.searchBtn.addEventListener('click', () => fetchAllDataByCity(ui.input.value));
    ui.input.addEventListener('keypress', (e) => { if(e.key === 'Enter') fetchAllDataByCity(ui.input.value); });
    ui.locationBtn.addEventListener('click', autoDetectLocation);
});

function initMap() {
    map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);
    map.on('click', (e) => fetchAllDataByCoords(e.latlng.lat, e.latlng.lng));
}

async function fetchAllDataByCoords(lat, lon) {
    showLoading();
    try {
        const [wRes, pRes, fRes] = await Promise.all([
            fetch(`${BASE_URL}weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnits}`),
            fetch(`${BASE_URL}air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`),
            fetch(`${BASE_URL}forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnits}`)
        ]);

        const wData = await wRes.json();
        const pData = await pRes.json();
        const fData = await fRes.json();

        updateUI(wData, pData, fData);
        updateMap(lat, lon, wData.name);
    } catch (err) {
        console.error("Fetch Error:", err);
    } finally { hideLoading(); }
}

async function fetchAllDataByCity(city) {
    if (!city) return;
    showLoading();
    try {
        const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`);
        const data = await res.json();
        if (data.length > 0) fetchAllDataByCoords(data[0].lat, data[0].lon);
        else alert("City not found");
    } catch (err) { console.error(err); }
    finally { hideLoading(); }
}

function updateUI(w, p, f) {
    // Main Card
    document.getElementById('locationName').innerText = w.name;
    document.getElementById('mainTemp').innerText = Math.round(w.main.temp);
    document.getElementById('weatherDesc').innerText = w.weather[0].description;
    document.getElementById('feelsLike').innerText = Math.round(w.main.feels_like);
    document.getElementById('weatherIcon').src = `https://openweathermap.org/img/wn/${w.weather[0].icon}@4x.png`;

    // Details Grid
    document.getElementById('humidityVal').innerText = w.main.humidity;
    document.getElementById('windVal').innerText = w.wind.speed;
    
    // AQI Logic
    const aqi = p.list[0].main.aqi;
    const aqiText = ["", "Good", "Fair", "Moderate", "Poor", "Very Poor"];
    document.getElementById('aqiVal').innerText = aqi;
    document.getElementById('aqiDesc').innerText = aqiText[aqi];

    // Forecast & Graph
    renderHourlyGraph(f.list.slice(0, 5));
    render5DayForecast(f.list);
}

function renderHourlyGraph(next5) {
    const ctx = document.getElementById('hourlyChart').getContext('2d');
    const labels = next5.map(d => new Date(d.dt * 1000).getHours() + ":00");
    const temps = next5.map(d => Math.round(d.main.temp));

    if (weatherChart) weatherChart.destroy();

    weatherChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: temps,
                borderColor: '#fff',
                backgroundColor: 'rgba(255,255,255,0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#fff' }, grid: { display: false } },
                y: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } }
            }
        }
    });
}

function render5DayForecast(list) {
    ui.forecastScroll.innerHTML = '';
    const daily = list.filter(item => item.dt_txt.includes("12:00:00"));
    
    daily.forEach(day => {
        const date = new Date(day.dt * 1000).toLocaleDateString('en-US', {weekday: 'short'});
        const div = document.createElement('div');
        div.className = 'forecast-card';
        div.innerHTML = `
            <p>${date}</p>
            <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png">
            <p><strong>${Math.round(day.main.temp)}°C</strong></p>
        `;
        ui.forecastScroll.appendChild(div);
    });
}

function updateMap(lat, lon, name) {
    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lon]).addTo(map).bindPopup(name).openPopup();
    map.setView([lat, lon], 10);
}

function autoDetectLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            p => fetchAllDataByCoords(p.coords.latitude, p.coords.longitude),
            () => fetchAllDataByCity('New Delhi')
        );
    }
}

function showLoading() { ui.loading.classList.add('active'); }
function hideLoading() { ui.loading.classList.remove('active'); }
function initDate() { document.getElementById('currentDate').innerText = new Date().toDateString(); }