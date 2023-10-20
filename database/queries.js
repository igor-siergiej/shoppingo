require('dotenv').config();
const Pool = require('pg').Pool

const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
    ssl: true
})

const getAllItems = (request, response) => {
    pool.query(`
        Select shopping_list.get_all_items();`
        , (error, results) => {
            if (error) {
                throw error
            }
            response.status(200).json(results.rows[0].get_all_items)
        })
}

module.exports = {
    getAllItems
}