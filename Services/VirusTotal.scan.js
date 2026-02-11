const axios = require('axios')
const fs = require('fs')
const path = require('path')
const FormData = require('form-data')
require('dotenv').config({
    path: path.join(__dirname, '..', '.env')
})

async function scanFileWithVirusTotal(filePath) {
    if (!filePath) {
        return { status: false, reason: `File Path is Not Valid ${filePath}` }
    }

    const fullPath = path.join(__dirname, '..', filePath)
    
    // Check if file exists before trying to scan
    if (!fs.existsSync(fullPath)) {
        console.error(`File not found at path: ${fullPath}`)
        throw new Error(`ENOENT: no such file or directory, open '${fullPath}'`)
    }

    let formData = new FormData()
    formData.append('file', fs.createReadStream(fullPath))

    try {
        const res = await axios.post('https://www.virustotal.com/api/v3/files',
            formData,
            {
                headers: {
                    'x-apikey': process.env.VIRUS_TOTAL_API_KEY,
                    ...formData.getHeaders()
                },
                timeout: 60000 // 60 second timeout
            })

        if (res.data) {
            console.log(`✅ File uploaded to VirusTotal successfully. Analysis ID: ${res.data.data.id}`)
            return res.data.data.id
        }
        throw new Error("Failed To Process The File")
    }
    catch (error) {
        console.error(`❌ Error While Processing File With Virus Total: ${error.message}`)
        console.error(`File path attempted: ${fullPath}`)
        throw new Error(`VirusTotal upload failed: ${error.message}`)
    }
}

async function getAnalysisReport(analysisId) {
    const url = `https://www.virustotal.com/api/v3/analyses/${analysisId}`
    try {
        let retries = 30 // Increased from 20 to 30
        let attemptCount = 0
        
        console.log(`🔍 Starting analysis polling for ID: ${analysisId}`)
        
        while (retries-- > 0) {
            attemptCount++
            
            try {
                const res = await axios.get(url, {
                    headers: { 'x-apikey': process.env.VIRUS_TOTAL_API_KEY },
                    timeout: 10000 // 10 second timeout per request
                })

                const status = res.data.data.attributes.status
                console.log(`📊 Analysis attempt ${attemptCount}: Status = ${status}`)
                
                if (status === 'completed') {
                    console.log(`✅ Analysis completed successfully after ${attemptCount} attempts`)
                    return { date: res.data.data.attributes.date, stats: res.data.data.attributes.stats }
                }
                
                // Wait 8 seconds between retries (increased from 5)
                await new Promise((resolve) => setTimeout(resolve, 8000))
                
            } catch (requestError) {
                console.warn(`⚠️  Request failed on attempt ${attemptCount}: ${requestError.message}`)
                // Continue retrying even if individual request fails
                await new Promise((resolve) => setTimeout(resolve, 5000))
            }
        }
        
        console.error(`❌ Analysis did not complete after ${attemptCount} attempts (${attemptCount * 8 / 60} minutes)`)
        throw new Error(`Analysis Did Not Complete After ${attemptCount} Retries`)
        
    }
    catch (error) {
        console.error(`❌ Fatal error in getAnalysisReport: ${error.message}`)
        throw new Error(`Not Able To Get The Analysis Report ${error.message}`)
    }
}

module.exports = { getAnalysisReport, scanFileWithVirusTotal }