const path = require('path')
const fs = require('fs')
const pool = require('../SQL Server/Database')

/**
 * @description {create database and related tables for the appilication}
 * @returns {}
 */

async function createDatabaseAndTable() {
    // Check if Database is Created or Not if Not Create it
    let connection;
    try {
        connection = await pool.getConnection()
        const [rows, fields] = await pool.query('CREATE DATABASE IF NOT EXISTS MINI_S3_BUCKET')

        if (rows.affectedRows === 0) {
            console.log("Database Is Already Connected")
        } else {
            console.log('Database With Name MINI_S3_BUCKET Created Successfuly')
        }
    }
    catch (error) {
        console.log(error.message)
        process.exit(1)
    }
    finally {
        if (connection)
            connection.release()
    }

    // Create Table for The 
    const schemaDirectory = path.join(__dirname, '..', 'Database Schema')
    try {
        
        const files = fs.readdirSync(schemaDirectory)
        connection = await pool.getConnection()
        await connection.query('USE MINI_S3_BUCKET')

        for (const file of files) {
            if (file.endsWith('.sql')) {
                const sql = fs.readFileSync(path.join(schemaDirectory, file), 'utf-8')
                console.log(`${file} Is Currently Processing`)

                const [rows, fields] = await connection.query(sql)
                if (rows.affectedRows > 0) {
                    console.log(`${file} Table is Create Successfuly`)
                } else {
                    console.log(`${file} Table is Created Previously`)
                }
            }
        }
    }
    catch (error) {
        console.log(`Error While Creating Database Tables ${error.message}`)
        process.exit(1)
    }
    finally {
        if (connection)
            connection.release()
    }
}

module.exports = createDatabaseAndTable