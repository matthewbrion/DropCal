import express from 'express';
import cookieParser from 'cookie-parser'; //used like express.json but parses the cookie header and gives back an object
import apiRouter from '#api/index';

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use('/api', apiRouter);

app.get('/', (req, res) => {
    res.send('DropCal API');
});

export default app;