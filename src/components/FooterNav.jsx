import LineChart from "./icons/LineChart";
import Player from "./icons/Player";
import Eraser from "./icons/Eraser";

const FooterNav = ({ modalRef, backdropRef }) => {
  const modalHanlder = (id) => {
    modalRef.current[id].classList.add("show");
    backdropRef.current[id].classList.add("show", "pointer-events-auto");
  };

  return (
    <nav className="fixed bottom-0 w-full border-t-2 h-[50px]">
      <div className="container absolute -top-[30px] w-full">
        MJ Caculator &reg; Built and designed by Ning
      </div>

      <div className="container flex items-center h-full">
        <div className="flex items-center">
          <Player
            onClick={() => modalHanlder("playersModal")}
            className="h-[35px] w-[35px] mr-8 fill-white bg-sky-500 border border-sky-500 p-1 rounded"
          />
          <LineChart
            onClick={() => modalHanlder("mjChart")}
            className="h-[35px] w-[35px] mr-8 fill-white bg-sky-500 border border-sky-500 p-1 rounded"
          />
          <Eraser
            onClick={() => modalHanlder("clearRecord")}
            className="h-[35px] w-[35px] fill-white border border-sky-500 bg-sky-500 p-1 rounded"
          />
        </div>

        <div className="flex-1"></div>

        <button
          onClick={() => modalHanlder("hu")}
          className="shadow-gray-500 mb-8 shadow-md bottom-[20px] right-10 bg-sky-500 text-white w-[60px] h-[60px] flex justify-center items-center 
          rounded-full"
        >
          <span className="text-3xl">食!</span>
        </button>
      </div>
    </nav>
  );
};

export default FooterNav;
