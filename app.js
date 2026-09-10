import express from 'express';
import cookieParser from 'cookie-parser'; //used like express.json but parses the cookie header and gives back an object

const app = express();

app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.send('DropCal API');
});

export default app;