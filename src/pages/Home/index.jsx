// import React from 'react'
import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import Trash from "../../components/icons/Trash";
import Hu from "../../components/Hu";
import Modal from "../../components/Modal";
import MjChart from "../../components/MjChart";

const Home = () => {
  const { storage_players, storage_rounds, fanPt, defualtData } =
    useOutletContext();

  let [theChart, setTheChart] = useState();

  const modalRef = useRef();
  const charRef = useRef();
  const backdropRef = useRef();
  const [clearing, setClearing] = useState(false);

  const [rounds, setRounds] = useState(storage_rounds ? storage_rounds : 0);

  const [players, setPlayers] = useState(
    storage_players ? storage_players : defualtData
  );

  const nameHandler = (idx) => {
    return (ev) => {
      players[idx].name = ev.target.value;
      setPlayers([...players]);
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

  const modalHanlder = () => {
    modalRef.current.classList.add("show");
    backdropRef.current.classList.add("show", "pointer-events-auto");
  };

  const closeModal = () => {
    clearing ? setClearing(false) : "";
    backdropRef.current.classList.remove("show", "pointer-events-auto");
    modalRef.current.classList.remove("show");
  };

  useEffect(() => {
    localStorage.setItem("data", JSON.stringify([...players]));
  }, [players]);

  return (
    <div>
      {/* <small>{JSON.stringify(hu)}</small> */}

      <div className="container">
        <section className="py-5">
          <MjChart {...{ players, setPlayers, fanPt, rounds, charRef }} />
        </section>

        <Modal {...{ modalRef, backdropRef, closeModal, setClearing }}>
          <Hu
            {...{
              players,
              setPlayers,
              fanPt,
              rounds,
              setRounds,
              closeModal,
              charRef,
              clearing,
              setClearing,
            }}
          />
        </Modal>

        <br />
        <br />

        <div className="flex flex-row relative -mx-5">
          <div className="pl-5"></div>

          <div className="absolute top-[31px]">
            {new Array(rounds).fill(null)?.map((el, i) => (
              <div className="odd:bg-gray-200" onClick={delRound(i)} key={i}>
                <Trash width={24} height={24} className="py-1 fill-red-500 " />
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
                  defaultValue={name}
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

      <button
        onClick={modalHanlder}
        className="fixed shadow-gray-500 shadow-md bottom-[50px] left-[50%] -translate-x-[50%] bg-sky-500 text-white w-[60px] h-[60px] flex justify-center items-center rounded-full"
      >
        <span className="text-3xl">食!</span>
      </button>
    </div>
  );
};

export default Home;
