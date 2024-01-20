import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

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
        const lists = await dynamo.send(
            new ScanCommand({ TableName: tableName })
        );

        return {
            statusCode: 200,
            body: JSON.stringify(
                lists.Items.sort(
                    (a, b) =>
                        new Date(a.dateAdded).getTime() -
                        new Date(b.dateAdded).getTime()
                )
            ),
            headers,
        };
    } catch (err) {
        return { statusCode: 400, body: err.message, headers };
    }
};
