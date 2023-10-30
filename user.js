/**
 * Gestione degli utenti e del superuser
 */
const fs = require('fs').promises;
const crypto = require('crypto');
const usersFilePath = 'users.json';

async function loadSuperUser(){
  try
  {
    let data = await fs.readFile(usersFilePath, 'utf-8');
    if(!data) // Se è vuoto, inizializzo il file JSON
      data = "[]"
    const users = JSON.parse(data);
    // Verifica se il superuser esiste, altrimenti crealo
    const superuserExists = users.some(user => user.role === 'superuser');
    if (!superuserExists) 
    {
      // Creazione del superuser
      const superuser = {
          id: 1,  // Imposta l'ID come preferisci
          email: 'stefanoroybisi@gmail.com',
          password: 'secret',  // Imposta la password desiderata
          role: 'superuser'
      };
      superuser.password = crypto.createHash('sha256').update(superuser.password).digest('hex');
      // Aggiungi il superuser agli utenti
      users.push(superuser);
      saveUsers(users)
   }
  }
  catch(err){
    console.error('Errore del server:', err);
  }
}


// Funzione per caricare gli utenti dal file JSON
async function loadUsers() {
  try {
    const data = await fs.readFile(usersFilePath, 'utf-8');
    const users = JSON.parse(data);
    return users;
  }
  catch (error) {
    return [];
  }
}

// Funzione per salvare gli utenti nel file JSON
async function saveUsers(users) {
  try {
    const data = JSON.stringify(users, null, 2);
    await fs.writeFile(usersFilePath, data, 'utf-8');
  } 
  catch (error) {
    console.error('Errore durante il salvataggio degli utenti:', error);
  }
}

module.exports = {loadUsers, saveUsers, loadSuperUser};