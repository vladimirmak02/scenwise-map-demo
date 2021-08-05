import { Component, useState } from "react";
import Chart from "react-apexcharts";
import { privateApiKey } from "./Api";

export const WindyWebcam = (props: Webcam["properties"]) => {
  const [isLoaded, setisLoaded] = useState(false);

  return (
    <div>
      <iframe
        title="A view from the webcam"
        src={props.src}
        onLoad={() => setisLoaded(true)}
        width={450}
        height={253}
        allowFullScreen
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

export const YoutubeWebcamEmbed = (props: Webcam["properties"]) => {
  const [isLoaded, setisLoaded] = useState(false);

  return (
    <div>
      <iframe
        width={450}
        height={253}
        onLoad={() => setisLoaded(true)}
        src={`https://www.youtube.com/embed/${props.embedID}?autoplay=1`}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Youtube Webcam"
      />
      {!isLoaded ? (
        <div>
          Loading{" "}
          <a href={props.href} target="_blank" rel="noreferrer">
            Youtube.com
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
  constructor(props: {
    series: {
      name: string;
      data: {
        x: string;
        y: number;
      }[];
    }[];
  }) {
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
        height="250"
      />
    );
  }
}

export class BusyHoursDayChart extends Component<any, any> {
  constructor(props: {
    series: { name: string; data: { x: number; y: number }[] }[];
  }) {
    super(props);
    this.state = {
      liveDataShown: false,
      options: {
        chart: {
          type: "bar",
          toolbar: {
            show: false,
          },
          redrawOnParentResize: true,
        },
        xaxis: {
          categories: [
            "6:00",
            "7:00",
            "8:00",
            "9:00",
            "10:00",
            "11:00",
            "12:00",
            "13:00",
            "14:00",
            "15:00",
            "16:00",
            "17:00",
            "18:00",
            "19:00",
            "20:00",
            "21:00",
            "22:00",
            "23:00",
            "00:00",
            "1:00",
            "2:00",
            "3:00",
            "4:00",
            "5:00",
          ],
          tickPlacement: "on",
        },
        yaxis: {
          title: {
            text: "Busyness on " + props.series[0].name,
          },
        },
        plotOptions: {
          bar: {
            columnWidth: "60%",
          },
        },
        colors: ["#7BAAF7"],
        dataLabels: {
          enabled: false,
        },
        legend: {
          show: true,
          showForSingleSeries: true,
          customLegendItems: ["Predicted", "Live"],
          markers: {
            fillColors: ["#7BAAF7", "#f50057"],
          },
        },
      },
      series: props.series,
    };
  }

  addLiveData() {
    const that = this; // so that we can set the state inside the promise
    that.setState({ liveDataShown: true });
    // get the live data

    const params = new URLSearchParams({
      api_key_private: privateApiKey,
      venue_id: this.props.venue_id,
    });

    fetch(`https://besttime.app/api/v1/forecasts/live?${params}`, {
      method: "POST",
    }).then(function (data) {
      data.json().then((response) => {
        //   got the response

        if (response.analysis.venue_live_busyness_available) {
          const livebusyness = response.analysis.venue_live_busyness;
          const hourStart: number = response.analysis.hour_start;

          that.setState(
            (prevSeries: {
              series: { name: string; data: { x: number; y: number }[] }[];
            }) => {
              let newseries = prevSeries.series.map((series) => {
                return {
                  ...series,
                  data: series.data.map((hour, index) => {
                    // console.log((hourStart - 6) % 24, index);
                    if (index === (hourStart - 6) % 24) {
                      // starts at 6 AM
                      //live hour
                      return {
                        ...hour,
                        goals: [
                          {
                            name: "Live",
                            value: livebusyness,
                            strokeWidth: 5,
                            strokeColor: "#f50057",
                          },
                        ],
                      };
                    } else {
                      return {
                        ...hour,
                      };
                    }
                  }),
                };
              });
              return { series: newseries };
            }
          );
        } else {
          // No live data available
          that.setState((prevOptions: { options: { legend: any } }) => {
            let newOptions = {
              ...prevOptions,
              options: {
                ...prevOptions.options,
                legend: {
                  ...prevOptions.options.legend,
                  customLegendItems: ["Predicted", "Live - data not available"],
                },
              },
            };
            return newOptions;
          });
        }
      });
    });
  }

  render() {
    return (
      <div>
        <Chart
          options={this.state.options}
          series={this.state.series}
          type="bar"
          height="250"
        />
        {this.state.liveDataShown ? (
          ""
        ) : (
          <button onClick={this.addLiveData.bind(this)}>
            Add LIVE data to chart
          </button>
        )}
      </div>
    );
  }
}

export type Webcam = {
  type: "Feature";
  properties: {
    href: string;
    src?: string;
    embedID?: string;
    description: string;
    icon?: string;
  };
  geometry: {
    type: "Point";
    coordinates: [number | string, number | string];
  };
};

export type PopularTimesFeature = {
  type: "Feature";
  properties: {
    busy: number;
    week:
      | [
          {
            day_raw: number[];
            day_info: {
              day_text: string;
            };
          }
        ]
      | string;
    name: string;
    lastUpdate: string;
    venue_id: string;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
};

export const youtubeWebcamInfo: Webcam[] = [
  {
    type: "Feature",
    properties: {
      href: "https://www.youtube.com/watch?v=yST7Ux0ypUM",
      // embedID: the embed ID of the YT stream
      embedID: "yST7Ux0ypUM",
      description: "Location: ".concat(
        "Amsterdam", //City - Dam Amsterdam
        ", Netherlands"
      ),
      icon: "camera2",
    },
    geometry: {
      type: "Point",
      coordinates: [
        "4.893240", //long
        "52.373001", //lat
      ],
    },
  },
  {
    type: "Feature",
    properties: {
      href: "https://www.youtube.com/watch?v=LwH8kEj8QCA",
      // embedID: the embed ID of the YT stream
      embedID: "LwH8kEj8QCA",
      description: "Location: ".concat(
        "Zandvoort", //City
        ", Netherlands"
      ),
      icon: "camera2",
    },
    geometry: {
      type: "Point",
      coordinates: [
        "4.537590", //long
        "52.379640", //lat
      ],
    },
  },
  {
    type: "Feature",
    properties: {
      href: "https://www.youtube.com/watch?v=nmRRzgVUeoY",
      // embedID: the embed ID of the YT stream
      embedID: "nmRRzgVUeoY",
      description: "Location: ".concat(
        "Zandvoort", //City
        ", Netherlands"
      ),
      icon: "camera2",
    },
    geometry: {
      type: "Point",
      coordinates: [
        "4.5273356937502856", //long
        "52.37737804091559", //lat
      ],
    },
  },
  //   {
  //     type: "Feature",
  //     properties: {
  //       href: "",
  //       // embedID: the embed ID of the YT stream
  //       embedID: "",
  //       description: "Location: ".concat(
  //         "", //City
  //         ", Netherlands"
  //       ),
  //       icon: "camera2",
  //     },
  //     geometry: {
  //       type: "Point",
  //       coordinates: [
  //         "", //long
  //         "", //lat
  //       ],
  //     },
  //   },
];
