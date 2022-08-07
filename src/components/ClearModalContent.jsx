// import React from 'react'
import { useOutletContext } from "react-router-dom";
import PrimaryBtn from "./PrimaryBtn";

const ClearModalContent = ({
  setPlayers,
  setRounds,
  closeModal,
}) => {
  const { defualtData } = useOutletContext();
  const defualtPlayers = ["P1", "P2", "P3", "P4"];

  const clearHandler = (id) => {
    localStorage.clear();

    for (const [idx, player] of defualtData.entries()) {
      player.points.length ? (player.points = []) : "";
      player.name = defualtPlayers[idx];
    }

    setPlayers([...defualtData]);
    setRounds(0);
    closeModal(id);
  };

  return (
    <div className="flex flex-col items-center">
      <h2 className="mb-5">刪曬所有紀錄</h2>

      <div className="flex w-[300px] justify-between">
        <PrimaryBtn
          onClick={() => clearHandler("clearRecord")}
          className="bg-red-500"
        >
          確定清除!
        </PrimaryBtn>
        <PrimaryBtn
          onClick={() => closeModal("clearRecord")}
          className="bg-gray-400"
        >
          取消
        </PrimaryBtn>
      </div>
    </div>
  );
};

export default ClearModalContent;
