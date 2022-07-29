import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { eat, zimo } from "../lib/plugins";
import { Chart } from "chart.js";

const HuFooter = (props) => {
  const { defualtData } = useOutletContext();
  const { hu, players, setPlayers, setRounds, rounds, closeModal, charRef, clearing, setClearing  } =
    props;

  const calhandler = () => {
    if (hu.bao && hu.winner && hu.loser) return zimo(props), closeModal();
    if (hu.selfTouch && hu.winner) return zimo(props), closeModal();
    if (hu.winner && hu.loser && hu.winner !== hu.loser)
      return eat(props), closeModal();
  };

  const defualtPlayers = ["Ning", "Fiona", "Jacky", "Vivian"]
  

  const clearHandler = () => {
    closeModal();
    localStorage.clear();

    for (const [idx, player] of defualtData.entries()) {
      // console.log(player)
      player.points.length ? (player.points = []) : "";
      player.name = defualtPlayers[idx]
    }

    console.log(defualtData)

    setClearing(false);
    setPlayers([...defualtData]);
    setRounds(0);
  };

  return (
    <div className="flex">
      <button
        className={`rounded py-2 px-5 text-white ${
          (hu.winner && hu.loser) || (hu.winner && hu.selfTouch)
            ? "bg-red-600"
            : "bg-gray-500 pointer-events-none"
        }`}
        onClick={calhandler}
      >
        計數
      </button>

      <div className="flex-1"></div>

      {!clearing ? (
        <button
          onClick={() => setClearing(true)}
          className="bg-black text-white rounded py-2 px-5"
        >
          清除紀錄
        </button>
      ) : (
        <div>
          <button
            className="bg-red-500 mr-3 text-white rounded py-2 px-5"
            onClick={clearHandler}
          >
            確定清除
          </button>
          <button
            className="bg-black text-white rounded py-2 px-5"
            onClick={() => setClearing(false)}
          >
            取消
          </button>
        </div>
      )}
    </div>
  );
};

export default HuFooter;
