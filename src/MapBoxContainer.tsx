import React, { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import axios from "./Api";
import "mapbox-gl/dist/mapbox-gl.css";
import cameraSVG from "./videocamera.svg";

mapboxgl.accessToken =
  "pk.eyJ1IjoidHVkdGltMjEiLCJhIjoiY2tvYWQwczczMTJ6NTJwbXUydmVvbXFsZCJ9.ixIsrkMIvzJuWoGSMTKZmw";

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
        console.log("stuff");

        map.addImage("camera", img);
      };
      img.src = cameraSVG;

      axios
        .get(
          "api/webcams/v2/list/webcam=1563699574?show=webcams:id,status,property,url,location&key=UhJq6YO7wyp9Tt2xnTJ3ox33X1ReJLdo",
          {
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "application/json",
            },
            params: {
              ID: 12345,
            },
          }
        )
        .then(function (response) {
          console.log(response);
        })
        .catch(console.log);

      map.addSource("places", {
        // This GeoJSON contains features that include an "icon"
        // property. The value of the "icon" property corresponds
        // to an image in the Mapbox Streets style's sprite.
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {
                description: "Stuff",
                icon: "camera",
              },
              geometry: {
                type: "Point",
                coordinates: [4.528506, 52.375666],
              },
            },
          ],
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
        var description = e.features[0].properties.description;

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(description)
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
    });
  });

  return <div ref={mapContainer} className="map-container" />;
}
