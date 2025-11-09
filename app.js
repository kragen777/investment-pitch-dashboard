// NewsAPI Key - Bitte durch eigenen Key ersetzen
const NEWS_API_KEY = 'DEIN_NEWSAPI_KEY_HIER';

// Liste der zu überwachenden Unternehmen
const companies = [
    { name: 'Comstock', query: 'Comstock mining OR Comstock Inc' },
    { name: 'Duolingo', query: 'Duolingo language learning' },
    { name: 'ANGI', query: 'ANGI HomeServices OR Angi Inc' },
    { name: 'Kaspi.kz', query: 'Kaspi.kz Kazakhstan fintech' },
    { name: 'Litigation Capital Management', query: 'Litigation Capital Management' },
    { name: 'IAC Inc.', query: 'IAC InterActiveCorp' },
    { name: 'Northern Dynasty Minerals', query: 'Northern Dynasty Pebble Mine' },
    { name: 'Panthera Resources', query: 'Panthera Resources mining' },
    { name: 'MercadoLibre', query: 'MercadoLibre Latin America' },
    { name: 'Diageo PLC', query: 'Diageo spirits alcohol' }
];

// Funktion zur Analyse der Impact-Relevanz
function analyzeImpact(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    
    // Kritische Keywords (negativ)
    const criticalKeywords = [
        'bankruptcy', 'lawsuit', 'scandal', 'fraud', 'investigation',
        'decline', 'loss', 'crash', 'plunge', 'collapse', 'suspended',
        'konkurs', 'klage', 'skandal', 'betrug', 'untersuchung',
        'rückgang', 'verlust', 'absturz', 'einbruch'
    ];
    
    // Positive Keywords
    const positiveKeywords = [
        'growth', 'profit', 'success', 'expansion', 'partnership',
        'innovation', 'breakthrough', 'record', 'surge', 'soar',
        'wachstum', 'gewinn', 'erfolg', 'expansion', 'partnerschaft',
        'innovation', 'durchbruch', 'rekord'
    ];
    
    // Neutrale wichtige Keywords
    const neutralKeywords = [
        'merger', 'acquisition', 'launch', 'report', 'announcement',
        'fusion', 'übernahme', 'einführung', 'bericht', 'ankündigung'
    ];
    
    // Prüfe auf kritische Keywords
    if (criticalKeywords.some(keyword => text.includes(keyword))) {
        return 'critical';
    }
    
    // Prüfe auf positive Keywords
    if (positiveKeywords.some(keyword => text.includes(keyword))) {
        return 'positive';
    }
    
    // Prüfe auf neutrale Keywords
    if (neutralKeywords.some(keyword => text.includes(keyword))) {
        return 'neutral';
    }
    
    return 'none';
}

// Funktion zum Laden der News für ein Unternehmen
async function fetchCompanyNews(company) {
    try {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(company.query)}&language=de&sortBy=publishedAt&pageSize=1&apiKey=${NEWS_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'ok' && data.articles && data.articles.length > 0) {
            const article = data.articles[0];
            const impact = analyzeImpact(article.title, article.description || '');
            
            return {
                title: article.title,
                url: article.url,
                source: article.source.name,
                publishedAt: new Date(article.publishedAt).toLocaleDateString('de-DE'),
                impact: impact
            };
        }
        
        return null;
    } catch (error) {
        console.error(`Fehler beim Laden der News für ${company.name}:`, error);
        return null;
    }
}

// Funktion zum Erstellen einer Company Card
function createCompanyCard(company, news) {
    const card = document.createElement('div');
    card.className = 'company-card';
    
    const companyName = document.createElement('div');
    companyName.className = 'company-name';
    companyName.textContent = company.name;
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

// Hauptfunktion zum Laden des Dashboards
async function loadDashboard() {
    const dashboard = document.getElementById('dashboard');
    dashboard.innerHTML = '<p style="text-align: center; color: #999;">Lade aktuelle Nachrichten...</p>';
    
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
