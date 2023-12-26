import express, { Application } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import {
  addItem,
  updateItem,
  deleteItem,
  getItemsInList,
  getAllLists,
  addList,
  deleteList,
  clearList,
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

app.get("/items/:listName", getItemsInList);
app.get("/lists", getAllLists);

app.put("/lists", addList);
app.put("/items", addItem);

app.post("/items", updateItem);

app.delete("/lists/:listName", deleteList);
app.delete("/items/:itemName/:listName", deleteItem);
app.delete("/clear/:listName", clearList);

app.listen(port, () => {
  console.log(`App running on port ${port}.`);
});
