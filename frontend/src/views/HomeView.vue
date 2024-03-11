<script setup lang="ts">
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

import * as geojson from 'geojson';

import { onMounted, ref, toRaw, watch } from 'vue';
import { Button, Column, DataTable, Dropdown, InputText, useToast, Panel } from '@/lib/primevue';
import { dataService, featureGroupService, featureService } from '@/services';

import type { Ref } from 'vue';
import type { Feature, FeatureGroup } from '@/types';

// State
const drawLayer: Ref<FeatureGroup | undefined> = ref(undefined);
const newOverlayLayerName: Ref<string> = ref('');
const overlayLayers: Ref<Array<FeatureGroup>> = ref([]);
const selectedFeature: Ref<L.GeoJSON | undefined> = ref(undefined);
const parcelData: Ref<any> = ref(undefined);
const addressDropdownOptions: Ref<Array<string>> = ref([]);
const addressSearchString: Ref<string> = ref('');
const showAddLayerInput = ref(false);
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

  const response = await dataService.geocodeAddress(params);
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

    const response = await dataService.geocodeAddress(params);
    const results = await response.json();
    addressDropdownOptions.value = results.features.map((x: any) => x.properties.fullAddress);
  }
}

// show parcel data from Geocoder
async function showPMBCParcelData(data) {
  await dataService.getParcelDataFromPMBC(data).then((data) => {
    parcelData.value = data.features.map((f) => f.properties);
  });
}
function showParcelSidebar(id) {
  parcelDetail.value = parcelData.value.find((p) => p.PARCEL_FABRIC_POLY_ID === id);
  selectedParcel.value = id;
}
const parcelRowClass = (data: any) => [{ 'selected-row': data.PARCEL_FABRIC_POLY_ID === selectedParcel.value }];

