import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// calendar public URL
const publicUrl = "https://calendar.google.com/calendar/embed?src=cscae19m9abei8bv23e1queim8%40group.calendar.google.com&ctz=America%2FLos_Angeles";

const fromFields = { name: "UCSB AIChE", email: "ucsb.aiche@gmail.com" };
const AIChEEmail = "ucsb.aiche@gmail.com";

/**
 * 
 * @param {*} email address to send the confirmation email to
 * @param {*} name name on the email
 * @param {*} startTime starting time of the reservation
 * @param {*} endTime ending time of the reservation
 */
export const SendConfirmationEmail = async (email, name, startTime, endTime) => {
    console.log("Generating email");
    const templateID = "d-40d8dc5bc87a4f0e8faa212df7118d89";
    const mail = {
        to: email,
        bcc: AIChEEmail,
        from: fromFields,
        template_id: templateID,
        dynamic_template_data: {
            name: name,
            startTime: startTime,
            endTime: endTime,
            publicUrl: publicUrl
        }
    }

    useSendgrid(sgMail, mail);
}

/**
 * 
 * @param {*} sgMail sendgrind mail client
 * @param {*} mail the email object
 */
export const useSendgrid = (sgMail, mail) => {
    sgMail.send(mail)
        .then(() => {
            console.log('Email sent')
            // console.log('mail-sent-successfully', { templateId, dynamic_template_data });
            // console.log('response', response);
        })
        .catch((error) => {
            console.error('send-grid-error: ', error.toString());
        });
}