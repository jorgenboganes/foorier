import Head from "next/head";
import { Inter } from "next/font/google";
import CanvasDraw from "react-canvas-draw";
import { RefObject, useEffect, useRef, useState } from "react";
const FFT = require("fft.js");

const inter = Inter({ subsets: ["latin"] });

type Point = {
  x: number;
  y: number;
};

const foorier = (
  x: number,
  amplitudes: number[],
  phases: number[],
  TT: number,
  N: number
): number => {
  let fx: number = amplitudes[0] / N;
  for (let n = 1; n <= N / 2; n++) {
    const frequency: number = (2 * Math.PI * n) / TT;
    fx += (amplitudes[n] / (N / 2)) * Math.cos(frequency * x + phases[n - 1]);
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

function interpolateData(points: Point[], sampleSize: number): Point[] {
  const xValues: number[] = points.map((point) => point.x);
  const yValues: number[] = points.map((point) => point.y);
  const interpolatedX: number[] = Array.from(
    { length: sampleSize },
    (_, index) =>
      ((Math.max(...xValues) - Math.min(...xValues)) / (sampleSize - 1)) *
        index +
      Math.min(...xValues)
  );

  const interpolatedY: number[] = interpolatedX.map((x) =>
    interpolate(x, xValues, yValues)
  );

  const interpolatedData: Point[] = interpolatedX.map((_, index) => ({
    x: index,
    y: interpolatedY[index],
  }));

  return interpolatedData;
}

// Helper function for linear interpolation
function interpolate(x: number, xValues: number[], yValues: number[]): number {
  const lowerIndex: number = xValues.findIndex((value) => value > x) - 1;
  const upperIndex: number = lowerIndex + 1;

  const x0: number = xValues[lowerIndex];
  const x1: number = xValues[upperIndex];
  const y0: number = yValues[lowerIndex];
  const y1: number = yValues[upperIndex];

  return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
}

function downsample(originalArray: number[], targetSamples: number) {
  const stepSize = Math.floor(originalArray.length / targetSamples);
  const downsampledArray = [];

  for (let i = 0; i < originalArray.length; i += stepSize) {
    downsampledArray.push(originalArray[i]);
  }

  return downsampledArray;
}

const computeFFT = (inputLine: { points: Point[] }, size: number) => {
  /* const FFT = require("fft.js");
  const f = new FFT(size);
  const out = f.createComplexArray();

  console.log(inputLine.points);
  const realInput = new Array(10, 5, 6, 5, 3, 5, 3, 2);
  console.log(realInput);
  f.realTransform(out, realInput);
  f.completeSpectrum(out);
  console.log(out);*/
};

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

  const setGraphData = (newLine: any) => {
    if (canvasRef?.current && canvasRef2?.current) {
      const olddata: any = JSON.parse(canvasRef.current.getSaveData());
      const newData: any = { ...olddata, lines: [newLine] };
      console.log(JSON.stringify(newData));
      canvasRef2.current.loadSaveData(JSON.stringify(newData), true);
    }
  };

  useEffect(() => {
    if (canvasData && canvasData?.length != 0) {
      const data = JSON.parse(canvasData as string);
      const points: Point[] = data.lines
        .map((l: { points: Point[] }) => l.points)
        .flat();
      const result: Point[] = interpolateData(points, 1024);
      const f_x = result.map((p) => p.y).map((p) => (Number.isNaN(p) ? 0 : p));
      const f = new FFT(1024);
      const out = f.createComplexArray();
      f.realTransform(out, f_x);
      f.completeSpectrum(out);
      const amp = getAmpPhase(out);
      setAmps(amp);
      setOut(out);

      const fr = result.map((p, i) => {
        return foorier(p.x, amp.amplitudes, amp.phases, i, 1023);
      });
      const downsampledFr = downsample(fr, 400);
      const newLine = {
        points: downsampledFr.map((f, i) => {
          return { x: i, y: f };
        }),
        brushColor: "#444",
        brushRadius: 1,
      };
      setGraphData(newLine);
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
