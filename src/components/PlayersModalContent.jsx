import { useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";

const PlayersModalContent = ({ players, setPlayers }) => {
  const { allPlayers } = useOutletContext();
  const [error, setError] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const activePlayersRef = useRef({});

  const removePlayer = (inputId, ev) => {
    Object.values(activePlayersRef.current).forEach((playerBtn) => {
      playerBtn.classList.remove("!bg-red-500");
    });
    ev.target.classList.add("!bg-red-500");
    players.find(({ id }) => id === inputId).name = inputId.toUpperCase();
    setPlayers([...players]);
    setSelectedPlayer(inputId);
  };

  const playerHandler = (player) => {
    selectedPlayer
      ? ((players.find(({ id }) => selectedPlayer === id).name = player),
        setPlayers([...players]))
      : setError(true);
  };

  return (
    <div className="text-center">
      <div className="border p-3 rounded">
        <h2 className="mb-3">邊個玩緊?</h2>
        <div className="flex justify-center">
          {players.map(({ name, id }) => (
            <button
              key={id}
              ref={(el) => (activePlayersRef.current[id] = el)}
              onClick={(ev) => removePlayer(id, ev)}
              className="bg-sky-500 py-2 px-5 rounded text-white mr-3 last:mr-0"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5"></div>

      <div className="border rounded p-3">
        <h2 className="mb-3">揀人啦！</h2>

        {error && !selectedPlayer ? (
          <p className="mb-3 text-red-500">揀個玩緊既人先啦</p>
        ) : (
          ""
        )}

        <div className="flex flex-wrap justify-center">
          {allPlayers.map((player, i) => (
            <button
              key={i}
              onClick={() => playerHandler(player)}
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
