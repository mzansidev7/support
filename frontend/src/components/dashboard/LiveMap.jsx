import React from "react";
import L from "leaflet";
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Badge,
  Flex,
} from "@chakra-ui/react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const carIcon = new L.Icon({
  iconUrl: "/icons/car.png", // place in public/icons/car.png
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const vehicleLocations = [
  { id: "VH-11", lat: -25.775, lng: 29.466, status: "On Route", speed: 65 },
  { id: "VH-12", lat: -25.780, lng: 29.470, status: "Idle", speed: 0 },
  { id: "VH-13", lat: -25.770, lng: 29.460, status: "Stopped", speed: 0 },
];

const getStatusColor = (status) => {
  switch (status) {
    case "On Route":
      return "green";
    case "Idle":
      return "yellow";
    case "Stopped":
      return "red";
    default:
      return "gray";
  }
};

const LiveMap = () => {
  return (
    <Box p={4}>
      <Heading mb={4}>Live Vehicle Tracking</Heading>

      {/* 🗺️ MAP */}
      <Box borderRadius="xl" overflow="hidden" boxShadow="lg">
        <MapContainer
          center={[-25.775, 29.466]}
          zoom={13}
          style={{ height: "400px", width: "100%" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {vehicleLocations.map((vehicle) => (
            <Marker
              key={vehicle.id}
              position={[vehicle.lat, vehicle.lng]}
              icon={carIcon}  
            >
              <Popup>
                <strong>{vehicle.id}</strong>
                <br />
                Status: {vehicle.status}
                <br />
                Speed: {vehicle.speed} km/h
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </Box>

      {/* 📊 INFO SECTION */}
      <Box mt={6}>
        <Heading size="md" mb={4}>
          Fleet Overview
        </Heading>

        <SimpleGrid columns={[1, 2, 3]} spacing={4}>
          {vehicleLocations.map((vehicle) => (
            <Box
              key={vehicle.id}
              p={4}
              borderRadius="xl"
              boxShadow="md"
              bg="white"
            >
              <Flex justify="space-between" align="center">
                <Text fontWeight="bold">{vehicle.id}</Text>
                <Badge colorScheme={getStatusColor(vehicle.status)}>
                  {vehicle.status}
                </Badge>
              </Flex>

              <Text mt={2} fontSize="sm" color="gray.600">
                Speed: {vehicle.speed} km/h
              </Text>

              <Text fontSize="sm" color="gray.500">
                Lat: {vehicle.lat.toFixed(3)}, Lng: {vehicle.lng.toFixed(3)}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Box>

      {/* 📈 SUMMARY */}
      <Box mt={6} p={4} borderRadius="xl" bg="gray.50">
        <Heading size="sm" mb={2}>
          Summary
        </Heading>

        <Text>
          Total Vehicles: <strong>{vehicleLocations.length}</strong>
        </Text>
        <Text>
          Active (On Route):{" "}
          <strong>
            {vehicleLocations.filter((v) => v.status === "On Route").length}
          </strong>
        </Text>
        <Text>
          Idle:{" "}
          <strong>
            {vehicleLocations.filter((v) => v.status === "Idle").length}
          </strong>
        </Text>
        <Text>
          Stopped:{" "}
          <strong>
            {vehicleLocations.filter((v) => v.status === "Stopped").length}
          </strong>
        </Text>
      </Box>
    </Box>
  );
};

export default LiveMap;