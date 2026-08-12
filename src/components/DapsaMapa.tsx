'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const estaciones = [
    { nombre: 'La Criolla', lat: -30.232937, lng: -60.363938 },
    { nombre: 'Calchaquí', lat: -29.879437, lng: -60.281688 },
    { nombre: 'Vera', lat: -29.462563, lng: -60.227563 },
    { nombre: 'Margarita', lat: -29.692438, lng: -60.248188 },
];

const iconoDapsa = new L.DivIcon({
    className: '',
    html: `
        <div style="
            width: 56px;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 9999px;
            background: white;
            border: 2px solid #801818;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
            overflow: hidden;
        ">
            <img src="/icons/dapsa-logo.jpg" style="width: 42px; height: auto; display: block;" />
        </div>
    `,
    iconSize: [56, 56],
    iconAnchor: [28, 28],
    popupAnchor: [0, -28],
});

export default function DapsaMapa() {
    const centro: [number, number] = [-29.85, -60.29];

    return (
        <MapContainer
            center={centro}
            zoom={8}
            scrollWheelZoom={false}
            style={{ height: '320px', width: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {estaciones.map((e) => (
                <Marker key={e.nombre} position={[e.lat, e.lng]} icon={iconoDapsa}>
                    <Popup>
                        <strong>{e.nombre}</strong>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
