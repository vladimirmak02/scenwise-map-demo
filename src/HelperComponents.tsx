import { ApexOptions } from "apexcharts";
import { Component, useEffect, useRef, useState } from "react";
import Chart from "react-apexcharts";

export const WindyWebcam = (props) => {
  const [isLoaded, setisLoaded] = useState(false);

  return (
    <div>
      <iframe
        title="A view from the webcam"
        src={props.src}
        onLoad={() => setisLoaded(true)}
      ></iframe>
      {!isLoaded ? (
        <div>
          Loading{" "}
          <a href={props.href} target="_blank" rel="noreferrer">
            Windy.com
          </a>
          ...
        </div>
      ) : (
        <div>{props.description}</div>
      )}
    </div>
  );
};

export class BusyHoursHeatmap extends Component<any, any> {
  constructor(props) {
    super(props);
    this.state = {
      options: {
        chart: {
          toolbar: {
            show: false,
          },
          redrawOnParentResize: true,
          type: "heatmap",
        },
        plotOptions: {
          heatmap: {
            shadeIntensity: 0.8,
            radius: 2,
            useFillColorAsStroke: true,
            colorScale: {
              ranges: [
                {
                  from: 0,
                  to: 1,
                  name: "zero",
                  color: "#cccccc",
                },
                {
                  from: 1,
                  to: 25,
                  name: "low",
                  color: "#00A100",
                },
                {
                  from: 26,
                  to: 50,
                  name: "medium",
                  color: "#128FD9",
                },
                {
                  from: 51,
                  to: 75,
                  name: "high",
                  color: "#FFB200",
                },
                {
                  from: 76,
                  to: 100,
                  name: "extreme",
                  color: "#FF0000",
                },
              ],
            },
          },
        },
        dataLabels: {
          enabled: false,
        },
        stroke: {
          width: 1,
        },
      },
      series: props.series,
    };
  }

  componentDidMount() {}
  render() {
    return (
      <Chart
        options={this.state.options}
        series={this.state.series}
        type="heatmap"
      />
    );
  }
}
