// js/tutor.js

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
    console.log('switchTab called', { tab });
    // nasconde tutte le tabpages e mostra solo quella selezionata 
    $$('.tabpage').forEach((p) => p.classList.add('hidden'));
    const target = '#tab-' + tab;
    $(target).classList.remove('hidden');
    
    const titles = {
        slots: 'Crea una lezione o visualizza quelle disponibili',
        history: 'Visualizza lezioni passate e lo stato di pagamento',
        upcoming: 'Visualizza le prossime lezioni prenotate',
        payments: 'Gestisci i tuoi pagamenti',
        config: 'Configura il tuo account tutor'
    };
    $('#pageTitle').textContent = titles[tab];

    // Caricamento dinamico dati se necessario
    if (tab === 'slots') loadCreatedSlots();
    if (tab === 'history' || tab === 'upcoming' || tab === 'payments') loadStats();
    if (tab === 'config') loadConfig();
}


/* ----- tab slot e gestione modal ----- */
const modal = $('#modal');
const modalSlotDate = $('#slotDate');
const modalSlotTime = $('#slotTime');
const modalSlotMode = $('#slotMode');
const confirmBtn = $('#modalConfirm');
const cancelBtn = $('#modalCancel');

$('#createSlotBtn').addEventListener('click', (e) => {
    e.preventDefault();
    console.log('createSlotBtn clicked');

    // formattazione iniziale del form
    modalSlotDate.innerHTML = '';
    modalSlotTime.innerHTML = '';
    confirmBtn.disabled = false;
    cancelBtn.disabled = false;

    // mostra modal
    modal.classList.remove('hidden');
});

cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
confirmBtn.addEventListener('click', async () => {
    // disabilita bottone per evitare doppio click
    console.log('confirmBtn clicked');
    confirmBtn.disabled = true;

    // recupero dati
    let date = modalSlotDate.value;
    let time = modalSlotTime.value;
    let mode = modalSlotMode.value;
    console.log("Creazione slot, " + date + " " + time + " " + mode);
    
    // controllo dati
    if (!date || !time || !mode || new Date(date + 'T' + time) < new Date()) {
        alert('Errore: dati form non validi');
        confirmBtn.disabled = false;
        return;
    }

    // creazione slot
    const res = await fetch('../api/slots_create.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({date: date, time: time, mode: mode})
    });
    const data = await res.json();

    // fallimento
    if (!data.success) {
        alert('Errore creazione nuovo slot: ' + data.message);
        confirmBtn.disabled = false;
        return;
    }

    // successo
    modal.classList.add('hidden');
    alert('Slot creato con successo!');
    await loadCreatedSlots();
});

async function loadCreatedSlots() {
    console.log('loadCreatedSlots called');
    // recupero container
    const container = $('#slotsList');
    container.innerHTML = 'Caricamento slot...';

    // recupero dati
    const res = await fetch('../api/slots_available.php');
    const data = await res.json();
    if (!data.success) {
        alert('Errore caricamento slots: ' + data.message);
        container.innerHTML = 'Errore nel caricamento degli slot';
        return;
    }

    // filtraggio slot creati dal tutor loggato
    let slots_available = [];
    const sessionRes = await fetch('../api/session.php');
    const sessionData = await sessionRes.json();
    for (const s of data.slots)
        if (s.tutor_id === sessionData.user_id)
            slots_available.push(s);
    console.log({ slots_available });
    if (slots_available.length === 0) {
        container.innerHTML = 'Non hai ancora creato nessuno slot.';
        return;
    }
    
    // creazione slots
    container.innerHTML = '';
    for (let i = 0; i < slots_available.length; i++) {
        const s = slots_available[i];

        // div dello slot
        const wrapper = document.createElement('div');
        wrapper.classList.add('slot');
        wrapper.dataset.slot_id = s.id;
        container.appendChild(wrapper);

        // header = data
        const head = document.createElement('div');
        head.classList.add('head');
        wrapper.appendChild(head);
        const strong = document.createElement('strong');
        strong.textContent = displayDate(s.date) + ' ' + formatTime(s.time);
        head.appendChild(strong);

        // meta = modalità
        const meta = document.createElement('div');
        meta.classList.add('meta');
        let textMode = '';
        if (s.mode === 'both')
            textMode = 'In presenza o online';
        else textMode = s.mode;
        meta.textContent = textMode;
        wrapper.appendChild(meta);

        // delete button
        const btn = document.createElement('button');
        btn.classList.add('btn-small');
        btn.textContent = 'Cancella';
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            const res = await fetch('../api/slots_cancel.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slot_id: s.id })
            });
            const data = await res.json();

            if (!data.success) {
                alert('Errore cancellazione slot: ' + data.message);
                btn.disabled = false;
                return;
            }

            alert('Slot cancellato con successo!');
            await loadCreatedSlots();
        });
        wrapper.appendChild(btn);
    }
}

