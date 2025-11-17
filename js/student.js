// js/student.js

/* ----- navigazione tab ----- */
$$('.sidebar nav a').forEach((a) => {
    a.addEventListener('click', (e) => {
        e.preventDefault();

        // attivazione tab selezionata
        $$('.sidebar nav a').forEach((x) => x.classList.remove('active'));
        a.classList.add('active');
        switchTab(a.dataset.tab);
    });
});

function switchTab(tab) {
    console.log('switchTab called', {tab});
    // nasconde tutte le tabpages e mostra solo quella selezionata 
    $$('.tabpage').forEach((p) => p.classList.add('hidden'));
    const target = '#tab-' + tab;
    $(target).classList.remove('hidden');
    const titles = {
        book: 'Prenota una lezione filtrando fra quelle disponibili',
        upcoming: 'Visualizza le prossime lezioni prenotate',
        history: 'Visualizza le lezioni passate e lo stato di pagamento',
        payments: 'Visualizza e gestisci i tuoi pagamenti',
    };
    $('#pageTitle').textContent = titles[tab];
}


/* ----- tab per prenotare: API = slots_available.php ----- */
async function loadAvailableSlots(){
    // recupero container
    const container = $('#slotsList');
    container.innerHTML = 'Caricamento slot...';
    
    // recupero filtri
    const filterMode = $('#filterMode').value;
    const filterTutor = $('#filterTutor').value.trim().toLowerCase();

    // recupero dati
    const res = await fetch('../api/slots_available.php');
    const data = await res.json();
    if (!data.success){
        alert('Errore caricamento slots: ' + data.message);
        container.innerHTML = 'Errore nel caricamento degli slot';
        return;
    }

    console.log('API slots:', data.slots);
    console.log('filterMode=', filterMode, 'filterTutor=', filterTutor);

    // costruzione array con slot filtrati
    const filtered = [];
    for (let i = 0; i < data.slots.length; i++){
        const s = data.slots[i];
        if ((filterMode && filterMode !== '' && s.mode !== 'both' && filterMode !== s.mode) || (filterTutor && filterTutor !== '' && !String(s.tutor_name.toLowerCase()).includes(filterTutor)))
            continue;
        filtered.push(s);
    }

    // caso nessuno slot disponibile
    if (filtered.length === 0){
        container.innerHTML = 'Nessuno slot disponibile al momento';
        return;
    }

    // creazione slots
    container.innerHTML = '';
    for (let i = 0; i < filtered.length; i++){
        const s = filtered[i];
        
        // div dello slot
        const wrapper = document.createElement('div');
        wrapper.classList.add('slot');
        wrapper.dataset.slot_id = s.id;
        container.appendChild(wrapper);

        // header = tutor + data
        const head = document.createElement('div');
        head.classList.add('head');
        wrapper.appendChild(head);
        const strong = document.createElement('strong');
        strong.textContent = s.tutor_name;
        head.appendChild(strong);
        head.appendChild(document.createTextNode(displayDate(s.date) + ' ' + formatTime(s.time)));

        // info tutor
        const infoBtn = document.createElement('button');
        infoBtn.textContent = 'i';
        infoBtn.classList.add('btn-small', 'btn-info-icon');

        infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showTutorInfo(s.tutor_id, s.tutor_name);
        });
        head.appendChild(infoBtn);

        // meta = modalità + prezzi
        const meta = document.createElement('div');
        meta.classList.add('meta');
        wrapper.appendChild(meta);
        let priceText = '';
        if (s.mode == 'both')
            priceText = 'online €' + s.cost_online  + ' / presenza €' + s.cost_presenza;
        else if (s.mode == 'online')
            priceText = 'online €' + s.cost_online;
        else priceText = 'presenza €' + s.cost_presenza;
        meta.textContent = priceText;

        // listener prenotazione
        wrapper.addEventListener('click', () => {
            window.bookingAttempt = {tutor_name: s.tutor_name, date: s.date, time: s.time, mode: s.mode, slot_id: s.id};
            openConfirm(s.tutor_name, s.date, s.time, s.mode, s.id);
        });
        console.log('added slot: ' + s.tutor_name + ', ' + s.date + ', ' + s.time + ', ' + s.mode + ', ' + priceText);
    }
}

