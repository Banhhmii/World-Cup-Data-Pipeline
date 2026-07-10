const displayContainer = document.getElementById("display-container");

const getAllPLayers = async () => {
    try {
        const response = await fetch("/players");
        if (!response.ok) {
            throw new Error("Failed to fetch players");
        }
        const data = await response.json();
        return data.players;
    } catch (error) {
        console.error("Error fetching players:", error);
        throw error;
    }
};

