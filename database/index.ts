import express, { Application } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import {
  addItem,
  updateItem,
  getAllItems,
  deleteItem,
  deleteAll,
} from "./queries";

const app: Application = express();
const port = 3001;

const allowedOrigins: string[] = [
  "https://im-shoppingo.netlify.app",
  "http://localhost:3000",
];

const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
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

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.get("/items", getAllItems);
app.put("/items", addItem);
app.post("/items", updateItem);
app.delete("/items", deleteAll);
app.delete("/items/:itemName", deleteItem);

app.listen(port, () => {
  console.log(`App running on port ${port}.`);
});
