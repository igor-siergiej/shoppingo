const Pool = require('pg').Pool
const pool = new Pool({
    user: 'igor-siergiej',
    host: 'ep-long-resonance-24372392.eu-central-1.aws.neon.tech',
    database: 'neondb',
    password: '7Ljcxg0uTpBZ',
    port: 5432,
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