/* ----- tab statistiche ----- */
async function loadStats() {
    console.log('loadStats called');
    const containerHistory = $('#historyList');
    const containerUpcoming = $('#upcomingList');
    const containerPayments = $('#paymentsList');

    const res = await fetch('../api/bookings_tutor.php');
    const data = await res.json();
    if (!data.success) {
        alert('Errore caricamento lezioni: ' + data.message);
        containerHistory.innerHTML = 'Errore nel caricamento';
        return;
    }

    containerUpcoming.innerHTML = '';
    containerHistory.innerHTML = '';
    containerPayments.innerHTML = '';

    let past = 0;
    let next = 0;
    let toHave = 0;

    // Raggruppamento per studenti
    const paymentsByStudent = {};

    for (let i = 0; i < data.bookings.length; i++) {
        const s = data.bookings[i];
        const isDone = (new Date(s.date + 'T' + s.time) < new Date());
        const isPaid = (s.paid == 1); // check robusto int/string

        let mode, price;
        if (s.chosenMode == 0) {
            mode = s.mode;
            price = (s.mode === 'online') ? s.cost_online : s.cost_presenza;
        } else if (s.chosenMode == 1) {
            mode = 'online';
            price = s.cost_online;
        } else {
            mode = 'presenza';
            price = s.cost_presenza;
        }

        /* --- 1. Lista Storico e Future --- */
        let container;
        if (isDone) {
            container = containerHistory;
            past++;
        } else {
            container = containerUpcoming;
            next++;
        }

        const wrapper = document.createElement('div');
        wrapper.classList.add('slot');
        container.appendChild(wrapper);

        const head = document.createElement('div');
        head.classList.add('head');
        wrapper.appendChild(head);
        const strong = document.createElement('strong');
        strong.textContent = s.student_name;
        head.appendChild(strong);
        head.appendChild(document.createTextNode(displayDate(s.date) + ' ' + formatTime(s.time)));

        const meta = document.createElement('div');
        meta.classList.add('meta');
        meta.innerHTML = `Modalità: ${mode}<br>Prezzo: €${price}`;
        wrapper.appendChild(meta);

        if (isDone) {
            const status = document.createElement('span');
            status.textContent = isPaid ? 'Pagato' : 'In attesa di pagamento';
            // Unico stile mantenuto: colore stato
            status.style.color = isPaid ? 'green' : '#b00020';
            status.style.fontWeight = 'bold';
            wrapper.appendChild(status);
        }

        /* --- 2. Logica Pagamenti (Raggruppamento) --- */
        if (isDone && !isPaid) {
            toHave += parseFloat(price);

            if (!paymentsByStudent[s.student_name]) {
                paymentsByStudent[s.student_name] = {
                    student_id: s.student_id,
                    total: 0,
                    lessons: []
                };
            }

            paymentsByStudent[s.student_name].total += parseFloat(price);
            paymentsByStudent[s.student_name].lessons.push({
                booking_id: s.booking_id,
                date: s.date,
                time: s.time,
                mode: mode,
                price: price
            });
        }
    }

    /* --- 3. Generazione UI Tab Pagamenti --- */
    if (toHave > 0) {
        for (const [studentName, sData] of Object.entries(paymentsByStudent)) {
            const studentCard = document.createElement('div');
            studentCard.classList.add('slot');
            // Nota: rimossi stili width, cursor, ecc.
            containerPayments.appendChild(studentCard);

            // --- Header Card: Nome + Totale + Tasto Salda Tutto ---
            const head = document.createElement('div');
            head.classList.add('head');
            // Nota: rimossi stili flex, border, padding

            const leftDiv = document.createElement('span');
            leftDiv.innerHTML = `<strong>${studentName}</strong> <span class="badge warn">Totale: €${sData.total.toFixed(2)}</span>`;
            head.appendChild(leftDiv);

            const payAllBtn = document.createElement('button');
            payAllBtn.textContent = 'Salda tutto';
            payAllBtn.classList.add('btn'); // Delega stile al CSS

            payAllBtn.onclick = async () => {
                if (!confirm(`Confermi di voler segnare come pagate TUTTE le lezioni di ${studentName}?`)) return;

                payAllBtn.disabled = true;
                payAllBtn.textContent = '...';

                try {
                    const res = await fetch('../api/pay_all.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ student_id: sData.student_id })
                    });
                    const apiData = await res.json();

                    if (apiData.success) {
                        alert(apiData.message);
                        await loadStats(); // Ricarica
                    } else {
                        alert('Errore: ' + apiData.message);
                        payAllBtn.disabled = false;
                        payAllBtn.textContent = 'Salda tutto';
                    }
                } catch (e) {
                    alert('Errore di connessione');
                    payAllBtn.disabled = false;
                }
            };
            head.appendChild(payAllBtn);
            studentCard.appendChild(head);

            // --- Lista Lezioni Singole ---
            const ul = document.createElement('ul');
            // Nota: rimossi stili list-style, padding

            sData.lessons.forEach(lesson => {
                const li = document.createElement('li');
                // Nota: rimossi stili flex, border, padding

                const infoSpan = document.createElement('span');
                infoSpan.innerHTML = `${displayDate(lesson.date)} ${formatTime(lesson.time)} (${lesson.mode}) - <b>€${lesson.price}</b> `;
                li.appendChild(infoSpan);

                // Bottone Singolo "Salda"
                const singleBtn = document.createElement('button');
                singleBtn.classList.add('btn-small'); // Delega stile al CSS
                singleBtn.textContent = 'Salda';

                singleBtn.onclick = async () => {
                    if (!confirm(`Confermi il pagamento di €${lesson.price} per questa singola lezione?`)) return;

                    singleBtn.disabled = true;
                    singleBtn.textContent = '...';

                    try {
                        const res = await fetch('../api/pay_single.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ booking_id: lesson.booking_id })
                        });
                        const respData = await res.json();
                        if (respData.success) {
                            await loadStats(); // Ricarica
                        } else {
                            alert('Errore: ' + respData.message);
                            singleBtn.disabled = false;
                            singleBtn.textContent = 'Salda';
                        }
                    } catch (e) {
                        alert('Errore di rete');
                        singleBtn.disabled = false;
                        singleBtn.textContent = 'Salda';
                    }
                };

                li.appendChild(singleBtn);
                ul.appendChild(li);
            });
            studentCard.appendChild(ul);
        }
    }

    // Sidebar stats
    $('#statUpcoming').textContent = next;
    $('#statHours').textContent = past;
    $('#statDue').textContent = '€' + toHave.toFixed(2);

    if (next === 0) containerUpcoming.innerHTML = '<div class="empty">Nessuna lezione futura.</div>';
    if (past === 0) containerHistory.innerHTML = '<div class="empty">Nessuna lezione passata.</div>';
    if (toHave === 0) containerPayments.innerHTML = '<div class="empty">Nessun pagamento in sospeso!</div>';
}

