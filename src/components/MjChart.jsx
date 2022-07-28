import Chart from "chart.js/auto";
import { useRef, useEffect, useState } from "react";
import { randomRgbaString } from "../lib/plugins";

const MjChart = ({ players, rounds, charRef }) => {
  const labels = [];
  const datasets = [];

  for (let i = 1; i <= rounds; i++) {
    labels.push("Round " + i);
  }

  for (const [idx, { name, points, accPoints }] of players.entries()) {
    const color = randomRgbaString(1);
    !datasets[idx] ? (datasets[idx] = {}) : "";
    datasets[idx].label = name;
    datasets[idx].data = accPoints;
    datasets[idx].backgroundColor = color;
    datasets[idx].borderColor = color;
    datasets[idx].tension = 0.2;
  }

  const data = {
    labels,
    datasets,
  };

  const configLineChart = {
    type: "line",
    data,
    options: {},
  };

  useEffect(() => {
    if (!Chart.getChart(charRef.current)) {
      new Chart(charRef.current, configLineChart);
    } else if (rounds > Chart.getChart(charRef.current).data.labels.length) {
      const chart = Chart.getChart(charRef.current);
      players.forEach((player, idx) => {
        chart.data.datasets[idx].data = player.accPoints;
      });

      chart.data.labels.push("Round " + rounds);
      chart.update();
    } else if (rounds === 0) {
      const chart = Chart.getChart(charRef.current);
      players.forEach((player, idx) => {
        chart.data.datasets[idx].data = [];
      });
      chart.data.labels = [];
      chart.update();
    }
  }, [rounds]);

  useEffect(() => {
    if (Chart.getChart(charRef.current)) {
      const chart = Chart.getChart(charRef.current);

      for (const [idx, player] of chart.data.datasets.entries()) {
        player.label !== players[idx].name
          ? (player.label = players[idx].name)
          : "";
      }
      chart.update();
    }
  }, [players]);

  return (
    <canvas id="mjChart" width="400" height="300" ref={charRef}>
      MjChart
    </canvas>
  );
};

export default MjChart;
