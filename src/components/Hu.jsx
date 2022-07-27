import { useRef, useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import HuHeader from "./HuHeader";
import HuFooter from "./HuFooter";
import WinLoseContainer from "./WinLoseContainer";

const Hu = (props) => {
  const { players, setPlayers, fanPt } = props;
  const [hu, setHu] = useState({});
  const [fan, setFan] = useState(3);
  const [loser, setLoser] = useState(players)
  const winnerRef = useRef({});
  const loserRef = useRef({});

  const containerProps = {
    winnerRef,
    loserRef,
    setHu,
    hu,
    fanPt,
    fan,
  };

  useEffect(() => {
    // console.log(loserHandler())

    setLoser(players.filter(({ id }) => id !== hu.winner))
  }, [hu.winner]);

  return (
    <div>
      <HuHeader {...{ hu, setHu, fan, setFan, setPlayers }} />
      <br />
      <hr />

      <div className="py-5">
        <div className="winner-container bg-sky-300 p-3 mb-3 last:mb-0 rounded">
          <WinLoseContainer
            {...containerProps}
            players={players}
            winnerContainer
          />
        </div>

        <div
          className={`loser-container bg-red-300 p-3 rounded ${
            (hu.selfTouch && !hu.bao) || !hu.winner ? "hidden" : ""
          }`}
        >
          <WinLoseContainer
            {...containerProps}
            players={loser}
            loserContainer
          />
        </div>
      </div>

      <hr />
      <br />

      <HuFooter {...{ hu }} {...props} />
    </div>
  );
};

export default Hu;