/* ----- tab prenotazioni future, passate e pagamenti: API = bookings_student.php ----- */
async function loadStats() {
    // recupero container
    const containerUpcoming = $('#upcomingList');
    containerUpcoming.innerHTML = 'Caricamento prenotazioni...';
    const containerHistory = $('#historyList');
    containerHistory.innerHTML = 'Caricamento storico...';
    const containerPayments = $('#paymentsList');
    containerHistory.innerHTML = 'Caricamento pagamenti...';

    // recupero dati
    const res = await fetch('../api/bookings_student.php');
    const data = await res.json();
    if (!data.success) {
        alert('Errore caricamento prenotazioni: ' + data.message);
        containerUpcoming.innerHTML = 'Errore nel caricamento delle prenotazioni';
        return;
    }

    // per ogni prenotazione aggiungo il campo done (passata o futura)
    data.bookings.forEach((s) => {
        s.done = (new Date(s.date + 'T' + s.time) < new Date());
        console.log(s);
    });

    // creazione slots per upcoming/history a seconda del campo 'done'
    containerUpcoming.innerHTML = '';
    containerHistory.innerHTML = '';
    containerPayments.innerHTML = '';
    let past = 0;
    let next = 0;
    let toPay = 0;
    for (let i = 0; i < data.bookings.length; i++) {
        const s = data.bookings[i];
        let container;
        if (s.done){
            container = containerHistory;
            past++;
        }
        else {
            container = containerUpcoming;
            next++;
        }

        // div dello slot
        const wrapper = document.createElement('div');
        wrapper.classList.add('slot');
        container.appendChild(wrapper);

        // header = tutor + data
        const head = document.createElement('div');
        head.classList.add('head');
        wrapper.appendChild(head);
        const strong = document.createElement('strong');
        strong.textContent = s.tutor_name;
        head.appendChild(strong);
        head.appendChild(document.createTextNode(displayDate(s.date) + ' ' + formatTime(s.time)));
        
        // meta = modalità + prezzi
        const meta = document.createElement('div');
        meta.classList.add('meta');
        wrapper.appendChild(meta);
        let mode, price;
        if (s.chosenMode == 0){
            mode = s.mode;
            price = (s.mode === 'online') ? s.cost_online : s.cost_presenza;
        }
        else if (s.chosenMode == 1){
            mode = 'online';
            price = s.cost_online;
        }
        else {
            mode = 'presenza';
            price = s.cost_presenza;
        }

        if (s.done && !s.paid)
            toPay += parseFloat(price);
        meta.textContent = 'Modalità: ' + mode + ' • Prezzo: ' + price;

        if (!s.done) {
            // bottone di cancellazione (solo per prenotazioni future)
            const btn = document.createElement('button');
            btn.classList.add('btn-small');
            btn.textContent = 'Cancella';
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                const res = await fetch('../api/bookings_cancel.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ booking_id: s.booking_id })
                });
                const data = await res.json();

                if (!data.success) {
                    alert('Errore cancellazione: ' + data.message);
                    btn.disabled = false;
                    return;
                }

                alert('Prenotazione cancellata con successo!');
                await loadAvailableSlots();
                await loadStats();
            });
            wrapper.appendChild(btn);
        }
        else {
            // stato pagamento (solo per prenotazioni passate)
            const status = document.createElement('span');
            status.textContent = s.paid ? 'Pagato' : 'Non pagato';
            status.style.fontWeight = 'bold';
            status.style.color = s.paid ? 'green' : 'red';
            wrapper.appendChild(status);
        }
    }

    // creazione slots per payments
    if (toPay > 0) {
        // crea array con prenotazioni da pagare raggruppate per tutor
        const tutorGrouped = {};
        for (const s of data.bookings) {
            if (!s.done || s.paid)
                continue;
            if (!tutorGrouped[s.tutor_name])
                tutorGrouped[s.tutor_name] = [];
            tutorGrouped[s.tutor_name].push(s);
        }
        console.log('tutorGrouped:', tutorGrouped);

        // per ogni tutor crea uno slot
        for (const tutor in tutorGrouped) {
            const bookings = tutorGrouped[tutor];
            const wrapper = document.createElement('div');
            wrapper.classList.add('slot');
            containerPayments.appendChild(wrapper);

            // header = tutor
            const head = document.createElement('div');
            head.classList.add('head');
            wrapper.appendChild(head);
            const strong = document.createElement('strong');
            strong.textContent = tutor;
            head.appendChild(strong);

            // meta = lista pagamenti da fare
            const meta = document.createElement('div');
            meta.classList.add('meta');
            wrapper.appendChild(meta);
            let total = 0;
            const ul = document.createElement('ul');
            for (const s of bookings) {
                let mode, price;
                if (s.chosenMode == 0){
                    mode = s.mode;
                    price = (s.mode === 'online') ? s.cost_online : s.cost_presenza;
                }
                else if (s.chosenMode == 1){
                    mode = 'online';
                    price = s.cost_online;
                }
                else {
                    mode = 'presenza';
                    price = s.cost_presenza;
                }
                total += parseFloat(price);

                const li = document.createElement('li');
                li.textContent = displayDate(s.date) + ' ' + formatTime(s.time) + ' • ' + mode + ' • €' + price;
                ul.appendChild(li);
            }
            meta.appendChild(ul);
            const totalP = document.createElement('p');
            totalP.style.fontWeight = 'bold';
            totalP.textContent = 'Totale da pagare: €' + total.toFixed(2);
            meta.appendChild(totalP);

            /* todo
            // bottone di pagamento
            const btn = document.createElement('button');
            btn.classList.add('btn-small');
            btn.textContent = 'Paga ora';
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                const res = await fetch('../api/payments_create.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tutor_name: tutor })
                });
                const data = await res.json();

                if (!data.success) {
                    alert('Errore pagamento: ' + data.message);
                    btn.disabled = false;
                    return;
                }

                alert('Pagamento effettuato con successo!');
                await loadStats();
            });
            wrapper.appendChild(btn);
            */
        }
    }

    // aggiornamento statistiche
    $('#statUpcoming').textContent = next;
    $('#statHours').textContent = past;
    $('#statDue').textContent = '€' + toPay;

    // messaggi in caso di container vuoti
    if (next === 0)
        containerUpcoming.innerHTML = 'Nessuna prenotazione futura';
    if (past === 0)
        containerHistory.innerHTML = 'Nessuna prenotazione passata';
    if (toPay === 0)
        containerHistory.innerHTML = 'Nessun pagamento in sospeso';
}



