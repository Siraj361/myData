const fs = require('fs');
const { MailerSend, EmailParams, Sender, Recipient, Attachment } = require('mailersend');

const mailerSend = new MailerSend({ apiKey: process.env.MAIL_SENDER_API_KEY });

const sendEmailWithPdf = async (req, res) => {
  // Your existing controller code
  try {
    const { toEmail, subject, message } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'PDF file is required' });
    }

    const attachment = new Attachment(
      fs.readFileSync(file.path, { encoding: 'base64' }),
      file.originalname,
      'attachment'
    );

    const emailParams = new EmailParams()
      .setFrom(new Sender('no-reply@yourdomain.com', 'Your Company'))
      .setTo([new Recipient(toEmail, toEmail)])
      .setSubject(subject)
      .setText(message)
      .setHtml(`<p>${message}</p>`)
      .setAttachments([attachment]);

    await mailerSend.email.send(emailParams);

    res.status(200).json({ success: true, message: 'Email sent with PDF attachment' });
  } catch (error) {
    console.error('Error sending email:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
};

module.exports = { sendEmailWithPdf };