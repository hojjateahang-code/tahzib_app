import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian.js';
const d = new DateObject({ calendar: persian });
console.log(d.format());
console.log(d.toDate().toISOString());
