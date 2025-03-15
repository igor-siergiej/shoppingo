import express, { Application } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import getLists from './endpoints/getLists';
import getList from './endpoints/getList';
import deleteList from './endpoints/deleteList';
import addList from './endpoints/addList';
import addItem from './endpoints/addItem';
import { registerDepdendencies } from './dependencies';
import { DependencyContainer } from './lib/dependencyContainer';
import { DependencyToken } from './lib/dependencyContainer/types';
import 'dotenv/config';
import updateItem from './endpoints/updateItem';
import deleteItem from './endpoints/deleteItem';
import clearList from './endpoints/clearList';

const port = process.env.PORT;

const allowedOrigins: Array<string> = [
    'https://shoppingo.imapps.co.uk',
    'http://localhost:4000',
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
            callback(new Error('Not allowed by CORS'));
        }
    },
};

export const onStartup = async () => {
    try {
        const app: Application = express();

        registerDepdendencies();

        const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

        await database.connect();

        app.use(cors(corsOptions));
        app.use(bodyParser.json());
        app.use(
            bodyParser.urlencoded({
                extended: true,
            })
        );

        app.use((req, res, next) => {
            // TODO: do some logging here
            next();
        });

        // TODO: move these out to another directory and remove the leading /api/

        app.get('/api/lists/:name', getList);
        app.get('/api/lists', getLists);
        app.delete('/api/lists/:name', deleteList);
        app.put('/api/lists', addList);

        app.put('/api/lists/:listName/items', addItem);

        app.post('/api/lists/:listName/items/:itemName', updateItem);

        app.delete('/api/lists/:listName/items/:itemName', deleteItem);

        app.delete('/api/lists/:listName/clear', clearList);

        app.listen(port, () => {
            console.log(`Shoppingo Api server running on port ${port}.`);
        });
    } catch (error) {
        console.error('Encountered an error on start up', error);
        process.exit(1);
    }
};

onStartup();
