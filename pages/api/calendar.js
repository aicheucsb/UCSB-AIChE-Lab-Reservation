import Axios from 'axios';
import sgMail from '@sendgrid/mail';
import moment from 'moment';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// calendar public URL
const publicUrl = "https://calendar.google.com/calendar/embed?src=cscae19m9abei8bv23e1queim8%40group.calendar.google.com&ctz=America%2FLos_Angeles";

const fromFields = { name: "UCSB AIChE", email: "ucsb.aiche@gmail.com" };
const AIChEEmail = "ucsb.aiche@gmail.com";

export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(400).send('Invalid request');
    }

    // Obtain the information from the request and put it on
    let body;
    if (typeof req.body === 'string') {
        body = JSON.parse(req.body);
    } else {
        body = req.body;
    }
    const startTime = body.start;
    const endTime = body.end;
    const description = "Note: Please ensure you've completed the safety training and wear long sleeved clothes and closed toe shoes if you will be working with chemicals.\n\n" + body.description;
    const title = body.title;

    // Get Access token
    GetAccessToken(res).then((accessToken) => {
        const calendarID = "cscae19m9abei8bv23e1queim8@group.calendar.google.com" // This was obtained via the Google API Explorer Calendar List: https://developers.google.com/calendar/api/v3/reference/calendarList/list
        // CalendarID is needed to get the calendar
        // If you delete and remake the calendar, you must get the ID again using API Explorer and paste it in inside of const calendarID

        // Check availability of the time
        CheckAvailability(res, calendarID, accessToken, startTime, endTime).then((available) => {
            if (available) {
                // Make the reservation
                MakeReservation(res, calendarID, accessToken, startTime, endTime, description, title).then(() => {
                    SendConfirmationEmail(body.email, body.name, moment(startTime).format('MMMM Do YYYY, h:mm a'), moment(startTime).format('MMMM Do YYYY, h:mm a'));
                });
            } else {
                res.status(409).send('Conflicting times with another reservation'); // 409: conflict status code. There was a conflict with overlapping times. Likely not an issue with the code
            }
        });
    });
}

const GetAccessToken = async (res) => {
    try {
        // Generate new access token: https://stackoverflow.com/questions/10631042/how-to-generate-access-token-using-refresh-token-through-google-drive-api
        let res = await Axios.post("https://www.googleapis.com/oauth2/v4/token", {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
            grant_type: "refresh_token"
        });
        return res.data.access_token;
    } catch (error) {
        console.error(error)
        res.status(500).send({error: 'Failed to get Access Token. Refresh Token likely expired. Please contact the site admin.'}); // 500 error. API Key might be invalid, or the refresh token expired. Debug by generating new Refresh token according to IBM instructions
    }
}

const CheckAvailability = async (res, calendarId, accessToken, startTime, endTime) => {
    try {
        // Use the freebusy API to confirm availability: https://developers.google.com/calendar/api/v3/reference/freebusy/query
        // // Axios has headers as the third argument: https://stackoverflow.com/questions/44617825/passing-headers-with-axios-post-request
        const res = await Axios.post(`https://www.googleapis.com/calendar/v3/freeBusy?key=${process.env.GOOGLE_API_KEY}`, {
            // POST request body
            "timeMin": startTime,
            "timeMax": endTime,
            "items": [
                {calendarId}
            ]
        }, {
            // Authorization header
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        // Parse response and check if there are conflicts
        // console.log("Here it is")
        // console.log(res.data);
        // console.log(res.data.calendars);
        // console.log(res.data.calendars[''].busy);
        // console.log("Bye bye")
        return res.data.calendars[''].busy.length === 0;
    } catch (error) {
        console.error(error);
        res.status(500).send('Unable to check availability. Please contact the site admin.'); // Checking availability encountered an error. Debug CheckAvailability. API Key might be invalid, or the refresh token expired. Debug by generating new Refresh token according to IBM instructions
    }
}

const MakeReservation = async (res, calendarId, accessToken, startTime, endTime, description, title) => {
    try {
        const eventResource = {
            start: {
                dateTime: startTime,
                timeZone: 'America/Los_Angeles',
            },
            end: {
                dateTime: endTime,
                timeZone: 'America/Los_Angeles',
            },
            description: description,
            summary: title
        }
        await Axios.post(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${process.env.GOOGLE_API_KEY}`, eventResource, {
            // Authorization header
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        res.status(201).send('Reservation successfully created');
    } catch(error) {
        console.error(error);
        res.status(502).send('Unable to make reservation for an unknown reason. Contact the site admin.'); // 502 error, something went wrong when making the reservation with the post request. Debug MakeReservation, ensure that the Google API has not changed
    }
}

const SendConfirmationEmail = async (email, name, startTime, endTime) => {
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

const useSendgrid = (sgMail, mail) => {
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