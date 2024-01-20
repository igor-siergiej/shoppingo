import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

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
        const listName = event.pathParameters.name;
        await dynamo.send(
            new DeleteCommand({
                TableName: tableName,
                Key: {
                    name: event.pathParameters.name,
                },
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify(`Deleted list: ${listName}`),
            headers,
        };
    } catch (err) {
        return { statusCode: 400, body: err.message, headers };
    }
};
