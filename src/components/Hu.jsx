import { useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import HuHeader from "./HuHeader";
import HuFooter from "./HuFooter";
import WinLoseContainer from "./WinLoseContainer";

const Hu = (props) => {
  const { players, setPlayers, fanPt } = props;
  const [hu, setHu] = useState({});
  const [fan, setFan] = useState(3);
  const winnerRef = useRef([]);
  const loserRef = useRef([]);

  const containerProps = {
    winnerRef,
    loserRef,
    players,
    setHu,
    hu,
    fanPt,
    fan,
  };

  return (
    <div>
      <HuHeader {...{ hu, setHu, fan, setFan, setPlayers }} />
      <br />
      <hr />

      <div className="py-5">
        <div className="winner-container bg-green-300 p-3 rounded">
          <WinLoseContainer {...containerProps} winnerContainer />
        </div>

        <br />
        <div className="loser-container bg-red-300 p-3 rounded">
          <WinLoseContainer {...containerProps} loserContainer />
        </div>
      </div>

      <hr />
      <br />

      <HuFooter {...{ hu }} {...props} />
    </div>
  );
};

export default Hu;
