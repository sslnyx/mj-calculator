import { useEffect } from "react";
import { resetBtns, setAllBtns } from "../lib/plugins";

const WinLoseContainer = ({
  winnerRef,
  loserRef,
  players,
  setHu,
  hu,
  fanPt,
  fan,
  winnerContainer,
  loserContainer,
}) => {
  const huHandler = (winner, loser) => {
    return (ev) => {
      if (winnerContainer) {
        resetBtns(winnerRef.current);
        ev.target.classList.add("active");
        setHu({ ...hu, winner, pt: fanPt[fan] });
      } else {
        resetBtns(loserRef.current);
        ev.target.classList.add("active");
        setHu({ ...hu, loser, pt: fanPt[fan] });
      }
    };
  };

  useEffect(() => {
    loserContainer
      ? (resetBtns(loserRef.current), setHu({ ...hu, loser: null }))
      : "";
  }, [hu.winner]);

  useEffect(() => {
    loserContainer && hu.bao ? console.log("bao") : "";
  }, [hu.bao]);

  return (
    <>
      <h3 className="text-center font-bold text-xl">
        {winnerContainer && !hu.winner && hu.selfTouch
          ? "邊個自摸？"
          : winnerContainer && !hu.winner && hu.bao
          ? "邊個自摸？"
          : (winnerContainer && hu.winner && hu.bao) ||
            (hu.selfTouch && winnerContainer && hu.winner)
          ? "自摸"
          : winnerContainer
          ? "食糊"
          : loserContainer && hu.bao
          ? "邊個包？"
          : "出銃"}
      </h3>

      <div className="flex flex-wrap justify-center">
        {players?.map(({ name, id }, i) => (
          <button className="font-bold basis-1/2 p-1" key={i}>
            <div
              ref={(el) =>
                winnerContainer
                  ? (winnerRef.current[id] = el)
                  : (loserRef.current[id] = el)
              }
              onClick={huHandler(id, id)}
              className="text-neutral-800 py-1 px-4 bg-white rounded"
            >
              {name}
            </div>
          </button>
        ))}
      </div>
    </>
  );
};

export default WinLoseContainer;
