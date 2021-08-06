// @ts-ignore
import mapboxgl from "!mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import ReactDOM from "react-dom";
import {
  BusyHoursDayChart,
  BusyHoursHeatmap,
  PopularTimesFeature,
  Webcam,
  WindyWebcam,
  YoutubeWebcamEmbed,
} from "./HelperComponents";

export const addWebcamPopup = (map: mapboxgl.Map) => {
  map.on(
    "click",
    "webcams",
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
      const content: Webcam["properties"] = e.features[0].properties;

      // Ensure that if the map is zoomed out such that multiple
      // copies of the feature are visible, the popup appears
      // over the copy being pointed to.
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      const holder = document.createElement("div");

      ReactDOM.render(
        content.embedID ? ( // If it's a youtube stream or a Windy Webcam
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

  changeMousePointers("webcams", map);
};

export const addPopularTimesPopup = (map: mapboxgl.Map) => {
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
      const curr = new Date();
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

  changeMousePointers("busyhours-point", map);
};

/**
 * Changes the pointer style to tell the user that an element is clickable.
 * @param layer clickable layer
 * @param map
 */
const changeMousePointers = (layer: string, map: mapboxgl.Map): void => {
  //next two listeners change the pointer style
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  map.on("mouseenter", layer, function () {
    // Change the cursor style as a UI indicator.
    map.getCanvas().style.cursor = "pointer";
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  map.on("mouseleave", layer, function () {
    // Change the cursor style as a UI indicator.
    map.getCanvas().style.cursor = "";
  });
};
