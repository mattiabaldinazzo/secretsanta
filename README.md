# Secret Santa

Sito statico per organizzare uno scambio di regali Secret Santa. Gira su GitHub Pages, senza server, database o account.

## Cosa fa

- **Estrazione** in un unico giro (A regala a B, B a C, ... fino a tornare ad A): nessuna coppia si scambia il regalo e non ci sono gruppi chiusi. Se le esclusioni rendono impossibile un giro unico, usa più giri.
- **Esclusioni** a coppie: due persone non si pescano a vicenda.
- **Aggiunte dell'ultimo minuto** dopo l'estrazione: la persona nuova entra nel giro esistente. Se G regalava a R, ora G regala al nuovo arrivato e il nuovo arrivato regala a R. Le mail da rifare sono solo 2: quella di G e quella del nuovo arrivato. Puoi indicare subito un partner da escludere.
- **Rimozioni dell'ultimo minuto**: chi regalava alla persona che esce prende il suo destinatario. Cambia una sola mail, al massimo due se serve rispettare le esclusioni.
- **Modifica manuale degli abbinamenti** per l'admin. Il sito controlla che ognuno faccia un solo regalo e ne riceva uno solo, e segnala esclusioni violate e coppie che si scambiano il regalo.
- **Invio mail** dal tuo account, con la conferma di invio sempre a mano:
  - app di posta del computer (link `mailto:`, per esempio Outlook desktop);
  - Outlook.com o Outlook Microsoft 365 nel browser, con la mail già compilata;
  - CSV da importare in MailUp.
- **Stato di ogni mail**: da inviare, da aggiornare (il testo è cambiato dopo l'invio, per esempio per un'aggiunta o una modifica) oppure inviata.
- **Backup** su file, anche cifrato con password (AES-256-GCM, chiave PBKDF2).

## Privacy: perché è sicuro su un repository pubblico

- Nel repository c'è solo codice. Nomi, email e abbinamenti non vengono mai salvati su GitHub.
- I dati restano nel `localStorage` del browser dell'admin. Per spostarli usi il backup su file.
- Il sito non fa richieste di rete. La Content Security Policy blocca ogni connessione (`connect-src 'none'`), quindi niente analytics né tracciamento.
- Le mail partono dal tuo account di posta. Il sito prepara solo il testo.
- Le pagine hanno `noindex` e non mandano il referrer.

Limite da sapere: chi apre il sito su un altro browser trova la pagina vuota, perché ogni browser ha i suoi dati. È voluto.

## Pubblicare su GitHub Pages

1. Porta il codice sul branch `main` (merge della pull request).
2. Su GitHub apri **Settings > Pages**.
3. In **Build and deployment** scegli **Deploy from a branch**, poi `main` e la cartella `/ (root)`, e salva.
4. Dopo circa un minuto il sito è online su `https://mattiabaldinazzo.github.io/secretsanta/`.

## Usare MailUp

1. Nella sezione **Invio mail** clicca **CSV MailUp: solo da inviare** oppure **tutte**.
2. In MailUp importa il file come lista di destinatari. Il separatore è il punto e virgola, la codifica UTF-8.
3. Collega le colonne (`nome`, `destinatario`, `evento`, `data`, `luogo`, `budget`, `messaggio`, `organizzatore`, `oggetto`, `testo`) ai campi personalizzati del tuo account.
4. Nel messaggio usa i campi dinamici di MailUp al posto dei segnaposto, almeno `destinatario`.
5. Dopo il download il sito ti chiede se segnare quelle mail come inviate.

Il CSV contiene gli abbinamenti in chiaro. Cancellalo dopo l'importazione.

## Sviluppo

```
npm test      # test della logica (Node 20 o superiore)
npm start     # server locale su http://localhost:8080
```

Serve un server locale, perché i moduli JavaScript non funzionano aprendo `index.html` come file.

Struttura:

- `index.html`: pagina unica
- `assets/style.css`: stile (colore primario `#CC0000`, tema chiaro e scuro)
- `assets/js/draw.js`: estrazione, controlli, aggiunte e rimozioni
- `assets/js/mail.js`: testo delle mail, link mailto e Outlook, CSV MailUp
- `assets/js/store.js`: salvataggio locale e backup cifrato
- `assets/js/app.js`: interfaccia
- `tests/`: test con `node --test`
