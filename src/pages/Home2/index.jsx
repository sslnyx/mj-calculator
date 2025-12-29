import React from "react";
import { useOutletContext } from "react-router-dom";

const Home2 = () => {
  const data = useOutletContext();

  const {
    storage_players,
    storage_rounds,
    fanPt,
    defaultData,
    modalRef,
    backdropRef,
  } = data;

  console.log({ data });
  return <div>index</div>;
};

export default Home2;
