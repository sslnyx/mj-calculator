// import React from "react";

const WinLoseContainer = ({
  winnerRef,
  loserRef,
  players,
  setHu,
  hu,
  fanPt,
  fan,
  winnerContainer,
}) => {
  const huHandler = (winner, loser) => {
    return (ev) => {
      if (winnerContainer) {
        for (const btn of winnerRef.current) {
          btn.classList.remove("active");
        }
        ev.target.classList.add("active");
        setHu({ ...hu, winner, pt: fanPt[fan] });
      } else {
        for (const btn of loserRef.current) {
          btn.classList.remove("active");
        }
        ev.target.classList.add("active");

        setHu({ ...hu, loser, pt: fanPt[fan] });
      }
    };
  };

  return (
    <>
      <h3 className="mb-3 text-center font-bold text-xl">{winnerContainer ? "食糊" : "出銃"}</h3>

      <div className="flex justify-between">
        {players?.map(({ name }, i) => (
          <button
            ref={(el) =>
              winnerContainer
                ? (winnerRef.current[i] = el)
                : (loserRef.current[i] = el)
            }
            className="py-1 px-4 bg-white mr-3 last:mr-0 rounded text-neutral-800 font-bold"
            key={i}
            onClick={huHandler(name, name)}
          >
            {name}
          </button>
        ))}
      </div>
    </>
  );
};

export default WinLoseContainer;
