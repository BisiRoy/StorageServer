/**
 * Gestione dei dati degli utenti
 */
const fs = require('fs').promises;
const dataFilePath = 'data.json';

// Funzione per caricare i dati dal file JSON
async function loadData() {
  try {
    const data = await fs.readFile(dataFilePath, 'utf-8');
    const allData = JSON.parse(data);
    return allData;
  } 
  catch (error) {
    return [];
  }
}

  // Funzione per salvare i dati nel file JSON
  async function saveData(data) {
    try {
      await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } 
    catch (error) {
      console.error('Errore durante il salvataggio dei dati:', error);
    }
  }

  module.exports = {loadData, saveData, dataFilePath}