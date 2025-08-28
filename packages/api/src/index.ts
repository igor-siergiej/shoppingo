import 'dotenv/config';

import bodyParser from 'body-parser';
import cors from 'cors';
import express, { Application } from 'express';

import { config } from './config';
import { dependencyContainer, registerDepdendencies } from './dependencies';
import { DependencyToken } from './dependencies/types';
import addItem from './endpoints/addItem';
import addList from './endpoints/addList';
import clearList from './endpoints/clearList';
import deleteSelected from './endpoints/deleteChecked';
import deleteItem from './endpoints/deleteItem';
import deleteList from './endpoints/deleteList';
import getList from './endpoints/getList';
import getLists from './endpoints/getLists';
import updateItem from './endpoints/updateItem';

const port = config.get('port');

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

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
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

        const logger = dependencyContainer.resolve(DependencyToken.Logger);
        const database = dependencyContainer.resolve(DependencyToken.Database);

        if (!database) {
            throw new Error('Database dependency not found');
        }

        logger.info('Starting API server - connecting to database');
        await database.connect({
            connectionUri: config.get('connectionUri'),
            databaseName: config.get('databaseName')
        });
        logger.info('Connected to database');

        app.use(cors(corsOptions));
        app.use(bodyParser.json());
        app.use(
            bodyParser.urlencoded({
                extended: true,
            })
        );

        app.get('/api/lists/title/:title', getList);

        app.get('/api/lists/user/:userId', getLists);

        app.delete('/api/lists/:title', deleteList);

        app.put('/api/lists', addList);

        app.put('/api/lists/:title/items', addItem);

        app.post('/api/lists/:title/items/:itemName', updateItem);

        app.delete('/api/lists/:title/items/:itemName', deleteItem);

        app.delete('/api/lists/:title/clear', clearList);

        app.delete('/api/lists/:title/clearSelected', deleteSelected);

        app.listen(port, () => {
            logger.info(`Shoppingo API server running on port ${port}`);
        });
    } catch (error) {
        const logger = dependencyContainer.resolve(DependencyToken.Logger);

        logger.error('Encountered an error on start up', error);
        process.exit(1);
    }
};

onStartup();
