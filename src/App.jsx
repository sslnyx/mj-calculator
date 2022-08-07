import { useState, useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import Footer from "./components/Footer";
import { fetchApi } from "./lib/plugins";
import FooterNav from "./components/FooterNav";

function App() {
  const [staticData, setStaticData] = useState(0);
  const modalRef = useRef({});
  const backdropRef = useRef({});

  const refs = {
    backdropRef,
    modalRef,
  };

  const storageData = {
    storage_players: JSON.parse(localStorage.getItem("data")),
    storage_rounds: Number(localStorage.getItem("rounds")),
  };

  const getStaticData = async () => {
    const data = await fetchApi("/static-data.json", "get");
    setStaticData(data);
  };

  useEffect(() => {
    getStaticData();
  }, []);

  return (
    <div className="App">
      {Object.keys(staticData).length ? (
        <Outlet context={{ ...storageData, ...staticData, ...refs }} />
      ) : (
        ""
      )}
      <FooterNav {...refs} />
    </div>
  );
}

export default App;
