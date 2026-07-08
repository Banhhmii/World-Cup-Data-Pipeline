const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
});

app.get('/players', async (req, res) => {
  try {
    const playerResult = await pool.query('SELECT * FROM player');
    const goalkeeperResult = await pool.query('SELECT * FROM goalkeepers');
    res.json({
      players: playerResult.rows,
      goalkeepers: goalkeeperResult.rows,
    });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})