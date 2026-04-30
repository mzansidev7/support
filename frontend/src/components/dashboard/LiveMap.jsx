import React from 'react';
import { Box, Heading } from "@chakra-ui/react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

const vehicleLocations = [
  { id: "VH-11", lat: -25.775, lng: 29.466, status: "On Route" },
  { id: "VH-12", lat: -25.780, lng: 29.470, status: "Delayed" },
  { id: "VH-13", lat: -25.770, lng: 29.460, status: "Stopped" },
];

const LiveMap = () => {
  return (
    <Box bg="white" p={5} borderRadius="xl">

      <Heading size="sm" mb={4}>
        Live Vehicle Tracking
      </Heading>

      <MapContainer
        center={[-25.775, 29.466]}
        zoom={13}
        style={{ height: "400px", width: "100%" }}
      >

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {vehicleLocations.map((v) => (
          <Marker key={v.id} position={[v.lat, v.lng]}>
            <Popup>
              <strong>{v.id}</strong>
              <br />
              Status: {v.status}
            </Popup>
          </Marker>
        ))}

      </MapContainer>

    </Box>
  );
};

export default LiveMap;