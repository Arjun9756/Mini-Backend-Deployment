const express = require('express')
const cluster = require('cluster')
const os = require('os')
const { spawn } = require('child_process')
const app = express()
const path = require('path')
const dotenv = require('dotenv')
const db = require('./Utils Service/DB_Connection.util')
const userRoute = require('./Routes/User.route')
const createDatabaseAndTable = require('./Utils Service/ExecuteTable.db')
const fileRoute = require('./Routes/File.route')
const cors = require('cors')
const rateLimiter = require('./Server Security/RateLimit.secure')
const analysisRoute = require('./Routes/Analysis.route')
const fs = require('fs')

dotenv.config({
    path: path.join(__dirname, '.env')
})

// Start Background Services (Queue Worker & Redis Subscriber)
// ALWAYS run in production - required for file scanning and email
if (cluster.isPrimary || cluster.isMaster) {
    console.log('🚀 Starting Background Services...\n')
    
    // Start Redis Subscriber
    console.log('📡 Starting Redis Subscriber...')
    const subscriber = spawn('node', [path.join(__dirname, 'Services', 'Redis.subscriber.js')], {
        stdio: 'inherit',
        shell: true
    })
    
    subscriber.on('error', (error) => {
        console.error('❌ Redis Subscriber Error:', error)
    })
    
    subscriber.on('exit', (code, signal) => {
        console.error(`❌ Redis Subscriber exited with code ${code} and signal ${signal}`)
        console.log('🔄 Restarting Redis Subscriber in 5 seconds...')
        setTimeout(() => {
            spawn('node', [path.join(__dirname, 'Services', 'Redis.subscriber.js')], {
                stdio: 'inherit',
                shell: true
            })
        }, 5000)
    })
    
    // Start Queue Worker
    console.log('⚙️  Starting Queue Worker...')
    const worker = spawn('node', [path.join(__dirname, 'Services', 'Queue.Worker.js')], {
        stdio: 'inherit',
        shell: true
    })
    
    worker.on('error', (error) => {
        console.error('❌ Queue Worker Error:', error)
    })
    
    worker.on('exit', (code, signal) => {
        console.error(`❌ Queue Worker exited with code ${code} and signal ${signal}`)
        console.log('🔄 Restarting Queue Worker in 5 seconds...')
        setTimeout(() => {
            spawn('node', [path.join(__dirname, 'Services', 'Queue.Worker.js')], {
                stdio: 'inherit',
                shell: true
            })
        }, 5000)
    })
    
    // Handle process termination
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down services...')
        subscriber.kill()
        worker.kill()
        process.exit(0)
    })
    
    process.on('SIGTERM', () => {
        console.log('\n🛑 Shutting down services...')
        subscriber.kill()
        worker.kill()
        process.exit(0)
    })
}

// DB Connection Test
if (cluster.isPrimary || cluster.isMaster) {
    db()
    createDatabaseAndTable()
    if(!fs.existsSync(path.join(__dirname , 'metrics.txt'))){
        fs.writeFileSync(path.join(__dirname , 'metrics.txt') , '' , {encoding:'utf-8'})
    }
}

app.use(express.json({
    limit: '10mb',
    strict:true
}))

