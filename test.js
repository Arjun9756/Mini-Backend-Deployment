const { scanFileWithVirusTotal , getAnalysisReport } = require('./Services/VirusTotal.scan')
const fs = require('fs')

async function virusScan(filePath)
{
    try{
        let analysisId = await scanFileWithVirusTotal(filePath)
        const {date , stats} = await getAnalysisReport(analysisId)

        console.log(stats)
    }
    catch(error){
        console.log(error)
    }
}

virusScan('uploads\\620144aedb17cc0baab8492bd0aa5f4224f1792a5e8dec4102c4b9e2d0037be5\\1763647644156Khushi Resume.pdf')
// fs.readFile('uploads\\620144aedb17cc0baab8492bd0aa5f4224f1792a5e8dec4102c4b9e2d0037be5\\1763647644156Khushi Resume.pdf' , {
//     encoding:'utf-8',
// },(err , data)=>{
//     console.log(data.toString())
// })