/* ----- gestione slot ----- */
$('#applyFilters').addEventListener('click', () => loadAvailableSlots());


/* ----- gestione modal  ----- */
const modal = $('#modal');
const modalBody = $('#modalBody');
const modalTitle = $('#modalTitle');
const confirmBtn = $('#modalConfirm');
const cancelBtn = $('#modalCancel');

function openConfirm(tutor, date, time, mode) {
    console.log('openConfirm called', { tutor, date, time, mode });

    // --- RESET COMPLETO STATO MODALE ---
    modalTitle.textContent = 'Conferma prenotazione'; // Ripristina titolo
    cancelBtn.textContent = 'Annulla'; // Ripristina testo annulla

    // Ripristina bottone conferma
    confirmBtn.classList.remove('hidden-force'); // Rimuovi la classe che lo nascondeva
    confirmBtn.style.display = ''; // Rimuovi eventuali stili inline residui
    confirmBtn.disabled = true; // Disabilita in attesa di scelta (se serve)
    // -----------------------------------

    modalBody.innerHTML = '';
    cancelBtn.disabled = false;

    const info = `<p>Stai per prenotare con <strong>${escapeHtml(tutor)}</strong> il <strong>${displayDate(date)}</strong> alle <strong>${formatTime(time)}</strong>.</p>`;

    if (mode === 'both') {
        modalBody.innerHTML = info + `
            <div>
                <p>Seleziona la modalità:</p>
                <div class="mode-chooser">
                    <input type="radio" id="mOn" name="chosenMode" value="online"><label for="mOn">Online</label>
                    <input type="radio" id="mPre" name="chosenMode" value="presenza"><label for="mPre">In presenza</label>
                </div>
            </div>`;

        // Listener per abilitare conferma solo dopo scelta
        const radios = modalBody.querySelectorAll('input[name="chosenMode"]');
        radios.forEach(r => {
            r.addEventListener('change', () => confirmBtn.disabled = false);
        });
    }
    else {
        modalBody.innerHTML = info + `<p>Modalità: <strong>${escapeHtml(mode)}</strong></p>`;
        confirmBtn.disabled = false; // Abilita subito se non c'è scelta
    }

    modal.classList.remove('hidden');
}

