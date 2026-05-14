const CONFIG = {
    REPO: "AndrewVeda/a-quote-a-day",
    DIR: "quotes",
    PER_PAGE: 20
};

let DB = []; 
let currentView = [];
let deckIdx = 0;

/* --- KEYBOARD ENGINE --- */
document.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('deckOverlay');
    if (!overlay || !overlay.classList.contains('open')) return;

    if (e.key === "Escape") {
        closeDeck();
    } else if (e.key === "ArrowRight") {
        if (deckIdx < currentView.length - 1) {
            deckIdx++;
            updateDeckPosition();
        }
    } else if (e.key === "ArrowLeft") {
        if (deckIdx > 0) {
            deckIdx--;
            updateDeckPosition();
        }
    }
});

function closeDeck() {
    document.getElementById('deckOverlay').classList.remove('open');
    document.body.style.overflow = 'auto';
    window.history.replaceState(null, null, window.location.pathname);
}

/* --- CORE INITIALIZATION --- */
document.addEventListener('DOMContentLoaded', async () => {
    await fetchArchive();
    setupNavigation();
    setupSwipeEngine();
    
    const urlParams = new URLSearchParams(window.location.search);
    const quoteId = urlParams.get('id');
    if (quoteId) {
        jumpToQuote(quoteId);
    }
});

async function fetchArchive() {
    const mainContent = document.getElementById('mainContent');
    try {
        const response = await fetch(`https://api.github.com/repos/${CONFIG.REPO}/contents/${CONFIG.DIR}`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const files = await response.json();
        const mdFiles = files.filter(f => f.name.endsWith('.md'));

        const promises = mdFiles.map(async (file, index) => {
            try {
                const raw = await fetch(file.download_url).then(r => r.text());
                return parseEntry(raw, file.name, index + 1);
            } catch (e) { return null; }
        });

        DB = (await Promise.all(promises)).filter(Boolean);
        DB.sort((a, b) => b.date - a.date);
        
        if (DB.length > 0) {
            document.getElementById('mastCount').innerText = `${DB.length} Quotes`;
            renderGrid(DB); 
        } else {
            throw new Error('Archive is empty');
        }

    } catch (err) {
        console.error("Archive Fetch Error:", err);
        mainContent.innerHTML = `<div class="empty-state" style="padding:40px; text-align:center;">
            <p>Syncing Academic Archive...</p>
            <button onclick="location.reload()" class="btn-premium" style="margin-top:20px;">Retry Connection</button>
        </div>`;
    } finally {
        const loader = document.getElementById('loader');
        if(loader) loader.style.display = 'none';
    }
}

function parseEntry(md, filename, fallbackId) {
    const match = md.match(/---([\s\S]*?)---/);
    if (!match) return null;

    const data = {};
    match[1].split('\n').forEach(line => {
        const i = line.indexOf(':');
        if (i !== -1) {
            data[line.substring(0, i).trim()] = line.substring(i + 1).trim();
        }
    });

    const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
    return {
        id: data.id || fallbackId,
        quote: data.quote || "Text missing.",
        author: data.author || "Unknown",
        contributor: data.contributor || "Student",
        department: data.department || "English",
        about: data.what_it_means_to_me || data.about || "",
        date: new Date(dateMatch ? dateMatch[1] : 0),
        dateStr: dateMatch ? dateMatch[1] : 'Unknown'
    };
}

/* --- DECK ENGINE --- */
function openDeck(quotes, startIdx) {
    currentView = quotes;
    deckIdx = startIdx;
    
    const track = document.getElementById('deckTrack');
    track.innerHTML = '';

    quotes.forEach((q, i) => {
        const slide = document.createElement('div');
        slide.className = 'deck-slide';
        
        slide.innerHTML = `
            <div class="deck-card" id="export-target-${i}">
                <div class="dc-content-scroll">
                    <div class="dc-kicker">QUOTE #${q.id} · ${q.dateStr.toUpperCase()}</div>
                    <div class="dc-quote">"${q.quote}"</div>
                    <div class="dc-author">${q.author}</div>
                    <div class="dc-role">Quoted Author</div>
                    
                    <div class="dc-contrib-envelope">
                        <div class="dc-contrib-label">CONTRIBUTED BY</div>
                        <div class="dc-contrib-name">${q.contributor}</div>
                        <div class="dc-contrib-dept">${q.department}</div>
                        
                        ${q.about ? `
                            <div style="height:1px; background:var(--gold-border); margin:20px 0;"></div>
                            <div class="dc-contrib-label">WHAT THIS MEANS TO ME</div>
                            <div class="dc-reflection">"${q.about}"</div>
                        ` : ''}
                    </div>
                </div>

                <div class="deck-action-row no-export">
                    <button class="btn-premium-action btn-whatsapp" onclick="shareToWhatsApp(${i})">
                        📲 Share on WhatsApp
                    </button>
                    <a href="https://andrewveda.github.io/a-quote-a-day/submissions" target="_blank" class="btn-premium-action btn-submit">
                        ✏️ Add a Quote
                    </a>
                </div>
                <div class="giscus-mount" id="giscus-slot-${i}" style="margin-top:20px;"></div>
            </div>
        `;
        track.appendChild(slide);
    });

    document.getElementById('deckOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    updateDeckPosition(false);
}

function updateDeckPosition(animate = true) {
    const track = document.getElementById('deckTrack');
    if (!track) return;
    
    track.style.transition = animate ? 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)' : 'none';
    track.style.transform = `translateX(${-deckIdx * 100}vw)`;
    
    const counter = document.getElementById('deckCounter');
    if (counter) counter.innerText = `${deckIdx + 1} / ${currentView.length}`;

    const q = currentView[deckIdx];
    if (q) window.history.replaceState(null, null, `?id=${q.id}`);

    loadGiscus(deckIdx);
}

/* --- UTILITIES --- */
function loadGiscus(idx) {
    const slot = document.getElementById(`giscus-slot-${idx}`);
    if (!slot || slot.innerHTML !== '') return;

    const script = document.createElement('script');
    script.src = "https://giscus.app/client.js";
    script.setAttribute("data-repo", CONFIG.REPO);
    script.setAttribute("data-repo-id", "R_kgDORI8-yw");
    script.setAttribute("data-category", "General");
    script.setAttribute("data-category-id", "DIC_kwDORI8-y84C1-Jq");
    script.setAttribute("data-mapping", "specific");
    script.setAttribute("data-term", `${currentView[idx].author} — ${currentView[idx].contributor}`);
    script.setAttribute("data-theme", "preferred_color_scheme");
    script.crossOrigin = "anonymous";
    script.async = true;
    slot.appendChild(script);
}

async function shareToWhatsApp(idx) {
    const q = currentView[idx];
    const btn = event.currentTarget;
    const originalContent = btn.innerHTML;
    btn.innerHTML = "<span>Processing...</span>";

    try {
        const stage = document.getElementById('share-canvas-container');
        stage.innerHTML = `
            <div id="poster-export" style="width:540px; min-height:960px; background:#faf7f2; padding:60px; display:flex; flex-direction:column; border-top:10px solid #c9a84c;">
                <div style="font-size:32px; line-height:1.4; border-left:4px solid #c9a84c; padding-left:20px; margin-bottom:40px;">"${q.quote}"</div>
                <div style="font-weight:900; font-size:36px;">${q.author}</div>
                <div style="background:rgba(201,168,76,0.1); padding:30px; margin-top:40px;">
                    <div style="font-size:12px; font-weight:700;">REFLECTION BY ${q.contributor}</div>
                    <div style="font-style:italic; margin-top:10px;">${q.about}</div>
                </div>
            </div>`;

        const canvas = await html2canvas(document.getElementById('poster-export'), { scale: 2 });
        const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9));
        const file = new File([blob], `Quote-${q.id}.jpg`, { type: 'image/jpeg' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], text: `Shared from A Quote A Day` });
        } else {
            const link = document.createElement('a');
            link.href = canvas.toDataURL();
            link.download = `Quote-${q.id}.jpg`;
            link.click();
        }
    } catch (e) { console.error(e); }
    btn.innerHTML = originalContent;
}

