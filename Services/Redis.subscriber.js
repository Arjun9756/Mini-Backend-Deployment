const { createClient } = require('../Utils Service/Redis.utils')
const { Queue, QueueEvents } = require('bullmq')
const { channel } = require('diagnostics_channel')
const fs = require('fs')
const path = require('path')
const subscriber = createClient()

// const thresholdValue = 1; // Bulk Processing

const virusScanQueue = new Queue('virusScanQueue', {
    connection: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD
    },
})

const virusScanQueueEvent = new QueueEvents('virusScanQueue', {
    connection: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD
    },
    autorun:true
})

virusScanQueueEvent.on('failed' , async ({jobId , failedReason})=>{
    const job = await virusScanQueue.getJob(jobId)
    console.log(`Job With ID ${jobId} is Failed To Process With Reason ${failedReason}`)
})

async function startSubsciber() {
    return new Promise(async (resolve , reject)=>{
        try{
            await subscriber.subscribe('virusScan')
            subscriber.on('message' , async (channel , msg)=>{
                const data = JSON.parse(msg)
                if(channel === 'virusScan'){
                    await virusScanQueue.add('virusScanQueue' , 
                        {filePath:msg.filePath , msg},
                        {
                            attempts:4,
                            backoff:{type:'exponential' , delay:500}, // Wait for delay * (2 ^ attempt - 1),
                            priority:1,
                            removeOnComplete:true,
                            timestamp:60000, // 1 Min Me hua toh thik verna ye attempt fail or attempt 0 toh remove,
                            removeOnFail:true
                        }
                    )
                }
            })

            resolve()
        }
        catch(error){
            console.log(error.message)
            reject()
        }
    })
}

module.exports = startSubsciber