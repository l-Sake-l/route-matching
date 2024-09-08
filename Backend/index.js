const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();

const OSRM_API_URL = "http://router.project-osrm.org/route/v1/driving";
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

function generatePoints(route, distance) {
  const points = [];
  let accumulatedDistance = 0;

  for (let i = 0; i < route.length - 1; i++) {
    const start = route[i];
    const end = route[i + 1];
    const segmentDistance = haversineDistance(start, end);

    if (accumulatedDistance + segmentDistance >= distance) {
      points.push(end);
      accumulatedDistance = 0;
    } else {
      accumulatedDistance += segmentDistance;
    }
  }

  return points;
}

function haversineDistance(coord1, coord2) {
  const R = 6371000; // Earth radius in meters
  const lat1 = (coord1[1] * Math.PI) / 180;
  const lat2 = (coord2[1] * Math.PI) / 180;
  const dLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const dLon = ((coord2[0] - coord1[0]) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

app.post("/match-routes", async (req, res) => {
  const { origin1, destination1, origin2, destination2 } = req.body;

  try {
    let IsSuitable = false

    const route1 = await getRoute(origin1, destination1);
    const route2 = await getRoute(origin2, destination2);

    const points1 = generatePoints(route1, 5); // Generate points every 5 meters for higher accuracy
    const points2 = generatePoints(route2, 5);

    const matchPercentage = calculateMatchPercentage(points1, points2);

    console.log(`Calculated match percentage: ${matchPercentage}%`);


    if (matchPercentage >= 70){

        console.log("Both Parties Suitable for Carpooling towards destination~!")
        IsSuitable = true
    }

    res.json({
      matchPercentage,
      route1,
      route2,
      points1,
      points2,
      IsSuitable
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

async function getRoute(origin, destination) {
    const sanitizedOrigin = origin.replace(/\s+/g, '');
  const sanitizedDestination = destination.replace(/\s+/g, '');

  const url = `${OSRM_API_URL}/${sanitizedOrigin};${sanitizedDestination}?geometries=geojson`;
  const response = await axios.get(url);
  return response.data.routes[0].geometry.coordinates;
}

function calculateMatchPercentage(points1, points2) {
  // Count the number of points in points1 that have at least one corresponding point in points2 within the distance threshold
  const matchingPointsCount = points1.filter(point1 =>
    points2.some(point2 => haversineDistance(point1, point2) <= 15)
  ).length;

  // Calculate the percentage based on the total number of points in points1
  return (matchingPointsCount / points1.length) * 100;
}


app.listen(3000, () => {
  console.log("Server running on port 3000");
});
