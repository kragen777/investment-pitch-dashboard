// Echtzeit-Investment Dashboard - Keine API-Keys benötigt!
// Quellen: SEC EDGAR, Yahoo Finance, Unternehmens-IR, London Stock Exchange

// CORS Proxy für direkte Anfragen
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

// Unternehmensdaten mit Ticker-Symbolen und SEC CIK-Nummern
const companies = [
    { 
        name: 'Comstock', 
        ticker: 'LODE',
        cik: '0001445283',
        exchange: 'NYSE',
        website: 'https://comstock.inc/investors/'
    },
    { 
        name: 'Duolingo', 
        ticker: 'DUOL',
        cik: '0001802749',
        exchange: 'NASDAQ',
        website: 'https://investors.duolingo.com/news'
    },
    { 
        name: 'ANGI', 
        ticker: 'ANGI',
        cik: '0001705110',
        exchange: 'NASDAQ',
        website: 'https://ir.angi.com/news'
    },
    { 
        name: 'Kaspi.kz', 
        ticker: 'KSPI',
        cik: '0001838416',
        exchange: 'NASDAQ',
        website: 'https://ir.kaspi.kz/news-and-events/'
    },
    { 
        name: 'Litigation Capital Management', 
        ticker: 'LIT',
        cik: null,
        exchange: 'LSE',
        ric: 'LIT.L',
        website: 'https://litigationcapital.com/investor-relations/'
    },
    { 
        name: 'IAC Inc.', 
        ticker: 'IAC',
        cik: '0001091883',
        exchange: 'NASDAQ',
        website: 'https://ir.iac.com/news-events/press-releases'
    },
    { 
        name: 'Northern Dynasty Minerals', 
        ticker: 'NAK',
        cik: '0001164771',
        exchange: 'NYSE',
        website: 'https://www.northerndynastyminerals.com/news/'
    },
    { 
        name: 'Panthera Resources', 
        ticker: 'PAT',
        cik: null,
        exchange: 'LSE',
        ric: 'PAT.L',
        website: 'https://pantheraresources.com/news/'
    },
    { 
        name: 'MercadoLibre', 
        ticker: 'MELI',
        cik: '0001099590',
        exchange: 'NASDAQ',
        website: 'https://investor.mercadolibre.com/news-events/press-releases'
    },
    { 
        name: 'Diageo PLC', 
        ticker: 'DEO',
        cik: '0000914208',
        exchange: 'NYSE',
        ric: 'DGE.L',
        website: 'https://www.diageo.com/en/news-and-media/'
    }
];

// Funktion zur Impact-Analyse
function analyzeImpact(title, description) {
    const text = (title + ' ' + (description || '')).toLowerCase();
    
    const criticalKeywords = [
        'bankruptcy', 'lawsuit', 'fraud', 'investigation', 'scandal',
        'decline', 'loss', 'crash', 'plunge', 'suspend', 'delay',
        'warning', 'miss', 'downgrade', 'concern', 'probe',
        'bankrott', 'klage', 'betrug', 'untersuchung', 'skandal'
    ];
    
    const positiveKeywords = [
        'profit', 'growth', 'beat', 'surge', 'record', 'success',
        'expansion', 'partnership', 'innovation', 'breakthrough',
        'upgrade', 'raise', 'exceed', 'strong', 'gain',
        'gewinn', 'wachstum', 'erfolg', 'rekord'
    ];
    
    const neutralKeywords = [
        'filing', 'report', 'announcement', 'presentation',
        'merger', 'acquisition', 'conference', 'meeting',
        'dividend', 'earnings', 'financial', 'quarter'
    ];
    
    if (criticalKeywords.some(kw => text.includes(kw))) return 'critical';
    if (positiveKeywords.some(kw => text.includes(kw))) return 'positive';
    if (neutralKeywords.some(kw => text.includes(kw))) return 'neutral';
    
    return 'none';
}

