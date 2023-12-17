import { Pool, QueryResult } from "pg";
import  { Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

const { PG_USER, PG_HOST,PG_DATABASE,PG_PASSWORD,PG_PORT } = process.env

const pool = new Pool({
  user: PG_USER,
  host: PG_HOST,
  database: PG_DATABASE,
  password: PG_PASSWORD,
  port: parseInt(PG_PORT || '5432', 10),
  ssl: true,
});

export const getAllItems = (request: Request, response: Response): void => {
  pool.query(
    `
    SELECT shopping_list.get_all_items();
    `,
    (error: Error, results: QueryResult) => {
      if (error) {
        throw error;
      }
      response.json(results.rows[0].get_all_items)
    }
  );
};

export const addItem = async (request: Request, response: Response) => {
  try {
  const { itemName, dateAdded } = request.body;

  console.log(itemName,dateAdded)
  if (!itemName || !dateAdded) {
    return response.status(400).json({ error: 'Item name and date added are required.' });
  }

  const result = pool.query('CALL shopping_list.add_item($1, $2)',[itemName, dateAdded]);

  response.json({ message: `Item ${itemName} added successfully.` });

} catch (error) {
  console.error('Error executing PostgreSQL query:', error);
  response.status(500).json({ error: 'Internal Server Error' });
}

};

export const updateItem = async (request: Request, response: Response) => {
  try {
  const { itemName, isSelected } = request.body;

  console.log(itemName,isSelected)
  if (!itemName || isSelected === null || isSelected === undefined) {
    return response.status(400).json({ error: 'Item name and is selected are required.' });
  }

  const result = await pool.query('CALL shopping_list.upsert_item($1, $2)',[itemName, isSelected]);

  response.json({message: `Successfully updated item: ${itemName}` });

} catch (error) {
  console.error('Error executing PostgreSQL query:', error);
  response.status(500).json({ error: 'Internal Server Error' });
}


};