app.use(cors({
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://127.0.0.1:3000', 'http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:5000'],
    methods: ['GET', 'PUT', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}))

app.use('/api/file', rateLimiter ,fileRoute)
app.use('/api/user', rateLimiter , userRoute)
app.use('/api/report', rateLimiter ,analysisRoute)

app.use(express.urlencoded({
    extended: true,
    limit:'10mb'
}))

app.set('trust proxy' , true)

// Serve Frontend Static Files
app.use(express.static(path.join(__dirname, 'Frontend')))

app.get('/api', (req, res) => {
    return res.status(200).json({
        status: true,
        server: os.machine(),
        port: process.env.PORT || 3000,
        cpus: os.cpus().length,
        memory: os.freemem(),
        netwrokInfo: os.networkInterfaces(),
        userInfo: os.userInfo()
    })
})

// Metrics endpoint
app.get('/metrics', (req, res) => {
    const metricsPath = path.join(__dirname, 'metrics.txt')
    
    if (fs.existsSync(metricsPath)) {
        const metrics = fs.readFileSync(metricsPath, 'utf-8')
        return res.status(200).json({
            status: true,
            metrics: metrics,
            timestamp: new Date().toISOString()
        })
    } else {
        return res.status(404).json({
            status: false,
            message: 'Metrics file not found'
        })
    }
})

// Cleanup job - runs every 24 hours (deletes files from server AND database)
setInterval(async () => {
    const uploadsDir = path.join(__dirname, 'uploads')
    
    console.log('🧹 Starting 24-hour cleanup job...')
    
    try {
        const now = Date.now()
        const oneDayAgo = now - (24 * 60 * 60 * 1000)
        let deletedFilesCount = 0
        let deletedFromDB = 0
        
        // Get database connection
        const pool = require('./SQL Server/Database')
        const connection = await pool.getConnection()
        
        try {
            await connection.query('USE MINI_S3_BUCKET')
            
            // Get all files older than 24 hours from database
            const [oldFiles] = await connection.query(
                'SELECT id, storage_path, createdAt FROM files WHERE createdAt < ?',
                [oneDayAgo]
            )
            
            console.log(`Found ${oldFiles.length} files older than 24 hours in database`)
            
            // Delete each old file from server and database
            for (const fileRecord of oldFiles) {
                try {
                    // Delete from server storage
                    const filePath = path.join(__dirname, fileRecord.storage_path)
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath)
                        console.log(`✅ Deleted file from server: ${filePath}`)
                        deletedFilesCount++
                    }
                    
                    // Delete from database (files table)
                    await connection.query('DELETE FROM files WHERE id = ?', [fileRecord.id])
                    
                    // Delete associated analysis records
                    await connection.query('DELETE FROM analysis WHERE file_id = ?', [fileRecord.id])
                    
                    // Delete associated shared records
                    await connection.query('DELETE FROM shared WHERE file_id = ?', [fileRecord.id])
                    
                    deletedFromDB++
                    console.log(`✅ Deleted file from database: ${fileRecord.id}`)
                    
                } catch (fileError) {
                    console.error(`❌ Error deleting file ${fileRecord.id}:`, fileError.message)
                }
            }
            
            // Clean up empty user folders
            if (fs.existsSync(uploadsDir)) {
                fs.readdirSync(uploadsDir).forEach(userFolder => {
                    const userPath = path.join(uploadsDir, userFolder)
                    
                    if (fs.statSync(userPath).isDirectory()) {
                        if (fs.readdirSync(userPath).length === 0) {
                            fs.rmdirSync(userPath)
                            console.log(`✅ Removed empty folder: ${userPath}`)
                        }
                    }
                })
            }
            
            console.log(`✅ Cleanup completed: ${deletedFilesCount} files from server, ${deletedFromDB} records from database`)
            
        } finally {
            connection.release()
        }
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error.message)
    }
}, 24 * 60 * 60 * 1000) // 24 hours

// Serve Frontend for all non-API routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'Frontend', 'index.html'))
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`\n✅ Server Started Successfully!`)
    console.log(`🌐 Server: http://localhost:${PORT}`)
    console.log(`📁 Frontend: http://localhost:${PORT}`)
    console.log(`🔧 API: http://localhost:${PORT}/api`)
    console.log(`📊 Metrics: http://localhost:${PORT}/metrics`)
    console.log(`\n📡 Redis Subscriber: Running`)
    console.log(`⚙️  Queue Worker: Running`)
    console.log(`\n🚀 All services are operational!\n`)
})

// if(cluster.isPrimary || cluster.isMaster)
// {
//     console.log('Primary Process is Spawning Multiple Process Dynamic Load Balancer')
//     for(let i=0 ; i<os.cpus().length ; i++)
//         cluster.fork()

//     cluster.on('exit' , (worker , code , signal)=>{
//         console.log(`Process With PID ${worker.pid} is Died Spawning New Process`)
//         setTimeout(()=>{
//             cluster.fork()
//             console.log('New Process has Joined The Pool')
//         },5000)
//     })
// }
// else
// {
//     app.listen(process.env.PORT || 3000 , ()=>{
//         console.log(`Server is Running On Port ${process.env.PORT || 3000}`)
//     })
// }