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
    'https://shoppingo.imapps.staging',
    'http://localhost:4000',
    'http://localhost:3000',
];

const corsOptions: cors.CorsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            console.log('CORS: Allowing request with no origin');
            callback(null, true);
            return;
        }

        console.log('CORS: Checking origin:', origin);
        console.log('CORS: Allowed origins:', allowedOrigins);

        if (allowedOrigins.includes(origin)) {
            console.log('CORS: Origin allowed:', origin);
            callback(null, true);
        } else {
            console.log('CORS: Origin rejected:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

export const onStartup = async () => {
    try {
        const app: Application = express();

        registerDepdendencies();

        const database = DependencyContainer.getInstance().resolve(DependencyToken.Database);

        if (!database) {
            throw new Error('Database dependency not found');
        }

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
