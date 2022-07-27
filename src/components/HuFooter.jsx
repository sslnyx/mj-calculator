import React from "react";
import { useOutletContext } from "react-router-dom";
import { eat, zimo } from "../lib/plugins";

const HuFooter = (props) => {
  const { defualtData } = useOutletContext();
  const { hu, players, setPlayers, setRounds, rounds, closeModal } = props;

  const calhandler = () => {
    closeModal();
    if (hu.bao && hu.winner && hu.loser) return zimo(props);
    if (hu.selfTouch && hu.winner) return zimo(props);
    if (hu.winner && hu.loser && hu.winner !== hu.loser) return eat(props);
  };

  const clearHandler = () => {
    closeModal();
    localStorage.clear();
    for (const player of defualtData) {
      player.points.length ? (player.points = []) : "";
    }
    setPlayers(defualtData);
    setRounds(0);
  };

  return (
    <div className="flex justify-between">
      <button
        className="bg-red-500 rounded py-2 px-5 text-white"
        onClick={calhandler}
      >
        計數
      </button>

      <button
        onClick={clearHandler}
        className="bg-black text-white rounded py-2 px-5"
      >
        清除紀錄
      </button>
    </div>
  );
};

export default HuFooter;
