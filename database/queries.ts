import { Pool, QueryResult } from "pg";
import { Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

const { PG_USER, PG_HOST, PG_DATABASE, PG_PASSWORD, PG_PORT } = process.env;

const pool = new Pool({
  user: PG_USER,
  host: PG_HOST,
  database: PG_DATABASE,
  password: PG_PASSWORD,
  port: parseInt(PG_PORT || "5432", 10),
  ssl: true,
});

export const getAllLists = (request: Request, response: Response) => {
  pool.query(
    `
    SELECT shopping_list.get_all_lists();
    `,
    (error: Error, results: QueryResult) => {
      if (error) {
        throw error;
      }
      response.json(results.rows[0].get_all_lists);
    }
  );
};

export const getItemsInList = (request: Request, response: Response) => {
  const { listName } = request.params;
  console.log(listName)

  if (!listName) {
    return response.status(400).json({ error: "List name is required." });
  }
  pool.query(
    `
    SELECT shopping_list.get_items_in_list($1);
    `,
    [listName],
    (error: Error, results: QueryResult) => {
      if (error) {
        throw error;
      }
      response.json(results.rows[0].get_items_in_list);
    }
  );
};

export const addItem = async (request: Request, response: Response) => {
  try {
    const { itemName, dateAdded, listName } = request.body;

    if (!itemName || !dateAdded || !listName) {
      return response
        .status(400)
        .json({ error: "Item name and date added are required." });
    }

    await pool.query("CALL shopping_list.add_item($1, $2, $3)", [
      itemName,
      dateAdded,
      listName
    ]);

    response.json({ message: `Item ${itemName} added successfully.` });
  } catch (error) {
    console.error("Error executing PostgreSQL query:", error);
    response.status(500).json({ error: "Internal Server Error" });
  }
};

export const addList = async (request: Request, response: Response) => {
  try {
    const { listName, dateAdded } = request.body;

    if (!listName || !dateAdded) {
      return response
        .status(400)
        .json({ error: "List name and date added are required." });
    }

    await pool.query("CALL shopping_list.add_list($1, $2)", [
      listName,
      dateAdded,
    ]);

    response.json({ message: `List ${listName} added successfully.` });
  } catch (error) {
    console.error("Error executing PostgreSQL query:", error);
    response.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateItem = async (request: Request, response: Response) => {
  try {
    const { itemName, isSelected, listName } = request.body;

    if (
      !itemName ||
      isSelected === null ||
      isSelected === undefined ||
      !listName
    ) {
      return response
        .status(400)
        .json({ error: "Item name, is selected and list name are required." });
    }

    await pool.query("CALL shopping_list.upsert_item($1, $2, $3)", [
      itemName,
      isSelected,
      listName,
    ]);

    response.json({ message: `Successfully updated item: ${itemName}` });
  } catch (error) {
    console.error("Error executing PostgreSQL query:", error);
    response.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteItem = async (request: Request, response: Response) => {
  try {
    const { itemName, listName } = request.params;

    if (!itemName || !listName) {
      return response
        .status(400)
        .json({ error: "Item name and list name are required." });
    }

    await pool.query("CALL shopping_list.delete_item($1,$2)", [
      itemName,
      listName,
    ]);

    response.json({ message: `Successfully deleted item: ${itemName}` });
  } catch (error) {
    console.error("Error executing PostgreSQL query:", error);
    response.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteList = async (request: Request, response: Response) => {
  const { listName } = request.params;

  if (!listName) {
    return response.status(400).json({ error: "List name is required." });
  }
  try {
    await pool.query("CALL shopping_list.delete_list($1)", [listName]);
    response.json({ message: `Successfully deleted list: ${listName}` });
  } catch (error) {
    console.error("Error executing PostgreSQL query:", error);
    response.status(500).json({ error: "Internal Server Error" });
  }
};

export const clearList = async (request: Request, response: Response) => {
  const { listName } = request.params;

  if (!listName) {
    return response.status(400).json({ error: "List name is required." });
  }
  try {
    await pool.query("CALL shopping_list.clear_list($1)", [listName]);

    response.json({ message: `Successfully cleared items.` });
  } catch (error) {
    console.error("Error executing PostgreSQL query:", error);
    response.status(500).json({ error: "Internal Server Error" });
  }
};
