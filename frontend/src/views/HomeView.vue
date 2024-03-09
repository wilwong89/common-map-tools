<script setup lang="ts">
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

import * as geojson from 'geojson';

import { onMounted, ref, toRaw, watch } from 'vue';
import { Button, Column, DataTable, Dropdown, InputText, useToast } from '@/lib/primevue';
import { storeToRefs } from 'pinia';

import { dataService, featureGroupService, featureService } from '@/services';

import type { Ref } from 'vue';
import type { Feature, FeatureGroup } from '@/types';

// State
const drawLayer: Ref<FeatureGroup | undefined> = ref(undefined);
const newOverlayLayerName: Ref<string> = ref('');
const overlayLayers: Ref<Array<FeatureGroup>> = ref([]);
const selectedFeature: Ref<L.GeoJSON | undefined> = ref(undefined);
const parcelData: Ref<any> = ref(undefined);

// Store
const { getConfig } = storeToRefs(useConfigStore());
import { useConfigStore } from '@/store';

const addressDropdownOptions: Ref<Array<string>> = ref([]);
const addressSearchString: Ref<string> = ref('');
const parcelData = ref(undefined);
const selectedParcel = ref(undefined);
const parcelDetail = ref(undefined);
const siteData = ref(undefined);
const siteDetail = ref(undefined);
const sitePidDetail = ref(undefined);
const selectedSite = ref(undefined);

// Actions
const toast = useToast();

let layerControl: L.Control.Layers;
let marker: L.Marker;
let map: L.Map;

function addOverlayLayer(data: FeatureGroup) {
  if (!data.layer) {
    data.layer = new L.GeoJSON().addTo(map);
  }
  layerControl.addOverlay(data.layer, data.name);
  overlayLayers.value.push(data);

  data.layer.on('click', (event) => {
    selectedFeature.value = event.propagatedFrom;
  });
}

async function createOverlayLayer() {
  try {
    if (newOverlayLayerName.value) {
      const result = await featureGroupService.createFeatureGroup(newOverlayLayerName.value);
      newOverlayLayerName.value = '';
      addOverlayLayer(result.data);
    }
  } catch (e: any) {
    toast.error('Error', e.message);
  }
}

async function deleteOverlayLayer() {
  if (drawLayer.value) {
    try {
      await featureGroupService.deleteFeatureGroup(drawLayer.value.featureGroupId);
      drawLayer.value.layer.removeFrom(map);
      layerControl.removeLayer(drawLayer.value.layer);
      overlayLayers.value = overlayLayers.value.filter((x) => x !== drawLayer.value);
      drawLayer.value = overlayLayers.value[0];
    } catch (e: any) {
      toast.error('Error', e.message);
    }
  }
}

function setAddressMarker(coords: any) {
  if (marker) map.removeLayer(marker);
  // Custom(-ish) markers courtesy of https://github.com/pointhi/leaflet-color-markers
  const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
  marker = L.marker(coords, { icon: redIcon });
  map.addLayer(marker);
}

async function moveMapFocus() {
  const params = new URLSearchParams({
    addressString: addressSearchString.value,
    maxResults: '1',
    provinceCode: 'BC'
  }).toString();

  const response = await fetch(`${getConfig.value.geocoder.apiPath}/addresses.geojson?${params}`);
  const results = await response.json();

  if (results.features.length == 0) {
    toast.info('Unable to find address');
  } else {
    const [lng, lat] = results.features[0].geometry.coordinates;
    const addressLocation = { lat: lat, lng: lng };

    map.flyTo(addressLocation, 17);
    setAddressMarker(addressLocation);
  }
}

async function autocompleteAddressSearch() {
  if (addressSearchString.value.length >= 3) {
    const params = new URLSearchParams({
      minScore: '50',
      maxResults: '5',
      echo: 'false',
      brief: 'true',
      autoComplete: 'true',
      addressString: addressSearchString.value
    });

    const response = await fetch(`${getConfig.value.geocoder.apiPath}/addresses.json?${params}`);
    const results = await response.json();
    addressDropdownOptions.value = results.features.map((x: any) => x.properties.fullAddress);
  }
}

function initGeoman() {
  map.pm.addControls({
    position: 'topleft',

    // Create
    drawCircleMarker: false,
    drawCircle: false,
    drawText: false,
    drawPolyline: false,

    // Edit
    cutPolygon: false,
    dragMode: false,
    editMode: false,
    rotateMode: false
  });
}

