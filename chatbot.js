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
  organization: "org-EoGLVJLQKfyDkqJSd1XuuDvz",
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
    hints: 'ask a question, or say "help" for assistance',
    numDigits: 1,
    method: 'POST'
  });
  
  gather.say('Please ask your question after the beep, or say "help" for assistance.');
  
  console.log(`Twiml: ${twiml.toString()}`);
  
  res.type('text/xml');
  res.send(twiml.toString());
});

async function generate_response(prompt, conversationHistory = '') {
  try {
    const completions = await openaiApi.createCompletion({
      model: 'davinci',
      prompt: `${conversationHistory}Q: ${prompt}\nA:`,
      max_tokens: 100,
      temperature: 0.8,
      n: 1,
      stop: ['\n'],
      return_prompt: true, // Add this line to return the prompt
    });

    // Decide the confidence of the given question.
    const choice = completions.data.choices[0];
    const confidence = choice.finish_reason === 'stop' ? choice.confidence : 0;
    const responseText = choice.text.trim();

    return { responseText, confidence };
  } catch (error) {
    console.error('Error generating response:', error);
    return {
      responseText: 'Sorry, maar ik kan uw verzoek op dit moment niet verwerken. Probeer het later opnieuw.',
      confidence: 0,
    };
  }
}

app.post('/process-input', async (req, res) => {
  const twiml = new VoiceResponse();

  const userSpeech = req.body.SpeechResult;
  console.log(`UserSpeech: ${userSpeech}`);

  // Use OpenAI's GPT-3 to generate a response to the user's question
  const { responseText, confidence } = await generate_response(userSpeech, req.body.conversationHistory);
  console.log(`Response: ${responseText}`);

  const confidenceThreshold = 0.5; // Set your desired confidence threshold

  if (confidence < confidenceThreshold) {
    // Redirect the call to a live agent or another phone number
    const redirectNumber = '+1234567890'; // Replace this with the phone number you want to redirect the call to
    twiml.say('Het lijkt erop dat uw vraag te complex is voor mij om te beantwoorden. Ik verbind u nu door met een medewerker.');
    twiml.dial(redirectNumber);
  }

  console.log(`Twiml: ${twiml.toString()}`);
  res.type('text/xml');
  res.send(twiml.toString());
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

//TODO: Test of dit nu werkt zonder Database connectie en zonder training.