// import React from 'react'
import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import TrashCan from "../../components/icons/TrashCan";
import Hu from "../../components/Hu";
import Modal from "../../components/Modal";
import MjChart from "../../components/MjChart";
import ClearModalContent from "../../components/ClearModalContent";
import PlayersModalContent from "../../components/PlayersModalContent";

const Home = () => {
  const {
    storage_players,
    storage_rounds,
    fanPt,
    defualtData,
    modalRef,
    backdropRef,
  } = useOutletContext();

  const charRef = useRef();
  const [clearing, setClearing] = useState(false);
  const [rounds, setRounds] = useState(storage_rounds ? storage_rounds : 0);

  const [players, setPlayers] = useState(
    storage_players ? storage_players : defualtData
  );

  const nameHandler = (idx) => {
    return (ev) => {
      players[idx].name = ev.target.value;
      setPlayers([...players]);
      localStorage.setItem("data", JSON.stringify(players));
    };
  };

  const delRound = (idx) => {
    return () => {
      for (const player of players) {
        player.points.splice(idx, 1);
      }
      localStorage.setItem("rounds", JSON.stringify(rounds - 1));
      setRounds((el) => el - 1);
      setPlayers(players);
    };
  };

  const closeModal = (id) => {
    clearing ? setClearing(false) : "";
    backdropRef.current[id].classList.remove("show", "pointer-events-auto");
    modalRef.current[id].classList.remove("show");
  };

  const modalProps = {
    modalRef,
    backdropRef,
    setClearing,
    clearing,
    closeModal,
  };

  const huProps = {
    players,
    setPlayers,
    fanPt,
    rounds,
    setRounds,
    charRef,
    clearing,
    setClearing,
    closeModal,
  };

  return (
    <div>
      <div className="container max-w-[420px] pt-10">
        <Modal id="hu" {...modalProps}>
          <Hu {...huProps} />
        </Modal>

        <Modal id="mjChart" {...modalProps}>
          <MjChart {...{ players, rounds, charRef }} />
        </Modal>

        <Modal id="clearRecord" {...modalProps}>
          <ClearModalContent {...huProps} />
        </Modal>

        <Modal id="playersModal" {...modalProps}>
          <PlayersModalContent {...huProps} />
        </Modal>

        <div className="flex flex-row relative -mx-5">
          <div className="pl-5"></div>

          <div className="absolute top-[31px]">
            {new Array(rounds).fill(null)?.map((el, i) => (
              <div className="odd:bg-gray-200" onClick={delRound(i)} key={i}>
                <TrashCan
                  width={24}
                  height={24}
                  className="py-1 fill-red-500 "
                />
              </div>
            ))}
          </div>

          {players?.map(({ name, points, id }, i) => (
            <div key={i} className="basis-1/4">
              <div className="w-full">
                <input
                  className={`text-center max-w-full w-full h-[24px] font-bold mb-2 ${
                    name.toLowerCase().includes("jac")
                      ? "focus-visible:bg-gradient-to-br focus-visible:from-green-500 focus-visible:to-transparent focus-visible:border-green-500"
                      : ""
                  }`}
                  type="text"
                  value={name}
                  onChange={nameHandler(i)}
                />

                {points?.map((pt, i) => (
                  <div
                    key={i}
                    className="text-center even:bg-gray-200 h-[24px] flex justify-center items-center"
                  >
                    <span>{pt}</span>
                  </div>
                ))}

                <div className="mb-3"></div>

                <hr />
                <div className="mb-3"></div>

                <div className="text-center">
                  {points?.reduce((acc, pt) => acc + pt, 0)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-10"></div>
      </div>
    </div>
  );
};

export default Home;
