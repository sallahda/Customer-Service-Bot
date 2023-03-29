require('dotenv').config()

const { Configuration, OpenAIApi } = require("openai");

const { MongoClient, ServerApiVersion } = require('mongodb');
const client = new MongoClient(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const twilio = require('twilio');
const Voice = require('twilio/lib/rest/Voice');
const VoiceResponse = twilio.twiml.VoiceResponse;

// Set up the OpenAI API credentials
const configuration = new Configuration({
  organization: process.env.ORGANIZATION_ID,
  apiKey: process.env.API_KEY,
});
const openaiApi = new OpenAIApi(configuration);

const defaultVoice = 'Polly.Ruben'

const faqs = {
  "faqs": [
    {
      "question": "Wat zijn de openingstijden van uw bedrijf?",
      "answer": "Onze openingstijden zijn van maandag tot en met vrijdag van 9:00 tot 18:00 uur."
    },
    {
      "question": "Hoe kan ik contact opnemen met uw klantenservice?",
      "answer": "U kunt contact opnemen met onze klantenservice door een e-mail te sturen naar support@voorbeeldbedrijf.com of door te bellen naar 0800-1234."
    },
    {
      "question": "Wat is de levertijd van jullie producten?",
      "answer": "De levertijd van onze producten is afhankelijk van het product en de locatie waar het geleverd moet worden. Gemiddeld duurt het 2 tot 5 werkdagen."
    },
    {
      "question": "Kan ik mijn bestelling annuleren?",
      "answer": "Ja, u kunt uw bestelling annuleren zolang deze nog niet verzonden is. Neem contact op met onze klantenservice om uw annulering door te geven."
    },
    {
      "question": "Wat is jullie retourbeleid?",
      "answer": "Wij hanteren een retourbeleid van 14 dagen. U kunt het product binnen deze periode retourneren als het niet aan uw verwachtingen voldoet. Neem contact op met onze klantenservice om uw retourzending aan te melden."
    }
  ]
}

function createFAQPrompt(faqs) {
let prompt = 'De volgende vragen zijn veelgestelde vragen met hun respectievelijke antwoorden:\n';
for (const faq of faqs.faqs) {
  prompt += `Q: ${faq.question}\nA: ${faq.answer}\n`;
}
return prompt;
};
/**
 *  First webhook to be called when phone call starts
 */
app.post('/voice', async (req, res) => {
  const twiml = new VoiceResponse();

  // Prompt the user for their customer number
  const gather = twiml.gather({
    action: '/path',
    language: 'nl-NL',
    timeout: 10,
    speechTimeout: 'auto',
    numDigits: 1,
    method: 'POST'
  });
  
  gather.say({voice: defaultVoice}, 'Welkom bij onze klantenservice! Kies uit de volgende opties: Toets 1 voor algemene vragen, toets 2 voor vragen over uw factuur of bestelling, of toets 3 om met een medewerker te spreken.');
  
  console.log(`Twiml: ${twiml.toString()}`);
  
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/path', async (req, res) => {
  const twiml = new VoiceResponse();
  const digit = req.body.Digits;

  switch (digit) {
    case ('1'):
      twiml.redirect('/faq')
      break;
    case ('2'):
      twiml.redirect('/personal')
      break;
    case ('3'):
      twiml.dial('+31686251763')
      break;
    default:
      twiml.say({voice: defaultVoice}, 'Ongeldige optie, probeer het opnieuw.');
      twiml.redirect('/voice');
  }

  res.type('text/xml');
  res.send(twiml.toString());
})

app.post('/faq', async (req, res) => {
  const twiml = new VoiceResponse();

  const gather = twiml.gather({
    input: 'speech',
    action: '/process-faq',
    method: 'POST',
    timeout: 10,
    language: 'nl-NL',
    speechTimeout: 'auto',
  });

  gather.say({voice: defaultVoice}, 'Stel nu uw algemene vraag.')

  console.log(`Twiml: ${twiml.toString()}`);

  res.type('text/xml');
  res.send(twiml.toString());
})

app.post('/process-faq', async (req, res) => {
  const twiml = new VoiceResponse();
  const userQuestion = req.body.SpeechResult;

  const context = '';
  const response = await generateResponse(userQuestion, 1, context)

  const gather = twiml.gather({
    input: 'speech',
    action: `/process-faq`,
    language: 'nl-NL',
    timeout: 10,
    speechTimeout: 'auto',
    method: 'POST'
  });

  gather.say({voice: defaultVoice}, response);
  gather.say({voice: defaultVoice}, "Als u nog een algemene vraag heeft, kunt u die nu stellen.")

  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/personal', async (req, res) => {
  const twiml = new VoiceResponse();

  // Prompt the user for their customer number
  const gather = twiml.gather({
    input: 'dtmf speech',
    action: '/ask-purpose',
    language: 'nl-NL',
    timeout: 10,
    speechTimeout: 'auto',
    numDigits: 6,
    method: 'POST'
  });
  
  gather.say({voice: defaultVoice}, 'Geef alstublieft uw klantnummer op of, indien u uw adres en huisnummer mondeling wilt doorgeven, kunt u dat nu doen.');
  
  console.log(`Twiml: ${twiml.toString()}`);
  
  res.type('text/xml');
  res.send(twiml.toString());
});

//TODO: GEEF EEN PAAR OPTIES VOOR DE REDEN VAN BELLEN, DENK NA OF JE HIER DE CUSTOMERINFO AL WILT OPHALEN EN GWN MEEWILT GEVEN IN DE QUERYSTRING OF NIET.
app.post('/ask-purpose', async (req, res) => {
  const twiml = new VoiceResponse();
  const userSpeech = req.body.SpeechResult;
  const userDigits = req.body.Digits;

  const credential = userSpeech || userDigits;
  console.log(credential);

  const gather = twiml.gather({
    action: `/process-customer-number?cred=${encodeURIComponent(JSON.stringify(credential))}`,
    language: 'nl-NL',
    timeout: 10,
    speechTimeout: 'auto',
    numDigits: 1,
    method: 'POST'
  });

  gather.say({voice: defaultVoice}, 'Toets 1 als u een specifieke vraag heeft over een bestelling of factuur, toets 2 als u een vraag heeft over uw accountgegevens.');

  res.type('text/xml');
  res.send(twiml.toString());
})

app.post('/process-customer-number', async (req, res) => {
  const twiml = new VoiceResponse();
  const digit = req.body.Digits;

  const credential = JSON.parse(decodeURIComponent(req.query.cred));
  let customerInfo;
  let customerOrders;

  if (digit == 1) {
  customerOrders = await getCustomerOrders(credential);
  console.log('Orders ' + customerOrders);
  } else {
  customerInfo = await getCustomerInfo(credential);
  console.log('Info ' + customerInfo);
  }

  // Retrieve customer information from the database

  if (customerInfo || customerOrders) {
    console.log(customerInfo || customerOrders);

    // Customer information found, continue with the conversation
    const gather = twiml.gather({
      input: 'speech',
      action: `/process-personal?customerInfo=${encodeURIComponent(JSON.stringify(customerInfo || customerOrders))}`,
      language: 'nl-NL',
      timeout: 10,
      speechTimeout: 'auto',
      numDigits: 1,
      method: 'POST'
    });

    if(customerOrders != null) {
      customerName = customerOrders.voornaam;
    } else {
      customerName = customerInfo.voornaam;
    }

    gather.say({voice: defaultVoice}, `Geachte ${customerName}, uw klantnummer is gevonden. Stel alstublieft uw vraag.`);   
  } else {
    twiml.say({voice: defaultVoice}, 'Het opgegeven klantnummer of adres kon niet worden gevonden. Probeer het opnieuw.');
    twiml.redirect('/personal');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/process-personal', async (req, res) => {
  const twiml = new VoiceResponse();

  const userSpeech = req.body.SpeechResult;
  console.log(`UserSpeech: ${userSpeech}`);

  const customerInfo = JSON.parse(decodeURIComponent(req.query.customerInfo));
  const parsedInfo = JSON.stringify(customerInfo);
  console.log(parsedInfo);

  const context = 'Jij bent een NL klantenservice bot die vragen met betrekking tot facturen of bestelling kan beantwoorden. Met deze prompt heb je de gegevens van de klanten meegekregen inclusief hun bestellingen, gebruik die bij je reacties.';

  // Use OpenAI's GPT-3 to generate a response to the user's question
  const response = await generateResponse(userSpeech, 2, context, parsedInfo, req.body.conversationHistory);
  console.log(`Response: ${response}`);

  // Create a gather block to prompt the user for more input
  const gather = twiml.gather({
    input: 'speech',
    action: `/process-personal?customerInfo=${encodeURIComponent(JSON.stringify(customerInfo))}`,
    language: 'nl-NL',
    timeout: 10,
    speechTimeout: 'auto',
    numDigits: 1,
    method: 'POST'
  });

  // Say the generated response and prompt the user for more input
  gather.say({voice: defaultVoice}, response);
  gather.say({voice: defaultVoice}, 'Als u nog een vraag heeft, kunt u die nu stellen.');

  // If the user does not provide any input, end the call
  twiml.say({voice: defaultVoice}, 'Dank u voor het gebruik van onze service. Tot ziens.');

  console.log(`Twiml: ${twiml.toString()}`);

  res.type('text/xml');
  res.send(twiml.toString());
});

async function getCustomerOrders(customerCredential) {
  try {
    await client.connect();

    const database = client.db('mockDb');
    const customersCollection = database.collection('klanten');

    // Try to find the customer by their 'klantnummer'
    let query = { klantnummer: parseInt(customerCredential) };
    let customerInfo = await customersCollection.findOne(query);

    // If the customer is not found, try to find them by their 'adres'
    if (!customerInfo) {
      query = { adres: customerCredential };
      customerInfo = await customersCollection.findOne(query);
    }

    // If the customer is found, return their 'voornaam', 'achternaam', and 'bestellingen'
    if (customerInfo) {
      const { voornaam, achternaam, bestellingen } = customerInfo;
      console.log(`Name: ${voornaam} ${achternaam}`);
      console.log(`Orders: ${bestellingen}`);
      return { voornaam, achternaam, bestellingen };
    } else {
      console.log('Customer not found');
      return null;
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

/**
 * Connect to the MongoDB database and retrieve the customer's information
 */
async function getCustomerInfo(customerCredential) {

  try {
    await client.connect();

    const database = client.db('mockDb');
    const customersCollection = database.collection('klanten');

    const query = { klantnummer: parseInt(customerCredential) };
    const projection = {bestellingen: 0};
    const customerInfo = await customersCollection.findOne(query);

    if (customerInfo) {
      console.log(customerInfo);
      return customerInfo;
    } else {
      const queryByAddress = { adres: customerCredential };
      const customerInfoByAddress = await customersCollection.findOne(queryByAddress);
    
      if (customerInfoByAddress) {
        console.log(customerInfoByAddress);
        return customerInfoByAddress;
      } else {
        console.log('Customer not found');
        return null;
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }

  // Return the customer's information
  return;
}

async function generateResponse(prompt, type, context, customerInfo, conversationHistory = '') {
  // const faqPrompt = 'Openingstijden: ma-vr 9:00-18:00. Contact: support@voorbeeldbedrijf.com, 0800-1234. Levertijd: 2-5 werkdagen. Annulering: mogelijk voor verzending. Retourbeleid: 14 dagen.'
  const faqPrompt = createFAQPrompt(faqs);

  try {
    if (type == 1) {
      const completions = await openaiApi.createCompletion({
        model: 'text-davinci-003',
        prompt: `${context}\n FAQ: ${faqPrompt} Q: ${prompt}\n A:`,
        max_tokens: 100,
        temperature: 0.3,
        n: 1,
        stop: ['\n']
      });

      return completions.data.choices[0].text.trim();
    }

    if (type == 2) {
      const completions = await openaiApi.createCompletion({
        model: 'text-davinci-003',
        prompt: `${context}\n Customer Info:${customerInfo}\n ${conversationHistory}Q: ${prompt}\nA:`,
        max_tokens: 120,
        temperature: 0.5,
        n: 1,
        stop: ['\n']
      });

      return completions.data.choices[0].text.trim();
    }

  } catch (error) {
    console.error('Error generating response:', error);
    return 'Het spijt me, maar ik kan uw verzoek momenteel niet verwerken. Probeer het later nog eens.';
  }
}

app.listen(process.env.BACKEND_PORT, () => {
  console.log(`Server listening on http://localhost:${process.env.BACKEND_PORT}`);
});

// TODO: Zorg ervoor dat wanneer tot ziens wordt gezegd er ook daadwerkelijk wordt opgehangen!