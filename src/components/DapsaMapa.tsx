'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const ZOOM_ESTACION = 14;

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
            width: 38px;
            height: 38px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 9999px;
            background: white;
            border: 2px solid #801818;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
            overflow: hidden;
        ">
            <img src="/icons/dapsa-logo.png" style="width: 28px; height: auto; display: block;" />
        </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
});

export default function DapsaMapa() {
    const centro: [number, number] = [-29.85, -60.29];
    const mapRef = useRef<L.Map | null>(null);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        const bounds = L.latLngBounds(estaciones.map((e) => [e.lat, e.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [40, 40] });
    }, []);

    return (
        <MapContainer
            ref={mapRef}
            center={centro}
            zoom={8}
            zoomSnap={0.25}
            scrollWheelZoom={false}
            style={{ height: '460px', width: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {estaciones.map((e) => (
                <Marker
                    key={e.nombre}
                    position={[e.lat, e.lng]}
                    icon={iconoDapsa}
                    eventHandlers={{
                        click: () => {
                            mapRef.current?.flyTo([e.lat, e.lng], ZOOM_ESTACION, { duration: 0.8 });
                        },
                    }}
                >
                    <Tooltip permanent direction="right" offset={[12, 0]} className="dapsa-tooltip">
                        {e.nombre}
                    </Tooltip>
                </Marker>
            ))}
        </MapContainer>
    );
}
