import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const WordEmbeddingChart = ({ vectors = [], clue, turnId }) => {
  console.log("WordEmbeddingChart received:", { vectors, clue, turnId });
  
  const uniqueVectors = Object.values(
    vectors.reduce((acc, v) => {
      if (!acc[v.word]) {
        acc[v.word] = { ...v };
      } else {
        acc[v.word].isClue = acc[v.word].isClue || v.isClue;
        acc[v.word].isGuess = acc[v.word].isGuess || v.isGuess;
      }
      return acc;
    }, {})
  );
  
  console.log("Unique vectors processed:", uniqueVectors);

  const sorted = [...uniqueVectors].sort((a, b) => b.cosineSimilarity - a.cosineSimilarity);
  
  console.log("Sorted vectors for table:", sorted.length, sorted);

  const data = {
    labels: sorted.map(v => v.word),
    datasets: [
      {
        label: "דמיון קוסינוס",
        data: sorted.map(v => v.cosineSimilarity),
        backgroundColor: sorted.map(v =>
          v.isClue ? "rgba(255, 215, 0, 0.8)" : v.isGuess ? "rgba(34, 197, 94, 0.8)" : "rgba(59, 130, 246, 0.8)"
        ),
        borderColor: sorted.map(v =>
          v.isClue ? "rgb(255, 215, 0)" : v.isGuess ? "rgb(34, 197, 94)" : "rgb(59, 130, 246)"
        ),
        borderWidth: 2,
        borderRadius: 4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          generateLabels: () => [
            { text: "רמז", fillStyle: "rgba(255, 215, 0, 0.8)" },
            { text: "ניחוש", fillStyle: "rgba(34, 197, 94, 0.8)" },
            { text: "אחר", fillStyle: "rgba(59, 130, 246, 0.8)" }
          ]
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const index = context.dataIndex;
            const vector = sorted[index];
            return [
              `דמיון קוסינוס: ${vector.cosineSimilarity.toFixed(3)}`,
              `מרחק אוקלידי: ${vector.euclideanDistance.toFixed(3)}`
            ];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
        title: {
          display: true,
          text: "דמיון קוסינוס"
        },
        grid: {
          color: "#eee"
        }
      },
      x: {
        title: {
          display: true,
          text: "מילים"
        },
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 w-full max-w-screen-xl mx-auto h-full flex flex-col">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          🔍 רמז: <span className="text-indigo-600">{clue}</span>
          {turnId && <span className="text-gray-500 text-sm ml-2">(#{turnId})</span>}
        </h2>
      </div>

      <div className="flex-grow min-h-[300px]">
        <Bar data={data} options={options} />
      </div>

      <div className="border-t mt-4 flex-grow-0 bg-white" style={{ minHeight: '300px', maxHeight: '500px', overflowY: 'auto', border: '2px solid red' }}>
        <div className="p-2 bg-yellow-100">
          <strong className="text-black">טבלה: {sorted.length} מילים</strong>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-right text-gray-600 border border-gray-300">מילה</th>
              <th className="px-4 py-2 text-center text-gray-600 border border-gray-300">דמיון</th>
              <th className="px-4 py-2 text-center text-gray-600 border border-gray-300">מרחק</th>
              <th className="px-4 py-2 text-center text-gray-600 border border-gray-300">סוג</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((v, i) => {
              console.log(`Rendering row ${i}:`, v.word, v.cosineSimilarity);
              return (
                <tr key={i} className="hover:bg-gray-50 border-b">
                  <td className="px-4 py-2 text-right border border-gray-300 bg-blue-50 text-black font-medium">{v.word}</td>
                  <td className="px-4 py-2 text-center border border-gray-300 bg-green-50 text-black font-medium">{v.cosineSimilarity.toFixed(3)}</td>
                  <td className="px-4 py-2 text-center border border-gray-300 bg-yellow-50 text-black font-medium">{v.euclideanDistance.toFixed(3)}</td>
                  <td className="px-4 py-2 text-center border border-gray-300 bg-purple-50 text-black font-medium">
                    {v.isClue ? "⭐" : v.isGuess ? "✅" : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WordEmbeddingChart;
