import { LayersControl, TileLayer } from "react-leaflet";

export default function MuseumMapLayers() {
  return (
    <LayersControl position="topright">
      {/* Base Layers */}
      <LayersControl.BaseLayer checked name="Museum Classic">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </LayersControl.BaseLayer>

      <LayersControl.BaseLayer name="Antique Style">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | <a href="https://cartodb.com/attributions">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
      </LayersControl.BaseLayer>

      <LayersControl.BaseLayer name="Cultural Heritage">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
      </LayersControl.BaseLayer>

      <LayersControl.BaseLayer name="Satellite View">
        <TileLayer
          attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
      </LayersControl.BaseLayer>

      {/* Overlay Layers */}
      <LayersControl.Overlay name="Country Borders">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
          opacity={0.7}
        />
      </LayersControl.Overlay>

      <LayersControl.Overlay name="Historical Routes">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tiles.wmflabs.org/hikebike/{z}/{x}/{y}.png"
          opacity={0.5}
        />
      </LayersControl.Overlay>
    </LayersControl>
  );
}