// show site data from Geocoder
async function showSiteData(coordinates) {
  const resp = await dataService.geocodeSitesInArea(coordinates);
  const results = await resp.json();
  siteData.value = results.features.map((feature) => feature.properties);
}
async function showSiteSidebar(id) {
  selectedSite.value = id;
  siteDetail.value = siteData.value.find((s) => s.siteID === id);
  const resp = await dataService.geocodePidForSite(id);
  const results = await resp.json();
  sitePidDetail.value = results;
}
const siteRowClass = (data: any) => [{ 'selected-row': data.siteID === selectedSite.value }];

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
      else map.flyTo(geo._latlng, 17);

      // If drawing a Polygon, show parcel data using WFS api
      if (e.layer.pm._shape === 'Polygon') {
        showPMBCParcelData(geo.getLatLngs()[0]);
      }
      // if drawing a rectagle show site data using BC Address Gecoder
      else if (e.layer.pm._shape === 'Rectangle') {
        showSiteData(geo.getLatLngs()[0]);
      }
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
  <div class="grid nested-grid max-width-1500">
    <div class="col-6">
      <!-- geocode address -->
      <Panel header="Geocode an address">
        <div class="flex max-w-20rem">
          <Dropdown
            v-model="addressSearchString"
            editable
            name="addressSearch"
            class="flex flex-auto mr-1"
            :options="addressDropdownOptions"
            @input="autocompleteAddressSearch"
          />
          <Button
            icon="pi pi-search"
            @click="moveMapFocus"
          />
        </div>
      </Panel>
    </div>
    <div class="col-6">
      <!-- layer conrols -->
      <Panel header="Layers">
        <div class="flex">
          <span
            v-if="overlayLayers.length"
            class="mr-4"
          >
            <Dropdown
              v-model="drawLayer"
              :options="overlayLayers"
              option-label="name"
              option-value="layer"
            />
            <Button
              v-if="overlayLayers.length > 0"
              @click="deleteOverlayLayer"
              severity="primary"
              text
            >
              Delete
            </Button>
            |
          </span>

          <span v-if="overlayLayers.length > 0 && !showAddLayerInput">
            <Button
              @click="showAddLayerInput = true"
              class="pl-0"
              severity="primary"
              text
            >
              Add new layer
            </Button>
          </span>

          <span
            v-if="showAddLayerInput || overlayLayers.length === 0"
            class="flex align-items-center"
          >
            <label for="newOverlayLayerName">Name:</label>
            <InputText
              v-model="newOverlayLayerName"
              class="flex flex-auto ml-2"
            />
            <Button
              @click="
                createOverlayLayer();
                showAddLayerInput = false;
              "
              icon="pi pi-plus"
            />
            <Button
              v-if="overlayLayers.length > 0"
              @click="showAddLayerInput = false"
              text
            >
              cancel
            </Button>
          </span>
        </div>
      </Panel>
    </div>
    <div class="col-12">
      <!-- map -->
      <div id="map" />
    </div>

    <div class="col-12">
      <!-- Selected feature -->
      <Panel
        toggleable
        collapsed
        v-if="selectedFeature"
        header="Selected Feature"
      >
        <pre>{{ selectedFeature.toGeoJSON() }}</pre>
      </Panel>
    </div>

    <div class="col-12">
      <!-- PMBC Parcel details -->
      <Panel
        toggleable
        v-if="parcelData?.length"
      >
        <template #header>
          <span>
            <span class="font-semibold">Parcel Data</span>
            - data source:
            <a href="https://catalogue.data.gov.bc.ca/dataset/4cf233c2-f020-4f7a-9b87-1923252fbc24">
              ParcelMap BC Parcel Fabric
            </a>
          </span>
        </template>
        <div class="grid">
          <div class="col-7">
            <DataTable
              :value="parcelData"
              data-key="PARCEL_FABRIC_POLY_ID"
              class="p-datatable-sm"
              responsive-layout="scroll"
              :paginator="true"
              :rows="10"
              :row-class="parcelRowClass"
            >
              <Column
                field="PARCEL_FABRIC_POLY_ID"
                header="PARCEL_FABRIC_POLY_ID"
              >
                <template #body="slotProps">
                  <Button
                    class="p-0"
                    text
                    @click="showParcelSidebar(slotProps.data.PARCEL_FABRIC_POLY_ID)"
                  >
                    {{ slotProps.data.PARCEL_FABRIC_POLY_ID }}
                  </Button>
                </template>
              </Column>
              <Column
                field="OWNER_TYPE"
                header="Owner Type"
              ></Column>
              <Column
                field="PID_FORMATTED"
                header="PID"
              ></Column>
              <Column
                field="PARCEL_CLASS"
                header="Parcel Class"
              ></Column>

              <template #paginatorstart>Total parcels: {{ parcelData.length }}</template>
            </DataTable>
          </div>
          <div class="col-5">
            <div
              v-if="parcelDetail"
              class="detail"
            >
              <strong>Parcel Detail:</strong>
              <pre>{{ parcelDetail }}</pre>
            </div>
          </div>
        </div>
      </Panel>
    </div>
    <div class="col-12">
      <!-- geocoder results -->

      <Panel
        toggleable
        v-if="siteData?.length"
      >
        <template #header>
          <span>
            <span class="font-semibold">Site Data</span>
            - data source:
            <a href="https://www2.gov.bc.ca/gov/content/data/geographic-data-services/location-services/geocoder">
              BC Address Geocoder
            </a>
          </span>
        </template>
        <div class="grid">
          <div class="col-7">
            <DataTable
              :value="siteData"
              data-key="siteID"
              class="p-datatable-sm"
              responsive-layout="scroll"
              :paginator="true"
              :rows="10"
              :row-class="siteRowClass"
            >
              <Column
                field="siteID"
                header="Site ID"
              >
                <template #body="slotProps">
                  <Button
                    class="p-0"
                    text
                    @click="showSiteSidebar(slotProps.data.siteID)"
                  >
                    {{ slotProps.data.siteID }}
                  </Button>
                </template>
              </Column>
              <Column
                field="fullAddress"
                header="Full Address"
              ></Column>
              <template #paginatorstart>Total sites: {{ siteData.length }}</template>
            </DataTable>
          </div>
          <div class="col-5">
            <div
              v-if="siteDetail"
              class="detail"
            >
              <strong>Site Detail:</strong>
              <pre>{{ siteDetail }}</pre>
              <strong>Site PIDs:</strong>
              <pre>{{ sitePidDetail }}</pre>
            </div>
          </div>
        </div>
      </Panel>
    </div>
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
