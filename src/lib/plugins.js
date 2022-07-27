const fetchApi = async (url, method) => {
    const res = await fetch(url, {
        method
    })
    return await res.json()
}

const eat = ({ players, hu, setRounds, setPlayers, rounds }) => {
    for (const player of players) {
        player.points[rounds] = 0;
    }

    players.find(({ id }) => id === hu.winner).points[rounds] = hu.pt;
    players.find(({ id }) => id === hu.loser).points[rounds] = -hu.pt;

    localStorage.setItem("data", JSON.stringify([...players]));
    localStorage.setItem("rounds", JSON.stringify(rounds + 1));

    setRounds((el) => el + 1);
    setPlayers(players);
};

const zimo = ({ players, hu, setRounds, setPlayers, rounds }) => {
    if (hu.bao) {
        for (const player of players) {
            player.points[rounds] = 0;
        }
        players.find(({ id }) => id === hu.winner).points[rounds] =
            (hu.pt / 2) * 3;
        players.find(({ id }) => id === hu.loser).points[rounds] =
            -(hu.pt / 2) * 3;
    } else {
        const allLosers = players.filter(({ id }) => id !== hu.winner);
        for (const loser of allLosers) {
            loser.points[rounds] = -(hu.pt / 2);
        }
        players.find(({ id }) => id === hu.winner).points[rounds] =
            (hu.pt / 2) * 3;
    }

    localStorage.setItem("data", JSON.stringify([...players]));
    localStorage.setItem("rounds", JSON.stringify(rounds + 1));

    setRounds((el) => el + 1);
    setPlayers(players);
};

const resetBtns = (btnObj) => {
    for (const btn of Object.values(btnObj)) {
        btn?.classList.remove("active")
    }
}


const setAllBtns = (btnObj) => {
    for (const btn of Object.values(btnObj)) {
        btn?.classList.add("active")
    }
}

export { fetchApi, eat, zimo, resetBtns, setAllBtns }