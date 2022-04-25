import moment from 'moment-timezone';

/**
 * 
 * @param {*} time a string representing the date. For example: '2022-01-24T07:06:00-08:00'
 * @returns a date formatted in MMMM DO YYYY, h:mm a. For example: January 24th 2022, 6:06 am
 */
export const adjustForDST = (time) => {
    const formatted = moment(time).tz('America/Los_Angeles').format('MMMM Do YYYY, h:mm a');
    if (moment(time).tz('America/Los_Angeles').isDST()) {
        // subtract 1 hour
        const adjusted = moment(time).tz('America/Los_Angeles').subtract(1, "hour").format('MMMM Do YYYY, h:mm a');
        console.log(`${time} is detected to be in Daylight Savings time, subtracting 1 hour`)
        console.log(`Not DST: ${formatted} to adjusted for DST: ${adjusted}`);
        return adjusted;
    } else {
        // don't subtract
        console.log(`${time} is not in Daylight savings`);
        console.log(`Formatting time to: ${formatted}`)
        return formatted;
    }
}