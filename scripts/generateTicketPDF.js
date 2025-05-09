//scripts/generateTicketPDF.js

const puppeteer = require("puppeteer");
const fs = require("fs");

const generateTicketPDF = async (orderCode, visitorName, visitDate, email) => {
    const htmlTemplate = fs.readFileSync('ticket-template.html', 'utf-8');
    
    // Replace placeholders in the HTML
    let htmlContent = htmlTemplate
        .replace('{{orderCode}}', orderCode)
        .replace('{{visitorName}}', visitorName)
        .replace('{{visitDate}}', visitDate)
        .replace('{{email}}', email);
    
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
