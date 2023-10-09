const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const db = require('./queries')
const port = 3001
const cors = require("cors");

var corsOptions = {
  origin: ["https://im-shoppingo.netlify.app","http://localhost:3000"]
  }

app.use(cors(corsOptions));

app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)

app.get('/test', (request, response) => {
  response.json({ info: 'Node.js, Express, and Postgres API' })
})

app.get('/users', db.getUsers)


app.listen(port, () => {
  console.log(`App running on port ${port}.`)
})