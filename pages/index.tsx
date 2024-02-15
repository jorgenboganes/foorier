import Head from "next/head";
import { Inter } from "next/font/google";
import CanvasDraw from "react-canvas-draw";
import { RefObject, useEffect, useRef, useState } from "react";

const inter = Inter({ subsets: ["latin"] });

type Point = {
  x: number;
  y: number;
};

const foorier = (
  x: number,
  amplitudes: number[],
  phases: number[],
  N: number
): number => {
  let fx: number = amplitudes[0] / N;
  for (let n = 1; n <= N / 2; n++) {
    const frequency: number = n / N;
    fx += (amplitudes[n] / (N / 2)) * Math.cos(frequency * x + phases[n]);
  }
  return fx;
};

interface AmpPhaseResult {
  amplitudes: number[];
  phases: number[];
}

function getAmpPhase(out: number[]): AmpPhaseResult {
  const N: number = out.length;
  const amplitudes: number[] = new Array(N / 2).fill(0);
  const phases: number[] = new Array(N / 2).fill(0);

  for (let i = 0; i < N - 1; i += 2) {
    const real: number = out[i];
    const imag: number = out[i + 1];
    const amplitude: number = Math.sqrt(real * real + imag * imag);
    const phase: number = Math.atan2(imag, real);

    amplitudes[i / 2] = amplitude;
    phases[i / 2] = phase;
  }

  return {
    amplitudes: amplitudes,
    phases: phases,
  };
}

function interpolateData(inputData: Point[]): Point[] {
  // Extract x and y values
  const xValues: number[] = inputData.map((point) => point.x);
  const yValues: number[] = inputData.map((point) => point.y);

  // Find the minimum and maximum x values
  const minX: number = Math.min(...xValues);
  const maxX: number = Math.max(...xValues);

  // Interpolate x values with step 1 and round to nearest integer
  const interpolatedX: number[] = Array.from(
    { length: maxX - minX + 1 },
    (_, index) => Math.round(minX + index)
  );

  // Linear interpolation for y values
  const interpolatedY: number[] = interpolatedX.map((x) => {
    const lowerIndex: number = xValues.findIndex((val) => val <= x);
    const upperIndex: number = xValues.findIndex((val) => val > x);

    if (
      lowerIndex === -1 ||
      upperIndex === -1 ||
      lowerIndex === xValues.length - 1
    ) {
      return yValues[yValues.length - 1];
    }

    const lowerX: number = xValues[lowerIndex];
    const upperX: number = xValues[upperIndex];
    const lowerY: number = yValues[lowerIndex];
    const upperY: number = yValues[upperIndex];

    return lowerY + ((x - lowerX) / (upperX - lowerX)) * (upperY - lowerY);
  });

  // Combine interpolated x and y values into a list of points
  const resultData: Point[] = interpolatedX.map((x, index) => ({
    x,
    y: interpolatedY[index],
  }));

  return resultData;
}
function normalizeArray(arr: number[], newMin = 0, newMax = 400) {
  const oldMin = Math.min(...arr);
  const oldMax = Math.max(...arr);

  const normalizedArray = arr.map(
    (x) => ((x - oldMin) * (newMax - newMin)) / (oldMax - oldMin) + newMin
  );

  return normalizedArray;
}

export default function Home() {
  const canvasRef: RefObject<CanvasDraw> = useRef(null);
  const canvasRef2: RefObject<CanvasDraw> = useRef(null);
  const [canvasData, setCanvasData] = useState<string>();
  const [outval, setOut] = useState<Number[]>([]);
  const [amps, setAmps] = useState<AmpPhaseResult>();
  const [fourier, setFourier] = useState();

  const clear = () => {
    if (canvasRef?.current) {
      canvasRef.current.clear();
    }
  };
  const undo = () => {
    if (canvasRef?.current) {
      canvasRef.current.undo();
    }
  };

  const setGraphData = (newData: any) => {
    if (canvasRef?.current && canvasRef2?.current) {
      const olddata: any = JSON.parse(canvasRef.current.getSaveData());
      canvasRef2.current.loadSaveData(JSON.stringify(newData), true);
    }
  };

  useEffect(() => {
    if (canvasData && canvasData?.length != 0) {
      //Importerer fft.js
      const FFT = require("fft.js");
      //Henter data fra canvas
      const data = JSON.parse(canvasData as string);
      //Konvererer til points (x/y) type
      const points: Point[] = data.lines
        .map((l: { points: Point[] }) => l.points)
        .flat();
      //Interpolerer data
      const result: Point[] = interpolateData(points);
      //Henter ut kun y-verdiene i result til f_x
      const f_x = result.map((p) => p.y).map((p) => (Number.isNaN(p) ? 0 : p));
      //Lager ny fft-liste på 128 datapunkter
      const f = new FFT(128);
      //lager en complex array or setter i out
      var out = f.createComplexArray();
      //transformer f_x inn i out?
      f.realTransform(out, f_x);
      //???
      f.completeSpectrum(out);
      //Setter state (react-greie)
      setOut(out);
      //Henter amplituder og faser fra out
      const ampPhase = getAmpPhase(out);
      //foorier over hvert datapunkt i out, men bruker ikke tallet, men heller indeksen??
      const newOut = out.map((o: number, i: number) =>
        foorier(i, ampPhase.amplitudes, ampPhase.phases, 64)
      );
      //Normaliserer data til å passe i nytt canvas
      const newArray = normalizeArray(newOut);
      const newData = {
        ...data,
        lines: [
          {
            ...data.lines[0],
            points: newArray.map((y, i) => {
              return { x: i, y: y };
            }),
          },
        ],
      };
      console.log(newData);
      setGraphData(newData);
    }
  }, [canvasData]);

  // console.log("Out: " + outval);
  //console.log("Amplitudes: " + amps?.amplitudes);
  //console.log("Phases: " + amps?.phases);

  return (
    <>
      <Head>
        <title>Foorier</title>
      </Head>
      <main>
        <CanvasDraw
          ref={canvasRef}
          brushRadius={1}
          lazyRadius={5}
          onChange={(e) => {
            const saveData = e.getSaveData();
            const json = JSON.parse(saveData);
            if (json.lines.length !== 0) {
              setCanvasData(e.getSaveData());
            }
          }}
        />
        <br />
        <CanvasDraw ref={canvasRef2} brushRadius={1} lazyRadius={5} />
        <button onClick={() => undo()}>Undo</button>
        <button onClick={() => clear()}>Clear</button>
      </main>
    </>
  );
}
