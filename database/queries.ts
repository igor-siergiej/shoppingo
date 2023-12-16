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
      response.json({message: `Got all items successfully.`})
    }
  );
};

export const addItem = (request: Request, response: Response) => {
  const itemName = request.body.itemName;
  const dateAdded = request.body.dateAdded
  pool.query(
    `
    CALL shopping_list.add_item('${itemName}','${dateAdded}');
    `,
    (error: Error, results: QueryResult) => {
      if (error) {
        throw error;
      }
      response.json({message: `Added item ${itemName} successfully.`})
    }
  );
};

export const editItem = (request: Request, response: Response) => {
  const isSelected = request.params.isSelected;
  const itemName = request.params.itemName;
  pool.query(
    `
    CALL shopping_list.upsert_item('${itemName}', '${isSelected}');
    `,
    (error: Error, results: QueryResult) => {
      if (error) {
        throw error;
      }
      response.json(results);
    }
  );
};
