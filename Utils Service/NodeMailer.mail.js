const nodemailer = require('nodemailer')
const path = require('path')
const dotenv = require('dotenv')

dotenv.config({
    path:path.join(__dirname , '..' , '.env')
})

const transporter = nodemailer.createTransport({
    host:process.env.NODEMAILER_HOST_NAME,
    port:parseInt(process.env.NODEMAILER_PORT),
    secure:process.env.NODEMAILER_SECURE === 'true',
    auth:{
        user:process.env.NODEMAILER_USER,
        pass:process.env.NODEMAILER_PASS
    },
    from:process.env.NODEMAILER_USER,
    tls:{
        minVersion:'TLSv1.2'
    },
    connectionTimeout:10000,
    pool:true,
    maxMessages:100,
    maxConnections:5
})

// Gracefully handle SMTP verification - don't crash if email service is unavailable
transporter.verify((err) => {
  if (err) {
    console.warn('⚠️  SMTP Connection Failed:', err.message)
    console.warn('⚠️  Email notifications will be disabled. App will continue without email functionality.')
    console.warn('💡 Tip: Use SendGrid, Mailgun, or upgrade Render plan for SMTP access')
  } else {
    console.log('✅ SMTP Ready - Email notifications enabled')
  }
})

module.exports = transporter