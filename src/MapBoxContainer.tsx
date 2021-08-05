import React, { useRef, useEffect } from "react";
// @ts-ignore
import mapboxgl from "!mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import axios, { mapBoxAccessToken, publicApiKey, WindyApiKey } from "./Api";
import "mapbox-gl/dist/mapbox-gl.css";
import cameraSVG from "./videocamera.svg";
import camera2SVG from "./videocamera2.svg";
import ReactDOM from "react-dom";
import {
  BusyHoursDayChart,
  BusyHoursHeatmap,
  PopularTimesFeature,
  Webcam,
  WindyWebcam,
  YoutubeWebcamEmbed,
  youtubeWebcamInfo,
} from "./HelperComponents";

mapboxgl.accessToken = mapBoxAccessToken;

export default function MapBoxContainer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapElement = useRef<mapboxgl.Map>(null);

  useEffect(() => {
    if (mapElement.current) return; // initialize map only once
    let map = mapElement.current;
    map = new mapboxgl.Map({
      container: mapContainer.current as string | HTMLElement,
      style: "mapbox://styles/mapbox/light-v10?optimize=true",
      center: [4.9041, 52.3676], //coordinates for Amsterdam
      zoom: 10,
    });

    map.on("load", () => {
      let img = new Image(20, 20); //Camera Purple
      img.onload = () => {
        map.addImage("camera", img);
      };
      img.src = cameraSVG;

      let img2 = new Image(20, 20); //Camera Purple
      img2.onload = () => {
        map.addImage("camera2", img2);
      };
      img2.src = camera2SVG;

      function renderMapWebcams(response: {
        data: {
          result: {
            webcams: [
              {
                url: {
                  current: {
                    desktop: string;
                  };
                };
                player: {
                  day: {
                    embed: string;
                  };
                };
                location: {
                  city: string;
                  country: string;
                  longitude: string;
                  latitude: string;
                };
              }
            ];
          };
        };
      }) {
        map.addSource("places", {
          // This GeoJSON contains features that include an "icon"
          // property. The value of the "icon" property corresponds
          // to an image in the Mapbox Streets style's sprite.
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: response.data.result.webcams
              .map((webcam): Webcam => {
                return {
                  type: "Feature",
                  properties: {
                    href: webcam.url.current.desktop,
                    // src: webcam.image.current.thumbnail,
                    src: webcam.player.day.embed,
                    description: "Location: ".concat(
                      webcam.location.city,
                      ", ",
                      webcam.location.country
                    ),
                    icon: "camera",
                  },
                  geometry: {
                    type: "Point",
                    coordinates: [
                      webcam.location.longitude,
                      webcam.location.latitude,
                    ],
                  },
                };
              })
              .concat(youtubeWebcamInfo),
          },
        });

        map.addLayer({
          id: "places",
          type: "symbol",
          source: "places",
          layout: {
            "icon-image": "{icon}",
            "icon-allow-overlap": true,
          },
        });

        map.on(
          "click",
          "places",
          function (e: {
            features: [Webcam];
            lngLat: {
              lng: number;
              lat: number;
            };
          }) {
            const coordinates: number[] = e.features[0].geometry.coordinates
              .slice()
              .map((coord) => +coord);
            const content = e.features[0].properties;

            // Ensure that if the map is zoomed out such that multiple
            // copies of the feature are visible, the popup appears
            // over the copy being pointed to.
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
              coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            const holder = document.createElement("div");
            ReactDOM.render(
              content.embedID ? (
                <YoutubeWebcamEmbed
                  embedID={content.embedID}
                  href={content.href}
                  description={content.description}
                />
              ) : (
                <WindyWebcam
                  href={content.href}
                  src={content.src}
                  description={content.description}
                />
              ),
              holder
            );

            new mapboxgl.Popup()
              .setLngLat(coordinates)
              .setDOMContent(holder)
              .addTo(map);
          }
        );

        // Change the cursor to a pointer when the mouse is over the places layer.
        map.on("mouseenter", "places", function () {
          map.getCanvas().style.cursor = "pointer";
        });

        // Change it back to a pointer when it leaves.
        map.on("mouseleave", "places", function () {
          map.getCanvas().style.cursor = "";
        });
      }

      //   GET THE WEBCAMS AND DISPLAY THEM, WHILE SAVING ON INTERNET TRAFFIC
      const webcamsResponse = localStorage.getItem("webcams");
      if (webcamsResponse) {
        renderMapWebcams(JSON.parse(webcamsResponse));
      } else {
        axios
          .get(
            "https://api.windy.com/api/webcams/v2/list/webcam=1563699574,1511351235,1530091353,1226830866,1464096289",
            {
              headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json",
              },
              params: {
                show: "webcams:id,url,player,location,image",
                key: WindyApiKey,
              },
            }
          )
          .then(function (response) {
            localStorage.setItem("webcams", JSON.stringify(response));
            renderMapWebcams(response);
          })
          .catch(console.log);
      }

      function renderMapBusy(
        responses: [
          {
            data: {
              analysis: {
                week_raw: [
                  {
                    day_raw: number[];
                    day_info: {
                      day_text: string;
                    };
                  }
                ];
              };
              venue_info: {
                venue_name: string;
                venue_id: string;
                venue_lng: number;
                venue_lat: number;
              };
              forecast_updated_on: string;
            };
          }
        ]
      ) {
        let features: PopularTimesFeature[] = [];
        const curr = new Date();
        for (let i = 0; i < responses.length; i += 2) {
          const venue = responses[i].data;
          const week = responses[i + 1].data.analysis.week_raw;

          const currentDay = (curr.getDay() + 6) % 7;

          const currentHour = (curr.getHours() + 24 - 6) % 24;

          const forecast = week[currentDay].day_raw[currentHour];

          features.push({
            type: "Feature",
            properties: {
              busy: forecast,
              week: week,
              name: venue.venue_info.venue_name,
              lastUpdate: venue.forecast_updated_on,
              venue_id: venue.venue_info.venue_id,
            },
            geometry: {
              type: "Point",
              coordinates: [
                venue.venue_info.venue_lng,
                venue.venue_info.venue_lat,
              ],
            },
          });
        }
        map.addSource("busyhours", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: features,
          },
        });

        map.addLayer(
          {
            id: "busyhours-heat",
            type: "heatmap",
            source: "busyhours",
            maxzoom: circleZoomLevel + 1,
            paint: {
              // Increase the heatmap weight based on frequency and property magnitude
              "heatmap-weight": [
                "interpolate",
                ["linear"],
                ["get", "busy"],
                0,
                0,
                100,
                1,
              ],
              // Increase the heatmap color weight weight by zoom level
              // heatmap-intensity is a multiplier on top of heatmap-weight
              "heatmap-intensity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                0,
                1,
                circleZoomLevel + 1,
                3,
              ],
              // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
              // Begin color ramp at 0-stop with a 0-transparancy color
              // to create a blur-like effect.
              //   "heatmap-color": [
              //     "interpolate",
              //     ["linear"],
              //     ["heatmap-density"],
              //     0,
              //     "rgba(33,102,172,0)",
              //     0.2,
              //     "rgb(103,169,207)",
              //     0.4,
              //     "rgb(209,229,240)",
              //     0.6,
              //     "rgb(253,219,199)",
              //     0.8,
              //     "rgb(239,138,98)",
              //     1,
              //     "rgb(178,24,43)",
              //   ],
              // Adjust the heatmap radius by zoom level
              "heatmap-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                0,
                2,
                circleZoomLevel,
                20,
              ],
              // Transition from heatmap to circle layer by zoom level
              "heatmap-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                circleZoomLevel,
                1,
                circleZoomLevel + 1,
                0,
              ],
            },
          },
          "places"
        );

        map.addLayer(
          {
            id: "busyhours-point",
            type: "circle",
            source: "busyhours",
            minzoom: circleZoomLevel,
            paint: {
              // Size circle radius by earthquake magnitude and zoom level
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                7,
                ["interpolate", ["linear"], ["get", "busy"], 1, 1, 100, 4],
                16,
                ["interpolate", ["linear"], ["get", "busy"], 1, 5, 100, 50],
              ],
              // Color circle by earthquake magnitude
              "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "busy"],
                10,
                "rgba(33,102,172,0)",
                30,
                "rgb(103,169,207)",
                50,
                "rgb(209,229,240)",
                70,
                "rgb(253,219,199)",
                80,
                "rgb(239,138,98)",
                100,
                "rgb(178,24,43)",
              ],
              "circle-stroke-color": "white",
              "circle-stroke-width": 1,
              // Transition from heatmap to circle layer by zoom level
              "circle-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                circleZoomLevel,
                0,
                circleZoomLevel + 1,
                1,
              ],
            },
          },
          "busyhours-heat"
        );

        map.on(
          "click",
          "busyhours-point",
          function (e: {
            features: [PopularTimesFeature];
            lngLat: {
              lng: number;
              lat: number;
            };
          }) {
            var coordinates = e.features[0].geometry.coordinates.slice();
            var content = e.features[0].properties;
            if (typeof content.week == "string") {
              content.week = JSON.parse(content.week);
            }
            let week = content.week as [
              {
                day_raw: number[];
                day_info: {
                  day_text: string;
                };
              }
            ];
            let hourcount = 0;
            const currentDay = week[(curr.getDay() + 6) % 7];
            const series = week.map((day) => {
              return {
                name: day.day_info.day_text,
                data: day.day_raw.map((hour) => {
                  hourcount++;
                  return {
                    x: ((hourcount + 5) % 24) + ":00",
                    y: hour,
                  };
                }),
              };
            });

            // Ensure that if the map is zoomed out such that multiple
            // copies of the feature are visible, the popup appears
            // over the copy being pointed to.
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
              coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            const holder = document.createElement("div");
            holder.className = "busyhourscontainer";
            ReactDOM.render(
              <div style={{ width: 600, height: 300, maxHeight: 800 }}>
                <h4>{"Location: " + content.name}</h4>
                <BusyHoursDayChart
                  series={[
                    {
                      data: currentDay.day_raw.map((hour: number, index) => {
                        return {
                          x: index + 1,
                          y: hour,
                        };
                      }),
                      name: currentDay.day_info.day_text,
                    },
                  ]}
                  venue_id={content.venue_id}
                />
                <BusyHoursHeatmap series={series} />

                {/* <p>{"Last updated on: " + content.lastUpdate}</p> */}
              </div>,
              holder,
              () => {
                // This is a hotfix for the apexcharts misbehaving and frawing very badly
                window.dispatchEvent(new Event("resize"));
              }
            );

            new mapboxgl.Popup()
              .setLngLat(coordinates)
              .setDOMContent(holder)
              .addTo(map);
          }
        );

        // Change the cursor to a pointer when the mouse is over the places layer.
        map.on("mouseenter", "busyhours-point", function () {
          map.getCanvas().style.cursor = "pointer";
        });

        // Change it back to a pointer when it leaves.
        map.on("mouseleave", "busyhours-point", function () {
          map.getCanvas().style.cursor = "";
        });
      }

      //  GET THE BUSY DATA AND DISPLAY IT

      //   The Venues to GET
      const venues = [
        "ven_6363675f444c496265437a52635578734c335a3451374b4a496843",
        "ven_6f383562306f4f6648745152636b784a636244596278494a496843",
        "ven_6f3639495271654b717749526355787348426d505259424a496843",
        "ven_494d4b6f34612d3856734752636b784a38756c547231584a496843",
      ];

      const circleZoomLevel = 12;

      const venueResponses = localStorage.getItem("venues");
      if (venueResponses) {
        renderMapBusy(JSON.parse(venueResponses));
      } else {
        let venueRequests: any[] = [];
        //   Make Requests
        venues.forEach((venue) => {
          venueRequests.push(
            axios.get("https://besttime.app/api/v1/venues/" + venue, {
              params: {
                api_key_public: publicApiKey,
              },
            }),
            axios.get("https://besttime.app/api/v1/forecasts/week/raw2", {
              params: {
                venue_id: venue,
                api_key_public: publicApiKey,
              },
            })
          );
        });
        Promise.all(venueRequests)
          .then(function (responses) {
            localStorage.setItem("venues", JSON.stringify(responses));
            if (responses.length > 0) {
              //@ts-ignore I can't figure out why it still gives me an error of there being a possibility that nothing is in the array.
              renderMapBusy(responses);
            }
          })
          .catch(console.log);
      }
    });
  });

  return <div ref={mapContainer} className="map-container" />;
}