async function initMap() {
  const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });

  map = L.map('map', {
    center: [48.428, -123.365],
    zoom: 13,
    layers: [osm]
  });

  // On feature create
  map.on('pm:create', async (e) => {
    try {
      const geo = e.layer as L.GeoJSON;

      /* @ts-expect-error Ignore TS typings and force in feature_group_id */
      geo.feature = {
        properties: { featureGroupId: drawLayer.value?.featureGroupId }
      };

      // Create new feature
      /* @ts-expect-error The spread doesn't overwrite type, but it thinks it does */
      const result = (await featureService.createFeature({ type: 'Feature', ...geo.toGeoJSON() })).data;

      drawLayer.value?.layer.removeLayer(geo);
      drawLayer.value?.layer.addData(result.geoJson);

      // Zoom in
      if (geo.getBounds) map.fitBounds(geo.getBounds());

      // Show parcel data
      if (geo.getLatLngs) showParcelData(geo.getLatLngs()[0]);
    } catch (e: any) {
      toast.error('Error', e.message);
    }
  });

  // On feature remove
  map.on('pm:remove', async (e) => {
    try {
      const geo = e.layer as L.GeoJSON;
      const feature = geo.feature as geojson.Feature;
      await featureService.deleteFeature(feature.properties?.featureId);
    } catch (e: any) {
      toast.error('Error', e.message);
    }
  });

  // Don't allow dragging outside BC
  const bcBounds = new L.LatLngBounds([44, -140], [63, -109]);
  map.setMaxBounds(bcBounds);
  map.on('drag', function () {
    map.panInsideBounds(bcBounds, { animate: false });
  });

  const baseMaps = {
    OpenStreetMap: osm
  };

  layerControl = L.control.layers(baseMaps).addTo(map);

  // Load overlay layers
  const featureGroups = (await featureGroupService.getFeatureGroups()).data;
  featureGroups.forEach((fg: FeatureGroup) => {
    addOverlayLayer(fg);
  });

  // Set initial draw layer
  if (featureGroups.length) {
    drawLayer.value = featureGroups[0];
  }

  // Load overlay features
  const feature = (await featureService.getFeatures()).data;
  feature.forEach((fg: Feature) => {
    const overlayLayer = overlayLayers.value.find((x) => x.featureGroupId === fg.featureGroupId);
    overlayLayer?.layer.addData(fg.geoJson);
  });
}

async function showParcelData(data: unknown) {
  await dataService.getParcelData(data).then((data) => {
    parcelData.value = data.features.map((f) => f.properties);
  });
}
const rowClass = (data: any) => [{ 'selected-row': data.PARCEL_FABRIC_POLY_ID === selectedParcel.value }];

// set geoman global options
watch(drawLayer, () => {
  if (drawLayer.value) {
    map.pm.setGlobalOptions({ layerGroup: toRaw(drawLayer.value).layer });
  }
});

onMounted(async () => {
  await initMap();
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
      <p class="font-bold mt-2 mb-0">Find address</p>
      <div class="flex">
        <Dropdown
          v-model="addressSearchString"
          editable
          name="addressSearch"
          class="flex flex-auto mr-1"
          :options="addressDropdownOptions"
          @input="autocompleteAddressSearch"
        />
        <Button
          icon="pi pi-check"
          @click="moveMapFocus"
        />
      </div>
    </div>

  <div
    v-if="parcelData"
    class="py-2 mw-50"
  >
    <h3>Parcel Data</h3>
    <DataTable
      :value="parcelData"
      data-key="PID"
      class="p-datatable-sm"
      responsive-layout="scroll"
      :paginator="true"
      :rows="5"
    >
      <Column
        field="PID"
        header="Parcel ID"
      />
      <Column
        field="OWNER_TYPE"
        header="Owner Type"
      />
      <Column
        field="PARCEL_CLASS"
        header="Parcel Class"
      />
    </DataTable>
  </div>
</template>

<style scoped lang="scss">
.max-width-1500 {
  max-width: 1500px;
}
#map {
  height: 400px;
  width: 100%;
}
:deep(.selected-row) {
  background: #f2f2f2 !important;
}
:deep(.p-button-text) {
  &,
  &:hover,
  &:focus,
  &:active {
    outline: none;
    background: none;
    border: none;
    transition: none;
    box-shadow: none !important;
    color: #1a5a96 !important;
  }
}
:deep(a) {
  color: #1a5a96;
}
:deep(.p-paginator) {
  padding-left: 0.5rem;
}
.detail {
  padding: 0.5rem;
  background: #f2f2f2;
}
</style>