// 1. SEC EDGAR Filings abrufen
async function fetchSECFilings(company) {
    if (!company.cik) return null;
    
    try {
        // SEC EDGAR RSS Feed für das Unternehmen
        const cikPadded = company.cik.padStart(10, '0');
        const url = `https://data.sec.gov/cik-lookup-data.txt`;
        
        // Alternativ: Nutze SEC JSON API
        const secUrl = `https://data.sec.gov/submissions/CIK${cikPadded}.json`;
        
        const response = await fetch(CORS_PROXY + encodeURIComponent(secUrl), {
            headers: {
                'User-Agent': 'Investment Dashboard contact@example.com'
            }
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        
        if (data.filings && data.filings.recent && data.filings.recent.form.length > 0) {
            const latestFiling = {
                title: `${data.filings.recent.form[0]}: ${data.filings.recent.primaryDocument[0] || 'Filing'}`,
                url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${company.cik}&type=&dateb=&owner=exclude&count=40`,
                source: 'SEC EDGAR',
                publishedAt: data.filings.recent.filingDate[0],
                impact: analyzeImpact(data.filings.recent.form[0], '')
            };
            
            return latestFiling;
        }
        
        return null;
    } catch (error) {
        console.error(`SEC-Fehler für ${company.name}:`, error);
        return null;
    }
}

// 2. Yahoo Finance News abrufen
async function fetchYahooFinance(company) {
    try {
        const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${company.ticker}&quotesCount=1&newsCount=3`;
        
        const response = await fetch(CORS_PROXY + encodeURIComponent(url));
        
        if (!response.ok) return null;
        
        const data = await response.json();
        
        if (data.news && data.news.length > 0) {
            const article = data.news[0];
            return {
                title: article.title,
                url: article.link,
                source: 'Yahoo Finance',
                publishedAt: new Date(article.providerPublishTime * 1000).toLocaleDateString('de-DE'),
                impact: analyzeImpact(article.title, article.summary || '')
            };
        }
        
        return null;
    } catch (error) {
        console.error(`Yahoo-Fehler für ${company.name}:`, error);
        return null;
    }
}

// 3. Google Finance News (Fallback)
async function fetchGoogleFinance(company) {
    try {
        // Google Finance RSS Feed
        const url = `https://www.google.com/finance/quote/${company.ticker}:${company.exchange}`;
        
        const response = await fetch(CORS_PROXY + encodeURIComponent(url));
        
        if (!response.ok) return null;
        
        const html = await response.text();
        
        // Einfaches Parsing der ersten News-Überschrift
        const newsMatch = html.match(/<div class="[^"]*Yfwt5[^"]*">([^<]+)<\/div>/);
        
        if (newsMatch) {
            return {
                title: newsMatch[1],
                url: url,
                source: 'Google Finance',
                publishedAt: new Date().toLocaleDateString('de-DE'),
                impact: analyzeImpact(newsMatch[1], '')
            };
        }
        
        return null;
    } catch (error) {
        console.error(`Google Finance Fehler für ${company.name}:`, error);
        return null;
    }
}

// 4. London Stock Exchange RNS (für UK-Aktien)
async function fetchLSERNS(company) {
    if (!company.ric) return null;
    
    try {
        const url = `https://www.londonstockexchange.com/rss/market-news-home.rss`;
        
        const response = await fetch(CORS_PROXY + encodeURIComponent(url));
        
        if (!response.ok) return null;
        
        const xmlText = await response.text();
        
        // Einfaches XML-Parsing für RSS
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');
        const items = xml.querySelectorAll('item');
        
        // Suche nach Einträgen mit dem Ticker
        for (let item of items) {
            const title = item.querySelector('title')?.textContent;
            if (title && title.includes(company.ticker)) {
                return {
                    title: title,
                    url: item.querySelector('link')?.textContent || '',
                    source: 'London Stock Exchange',
                    publishedAt: new Date(item.querySelector('pubDate')?.textContent).toLocaleDateString('de-DE'),
                    impact: analyzeImpact(title, '')
                };
            }
        }
        
        return null;
    } catch (error) {
        console.error(`LSE-Fehler für ${company.name}:`, error);
        return null;
    }
}

// Hauptfunktion: Hole News aus allen Quellen
async function fetchCompanyNews(company) {
    // Versuche alle Quellen parallel
    const sources = await Promise.allSettled([
        fetchSECFilings(company),
        fetchYahooFinance(company),
        fetchGoogleFinance(company),
        fetchLSERNS(company)
    ]);
    
    // Finde die erste erfolgreiche Quelle mit Daten
    for (let result of sources) {
        if (result.status === 'fulfilled' && result.value) {
            return result.value;
        }
    }
    
    return null;
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
    dashboard.innerHTML = '<p style="text-align: center; color: #999;">Lade Echtzeit-Nachrichten...</p>';
    
    const results = [];
    
    for (const company of companies) {
        const news = await fetchCompanyNews(company);
        results.push({ company, news });
    }
    
    dashboard.innerHTML = '';
    
    results.forEach(result => {
        const card = createCompanyCard(result.company, result.news);
        dashboard.appendChild(card);
    });
}

// Dashboard beim Laden der Seite initialisieren
document.addEventListener('DOMContentLoaded', loadDashboard);
