<script setup lang="ts">
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

import { onMounted, ref, toRaw, watch } from 'vue';
import { Button, Dropdown, InputText } from '@/lib/primevue';

import type { Ref } from 'vue';

// State
const drawLayer: Ref<L.GeoJSON | undefined> = ref(undefined);
const newOverlayLayerName: Ref<string> = ref('');
const overlayLayers: Ref<Array<{ name: string; layer: L.GeoJSON }>> = ref([]);
const selectedFeature: Ref<L.GeoJSON | undefined> = ref(undefined);

// Actions
let map: L.Map;
let layerControl: L.Control.Layers;

function createOverlayLayer() {
  if (newOverlayLayerName.value && newOverlayLayerName.value.length > 0) {
    const newLayer = L.geoJSON().addTo(map);
    layerControl.addOverlay(newLayer, newOverlayLayerName.value);
    overlayLayers.value.push({ name: newOverlayLayerName.value, layer: newLayer });
    newOverlayLayerName.value = '';

    newLayer.on('click', (event) => {
      selectedFeature.value = event.propagatedFrom;
    });
  }
}

function deleteOverlayLayer() {
  if (drawLayer.value) {
    drawLayer.value.removeFrom(map);
    layerControl.removeLayer(drawLayer.value);
    overlayLayers.value = overlayLayers.value.filter((x) => x.layer !== drawLayer.value);
    drawLayer.value = overlayLayers.value[0].layer;
  }
}

function initGeoman() {
  map.pm.addControls({
    position: 'topleft',
    drawCircleMarker: false,
    rotateMode: false
  });
}

function initMap() {
  const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });

  map = L.map('map', {
    center: [48.428, -123.365],
    zoom: 13,
    layers: [osm]
  });

  /* Don't allow dragging outside BC */
  const bcBounds = new L.LatLngBounds([44, -140], [63, -109]);
  map.setMaxBounds(bcBounds);
  map.on('drag', function () {
    map.panInsideBounds(bcBounds, { animate: false });
  });

  const baseMaps = {
    OpenStreetMap: osm
  };

  layerControl = L.control.layers(baseMaps).addTo(map);
}

watch(drawLayer, () => {
  if (drawLayer.value) {
    map.pm.setGlobalOptions({ layerGroup: toRaw(drawLayer.value) });
  }
});

onMounted(() => {
  initMap();
  initGeoman();
});
</script>

<template>
  <div class="flex flex-row w-full">
    <div class="flex flex-column mr-2 w-3">
      <p class="font-bold mt-0 mb-0">Set draw layer</p>
      <Dropdown
        v-model="drawLayer"
        class="mb-2"
        :options="overlayLayers"
        option-label="name"
        option-value="layer"
      />
      <Button
        severity="danger"
        :disabled="overlayLayers.length <= 1"
        @click="deleteOverlayLayer"
      >
        Delete layer
      </Button>
      <p class="font-bold mt-2 mb-0">Create layer</p>
      <div class="flex">
        <InputText
          v-model="newOverlayLayerName"
          class="flex flex-auto mr-1"
        />
        <Button
          icon="pi pi-check"
          @click="createOverlayLayer"
        />
      </div>
      <span v-if="selectedFeature">
        <p class="font-bold mt-2 mb-0">Selected layer</p>
        <div class="flex flex-wrap-1">
          <p class="mt-0">{{ selectedFeature.toGeoJSON() }}</p>
        </div>
      </span>
    </div>
    <div
      id="map"
      class="w-9"
    />
  </div>
</template>

<style scoped lang="scss">
#map {
  height: 500px;
  width: 100%;
}
</style>
