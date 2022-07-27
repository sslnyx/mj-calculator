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
      <h3 className="mb-3 text-center font-bold text-xl">
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

      <div className="flex justify-center">
        {players?.map(({ name, id }, i) => (
          <button
            ref={(el) =>
              winnerContainer
                ? (winnerRef.current[id] = el)
                : (loserRef.current[id] = el)
            }
            className="py-1 px-4 bg-white mr-3 last:mr-0 rounded text-neutral-800 font-bold"
            key={i}
            onClick={huHandler(id, id)}
          >
            {name}
          </button>
        ))}
      </div>
    </>
  );
};

export default WinLoseContainer;
