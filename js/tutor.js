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

/* ----- tab lezioni passate, future e pagamenti ----- */
async function loadStats() {
    console.log('loadHistory called');
    // recupero container
    const containerHistory = $('#historyList');
    const containerUpcoming = $('#upcomingList');
    const containerPayments = $('#paymentsList');

    // recupero dati
    const res = await fetch('../api/bookings_tutor.php');
    const data = await res.json();
    if (!data.success) {
        alert('Errore caricamento lezioni: ' + data.message);
        container.innerHTML = 'Errore nel caricamento';
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
    let toHave = 0;
    for (let i = 0; i < data.bookings.length; i++) {
        const s = data.bookings[i];
        console.log(s.mode);
        let container;
        if (s.done) {
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
        strong.textContent = s.student_name;
        head.appendChild(strong);
        head.appendChild(document.createTextNode(displayDate(s.date) + ' ' + formatTime(s.time)));

        // meta = modalità + prezzi
        const meta = document.createElement('div');
        meta.classList.add('meta');
        wrapper.appendChild(meta);
        let mode, price;
        if (s.chosenMode == 0) {
            mode = s.mode;
            price = (s.mode === 'online') ? s.cost_online : s.cost_presenza;
        }
        else if (s.chosenMode == 1) {
            mode = 'online';
            price = s.cost_online;
        }
        else {
            mode = 'presenza';
            price = s.cost_presenza;
        }

        if (s.done && !s.paid)
            toHave += parseFloat(price);
        meta.textContent = 'Modalità: ' + mode + ' • Prezzo: ' + price;

        if (s.done) {
            // stato pagamento e bottone per segnare come pagato (solo per lezioni passate)
            const status = document.createElement('span');
            status.textContent = s.paid ? 'Pagato' : 'Non pagato';
            status.style.fontWeight = 'bold';
            status.style.color = s.paid ? 'green' : 'red';
            wrapper.appendChild(status);

            if (!s.paid) {
                const paidBtn = document.createElement('button');
                paidBtn.classList.add('btn-small');
                paidBtn.textContent = 'Segna come pagato';
                paidBtn.addEventListener('click', async () => {
                    console.log('Segna come pagato cliccato');
                    paidBtn.disabled = true;
                    const res = await fetch('../api/pay_single.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ booking_id: s.booking_id })
                    });
                    const data = await res.json();
                    await loadStats();
                });
                wrapper.appendChild(paidBtn);
            }
        }
    }
    /*
    // creazione slots per payments
    if (toHave > 0) {
        // crea array con prenotazioni da pagare raggruppate per studente
        const studentGrouped = {};
        for (const s of data.bookings) {
            if (!s.done || s.paid)
                continue;
            if (!studentGrouped[s.student_name])
                studentGrouped[s.student_name] = [];
            studentGrouped[s.student_name].push(s);
        }
        console.log('studentGrouped:', studentGrouped);

        // per ogni student crea uno slot
        for (const student in studentGrouped) {
            const bookings = studentGrouped[student];
            const wrapper = document.createElement('div');
            wrapper.classList.add('slot');
            containerPayments.appendChild(wrapper);

            // header = student
            const head = document.createElement('div');
            head.classList.add('head');
            wrapper.appendChild(head);
            const strong = document.createElement('strong');
            strong.textContent = student;
            head.appendChild(strong);

            // meta = lista pagamenti da fare
            const meta = document.createElement('div');
            meta.classList.add('meta');
            wrapper.appendChild(meta);
            let total = 0;
            const ul = document.createElement('ul');
            for (const s of bookings) {
                let mode, price;
                if (s.chosenMode == 0) {
                    mode = s.mode;
                    price = (s.mode === 'online') ? s.cost_online : s.cost_presenza;
                }
                else if (s.chosenMode == 1) {
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

            
            // bottone di pagamento
            const btn = document.createElement('button');
            btn.classList.add('btn-small');
            btn.textContent = 'Paga ora';
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                const res = await fetch('../api/payments_create.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ student_name: student })
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
            
        }
    }
        */

    // aggiornamento statistiche
    $('#statUpcoming').textContent = next;
    $('#statHours').textContent = past;
    $('#statDue').textContent = '€' + toHave;

    // messaggi in caso di container vuoti
    if (next === 0)
        containerUpcoming.innerHTML = 'Nessuna prenotazione futura';
    if (past === 0)
        containerHistory.innerHTML = 'Nessuna prenotazione passata';
    if (toHave === 0)
        containerHistory.innerHTML = 'Nessun pagamento in sospeso';
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
