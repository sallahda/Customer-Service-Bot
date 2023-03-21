// Requirements for the OpenAI API.
const { Configuration, OpenAIApi } = require("openai");
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')


const configuration = new Configuration({
    organization: "org-EoGLVJLQKfyDkqJSd1XuuDvz",
    apiKey: "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",
});
const openai = new OpenAIApi(configuration);

const app = express()
app.use(bodyParser.json())
app.use(cors())


app.use(express.json())
app.use(express.urlencoded({extended: true}))

const port = 3080

app.post('/', async (req, res) => {
    const { message, currentModel } = req.body;
    console.log(message);
    console.log(currentModel, "Current model");
    const response = await openai.createCompletion({
        model: `${currentModel}`,
        prompt: `${message}`,
        max_tokens: 500,
        temperature: 0.5,
      });

      res.json({
        message: response.data.choices[0].text,
      })
});

app.get('/models', async (req, res) => {
  const response = await openai.listEngines();
  console.log(response.data.data);
  res.json({
    models: response.data.data
  })
});

app.listen(port, () => {
console.log(`Example app listening at http://localhost:${port}`);
});