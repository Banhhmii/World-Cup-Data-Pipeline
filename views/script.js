const displayContainer = document.getElementById("display-container");

const getAllPlayers = async () => {
    try {
        const response = await fetch("/players");
        if (!response.ok) {
            throw new Error("Failed to fetch players");
        }
        const data = await response.json();
        console.log("Fetched players:", data);
        return { players: data.players, goalkeepers: data.goalkeepers };
    } catch (error) {
        console.error("Error fetching players:", error);
        throw error;
    }
};

const createStatRow = (label, value) => {
    const row = document.createElement("li");
    row.textContent = `${label}: ${value}`;
    return row;
};

const createPlayerCard = (player, statFields) => {
    const card = document.createElement("div");
    card.className = "player-card";

    const name = document.createElement("h3");
    name.textContent = `${player.name} (${player.country})`;
    card.appendChild(name);

    const stats = document.createElement("ul");
    for (const [label, key] of statFields) {
        stats.appendChild(createStatRow(label, player[key]));
    }
    card.appendChild(stats);

    return card;
};

const renderSection = (title, players, statFields) => {
    const section = document.createElement("section");

    const heading = document.createElement("h2");
    heading.textContent = title;
    section.appendChild(heading);

    players.forEach((player) => {
        section.appendChild(createPlayerCard(player, statFields));
    });

    return section;
};

const renderPlayers = ({players, goalkeepers}) => {
    displayContainer.appendChild(
        renderSection("Players", players, [
            ["Age", "age"],
            ["Position", "position"],
            ["Goals", "goals"],
            ["Assists", "assists"],
            ["Yellow Cards", "yellow_cards"],
            ["Red Cards", "red_cards"],
        ])
    );

    displayContainer.appendChild(
        renderSection("Goalkeepers", goalkeepers, [
            ["Age", "age"],
            ["Position", "position"],
            ["Saves", "saves"],
            ["Save %", "saves_pct"],
            ["Goals Conceded", "goals_conceded"],
            ["Clean Sheets", "clean_sheets"],
        ])
    );
};

getAllPlayers()
    .then(renderPlayers)
    .catch((error) => console.error("Error rendering players:", error));
