/**
 * Gestione degli endpoint e avvio del server
 */
const fastify = require('fastify')({ logger: true }); // per il debug
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validateToken, secretKey } = require('./auth'); // Importa il middleware di autenticazione
const { loadUsers, saveUsers, loadSuperUser } = require('./user');
const { loadData, saveData } = require('./data');

// per leggere  il body di una richiesta http Client
const formbody = require('@fastify/formbody');
// Registra il plugin per il parsing del corpo delle richieste
fastify.register(formbody); 


// Avvio la funzione loadSuperUser all'avvio del server
fastify.ready(async () => {
  try {
    // Carica l'utente superuser all'avvio del server
    const superUser = loadSuperUser();
    if (superUser) {
      console.log('Server caricato con successo');
    } 
    else 
    {
      console.log('Nessun utente superuser trovato o errore durante il caricamento.');
    }
  } 
  catch (err) {
    console.error('Errore durante l\'inizializzazione del server:', err);
  }
});


/* REGISTER ENDPOINT */
fastify.post('/register', {
  schema: {
    body: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        password: { type: 'string' },
      },
      required: ['email', 'password'],
    },
  },
}, async (request, reply) => {
  try{
    const { email, password } = request.body;
    let users =  await loadUsers(); // Carica gli utenti dal file JSON

    // Verifica se l'utente esiste già,find metodo di users
    if (users.find(user => user.email === email)) {
      return reply.code(409).send({ message: 'Utente già registrato' });
    }
    // Hash della password prima di salvarla
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    // Calcola l'ID incrementale per il nuovo utente
    const lastUser = users[users.length - 1];
    const newId = lastUser ? lastUser.id + 1 : 1;

    // Crea un nuovo utente
    const user = { id: newId, email: email, password: hashedPassword, role: 'user' };
    users.push(user);
    await saveUsers(users);
    return reply.send({ message: 'Utente registrato con successo' });
  }
  catch(error) {
    return reply.code(500).send({ message: 'Errore durante la registrazione' });
  }
});


 /* LOGIN ENDPOINT */
 fastify.post('/login', {
  schema: {
    body: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        password: { type: 'string' },
      },
      required: ['email', 'password'],
    },
  },
}, async (request, reply) => {
  try{
    const { email, password } = request.body;
    let users = await loadUsers(); 
    // Trova l'utente corrispondente all'email
    const user = users.find(user => user.email === email);

    if (!user) {
      return reply.code(401).send({ message: 'Utente non registrato' });
    }

    // Verifica la password dell'utente
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    if (user.password !== hashedPassword) {
      return reply.code(401).send({ message: 'Credenziali non valide' });
    }

    // Crea il token JWT con i dati dell'utente e lo consegna al Client
    // Includere la password all'interno del token JWT non è una pratica sicura, 
    // poiché il token JWT è generalmente considerato pubblico.
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, secretKey);
    return reply.send({ token });
  } 
  catch (error) {
    return reply.code(500).send({ message: 'Errore durante il login. ' + error});
  }
});


/* DELETE ENDPOINT */
fastify.delete('/delete', {
  schema: {
    body: {
      type: 'object',
      properties: {
        email: { type: 'string' },
      },
      required: ['email'],
    },
  },
  preHandler: [validateToken],
}, async (request, reply) => {
  try {
    const { user } = request;
    const email = user.email; 
    let users = await loadUsers(); 
    let existingData = await loadData(); 

    // Cerca l'utente da eliminare
    const deletedUsers = users.filter(existingUser => existingUser.email === email);

    if (deletedUsers.length === 0) {
      return reply.send({ message: 'Utente inesistente' });
    }

    // Rimuovi l'utente autenticato dall'array degli utenti
    const updatedUsers = users.filter(existingUser => existingUser.email !== email);

    // Salva gli utenti aggiornati nel file JSON
    await saveUsers(updatedUsers);

    // Elimina tutti i dati associati a questa email
    if (existingData[email]) {
      delete existingData[email];
      await saveData(existingData);
    }

    return reply.send({ message: 'Utente eliminato con successo' });

  } 
  catch (error) {
    return reply.code(500).send({ message: 'Errore durante l\'eliminazione dell\'utente ' + error });
  }
});



