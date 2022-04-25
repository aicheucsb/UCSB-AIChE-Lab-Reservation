import Axios from 'axios';
import { PrintError } from './functions/util.js';
import { adjustForDST } from './functions/time.js'
import { SendConfirmationEmail } from './functions/email.js'

// Enable CORS: https://vercel.com/support/articles/how-to-enable-cors
const allowCors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', 'https://registration-six.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'POST')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )
    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }
    return await fn(req, res);
}

function handler(req, res) {
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
    console.log("Got new request: ", body);
    const startTime = body.start; // these look like: '2022-04-25T07:06:00-08:00' YYYY-MM-DDTHH:mm:ssZ format
    const endTime = body.end;
    const description = "Note: Please ensure you've completed the safety training and wear long sleeved clothes and closed toe shoes if you will be working with chemicals.\n\n" + body.description;
    const title = body.title;

    // Get Access token
    GetAccessToken(res).then((accessToken) => {
        const calendarID = "cscae19m9abei8bv23e1queim8@group.calendar.google.com" // This was obtained via the Google API Explorer Calendar List: https://developers.google.com/calendar/api/v3/reference/calendarList/list
        // CalendarID is needed to get the calendar
        // If you delete and remake the calendar, you must get the ID again using API Explorer and paste it in inside of const calendarID

        // Convert to the google calendar friendly time while checking if DST
        const momentStart = adjustForDST(startTime);
        const momentEnd = adjustForDST(endTime);

        // Check availability of the time
        CheckAvailability(res, calendarID, accessToken, momentStart, momentEnd).then((available) => {
            if (available) {
                // Make the reservation
                MakeReservation(res, calendarID, accessToken, momentStart, momentEnd, description, title).then(() => {
                    SendConfirmationEmail(body.email, body.name, momentStart, momentEnd);
                });
            } else {
                res.status(409).send('Conflicting times with another reservation'); // 409: conflict status code. There was a conflict with overlapping times. Likely not an issue with the code
            }
        });
    }).catch((error) => {
        PrintError(error);
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
        PrintError(error)
        res.status(500).send('Failed to get Access Token. Refresh Token likely expired. Please contact the site admin.'); // 500 error. API Key might be invalid, or the refresh token expired. Debug by generating new Refresh token according to IBM instructions
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
                { id: calendarId }
            ]
        }, {
            // Authorization header
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }).catch((error) => {
            PrintError(error);
            res.status(500).send('Unable to check availability. Please contact the site admin.')
        });

        // Parse response and check if there are conflicts
        return res.data.calendars[calendarId].busy.length === 0;
    } catch (error) {
        PrintError(error);
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
        return
    } catch (error) {
        PrintError(error);
        res.status(502).send('Unable to make reservation for an unknown reason. Contact the site admin.'); // 502 error, something went wrong when making the reservation with the post request. Debug MakeReservation, ensure that the Google API has not changed
    }
}

module.exports = allowCors(handler);
