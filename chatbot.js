const { Configuration, OpenAIApi } = require("openai");
const express = require('express');
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

const app = express();

const port = 3080;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set up the OpenAI API credentials
const configuration = new Configuration({
  organization: "org-nKtsjKbguwzcTaQlJ6HD1NSc",
  apiKey: "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",
});

const openaiApi = new OpenAIApi(configuration);

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
  
  gather.say('Gelieve uw vraag te stellen na de pieptoon, of zeg "hulp" voor assistentie.');
  
  console.log(`Twiml: ${twiml.toString()}`);
  
  res.type('text/xml');
  res.send(twiml.toString());
});

async function generate_response(prompt, conversationHistory = '') {
  try {
    const completions = await openaiApi.createChatCompletion({
      model: 'gpt-3.5-turbo',
      prompt: `${conversationHistory}Q: ${prompt}\nA:`,
      max_tokens: 100,
      temperature: 0.4,
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
  const response = await generate_response(userSpeech, req.body.conversationHistory);
  console.log(`Response: ${response}`);

  // Create a gather block to prompt the user for more input
  const gather = twiml.gather({
    input: 'speech',
    action: '/process-input',
    language: 'nl-NL', // Change this to the desired language
    timeout: 10,
    speechTimeout: 'auto',
    hints: 'ask another question, or say "goodbye" to end the call',
    numDigits: 1,
    method: 'POST'
  });

  // Say the generated response and prompt the user for more input
  gather.say(response);
  gather.say('Als u nog een vraag heeft, kunt u die nu stellen, of zeg "tot ziens" om het gesprek te beëindigen.');

  // If the user does not provide any input, end the call
  twiml.say('Dank u voor het gebruik van onze service. Tot ziens.');

  console.log(`Twiml: ${twiml.toString()}`);

  res.type('text/xml');
  res.send(twiml.toString());
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

//TODO: Test of dit nu werkt zonder Database connectie en zonder training.

//TODO: Vind de beste Model voor deze use case.

// TODO: Feed the api eerst een prompt die hem fine tuned om vragen te beantwoorden als een klantenservice medewerker.

// TODO: Zorg ervoor dat wanneer tot ziens wordt gezegd er ook daadwerkelijk wordt opgehangen!