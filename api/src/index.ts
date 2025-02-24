import express, { Application } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { getDatabase } from "./db";
import getLists from "./endpoints/getLists";
import { Db } from "mongodb/mongodb";

const port = 4001;

const allowedOrigins: string[] = [
  "https://shoppingo.imapps.co.uk",
  "http://localhost:4000",
];

const corsOptions: cors.CorsOptions = {
  origin: function(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

export let database: Db;

export const onStartup = async () => {
  const app: Application = express();

  const database = await getDatabase()
  app.locals.database = database

  app.use(cors(corsOptions));
  app.use(bodyParser.json());
  app.use(
    bodyParser.urlencoded({
      extended: true,
    })
  );

  app.get("/lists", getLists);


  app.listen(port, () => {
    console.log(`Shoppingo Api server running on port ${port}.`);
  });
}

onStartup()