function setupSwipeEngine() {
    let startX = 0, dist = 0;
    const area = document.getElementById('deckOverlay');
    area.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, {passive: true});
    area.addEventListener('touchmove', e => { dist = e.touches[0].clientX - startX; }, {passive: true});
    area.addEventListener('touchend', () => {
        if (Math.abs(dist) > 80) {
            if (dist < 0 && deckIdx < currentView.length - 1) deckIdx++;
            if (dist > 0 && deckIdx > 0) deckIdx--;
            updateDeckPosition();
        }
        dist = 0;
    });
}

function setupNavigation() {
    document.querySelectorAll('.quick-tab').forEach(btn => {
        btn.onclick = () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.quick-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tab === 'all' ? renderGrid(DB) : openDirectory(tab);
        };
    });
    document.getElementById('deckClose').onclick = closeDeck;
}

function renderGrid(quotes) {
    const container = document.getElementById('mainContent');
    container.innerHTML = '<div class="col-grid"></div>';
    const grid = container.querySelector('.col-grid');
    quotes.forEach((q, i) => {
        const card = document.createElement('div');
        card.className = 'q-card';
        card.innerHTML = `<div class="q-card-text">"${q.quote}"</div><div>— ${q.author}</div>`;
        card.onclick = () => openDeck(quotes, i);
        grid.appendChild(card);
    });
}

function openDirectory(category) {
    const list = document.getElementById('dirList');
    list.innerHTML = '';
    const index = {};
    DB.forEach(item => {
        const key = category === 'authors' ? item.author : (category === 'contributors' ? item.contributor : item.department);
        if (!index[key]) index[key] = [];
        index[key].push(item);
    });
    Object.keys(index).sort((a,b) => index[b].length - index[a].length).forEach(name => {
        const row = document.createElement('div');
        row.className = 'dir-row';
        row.innerHTML = `<strong>${name}</strong> <span class="dir-badge">${index[name].length}</span>`;
        row.onclick = () => { renderGrid(index[name]); document.getElementById('dirPanel').classList.remove('open'); };
        list.appendChild(row);
    });
    document.getElementById('dirPanel').classList.add('open');
}

function jumpToQuote(id) {
    const found = DB.find(q => String(q.id) === String(id));
    if (found) openDeck(DB, DB.indexOf(found));
}
