import { useOutletContext } from "react-router-dom";

const HuHeader = ({ hu, setHu, fan, setFan }) => {
  const { fanPt } = useOutletContext();

  const fanHandler = (fn) => {
    fn === "+" && fan < 13
      ? setFan((el) => {
          setHu({ ...hu, pt: fanPt[el + 1] });
          return el + 1;
        })
      : fn === "-" && fan >= 4
      ? setFan((el) => {
          setHu({ ...hu, pt: fanPt[el - 1] });
          return el - 1;
        })
      : "";
  };

  return (
    <div className="flex items-center">
      <div className="flex items-center">
        <button
          className="w-[25px] h-[25px] bg-red-500 rounded-full text-white"
          onClick={() => fanHandler("-")}
        >
          -
        </button>
        <span className="px-5 font-bold text-2xl">{fan}</span>
        <button
          className="w-[25px] h-[25px] mr-3 bg-green-500 rounded-full text-white"
          onClick={() => fanHandler("+")}
        >
          +
        </button>
      </div>

      <div className="flex-1"></div>

      <div>
        <button
          className={`rounded py-2 px-5 mr-3 ${hu.bao ? "bao" : "bg-gray-200"}`}
          onClick={() => setHu({ ...hu, bao: !hu.bao, selfTouch: false })}
        >
          包自摸
        </button>

        <button
          className={`rounded py-2 px-5 mr-3 ${
            hu.selfTouch ? "bg-green-500 text-white" : "bg-gray-200"
          }`}
          onClick={() => setHu({ ...hu, selfTouch: !hu.selfTouch, bao: false })}
        >
          自摸
        </button>
      </div>
    </div>
  );
};

export default HuHeader;
