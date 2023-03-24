const { MongoClient } = require('mongodb');
require('dotenv').config();

// Vervang met je MongoDB connectie-string
const client = new MongoClient(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
const dbName = 'mockDb';
const collectionName = 'klanten';

const getRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateRandomCustomer = () => {
  const voornamen = ['Jan', 'Sofie', 'Maarten', 'Eva', 'Pieter'];
  const achternamen = ['Jansen', 'De Boer', 'Van Dijk', 'Bakker', 'Smit'];

  const randomVoornaam = voornamen[Math.floor(Math.random() * voornamen.length)];
  const randomAchternaam = achternamen[Math.floor(Math.random() * achternamen.length)];

  const geboortejaar = getRandomNumber(1950, 2000);
  const geboortemaand = getRandomNumber(1, 12);
  const geboortedag = getRandomNumber(1, 28);

  const bestellingen = generateRandomBestellingen(); // Voeg deze regel toe

  return {
    klantnummer: getRandomNumber(100000, 999999),
    voornaam: randomVoornaam,
    achternaam: randomAchternaam,
    geboortedatum: new Date(`${geboortejaar}-${geboortemaand}-${geboortedag}`),
    bestellingen,
  };
};

const generateRandomBestellingen = () => {
  const bestelStatussen = ['in afwachting', 'verzonden', 'afgeleverd', 'geannuleerd'];
  const producten = ['Product A', 'Product B', 'Product C', 'Product D', 'Product E'];

  const numBestellingen = getRandomNumber(1, 5);
  const bestellingen = [];

  for (let i = 0; i < numBestellingen; i++) {
    const randomProduct = producten[Math.floor(Math.random() * producten.length)];
    const randomStatus = bestelStatussen[Math.floor(Math.random() * bestelStatussen.length)];
    const randomAantal = getRandomNumber(1, 10);
    const randomBestelDatum = new Date(Date.now() - getRandomNumber(1, 30) * 24 * 60 * 60 * 1000);

    // Genereer een willekeurig 5-cijferig bestelnummer
    const randomBestelNummer = getRandomNumber(10000, 99999);

    const bestelling = {
      bestelnummer: randomBestelNummer,
      product: randomProduct,
      status: randomStatus,
      aantal: randomAantal,
      besteldatum: randomBestelDatum,
    };

    bestellingen.push(bestelling);
  }

  return bestellingen;
};

async function run() {
  try {
    await client.connect();

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const klanten = Array.from({ length: 5 }, () => generateRandomCustomer());

    const result = await collection.insertMany(klanten);
    console.log(`Succesvol ${result.insertedCount} klanten toegevoegd`);
  } catch (err) {
    console.error('Fout:', err);
  } finally {
    await client.close();
  }
}

run();
``
