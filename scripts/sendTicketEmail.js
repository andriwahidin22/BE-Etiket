//scripts/sendTicketEmail.js

const puppeteer = require('puppeteer');
const fs = require('fs');

const generateTicketPDF = async (orderCode, customerName, orderDate, status, ticketType, amount, departureDate) => {
    const htmlTemplate = fs.readFileSync('ticket-template.html', 'utf-8');
    
    // Replace placeholders in the HTML
    let htmlContent = htmlTemplate
        .replace('{{orderCode}}', orderCode)
        .replace('{{customerName}}', customerName)
        .replace('{{orderDate}}', orderDate)
        .replace('{{status}}', status)
        .replace('{{ticketType}}', ticketType)
        .replace('{{amount}}', amount)
        .replace('{{departureDate}}', departureDate);
    
    // Launch Puppeteer to convert the HTML to PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.setContent(htmlContent);
    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true
    });
    
    await browser.close();
    
    return pdfBuffer;
};

module.exports = generateTicketPDF;
