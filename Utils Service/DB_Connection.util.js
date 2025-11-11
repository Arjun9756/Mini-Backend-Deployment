const pool = require('../SQL Server/Database')
const path = require('path')
const fs = require('fs')

async function testConnection()
{
    let connection;
    try{
        connection = await pool.getConnection()
        const res = await connection.connect()

        console.log(`AIVEN MySQL Service is Conneted at PORT ${process.env.AIVEN_SQL_PORT}`)
    }
    catch(error){
        console.log(`Error While Connecting With MySQL Server ` + error.message)
        process.exit(1)
    }
    finally{
        if(connection)
            connection.release()
    }
}

module.exports = testConnection