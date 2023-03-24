const { Configuration, OpenAIApi } = require("openai");

const { MongoClient, ServerApiVersion } = require('mongodb');
const client = new MongoClient(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const express = require('express');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

require('dotenv').config()

const app = express();

// Set up the OpenAI API credentials
const configuration = new Configuration({
  organization: process.env.ORGANIZATION_ID,
  apiKey: process.env.API_KEY,
});

// Global variables
companyName = "MockBedrijf"

const openaiApi = new OpenAIApi(configuration);

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
    console.log(faq);
    prompt += `Q: ${faq.question}\nA: ${faq.answer}\n`;
  }
  return prompt;
}

// const faqPromptShort = 'Openingstijden: ma-vr 9:00-18:00. Contact: support@voorbeeldbedrijf.com, 0800-1234. Levertijd: 2-5 werkdagen. Annulering: mogelijk voor verzending. Retourbeleid: 14 dagen.'
const faqPrompt = createFAQPrompt(faqs);

app.post('/voice', async (req, res) => {
  const twiml = new VoiceResponse();

  // Prompt the user for input
  const gather = twiml.gather({
    input: 'speech',
    action: '/process-input',
    language: 'nl-NL',
    timeout: 10,
    speechTimeout: 'auto',
    numDigits: 1,
    method: 'POST'
  });
  
  gather.say('Gelieve uw vraag te stellen na de pieptoon. Uw kunt de gesprek beëindigen door tot ziens te zeggen.');
  
  console.log(`Twiml: ${twiml.toString()}`);
  
  res.type('text/xml');
  res.send(twiml.toString());
});

async function generate_response(prompt, conversationHistory = '') {
  try {
    const context = `Je bent een AI voor ${companyName} en biedt klantenservice door nauwkeurige en nuttige informatie te geven over de producten, diensten, beleidsmaatregelen en
                      procedures van het bedrijf. Beantwoord vragen beleefd en professioneel.\n`;

    const completions = await openaiApi.createCompletion({
      model: 'text-davinci-003',
      prompt: `${context}${conversationHistory}Q: ${prompt}\nA:`,
      max_tokens: 100,
      temperature: 0.3,
      n: 1,
      stop: ['\n']
    });
    return completions.data.choices[0].text.trim();
  } catch (error) {
    console.error('Error generating response:', error);
    return 'Het spijt me, maar ik kan uw verzoek momenteel niet verwerken. Probeer het later nog eens.';
  }
}
app.post('/process-input', async (req, res) => {
  const twiml = new VoiceResponse();

  const userSpeech = req.body.SpeechResult;
  console.log(`UserSpeech: ${userSpeech}`);

  // Use OpenAI's GPT-3 to generate a response to the user's question
  const response = await generate_response(userSpeech, faqPrompt + req.body.conversationHistory);
  console.log(`Response: ${response}`);

  // Create a gather block to prompt the user for more input
  const gather = twiml.gather({
    input: 'speech',
    action: '/process-input',
    language: 'nl-NL',
    timeout: 10,
    speechTimeout: 'auto',
    numDigits: 1,
    method: 'POST'
  });

  // if (userSpeech === 'Tot ziens.') {
  //   gather.say("Tot ziens!");
  //   twiml.hangup();
  // }

  // Say the generated response and prompt the user for more input
  gather.say(response);
  gather.say('Als u nog een vraag heeft, kunt u die nu stellen.');

  // If the user does not provide any input, end the call
  twiml.say('Dank u voor het gebruik van onze service. Tot ziens.');

  console.log(`Twiml: ${twiml.toString()}`);

  res.type('text/xml');
  res.send(twiml.toString());
});

app.listen(process.env.BACKEND_PORT, () => {
  console.log(`Server listening on http://localhost:${process.env.BACKEND_PORT}`);
});

// TODO: Feed the api eerst een prompt die hem fine tuned om vragen te beantwoorden als een klantenservice medewerker.

// TODO: Zorg ervoor dat wanneer tot ziens wordt gezegd er ook daadwerkelijk wordt opgehangen!