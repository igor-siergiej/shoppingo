import { MongoClient } from "mongodb";
import 'dotenv/config'

const connectionString = process.env.CONNECTION_URI || "";

export const getDatabase = async () => {
  const client = new MongoClient(connectionString);

  let conn;
  try {
    conn = await client.connect()
    console.log('SUCCESS')
  } catch (e) {
    console.error(e);
  }
  return conn.db("shoppingo")
}

