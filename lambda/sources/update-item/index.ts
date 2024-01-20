import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    GetCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { Item, List } from '../types';

const client = new DynamoDBClient({});

const dynamo = DynamoDBDocumentClient.from(client);

const tableName = 'lists';

export const handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
    };
    try {
        const inIsSelected = JSON.parse(event.body).isSelected;
        const listName = event.pathParameters.name;
        const itemName = event.pathParameters.itemName;

        const getList = await dynamo.send(
            new GetCommand({
                TableName: tableName,
                Key: {
                    name: listName,
                },
            })
        );

        const list = getList.Item as List;

        const updatedItems = list.items.map((item: Item) => {
            if (item.name === itemName) {
                return { ...item, isSelected: inIsSelected };
            } else {
                return item;
            }
        });
        await dynamo.send(
            new UpdateCommand({
                TableName: tableName,
                Key: {
                    name: listName,
                },
                UpdateExpression: 'SET #items = :newItems',
                ExpressionAttributeValues: {
                    ':newItems': updatedItems,
                },
                ExpressionAttributeNames: {
                    '#items': 'items',
                },
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify(`Updated item: ${itemName}`),
            headers,
        };
    } catch (err) {
        return { statusCode: 400, body: err.message, headers };
    }
};
