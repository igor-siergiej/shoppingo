import 'dotenv/config';

import bodyParser from 'body-parser';
import cors from 'cors';
import express, { Application } from 'express';

import { registerDepdendencies } from './dependencies';
import addItem from './endpoints/addItem';
import addList from './endpoints/addList';
import clearList from './endpoints/clearList';
import deleteSelected from './endpoints/deleteChecked';
import deleteItem from './endpoints/deleteItem';
import deleteList from './endpoints/deleteList';
import getList from './endpoints/getList';
import getLists from './endpoints/getLists';
import updateItem from './endpoints/updateItem';
import { DependencyContainer } from './lib/dependencyContainer';
import { DependencyToken } from './lib/dependencyContainer/types';

const port = process.env.PORT;

const allowedOrigins: Array<string> = [
    'https://shoppingo.imapps.co.uk',
    'http://shoppingo.imapps.staging',
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

        app.get('/lists/:name', getList);
        app.get('/lists', getLists);
        app.delete('/lists/:name', deleteList);
        app.put('/lists', addList);

        app.put('/lists/:listName/items', addItem);

        app.post('/lists/:listName/items/:itemName', updateItem);

        app.delete('/lists/:listName/items/:itemName', deleteItem);

        app.delete('/lists/:listName/clear', clearList);

        app.delete('/lists/:listName/clearSelected', deleteSelected);

        app.listen(port, () => {
            console.log(`Shoppingo Api server running on port ${port}.`);
        });
    } catch (error) {
        console.error('Encountered an error on start up', error);
        process.exit(1);
    }
};

onStartup();