/* ----- tab configurazione ----- */
async function loadConfig() {
    console.log('loadConfig called');
    const container = $('#configList');
    container.innerHTML = 'Caricamento configurazione...';
    container.className = '';

    // --- FIX SCROLLING PAGINA GENERALE ---
    // Il css attuale di .main non ha overflow, glielo forziamo qui via JS
    const mainElement = document.querySelector('main');
    if (mainElement) {
        mainElement.style.overflowY = 'auto';
        mainElement.style.height = '100%'; // Assicura che occupi lo spazio
    }
    // -------------------------------------

    const res = await fetch('../api/config_get.php');
    const data = await res.json();

    if (!data.success) {
        alert('Errore caricamento config: ' + data.message);
        container.innerHTML = 'Errore caricamento dati.';
        return;
    }

    const profile = data.profile;
    const allSubs = data.all_subjects;
    const mySubs = data.my_subjects;

    container.innerHTML = '';

    const formWrapper = document.createElement('div');
    formWrapper.classList.add('config-form');
    // Aggiungiamo margine in fondo per essere sicuri che il bottone non sia attaccato al bordo
    formWrapper.style.paddingBottom = '50px';
    container.appendChild(formWrapper);

    // --- A. Descrizione ---
    const groupDesc = document.createElement('div');
    groupDesc.classList.add('form-group');
    const lblDesc = document.createElement('label');
    lblDesc.textContent = 'Descrizione (max 500 car.):';
    const txtDesc = document.createElement('textarea');
    txtDesc.value = profile.description || '';
    txtDesc.rows = 5;
    groupDesc.appendChild(lblDesc);
    groupDesc.appendChild(txtDesc);
    formWrapper.appendChild(groupDesc);

    // --- B. Tariffe ---
    const groupCost = document.createElement('div');
    groupCost.classList.add('form-row');

    // Online
    const divOnline = document.createElement('div');
    divOnline.classList.add('form-group');
    const lblOnline = document.createElement('label');
    lblOnline.textContent = 'Tariffa Online (€):';
    const inpOnline = document.createElement('input');
    inpOnline.type = 'number';
    inpOnline.step = '0.5';
    inpOnline.min = '0';
    inpOnline.value = profile.cost_online;
    divOnline.appendChild(lblOnline);
    divOnline.appendChild(inpOnline);
    groupCost.appendChild(divOnline);

    // Presenza
    const divPres = document.createElement('div');
    divPres.classList.add('form-group');
    const lblPres = document.createElement('label');
    lblPres.textContent = 'Tariffa Presenza (€):';
    const inpPres = document.createElement('input');
    inpPres.type = 'number';
    inpPres.step = '0.5';
    inpPres.min = '0';
    inpPres.value = profile.cost_presenza;
    divPres.appendChild(lblPres);
    divPres.appendChild(inpPres);
    groupCost.appendChild(divPres);

    formWrapper.appendChild(groupCost);

    // --- C. Materie ---
    const groupSub = document.createElement('div');
    groupSub.classList.add('form-group');
    const lblSub = document.createElement('label');
    lblSub.textContent = 'Seleziona le materie che insegni:';
    groupSub.appendChild(lblSub);

    const subContainer = document.createElement('div');
    subContainer.classList.add('checkbox-grid');

    // --- FIX SCROLLING LISTA MATERIE ---
    subContainer.style.maxHeight = '300px';
    subContainer.style.overflowY = 'scroll'; // 'scroll' forza la barra sempre visibile
    subContainer.style.border = '1px solid #ccc';
    subContainer.style.padding = '10px';
    subContainer.style.display = 'block'; // Assicura comportamento a blocco
    // -----------------------------------

    allSubs.forEach(sub => {
        // Creiamo un div wrapper per ogni riga per forzare l'andata a capo
        const row = document.createElement('div');
        row.style.padding = '4px 0';

        const label = document.createElement('label');
        label.classList.add('checkbox-item');
        label.style.cursor = 'pointer';
        label.style.display = 'flex'; // Allinea checkbox e testo
        label.style.alignItems = 'center';

        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.value = sub.id;
        chk.name = 'subjects';
        chk.style.marginRight = '10px'; // Spazio visivo

        if (mySubs.some(myId => myId == sub.id)) {
            chk.checked = true;
        }

        label.appendChild(chk);
        label.appendChild(document.createTextNode(sub.name));

        row.appendChild(label);
        subContainer.appendChild(row);
    });

    groupSub.appendChild(subContainer);
    formWrapper.appendChild(groupSub);

    // --- D. Bottone Salva ---
    const btnSave = document.createElement('button');
    btnSave.textContent = 'Salva Modifiche';
    btnSave.classList.add('btn');
    btnSave.style.marginTop = '20px'; // Spazio extra sopra il bottone

    btnSave.addEventListener('click', async () => {
        const descVal = txtDesc.value.trim();
        const costOnVal = parseFloat(inpOnline.value);
        const costPrVal = parseFloat(inpPres.value);

        const selectedSubs = [];
        formWrapper.querySelectorAll('input[name="subjects"]:checked').forEach(c => {
            selectedSubs.push(c.value);
        });

        if (descVal.length > 500) {
            alert('Descrizione troppo lunga.'); return;
        }
        if (isNaN(costOnVal) || costOnVal < 0 || isNaN(costPrVal) || costPrVal < 0) {
            alert('Tariffe non valide.'); return;
        }
        if (selectedSubs.length === 0) {
            if (!confirm('Nessuna materia selezionata. Continuare?')) return;
        }

        btnSave.disabled = true;
        btnSave.textContent = 'Salvataggio...';

        try {
            const resUpdate = await fetch('../api/config_update.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: descVal,
                    cost_online: costOnVal,
                    cost_presenza: costPrVal,
                    subjects: selectedSubs
                })
            });
            const dataUpdate = await resUpdate.json();

            if (dataUpdate.success) {
                alert('Salvato con successo!');
            } else {
                alert('Errore: ' + dataUpdate.message);
            }
        } catch (e) {
            alert('Errore server');
        }

        btnSave.disabled = false;
        btnSave.textContent = 'Salva Modifiche';
    });

    formWrapper.appendChild(btnSave);
}

/* ----- logout ----- */
$('#logoutBtn').addEventListener('click', async () => {
    await fetch("../api/logout.php");
    window.location.href = '../index.html';
});


/* ----- inizializzazione ----- */
async function init() {
    console.log('init called');
    // recupero dati sessione e check
    const res = await fetch('../api/session.php');
    const data = await res.json();
    if (!data.logged || data.role !== 'tutor') {
        // non loggato come tutor, redirect alla login
        window.location.href = '../index.html';
        return;
    }
    $('#tutorName').textContent = 'Ciao, ' + data.username;

    // caricamento vari pannelli
    await loadCreatedSlots();
    await loadStats();
}
init();