/* POST DATA ENDPOINT */
fastify.post('/data', {
  schema: {
    body: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        data: { type: 'string' },
        email: { type: 'string' }, // Aggiungi questa se necessario
      },
      required: ['key', 'data'],
    },
  },
  preHandler: validateToken,
}, async (request, reply) => {
  try {
    const { key, data } = request.body;
    // Converti il campo "data" in base64
    const dataBase64 = Buffer.from(data).toString('base64');
    let email;
    if (request.user.role === 'superuser') {
      email = request.body.email || request.user.email;
    }
    else
    {
      email = request.user.email;
    }
    let existingData = await loadData();
    // Se l'oggetto è vuoto lo creo e lo salvo
    if (Object.keys(existingData).length === 0) 
    {
      existingData = { [email]: [{ key, dataBase64 }] };
    } 
    else 
    {
      // se non esistono dati relativi a questa email creo uno spazio riservato 
      if (!existingData[email])
        existingData[email] = [];
      // Verifica se la chiave 'key' esiste già in existingData[email]
      if (existingData[email].some(item => item.key === key))
        return reply.code(409).send({ message: 'Dato già presente' });
      existingData[email].push({ key, dataBase64 });
    }
    await saveData(existingData);

    return reply.send({ message: 'Dato salvato con successo' });
  } 
  catch (err) {
    return reply.code(500).send({ message: 'Errore durante il salvataggio dei dati ' + err });
  }
});


/* GET DATA ENDPOINT */
fastify.get('/data/:key', {
  schema: {
    params: {
      type: 'object',
      properties: {
        key: { type: 'string' },
      },
      required: ['key'],
    },
    querystring: {
      type: 'object',
      properties: {
        email: { type: 'string' }, // Aggiungi questa se sei superuser
      },
    },
  },
  preHandler: validateToken,
}, async (request, reply) => {
  try {
    const { key } = request.params;
    let email;
    if (request.user.role === 'superuser') {
      email = request.query.email || request.user.email;
    }
    else
    {
      email = request.user.email;
    }
    const existingData = await loadData();

    if (existingData[email]) {
      const dataEntry = existingData[email].find(item => item.key === key);
      if (dataEntry) {
        // Decodifica i dati da base64
        const decodedData = Buffer.from(dataEntry.dataBase64, 'base64').toString('utf-8');
        return reply.send({ key, data: decodedData });
      }
    }

    return reply.code(404).send({ message: 'Dato non trovato' });
  } catch (err) {
    return reply.code(500).send({ message: 'Errore durante la lettura dei dati ' + err});
  }
});

/* PATCH DATA ENDPOINT */
fastify.patch('/data/:key', {
  schema: {
    params: {
      type: 'object',
      properties: {
        key: { type: 'string' },
      },
      required: ['key'],
    },
    body: {
      type: 'object',
      properties: {
        data: { type: 'string' },
        email: { type: 'string' }, // Aggiungi questa se sei superuser
      },
      required: ['data'],
    },
  },
  preHandler: validateToken,
}, async (request, reply) => {
  try {
    const { key } = request.params;
    const { data } = request.body;
    let email;
    if (request.user.role === 'superuser') {
      email = request.body.email || request.user.email;
    }
    else
    {
      email = request.user.email;
    }
    let existingData = await loadData();

    if (existingData[email]) {
      const dataEntry = existingData[email].find(item => item.key === key);
      if (dataEntry) {
        // Aggiorna i dati
        dataEntry.dataBase64 = Buffer.from(data).toString('base64');
        await saveData(existingData);
        return reply.send({ message: 'Dato aggiornato con successo' });
      }
    }

    return reply.code(404).send({ message: 'Dato non trovato' });
  } catch (err) {
    return reply.code(500).send({ message: 'Errore durante l\'aggiornamento dei dati ' + err});
  }
});

/* DELETE DATA ENDPOINT */
fastify.delete('/data/:key', {
  schema: {
    params: {
      type: 'object',
      properties: {
        key: { type: 'string' },
      },
      required: ['key'],
    },
    body: {
      type: 'object',
      properties: {
        email: { type: 'string' }, // Il corpo email è ora facoltativo
      },
    },
  },
  preHandler: validateToken,
}, async (request, reply) => {
  try {
    const { key } = request.params;
    let email;
    if (request.user.role === 'superuser') {
      email = (request.body && request.body.email) || request.user.email;
    }
    else
    {
      email = request.user.email;
    }
    let existingData = await loadData();

    if (existingData[email]) {
      const dataEntryIndex = existingData[email].findIndex(item => item.key === key);
      if (dataEntryIndex !== -1) {
        // Elimina il dato corrispondente alla chiave
        existingData[email].splice(dataEntryIndex, 1);
        await saveData(existingData);
        return reply.send({ message: 'Dato eliminato con successo' });
      }
    }

    return reply.code(404).send({ message: 'Dato non trovato' });
  } catch (err) {
    return reply.code(500).send({ message: 'Errore durante l\'eliminazione dei dati ' +err});
  }
});


// Il Server Fastify ascolta sulla porta 3000
const startServer = async () => {
  try {
    // Attendo l'avvio del server
    await fastify.listen({
      port: 3000,
    });
    console.log('Server is now listening on port 3000');
  } catch (err) {
    console.error(err);
  }
};

startServer();
