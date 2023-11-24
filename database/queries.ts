import { Pool, QueryResult } from "pg";
import express, { Express, Request, Response, response } from "express";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT || "5432", 10),
  ssl: true,
});

const getAllItems = (request: Request, response: Response): void => {
  pool.query(
    `
    SELECT shopping_list.get_all_items();
    `,
    (error: Error, results: QueryResult) => {
      if (error) {
        throw error;
      }
      response.status(200).json(results.rows[0].get_all_items);
    }
  );
};

const addItem = (request: Request, response: Response) => {
  const itemName = request.params.itemName;
  pool.query(
    `
    CALL shopping_list.add_item('${itemName}');
    `,
    (error: Error, results: QueryResult) => {
      if (error) {
        throw error;
      }
      response.status(200);
    }
  );
};

export { getAllItems, addItem };
