import { useState, useRef, useEffect } from "react";
import { useOutletContext } from "react-router-dom";

const PlayersModalContent = ({ players, setPlayers }) => {
  const { allPlayers } = useOutletContext();
  const [error, setError] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState("p1");
  const activePlayersRef = useRef({});
  const allPlayersRef = useRef({});

  const removePlayer = (inputId, ev) => {
    Object.values(activePlayersRef.current).forEach((playerBtn) => {
      playerBtn.classList.remove("!bg-red-500", "scale-[1.2]");
    });
    ev.target.classList.add("!bg-red-500", "scale-[1.2]");
    players.find(({ id }) => id === inputId).name = inputId.toUpperCase();
    setPlayers([...players]);
    setSelectedPlayer(inputId);
  };

  const playerHandler = (player, ev) => {
    selectedPlayer
      ? ((players.find(({ id }) => selectedPlayer === id).name = player),
        setPlayers([...players]))
      : setError(true);

    const thePlayer = players.find(({ id }) => selectedPlayer === id);

    const nextPlayer =
      players.indexOf(thePlayer) + 1 > 3
        ? "p1"
        : players[players.indexOf(thePlayer) + 1].id;

    Object.values(activePlayersRef.current).forEach((playerBtn) => {
      playerBtn.classList.remove("!bg-red-500", "scale-[1.2]");
    });

    activePlayersRef.current[nextPlayer].classList.add(
      "!bg-red-500",
      "scale-[1.2]"
    );

    setSelectedPlayer(nextPlayer);
  };

  useEffect(() => {
    activePlayersRef.current[selectedPlayer].classList.add(
      "!bg-red-500",
      "scale-[1.2]"
    );
  }, []);

  useEffect(() => {
    Object.entries(allPlayersRef.current).forEach(([name, playerBtn]) => {
      playerBtn.classList.remove("!bg-red-500");
    });

    Object.entries(allPlayersRef.current).forEach(([name, playerBtn]) => {
      if (
        Object.values(activePlayersRef.current).find(
          (el) => el.innerHTML === name
        )
      ) {
        playerBtn.classList.add("!bg-red-500");
      }
    });
  }, [selectedPlayer]);

  return (
    <div className="text-center">
      <div className="border p-3 rounded">
        <h2 className="mb-3">邊個玩緊?</h2>
        <div className="flex justify-center flex-wrap">
          {players.map(({ name, id }) => (
            <button
              key={id}
              className="px-3 py-2 text-white last:mr-0 basis-1/2"
            >
              <div
                className="transition-all duration-500 ease-out py-2 px-5 bg-sky-500 rounded"
                ref={(el) => (activePlayersRef.current[id] = el)}
                onClick={(ev) => removePlayer(id, ev)}
              >
                {name}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5"></div>

      <div className="border rounded p-3">
        <h2 className="mb-3">揀人啦！</h2>

        <div className="flex flex-wrap justify-center">
          {allPlayers.map((player, i) => (
            <button
              key={i}
              ref={(el) => (allPlayersRef.current[player] = el)}
              onClick={(ev) => playerHandler(player, ev)}
              className="py-2 px-5 bg-sky-500 mb-3 mr-3 rounded text-white"
            >
              {player}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayersModalContent;
