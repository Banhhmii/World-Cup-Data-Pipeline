const fs = require('fs');
const parse = require('csv-parser');
const { pool } = require('pg');
const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(express.json());

const csvFilePath = '/Users/tommy/Downloads/players.csv';

const players = [];

fs.createReadStream(csvFilePath)
    .pipe(parse({ columns: true, delimiter: ',' }))
    .on('data', (row) => {
        players.push(row);
    })
    .on('end', () => {
        const transformedPlayers = players.map(transformPlayerData);
        console.log('Transformed Player Data:', transformedPlayers);
    });

const transformPlayerData = (player) => {
    return {
        name: player.player,
        age: parseInt(player.age, 10),
        position: player.position,
        goals: parseInt(player.goals, 10),
        goals_per_90: parseFloat(player.goals_per90),
        assists: parseInt(player.assists, 10),
        yellow_cards: parseInt(player.cards_yellow, 10),
        red_cards: parseInt(player.cards_red, 10),
        points_per_game: parseFloat(player.points_per_game)
    };
};


