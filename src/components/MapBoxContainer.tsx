import React, { useRef, useEffect } from "react";
// @ts-ignore
import mapboxgl from "!mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import axios, { mapBoxAccessToken, publicApiKey, WindyApiKey } from "../Api";
import "mapbox-gl/dist/mapbox-gl.css";
import cameraSVG from "../images/videocamera.svg";
import camera2SVG from "../images/videocamera2.svg";
import webcamsLayer from "./layers/webcamsLayer.json";
import busyhoursHeatmapLayer from "./layers/busyhoursHeatmapLayer.json";
import busyhoursPointLayer from "./layers/busyhoursPointLayer.json";
import {
  PopularTimesFeature,
  PopularTimesResponse,
  Webcam,
  WebcamsResponse,
  youtubeWebcamInfo,
} from "./HelperComponents";
import { addPopularTimesPopup, addWebcamPopup } from "./MapPopupFunctions";

mapboxgl.accessToken = mapBoxAccessToken;

export default function MapBoxContainer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapElement = useRef<mapboxgl.Map>(null);

  useEffect(() => {
    // When the map element loads
    if (mapElement.current) return; // initialize map only once
    let map = mapElement.current;
    map = new mapboxgl.Map({
      container: mapContainer.current as string | HTMLElement,
      style: "mapbox://styles/mapbox/light-v10?optimize=true",
      center: [4.9041, 52.3676], //coordinates for Amsterdam
      zoom: 10,
    });

    map.on("load", () => {
      // When the map itself loads
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

      /**
       * Adds sources of webcams to the map, adds the webcam layer and Popup
       * This is encapsulated into a function because it doesn't need to be called if the info is already stored in localStorage
       * @param response The response from Windy's API
       */
      function renderMapWebcams(response: WebcamsResponse) {
        map.addSource("webcams", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: response.data.result.webcams
              .map((webcam): Webcam => {
                return {
                  type: "Feature",
                  properties: {
                    href: webcam.url.current.desktop,
                    src: webcam.player.day.embed, // Windy webcam src
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
              .concat(youtubeWebcamInfo), // Adds the youtube webcams from another file
          },
        });

        map.addLayer(webcamsLayer);

        addWebcamPopup(map);
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
          .then(function (response: WebcamsResponse) {
            localStorage.setItem("webcams", JSON.stringify(response));
            renderMapWebcams(response);
          })
          .catch(console.log);
      }

      /**
       * Processes responses from Besttime API, adds features, sources to the map, sets up the 2 layers and Popup
       * @param responses An array of responses from the besttime.app API, with Even indexes being Venue information (0,2,4, ...) and odd being the week's forecast (1,3,5, ...)
       */
      function renderMapBusy(responses: PopularTimesResponse[]) {
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

        map.addLayer(busyhoursHeatmapLayer, "webcams");

        map.addLayer(busyhoursPointLayer, "busyhours-heat");

        addPopularTimesPopup(map);
      }

      //  GET THE BUSY DATA AND DISPLAY IT

      //   The Venues to GET
      const venues = [
        "ven_6363675f444c496265437a52635578734c335a3451374b4a496843",
        "ven_6f383562306f4f6648745152636b784a636244596278494a496843",
        "ven_6f3639495271654b717749526355787348426d505259424a496843",
        "ven_494d4b6f34612d3856734752636b784a38756c547231584a496843",
      ];

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
          .then(function (responses: PopularTimesResponse[]) {
            localStorage.setItem("venues", JSON.stringify(responses));
            renderMapBusy(responses);
          })
          .catch(console.log);
      }
    });
  });

  return <div ref={mapContainer} className="map-container" />;
}
