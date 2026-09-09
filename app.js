import express from 'express';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.send('DropCal API');
});

export default app;