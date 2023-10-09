const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const db = require('./queries')
const port = 3000
const cors = require("cors");


const allowCrossDomain = (req, res, next) => {
  res.header(`Access-Control-Allow-Origin`, 'https://im-shoppingo.netlify.app', 'http://localhost:3000');
  res.header(`Access-Control-Allow-Methods`, `GET,PUT,POST,DELETE`);
  next();
};

app.use(allowCrossDomain);

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