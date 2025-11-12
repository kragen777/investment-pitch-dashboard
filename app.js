// ECHTZEIT Investment Dashboard - Lädt Daten aus pitches.json
// Registriere dich kostenlos: https://finnhub.io/register
// Trage deinen API-Key unten ein!

// WICHTIG: Hier deinen Finnhub API-Key eintragen!
const FINNHUB_API_KEY = 'd48eut1r01qnpsnnh2qgd48eut1r01qnpsnnh2r0';

// URL zur pitches.json im Investment-Dashboard Repository
const PITCHES_JSON_URL = 'pitches.json';
// Globale Variable für Companies (wird aus pitches.json geladen)
let companies = [];

// Lade Unternehmen aus pitches.json
async function loadCompaniesFromPitches() {
    try {
        const response = await fetch(PITCHES_JSON_URL);
        if (!response.ok) throw new Error(`Fehler beim Laden der pitches.json: ${response.status}`);
        
        const pitches = await response.json();
        
        // Konvertiere pitches.json Format zu companies Format
        companies = pitches.map(pitch => {
            // Extrahiere Ticker aus Namen wenn vorhanden
            const tickerMatch = pitch.ticker || pitch.name.match(/\(([A-Z.]+)\)/);
            const ticker = tickerMatch ? (typeof tickerMatch === 'string' ? tickerMatch : tickerMatch[1]) : '';
            
            // Bestimme Exchange basierend auf Ticker
            let exchange = 'NASDAQ';
            if (ticker.endsWith('.L')) exchange = 'LSE';
            else if (['LODE', 'NAK', 'DEO'].includes(ticker)) exchange = 'NYSE';
            
            return {
                name: pitch.name.replace(/\s*\([A-Z.]+\)\s*$/, ''), // Entferne Ticker aus Name
                ticker: ticker,
                exchange: exchange,
                irUrl: null, // Nicht in pitches.json, könnte später ergänzt werden
                cik: null
            };
        });
        
        console.log(`✅ ${companies.length} Unternehmen aus pitches.json geladen`);
        return companies;
    } catch (error) {
        console.error('❌ Fehler beim Laden der Companies:', error);
        return [];
    }
}

// Impact-Analyse
function analyzeImpact(title, description) {
    const text = (title + ' ' + (description || '')).toLowerCase();
    
    if (/bankruptcy|lawsuit|fraud|investigation|scandal|decline|loss|crash|plunge|suspend|delay|warning|miss|downgrade|concern/.test(text)) {
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

// 1. Finnhub Company News (BESTE Option - zuverlässig!)
async function fetchFinnhubNews(company) {
    if (FINNHUB_API_KEY === 'DEIN_FINNHUB_API_KEY_HIER') {
        console.log('⚠️ Bitte Finnhub API-Key eintragen!');
        return null;
    }
    
    try {
        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const from = lastWeek.toISOString().split('T')[0];
        const to = today.toISOString().split('T')[0];
        
        const url = `https://finnhub.io/api/v1/company-news?symbol=${company.ticker}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
        
        const response = await fetch(url);
        
        if (!response.ok) throw new Error(`Finnhub Fehler: ${response.status}`);
        
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

// 2. Yahoo Finance (Fallback)
async function fetchYahooFinance(company) {
    try {
        const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${company.ticker}&quotesCount=1&newsCount=3&enableFuzzyQuery=false`;
        
        const response = await fetch(url);
        
        if (!response.ok) throw new Error(`Yahoo Fehler: ${response.status}`);
        
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
        console.log(`Yahoo Fehler für ${company.name}:`, error.message);
        return null;
    }
}

// 3. SEC EDGAR Filings (für US-Aktien)
async function fetchSECFilings(company) {
    if (!company.cik) return null;
    
    try {
        return {
            title: `Neueste SEC Filing - Klick für Details`,
            url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${company.cik}&type=&dateb=&owner=exclude&count=10`,
            source: 'SEC EDGAR',
            publishedAt: 'Aktuelle Filings',
            impact: 'neutral'
        };
    } catch (error) {
        return null;
    }
}

// Hauptfunktion: Hole News aus allen Quellen
async function fetchCompanyNews(company) {
    // Versuche Reihenfolge: Finnhub -> Yahoo -> SEC
    let news = await fetchFinnhubNews(company);
    
    if (!news) {
        news = await fetchYahooFinance(company);
    }
    
    if (!news) {
        news = await fetchSECFilings(company);
    }
    
    // Wenn nichts gefunden wurde, zeige Platzhalter
    if (!news) {
        news = {
            title: `🔍 Keine aktuellen News gefunden`,
            url: `https://www.google.com/search?q=${encodeURIComponent(company.name + ' ' + company.ticker + ' news')}`,
            source: 'Google Suche',
            publishedAt: 'Suche starten',
            impact: 'none'
        };
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
            none: 'Weitere Infos'
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
    dashboard.innerHTML = '<p style="text-align: center; color: #999;">🔄 Lade Unternehmen aus pitches.json...</p>';
    
    // Lade zuerst die Companies aus pitches.json
    await loadCompaniesFromPitches();
    
    if (companies.length === 0) {
        dashboard.innerHTML = '<p style="text-align: center; color: #f44;">Fehler: Keine Unternehmen geladen. Bitte pitches.json prüfen.</p>';
        return;
    }
    
    dashboard.innerHTML = '<p style="text-align: center; color: #999;">Lade Echtzeit-Nachrichten von Finnhub, Yahoo Finance & SEC...</p>';
    
    const results = [];
    
    // Lade alle Unternehmen sequentiell (vermeidet Rate Limits)
    for (const company of companies) {
        const news = await fetchCompanyNews(company);
        results.push({ company, news });
        
        // Mini-Pause zwischen Anfragen
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    dashboard.innerHTML = '';
    
    results.forEach(result => {
        const card = createCompanyCard(result.company, result.news);
        dashboard.appendChild(card);
    });
    
    const newsCount = results.filter(r => r.news && r.news.source !== 'Google Suche').length;
    console.log(`✅ Dashboard geladen! ${newsCount} News gefunden für ${companies.length} Unternehmen.`);
}

// Dashboard beim Laden der Seite initialisieren
document.addEventListener('DOMContentLoaded', loadDashboard);
