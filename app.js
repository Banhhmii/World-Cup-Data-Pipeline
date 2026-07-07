const fs = require('fs');
const parse = require('csv-parser');
const { Pool } = require('pg');
const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
});
const app = express();
app.use(express.json());

const csvData = './data/players.csv';

const players = [];

fs.createReadStream(csvData)
    .pipe(parse({ columns: true, delimiter: ',' }))
    .on('data', (row) => {
        players.push(row);
    })
    .on('end', () => {
        const transformedPlayers = players.map(transformPlayerData);
        console.log('Successfully read and transformed player data from CSV');
        storeAllPlayers(transformedPlayers);
        //console.log('Transformed player data:', transformedPlayers);
        console.log('All player data has been stored in the database');
    });

const transformPlayerData = (player) => {
    return {
        name: player.player,
        age: Number(player.age.split("", 2).join('')), // Extract the first two characters for age
        position: player.position,
        goals: parseInt(player.goals, 10),
        goals_per_90: parseFloat(player.goals_per90),
        assists: parseInt(player.assists, 10),
        yellow_cards: parseInt(player.cards_yellow, 10),
        red_cards: parseInt(player.cards_red, 10),
        points_per_game: parseFloat(player.points_per_game)
    };
};

const storePlayerData = async (player) => {
    const query = `
        INSERT INTO player (name, age, position, goals, goals_per_90, assists, yellow_cards, red_cards, points_per_game)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;

    const values = [
        player.name,
        player.age,
        player.position,
        player.goals,
        player.goals_per_90,
        player.assists,
        player.yellow_cards,
        player.red_cards,
        player.points_per_game
    ];

    try {
        await pool.query(query, values);
        console.log(`Player ${player.name} inserted successfully.`);
    } catch (error) {
        console.error(`Error inserting player ${player.name}:`, error);
    }
};

const storeAllPlayers = async (players) => {
    for (const player of players) {
        await storePlayerData(player);
    }
};




