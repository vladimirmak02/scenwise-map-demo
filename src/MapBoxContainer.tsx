import React, { useRef, useEffect, useState } from "react";
// @ts-ignore
import mapboxgl from "!mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import axios from "./Api";
import "mapbox-gl/dist/mapbox-gl.css";
import cameraSVG from "./videocamera.svg";
import ReactDOM from "react-dom";

mapboxgl.accessToken =
  "pk.eyJ1IjoidHVkdGltMjEiLCJhIjoiY2tvYWQwczczMTJ6NTJwbXUydmVvbXFsZCJ9.ixIsrkMIvzJuWoGSMTKZmw";

const WindyWebcam = (props) => {
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

export default function MapBoxContainer() {
  const mapContainer = useRef(null);
  const mapElement = useRef(null);

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
      let img = new Image(20, 20);
      img.onload = () => {
        map.addImage("camera", img);
      };
      img.src = cameraSVG;

      axios
        .get(
          "api/webcams/v2/list/webcam=1563699574,1511351235,1530091353,1226830866,1464096289",
          {
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "application/json",
            },
            params: {
              show: "webcams:id,url,player,location,image",
              key: "UhJq6YO7wyp9Tt2xnTJ3ox33X1ReJLdo",
            },
          }
        )
        .then(function (response) {
          map.addSource("places", {
            // This GeoJSON contains features that include an "icon"
            // property. The value of the "icon" property corresponds
            // to an image in the Mapbox Streets style's sprite.
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: response.data.result.webcams.map((webcam) => {
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
              }),
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

          map.on("click", "places", function (e) {
            var coordinates = e.features[0].geometry.coordinates.slice();
            var content = e.features[0].properties;

            // Ensure that if the map is zoomed out such that multiple
            // copies of the feature are visible, the popup appears
            // over the copy being pointed to.
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
              coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            const holder = document.createElement("div");
            ReactDOM.render(
              <WindyWebcam
                href={content.href}
                src={content.src}
                description={content.description}
              />,
              holder
            );

            new mapboxgl.Popup()
              .setLngLat(coordinates)
              .setDOMContent(holder)
              .addTo(map);
          });

          // Change the cursor to a pointer when the mouse is over the places layer.
          map.on("mouseenter", "places", function () {
            map.getCanvas().style.cursor = "pointer";
          });

          // Change it back to a pointer when it leaves.
          map.on("mouseleave", "places", function () {
            map.getCanvas().style.cursor = "";
          });
        })
        .catch(console.log);
    });
  });

  return <div ref={mapContainer} className="map-container" />;
}
