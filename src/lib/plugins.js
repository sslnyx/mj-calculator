const fetchApi = async (url, method) => {
    const res = await fetch(url, {
        method
    })
    return await res.json()
}

const eat = ({ players, hu, setRounds, setPlayers, rounds }) => {
    for (const player of players) {
        player.points[rounds] = 0;

        rounds === 0 ? player.accPoints[rounds] = 0 :
            player.accPoints[rounds] = player.accPoints[rounds - 1];
    }

    const winner = players.find(({ id }) => id === hu.winner)
    const loser = players.find(({ id }) => id === hu.loser)

    winner.points[rounds] = hu.pt;
    loser.points[rounds] = -hu.pt;

    rounds === 0 ? (winner.accPoints[rounds] = hu.pt, loser.accPoints[rounds] = -hu.pt) :
        (winner.accPoints[rounds] = hu.pt + winner.accPoints[rounds - 1],
            loser.accPoints[rounds] = -hu.pt + loser.accPoints[rounds - 1]
        );

    localStorage.setItem("rounds", JSON.stringify(rounds + 1));
    localStorage.setItem("data", JSON.stringify(players))

    setRounds((el) => el + 1);
    setPlayers(players);
};

const zimo = ({ players, hu, setRounds, setPlayers, rounds }) => {
    if (hu.bao) {
        for (const player of players) {
            player.points[rounds] = 0;
            rounds === 0 ? player.accPoints[rounds] = 0 :
                player.accPoints[rounds] = player.accPoints[rounds - 1];
        }

        const winner = players.find(({ id }) => id === hu.winner)
        const loser = players.find(({ id }) => id === hu.loser)

        winner.points[rounds] = (hu.pt / 2) * 3;
        loser.points[rounds] = -(hu.pt / 2) * 3;

        rounds === 0 ?
            (winner.accPoints[rounds] = (hu.pt / 2) * 3,
                loser.accPoints[rounds] = -(hu.pt / 2) * 3)
            : (winner.accPoints[rounds] = winner.accPoints[rounds - 1] + (hu.pt / 2) * 3,
                loser.accPoints[rounds] = loser.accPoints[rounds - 1] + (-(hu.pt / 2) * 3))

    } else {
        const allLosers = players.filter(({ id }) => id !== hu.winner);
        const winner = players.find(({ id }) => id === hu.winner)

        for (const loser of allLosers) {
            loser.points[rounds] = -(hu.pt / 2);
            rounds === 0 ?
                loser.accPoints[rounds] = -(hu.pt / 2) :
                loser.accPoints[rounds] = -(hu.pt / 2) + loser.accPoints[rounds - 1]
        }

        winner.points[rounds] = (hu.pt / 2) * 3;

        rounds === 0 ? winner.accPoints[rounds] = (hu.pt / 2) * 3 :
            winner.accPoints[rounds] = (hu.pt / 2) * 3 + winner.accPoints[rounds - 1]
    }

    localStorage.setItem("rounds", JSON.stringify(rounds + 1));
    localStorage.setItem("data", JSON.stringify(players))
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


function randomRgbaString(alpha) {
    let r = Math.floor(Math.random() * 255)
    let g = Math.floor(Math.random() * 255)
    let b = Math.floor(Math.random() * 255)
    let a = alpha
    return `rgba(${r},${g},${b},${a})`
}

export { fetchApi, eat, zimo, resetBtns, setAllBtns, randomRgbaString }