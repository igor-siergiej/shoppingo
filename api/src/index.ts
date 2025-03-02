import express, { Application } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import getLists from "./endpoints/getLists";
import getList from "./endpoints/getList";
import deleteList from "./endpoints/deleteList";
import addList from "./endpoints/addList";
import addItem from "./endpoints/addItem";
import { registerDepdendencies } from "./dependencies";
import { DependencyContainer } from "./lib/dependencyContainer";
import { DependencyToken } from "./lib/dependencyContainer/types";
import 'dotenv/config'

const port = process.env.PORT;

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

export const onStartup = async () => {
    try {
        const app: Application = express();

        registerDepdendencies()

        const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

        await database.connect();

        app.use(cors(corsOptions));
        app.use(bodyParser.json());
        app.use(
            bodyParser.urlencoded({
                extended: true,
            })
        );

        app.get("/lists/:name", getList);
        app.get("/lists", getLists);
        app.delete("/lists/:name", deleteList);
        app.put("/lists", addList);

        app.put("/items", addItem);
        // app.post("/items", updateItem);
        // app.delete("/items/:itemName/:listName", deleteItem);
        // app.delete("/clear/:listName", clearList);

        app.listen(port, () => {
            console.log(`Shoppingo Api server running on port ${port}.`);
        });
    } catch (error) {
        console.error('Encountered an error on start up', error)
        process.exit(1)
    }
}

onStartup()

