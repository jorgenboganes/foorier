import Head from "next/head";
import { Inter } from "next/font/google";
import CanvasDraw from "react-canvas-draw";
import { RefObject, useEffect, useRef, useState } from "react";

const inter = Inter({ subsets: ["latin"] });
interface Point {
  x: number;
  y: number;
}

interface Data {
  points: Point[];
}

function interpolateData(data: Data, sampleSize: number): Point[] {
  const xValues: number[] = data.points.map((point) => point.x);
  const yValues: number[] = data.points.map((point) => point.y);

  // Perform linear interpolation
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

  // Create an array of objects representing the interpolated points
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
  const [canvasData, setCanvasData] = useState<string>();
  const [outval, setOut] = useState<Number[]>([]);

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

  useEffect(() => {
    if (canvasData && canvasData?.length != 0) {
      const data = JSON.parse(canvasData as string);
      const pointData = {
        points: data.lines.map((l: { points: Point[] }) => l.points).flat(),
        brushColor: data.lines[0].brushColor,
        brushRadius: data.lines[0].brushRadius,
      };
      const result: Point[] = interpolateData(pointData, 1024);
      const f_x = result.map((p) => p.y).map((p) => (Number.isNaN(p) ? 0 : p));
      const FFT = require("fft.js");
      const f = new FFT(512);
      const out = f.createComplexArray();
      f.realTransform(out, f_x);
      f.completeSpectrum(out); // Fill in the full spectrum for real input

      setOut(out);
    }
  }, [canvasData]);
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

        <button onClick={() => undo()}>Undo</button>
        <button onClick={() => clear()}>Clear</button>
        {outval.map((o, i) => {
          return (
            <p style={{ margin: 0, fontSize: 12 }}>
              {i}: {o.toString()}
            </p>
          );
        })}
      </main>
    </>
  );
}
