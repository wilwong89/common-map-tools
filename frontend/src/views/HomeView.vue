<script setup lang="ts">
import * as L from 'leaflet';

import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

import { onMounted, ref, watch } from 'vue';
import { Button, Dropdown, InputText } from '@/lib/primevue';
import { storeToRefs } from 'pinia';

import { useConfigStore } from '@/store';
import type { GeoJSON, Geometry } from 'geojson';
import type { Ref } from 'vue';

// Types

// Store
const { getConfig } = storeToRefs(useConfigStore());

const layers: Ref<Array<{ name: string; layer: L.GeoJSON<any, Geometry> }>> = ref([]);
const selectedLayer: Ref<L.GeoJSON<any, Geometry> | undefined> = ref(undefined);
const newLayerName: Ref<string> = ref('');

let map: L.Map;
let layerControl: L.Control.Layers;

// Actions
function createLayer() {
  if (newLayerName.value && newLayerName.value.length > 0) {
    const newLayer = L.geoJSON().addTo(map);
    layerControl.addOverlay(newLayer, newLayerName.value);
    layers.value.push({ name: newLayerName.value, layer: newLayer });

    newLayer.on('click', (event) => {
      console.log('Shape clicked!');
      console.log('Layer', event.propagatedFrom);
      console.log('Geojson', event.propagatedFrom.toGeoJSON());
      if (event.propagatedFrom.getLatLngs) {
        console.log('Coords', event.propagatedFrom.getLatLngs());
      }
    });

    newLayerName.value = '';
  }
}

function deleteLayer() {
  if (selectedLayer.value) {
    selectedLayer.value.removeFrom(map);
    layerControl.removeLayer(selectedLayer.value);
    layers.value = layers.value.filter((x) => x.layer !== selectedLayer.value);
    selectedLayer.value = layers.value[0].layer;
  }
}

watch(selectedLayer, () => {
  if (selectedLayer.value) {
    map.pm.setGlobalOptions({ layerGroup: selectedLayer.value });
  }
});

onMounted(() => {
  const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });

  map = L.map('map', {
    center: [48.428, -123.365],
    zoom: 13,
    layers: [osm]
  });

  // add Leaflet-Geoman controls with some options to the map
  map.pm.addControls({
    position: 'topleft',
    drawCircleMarker: false,
    rotateMode: false
  });

  // 48.424552-123.343506,48.425691,-123.336124,48.422159,-123.327885,48.418856,123.334579, 48.419311,-123.342819,48.424552,-123.343506

  const geo1: Array<GeoJSON> = [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-123.343506, 48.424552],
            [-123.336124, 48.425691],
            [-123.327885, 48.422159],
            [-123.334579, 48.418856],
            [-123.342819, 48.419311],
            [-123.343506, 48.424552]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: [-123.357239, 48.424096]
      }
    }
  ];

  const geo2: Array<GeoJSON> = [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-123.335094, 48.4356],
            [-123.340588, 48.432867],
            [-123.329773, 48.430019],
            [-123.324623, 48.433664],
            [-123.335094, 48.4356]
          ]
        ]
      }
    }
  ];

  const baseMaps = {
    OpenStreetMap: osm
  };

  var geoLayer1 = L.geoJSON().addTo(map);
  var geoLayer2 = L.geoJSON().addTo(map);

  layers.value = [
    { name: 'Geo1', layer: geoLayer1 },
    { name: 'Geo2', layer: geoLayer2 }
  ];

  const overlayMaps = {
    Geo1: geoLayer1,
    Geo2: geoLayer2
  };

  layerControl = L.control.layers(baseMaps, overlayMaps).addTo(map);

  selectedLayer.value = geoLayer1;

  geoLayer1.on('click', (event) => {
    console.log('Shape clicked!');
    console.log('Layer', event.propagatedFrom);
    console.log('Geojson', event.propagatedFrom.toGeoJSON());
    if (event.propagatedFrom.getLatLngs) {
      console.log('Coords', event.propagatedFrom.getLatLngs());
    }
  });
  geoLayer1.addData(geo1);

  geoLayer2.on('click', (event) => {
    console.log('Shape clicked!');
    console.log('Layer', event.propagatedFrom);
    console.log('Geojson', event.propagatedFrom.toGeoJSON());
    if (event.propagatedFrom.getLatLngs) {
      console.log('Coords', event.propagatedFrom.getLatLngs());
    }
  });
  geoLayer2.addData(geo2);
});
</script>

<template>
  <div class="flex flex-row w-full">
    <div class="flex flex-column mr-2">
      <p class="font-bold mt-0 mb-0">Select draw layer</p>
      <Dropdown
        v-model="selectedLayer"
        class="mb-2"
        :options="layers"
        option-label="name"
        option-value="layer"
      />
      <Button
        severity="danger"
        @click="deleteLayer"
      >
        Delete layer
      </Button>
      <p class="font-bold mt-2 mb-0">Create layer</p>
      <div class="flex">
        <InputText
          v-model="newLayerName"
          class="mr-1"
        />
        <Button
          icon="pi pi-check"
          @click="createLayer"
        />
      </div>
    </div>
    <div
      id="map"
      class="flex flex-auto"
    />
  </div>
</template>

<style scoped lang="scss">
#map {
  height: 800px;
}
</style>
