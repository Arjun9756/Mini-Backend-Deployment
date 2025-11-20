const express = require('express')
const cluster = require('cluster')
const os = require('os')
const app = express()
const path = require('path')
const dotenv = require('dotenv')
const db = require('./Utils Service/DB_Connection.util')
const userRoute = require('./Routes/User.route')
const createDatabaseAndTable = require('./Utils Service/ExecuteTable.db')
const fileRoute = require('./Routes/File.route')
const cors = require('cors')

dotenv.config({
    path: path.join(__dirname, '.env')
})

// DB Connection Test
if (cluster.isPrimary || cluster.isMaster) {
    db()
    createDatabaseAndTable()
}

app.use(express.json({
    limit: '10mb'
}))

app.use(cors({
    origin: ['http://127.0.0.1:3000', 'http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:5000'],
    methods: ['GET', 'PUT', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}))

app.use('/api/file', fileRoute)

app.use(express.urlencoded({
    extended: true
}))

app.get('/confess-your-fellings', (req, res) => {
    return res.status(200).json({
        status: true,
        She: "Phele Kuch Ban Toh Jao Yar Me Tumhari Hi Hu"
    })
})

app.use('/api/user', userRoute)

app.get('/', (req, res) => {
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

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is Running On Port ${process.env.PORT || 3000}`)
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