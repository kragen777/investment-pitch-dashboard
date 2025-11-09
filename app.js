// Echtzeit-Investment Dashboard mit Yahoo Finance (DIREKT - kein Proxy nötig!)
// Yahoo Finance erlaubt Cross-Origin Requests für bestimmte Endpoints

// Unternehmensdaten mit Ticker-Symbolen
const companies = [
    { name: 'Comstock', ticker: 'LODE', exchange: 'NYSE' },
    { name: 'Duolingo', ticker: 'DUOL', exchange: 'NASDAQ' },
    { name: 'ANGI', ticker: 'ANGI', exchange: 'NASDAQ' },
    { name: 'Kaspi.kz', ticker: 'KSPI', exchange: 'NASDAQ' },
    { name: 'Litigation Capital Management', ticker: 'LIT.L', exchange: 'LSE' },
    { name: 'IAC Inc.', ticker: 'IAC', exchange: 'NASDAQ' },
    { name: 'Northern Dynasty Minerals', ticker: 'NAK', exchange: 'NYSE' },
    { name: 'Panthera Resources', ticker: 'PAT.L', exchange: 'LSE' },
    { name: 'MercadoLibre', ticker: 'MELI', exchange: 'NASDAQ' },
    { name: 'Diageo PLC', ticker: 'DEO', exchange: 'NYSE' }
];

// Impact-Analyse
function analyzeImpact(title, description) {
    const text = (title + ' ' + (description || '')).toLowerCase();
    
    if (/bankruptcy|lawsuit|fraud|investigation|scandal|decline|loss|crash|plunge|suspend|delay|warning|miss|downgrade/.test(text)) {
        return 'critical';
    }
    if (/profit|growth|beat|surge|record|success|expansion|partnership|innovation|breakthrough|upgrade|raise|exceed|strong|gain/.test(text)) {
        return 'positive';
    }
    if (/filing|report|announcement|presentation|merger|acquisition|conference|meeting|dividend|earnings|financial|quarter/.test(text)) {
        return 'neutral';
    }
    return 'none';
}

// Yahoo Finance News (DIREKTER Zugriff - funktioniert!)
async function fetchYahooFinance(company) {
    try {
        // Yahoo Finance Query API - erlaubt CORS!
        const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${company.ticker}&quotesCount=1&newsCount=3&enableFuzzyQuery=false`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error(`Yahoo API Fehler: ${response.status}`);
        
        const data = await response.json();
        
        if (data.news && data.news.length > 0) {
            const article = data.news[0];
            return {
                title: article.title,
                url: article.link,
                source: article.publisher || 'Yahoo Finance',
                publishedAt: new Date(article.providerPublishTime * 1000).toLocaleDateString('de-DE'),
                impact: analyzeImpact(article.title, article.summary || '')
            };
        }
        
        return null;
    } catch (error) {
        console.log(`Yahoo Finance Fehler für ${company.name}:`, error.message);
        return null;
    }
}

// Fallback: Finnhub.io (kostenlos, kein Key für Basisdaten nötig)
async function fetchFinnhubNews(company) {
    try {
        // Finnhub hat ein kostenloses API-Tier
        const url = `https://finnhub.io/api/v1/company-news?symbol=${company.ticker}&from=2025-11-01&to=2025-11-09&token=demo`;
        
        const response = await fetch(url);
        
        if (!response.ok) return null;
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            const article = data[0];
            return {
                title: article.headline,
                url: article.url,
                source: article.source || 'Finnhub',
                publishedAt: new Date(article.datetime * 1000).toLocaleDateString('de-DE'),
                impact: analyzeImpact(article.headline, article.summary || '')
            };
        }
        
        return null;
    } catch (error) {
        console.log(`Finnhub Fehler für ${company.name}:`, error.message);
        return null;
    }
}

// Hauptfunktion: Hole News
async function fetchCompanyNews(company) {
    // Versuche zuerst Yahoo Finance (am zuverlässigsten)
    let news = await fetchYahooFinance(company);
    
    // Falls Yahoo fehlschlägt, versuche Finnhub
    if (!news) {
        news = await fetchFinnhubNews(company);
    }
    
    return news;
}

// Company Card erstellen
function createCompanyCard(company, news) {
    const card = document.createElement('div');
    card.className = 'company-card';
    
    const companyName = document.createElement('div');
    companyName.className = 'company-name';
    companyName.textContent = `${company.name} (${company.ticker})`;
    card.appendChild(companyName);
    
    if (news) {
        const newsItem = document.createElement('div');
        newsItem.className = 'news-item';
        
        const newsTitle = document.createElement('div');
        newsTitle.className = 'news-title';
        const newsLink = document.createElement('a');
        newsLink.href = news.url;
        newsLink.target = '_blank';
        newsLink.textContent = news.title;
        newsTitle.appendChild(newsLink);
        newsItem.appendChild(newsTitle);
        
        const newsMeta = document.createElement('div');
        newsMeta.className = 'news-meta';
        newsMeta.textContent = `${news.source} • ${news.publishedAt}`;
        newsItem.appendChild(newsMeta);
        
        const impactBadge = document.createElement('div');
        impactBadge.className = `impact-badge impact-${news.impact}`;
        
        const impactTexts = {
            critical: 'Kritische Auswirkung',
            positive: 'Positive Entwicklung',
            neutral: 'Wichtige Nachricht',
            none: 'Keine Auswirkung'
        };
        
        impactBadge.textContent = impactTexts[news.impact];
        newsItem.appendChild(impactBadge);
        
        card.appendChild(newsItem);
    } else {
        const noNews = document.createElement('div');
        noNews.className = 'no-news';
        noNews.textContent = 'Keine Neuigkeiten';
        card.appendChild(noNews);
    }
    
    return card;
}

// Dashboard laden
async function loadDashboard() {
    const dashboard = document.getElementById('dashboard');
    dashboard.innerHTML = '<p style="text-align: center; color: #999;">Lade Echtzeit-Nachrichten von Yahoo Finance...</p>';
    
    const results = [];
    
    // Lade sequentiell um Rate Limits zu vermeiden
    for (const company of companies) {
        const news = await fetchCompanyNews(company);
        results.push({ company, news });
        
        // Kleine Pause zwischen Anfragen
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    dashboard.innerHTML = '';
    
    results.forEach(result => {
        const card = createCompanyCard(result.company, result.news);
        dashboard.appendChild(card);
    });
    
    console.log('Dashboard geladen mit', results.filter(r => r.news).length, 'News-Artikeln');
}

// Dashboard beim Laden der Seite initialisieren
document.addEventListener('DOMContentLoaded', loadDashboard);