/* ----- Funzione per mostrare dettagli tutor ----- */
async function showTutorInfo(tutorId, tutorName) {

    // Setup iniziale del Modale
    modalTitle.textContent = 'Profilo Tutor: ' + tutorName;
    modalBody.innerHTML = 'Caricamento profilo...';

    // Nascondi il bottone di conferma prenotazione
    confirmBtn.classList.add('hidden-force');
    cancelBtn.textContent = 'Chiudi';
    modal.classList.remove('hidden');

    // Chiamata API diretta senza blocco try-catch
    const res = await fetch('../api/tutor_details.php?id=' + tutorId);
    const data = await res.json();

    // Gestione errore API (es. tutor non trovato)
    if (!data.success) {
        modalBody.innerHTML = '<p class="error">' + data.message + '</p>';
        return;
    }

    const t = data.tutor;
    const subs = data.subjects;

    // Pulisce il messaggio di caricamento
    modalBody.innerHTML = '';

    // Costruzione contenuto
    const descSection = document.createElement('div');
    descSection.className = 'tutor-detail-section';
    descSection.innerHTML = `<strong>Chi sono:</strong><p class="tutor-desc">${t.description || 'Nessuna descrizione.'}</p>`;
    modalBody.appendChild(descSection);

    const subSection = document.createElement('div');
    subSection.className = 'tutor-detail-section';
    let tagsHtml = subs.length > 0 ? subs.map(s => `<span class="badge info">${s}</span>`).join(' ') : '<span>Nessuna materia.</span>';
    subSection.innerHTML = `<strong>Materie insegnate:</strong><div class="tutor-tags">${tagsHtml}</div>`;
    modalBody.appendChild(subSection);

    const ratesSection = document.createElement('div');
    ratesSection.className = 'tutor-detail-section';
    ratesSection.innerHTML = `<strong>Tariffe:</strong><ul class="tutor-rates"><li>Online: €${t.cost_online}</li><li>In presenza: €${t.cost_presenza}</li></ul>`;
    modalBody.appendChild(ratesSection);
}

// handler bottoni
cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
confirmBtn.addEventListener('click', async () => {
    // disabilita bottone per evitare doppio click
    confirmBtn.disabled = true;

    // recupera modalità scelta
    let chosenMode = 0;
    if (window.bookingAttempt['mode'] === 'both') {
        const radios = $$('input[name="chosenMode"]');
        chosenMode = radios[0].checked ? 1 : 2;
    }

    // POST alla API di prenotazione
    const res = await fetch('../api/bookings_create.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_id: window.bookingAttempt['slot_id'], mode: chosenMode })
    });
    const data = await res.json();

    // fallimento
    if (!data.success) {
        alert('Errore prenotazione: ' + data.message);
        confirmBtn.disabled = false;
        cancelBtn.textContent = 'Chiudi';
        return;
    }

    // successo
    modal.classList.add('hidden');
    alert('Prenotazione effettuata con successo!');
    await loadAvailableSlots();
    await loadStats();
});


/* ----- logout ----- */
$('#logoutBtn').addEventListener('click', async () => {
    await fetch("../api/logout.php");
    window.location.href = '../index.html';
});


/* ----- inizializzazione ----- */
async function init() {
    // recupero dati sessione e check
    const res = await fetch('../api/session.php');
    const data = await res.json();
    if (!data.logged || data.role !== 'student'){
        // non loggato come studente, redirect alla login
        window.location.href = '../index.html';
        return;
    }
    $('#studentName').textContent = 'Ciao, ' + data.username;

    // caricamento vari pannelli
    await loadAvailableSlots();
    await loadStats();
}
init();