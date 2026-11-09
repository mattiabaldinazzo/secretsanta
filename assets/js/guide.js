// Pagina Istruzioni: guida completa all'uso del sito.

const SECTIONS = [
  {
    id: 'in-breve',
    title: 'In breve',
    blocks: [
      ['p', "Il Secret Santa è uno scambio di regali: ogni persona fa un regalo a un'altra persona del gruppo, estratta a caso, e nessuno sa chi gli farà il regalo fino allo scambio."],
      ['ol', [
        'Crei un evento e inserisci i dettagli: data, luogo, budget, messaggio.',
        'Aggiungi i partecipanti con nome ed email.',
        'Se serve, imposti le esclusioni: due persone che non devono pescarsi.',
        "Fai l'estrazione.",
        'Invii a ognuno la sua mail dal tuo account di posta, oppure tutte insieme con uno strumento di mail delivery.',
      ]],
      ['p', "Dopo l'estrazione puoi ancora aggiungere o togliere persone e correggere gli abbinamenti a mano. Il sito ti dice sempre quali mail devi inviare o rifare."],
    ],
  },
  {
    id: 'evento',
    title: '1. Crea un evento',
    blocks: [
      ['p', 'Dalla pagina iniziale clicca "Nuovo evento". Si apre la pagina dell\'evento, divisa in 6 sezioni numerate.'],
      ['p', 'Nella sezione Dettagli compili:'],
      ['ul', [
        "Nome evento: compare nell'oggetto e nel testo delle mail (es. Natale in ufficio).",
        "Organizzatore: il tuo nome, firma le mail.",
        'Data dello scambio, luogo e budget: finiscono nella mail.',
        "Messaggio per tutti: un testo libero, per esempio \"portate il regalo incartato\".",
      ]],
      ['p', 'Tutti i campi sono facoltativi. Se lasci vuoto il luogo, la riga "Luogo" sparisce dalla mail. Ogni modifica si salva da sola.'],
    ],
  },
  {
    id: 'partecipanti',
    title: '2. Aggiungi i partecipanti',
    blocks: [
      ['p', 'Servono almeno 3 persone. Non c\'è un limite massimo. Ogni nome deve essere diverso dagli altri: se ci sono due Marco, scrivi "Marco R." e "Marco B.".'],
      ['p', 'Hai due modi per aggiungere persone:'],
      ['ul', [
        'Una alla volta, con il modulo "Aggiungi una persona". Nel campo "Non deve pescare" puoi indicare subito il partner da escludere.',
        'Tutte insieme, con "Incolla una lista di persone": una persona per riga, nome ed email separati da punto e virgola, virgola o tab. Puoi copiare due colonne da Excel e incollarle.',
      ]],
      ['p', 'Esempi di righe valide:'],
      ['pre', 'Mario Rossi; mario@esempio.it\nGiulia Bianchi <giulia@esempio.it>\nLuca, luca@esempio.it'],
      ['p', 'Puoi correggere nome ed email direttamente nella lista. Un\'email non valida diventa rossa e blocca l\'estrazione finché non la correggi.'],
      ['tip', 'Se partecipi anche tu, aggiungiti alla lista come tutti gli altri.'],
    ],
  },
  {
    id: 'esclusioni',
    title: '3. Imposta le esclusioni',
    blocks: [
      ['p', 'Un\'esclusione dice che due persone non si pescano a vicenda. Serve per partner, genitori e figli, o colleghi che si vedono ogni giorno.'],
      ['p', 'Scegli le due persone e clicca "Non si pescano". Per toglierla clicca "Rimuovi".'],
      ['p', 'Troppe esclusioni possono rendere l\'estrazione impossibile: in quel caso il sito te lo dice e ti chiede di toglierne qualcuna.'],
      ['p', 'Le esclusioni aggiunte dopo l\'estrazione non cambiano gli abbinamenti già fatti. Valgono per le aggiunte dell\'ultimo minuto e per una nuova estrazione. Se un abbinamento attuale viola un\'esclusione, vedi un avviso nella sezione Abbinamenti.'],
    ],
  },
  {
    id: 'estrazione',
    title: "4. Fai l'estrazione",
    blocks: [
      ['p', 'Clicca "Fai l\'estrazione". Il sito crea un unico giro: Anna regala a Bruno, Bruno a Carla, Carla a Dario, Dario ad Anna.'],
      ['p', 'Un giro unico ha due vantaggi:'],
      ['ul', [
        'nessuna coppia si fa il regalo a vicenda;',
        'il giro non si spezza in gruppetti chiusi, quindi le aggiunte e le rimozioni dell\'ultimo minuto toccano pochissime persone.',
      ]],
      ['p', 'Se le esclusioni rendono impossibile un giro unico, il sito crea più giri separati e te lo segnala.'],
      ['p', 'L\'estrazione usa il generatore casuale crittografico del browser, lo stesso usato per le password.'],
      ['p', 'Gli abbinamenti sono nascosti. Clicca "Mostra abbinamenti" solo se ti serve: se partecipi anche tu, non guardarli.'],
      ['p', '"Rifai l\'estrazione" ricomincia da capo. Tutti dovranno ricevere una nuova mail e le mail già inviate non saranno più valide.'],
    ],
  },
  {
    id: 'mail',
    title: '5. Invia le mail',
    blocks: [
      ['p', 'Nella sezione Invio mail scegli come inviare:'],
      ['ul', [
        'App di posta del computer: si apre il programma predefinito (Outlook desktop, Mail, Thunderbird) con la mail già scritta.',
        'Outlook.com nel browser: per gli account personali (outlook.com, hotmail.com, live.com).',
        'Outlook Microsoft 365 nel browser: per gli account di lavoro o scuola.',
      ]],
      ['p', 'In tutti e tre i casi la mail parte dal tuo account e sei tu a premere Invia. Il sito prepara solo il testo.'],
      ['p', 'Clicca "Apri la prossima" per lavorare una mail alla volta: si apre la mail della prima persona che deve ancora riceverla. Controlla, premi Invia, torna sul sito e ripeti.'],
      ['p', 'Per ogni persona hai anche:'],
      ['ul', [
        '"Copia": copia destinatario, oggetto e testo negli appunti, da incollare in qualsiasi programma di posta.',
        '"Anteprima": mostra la mail completa.',
        '"Segna inviata" e "Segna da inviare": cambiano lo stato a mano.',
      ]],
      ['h3', 'Stato delle mail'],
      ['ul', [
        'Da inviare: la persona non ha ancora ricevuto la mail.',
        "Da aggiornare: la mail è già partita, ma poi il testo è cambiato (nuovo destinatario dopo un'aggiunta, una rimozione o una modifica manuale, oppure data, luogo o testo modificati). Va inviata di nuovo.",
        'Inviata: la persona ha la versione giusta.',
      ]],
      ['tip', 'Quando apri una mail il sito la segna subito come inviata. Se poi non premi Invia, clicca "Segna da inviare".'],
      ['h3', 'Testo della mail'],
      ['p', 'Apri "Testo della mail" per cambiare oggetto e testo. Puoi usare questi segnaposto, che il sito sostituisce per ogni persona:'],
      ['ul', [
        '{nome}: nome di chi riceve la mail',
        '{destinatario}: persona a cui fare il regalo',
        "{evento}, {data}, {luogo}, {budget}, {messaggio}, {organizzatore}: i dettagli dell'evento",
      ]],
      ['p', 'Le righe con un segnaposto vuoto spariscono. "Ripristina il testo predefinito" torna al testo iniziale.'],
      ['h3', 'Invio con uno strumento di mail delivery'],
      ['p', 'Con molti partecipanti puoi inviare tutte le mail insieme da uno strumento di mail delivery, cioè un servizio per newsletter o invii massivi.'],
      ['ol', [
        'Clicca "Esporta CSV: solo da inviare" oppure "Esporta CSV: tutte".',
        'Importa il file nello strumento come lista di contatti. Il separatore è il punto e virgola, la codifica UTF-8.',
        'Collega le colonne ai campi dello strumento: email, nome, destinatario, evento, data, luogo, budget, messaggio, organizzatore, oggetto, testo.',
        'Nel modello della mail usa i campi personalizzati dello strumento al posto dei segnaposto. Il minimo è il campo "destinatario". In alternativa usa le colonne "oggetto" e "testo", che contengono la mail già completa.',
        'Dopo il download il sito ti chiede se segnare quelle mail come inviate.',
      ]],
      ['tip', 'Il CSV contiene gli abbinamenti in chiaro. Cancellalo dal computer e dallo strumento dopo l\'invio.'],
    ],
  },
  {
    id: 'ultimo-minuto',
    title: "6. Aggiunte e rimozioni dell'ultimo minuto",
    blocks: [
      ['p', 'Dopo l\'estrazione il modulo diventa "Aggiungi all\'ultimo minuto". La persona nuova entra nel giro senza rifare l\'estrazione.'],
      ['p', 'Esempio: Bruno regalava a Carla. Arriva Elena. Ora Bruno regala a Elena ed Elena regala a Carla. Tutti gli altri restano come prima.'],
      ['p', 'Le mail da inviare sono solo due: quella di Elena (nuova) e quella di Bruno (da aggiornare). Il sito te le indica nella sezione Invio mail.'],
      ['p', 'Se indichi un partner in "Non deve pescare", il sito sceglie un punto del giro che rispetta l\'esclusione. Se non ne trova uno, aggiunge comunque la persona e ti chiede di correggere a mano o rifare l\'estrazione.'],
      ['p', 'Per togliere qualcuno clicca "Togli" accanto al suo nome. Chi gli faceva il regalo prende il suo destinatario. Esempio: Bruno regalava a Carla e Carla a Dario. Se esce Carla, Bruno regala a Dario. Cambia una sola mail, al massimo due se serve rispettare un\'esclusione.'],
      ['tip', 'Se la persona che esce aveva già ricevuto la mail, avvisala tu che non partecipa più.'],
    ],
  },
  {
    id: 'modifica',
    title: '7. Modifica gli abbinamenti a mano',
    blocks: [
      ['p', 'Clicca "Modifica a mano" nella sezione Abbinamenti. Per ogni persona scegli da un menu a chi fa il regalo.'],
      ['p', 'Per scambiare due destinatari cambia entrambe le righe. Durante la modifica il sito mostra in tempo reale cosa non va:'],
      ['ul', [
        'Da correggere: qualcuno fa il regalo a se stesso, riceve due regali o non ne riceve nessuno. Non puoi salvare finché non sistemi.',
        "Avvisi: un abbinamento viola un'esclusione o due persone si fanno il regalo a vicenda. Puoi salvare lo stesso, dopo una conferma.",
      ]],
      ['p', 'Le righe modificate sono evidenziate. Dopo il salvataggio le mail delle persone coinvolte diventano "da aggiornare".'],
    ],
  },
  {
    id: 'backup',
    title: '8. Backup e cambio computer',
    blocks: [
      ['p', 'I dati sono salvati nel browser che stai usando. Un altro browser, un altro computer o una finestra in incognito non li vedono.'],
      ['p', 'Per non perdere nulla scarica un backup dalla sezione Backup e privacy. Con una password il file è cifrato (AES-256): senza password nessuno può leggerlo.'],
      ['p', 'Per riprendere l\'evento altrove apri il sito, vai su "Importa un backup" nella pagina iniziale e scegli il file.'],
      ['tip', 'Scarica un backup subito dopo l\'estrazione e dopo ogni modifica importante. Se cancelli i dati di navigazione senza backup, l\'evento è perso.'],
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy',
    blocks: [
      ['ul', [
        'Il sito è fatto solo di file statici su GitHub Pages: non ha server né database.',
        'Nomi, email e abbinamenti restano nel tuo browser. Il codice pubblico su GitHub non contiene nessun dato dei partecipanti.',
        'Il sito non può contattare nessun server: lo impedisce una regola di sicurezza del browser (Content Security Policy). Niente analytics, niente pubblicità, niente tracciamento.',
        'Le mail partono dal tuo account di posta o dal tuo strumento di mail delivery.',
        'Per cancellare tutto usa "Elimina evento", oppure cancella i dati del sito dal browser.',
      ]],
    ],
  },
  {
    id: 'domande',
    title: 'Domande frequenti',
    blocks: [
      ['h3', 'Una persona non ha ricevuto la mail. Cosa faccio?'],
      ['p', 'Controlla l\'email nella lista dei partecipanti e falle controllare la cartella spam. Poi clicca "Riapri" accanto al suo nome e inviala di nuovo.'],
      ['h3', 'Funziona con un numero dispari di persone?'],
      ['p', 'Sì. Il giro funziona con qualsiasi numero da 3 in su.'],
      ['h3', 'Posso partecipare anche io che organizzo?'],
      ['p', 'Sì. Aggiungiti alla lista e non cliccare "Mostra abbinamenti". La tua mail la apri come le altre: leggerai il tuo destinatario, come tutti.'],
      ['h3', 'Il programma di posta taglia il testo.'],
      ['p', 'Alcuni programmi accettano testi brevi nei link mailto. Accorcia il messaggio, oppure usa "Copia" e incolla la mail a mano.'],
      ['h3', 'Outlook nel browser non si apre con la mail compilata.'],
      ['p', 'Verifica di essere connesso all\'account giusto e di aver scelto il tipo corretto (personale o Microsoft 365). In alternativa usa "Copia".'],
      ['h3', 'Ho aperto il sito su un altro computer e non vedo l\'evento.'],
      ['p', 'È normale: i dati stanno solo nel browser dove li hai inseriti. Importa un backup.'],
    ],
  },
];

export function renderGuide(h) {
  const scrollTo = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };
  const block = ([type, content]) => {
    if (type === 'p') return h('p', {}, content);
    if (type === 'h3') return h('h3', { class: 'guide-h3' }, content);
    if (type === 'pre') return h('pre', { class: 'guide-pre' }, content);
    if (type === 'tip') return h('p', { class: 'notice' }, h('strong', {}, 'Consiglio: '), content);
    if (type === 'ul') return h('ul', { class: 'plain-list' }, content.map((c) => h('li', {}, c)));
    if (type === 'ol') return h('ol', { class: 'plain-list' }, content.map((c) => h('li', {}, c)));
    return null;
  };
  return [
    h('nav', { class: 'crumbs', 'aria-label': 'Percorso' }, h('a', { href: '#/' }, 'I miei eventi')),
    h('h1', { class: 'event-title' }, 'Istruzioni'),
    h('p', { class: 'lead' }, 'Come organizzare il Secret Santa passo per passo, dalla creazione dell\'evento all\'invio delle mail.'),
    h('nav', { class: 'panel guide-toc', 'aria-label': 'Indice' },
      h('h2', {}, 'Indice'),
      h('ul', { class: 'plain-list toc-list' }, SECTIONS.map((s) => h('li', {}, h('a', { href: `#g-${s.id}`, onclick: scrollTo(`g-${s.id}`) }, s.title))))),
    SECTIONS.map((s) => h('section', { class: 'panel guide-section', id: `g-${s.id}` },
      h('h2', {}, s.title),
      s.blocks.map(block))),
    h('div', { class: 'actions' },
      h('a', { class: 'btn btn-primary btn-large', href: '#/' }, 'Torna ai tuoi eventi')),
  ];
}
