import proj4 from 'proj4';

import { storeToRefs } from 'pinia';
import { useConfigStore } from '@/store';

// // Store
// const { getConfig } = storeToRefs(useConfigStore());

export default {
  /**
   * @function getParcelDataFromPMBC
   * DataBC’s Open Web Services
   * Accessing geographic data via WMS/WFS
   * Services Provided by OCIO - Digital Platforms & Data - Data Systems & Services
   * ref: https://docs.geoserver.org/main/en/user/services/wfs/reference.html#getfeature
   * ref: https://catalogue.data.gov.bc.ca/dataset/parcelmap-bc-parcel-fabric
   * @returns parcel data in JSON
   */
  async getParcelDataFromPMBC(polygon: Array<any>) {
    // close polygon by re-adding first point to end of array
    const points = polygon.concat(polygon[0]);

    // define the source and destination layer types
    // leaflet map layer
    const source = proj4.Proj('EPSG:4326'); // gps format of leaflet map
    // projection (BC Parcel data layer)
    proj4.defs(
      'EPSG:3005',
      'PROJCS["NAD83 / BC Albers", GEOGCS["NAD83", DATUM["North_American_Datum_1983", SPHEROID["GRS 1980",6378137,298.257222101, AUTHORITY["EPSG","7019"]], TOWGS84[0,0,0,0,0,0,0], AUTHORITY["EPSG","6269"]], PRIMEM["Greenwich",0, AUTHORITY["EPSG","8901"]], UNIT["degree",0.0174532925199433, AUTHORITY["EPSG","9122"]], AUTHORITY["EPSG","4269"]], PROJECTION["Albers_Conic_Equal_Area"], PARAMETER["standard_parallel_1",50], PARAMETER["standard_parallel_2",58.5], PARAMETER["latitude_of_center",45], PARAMETER["longitude_of_center",-126], PARAMETER["false_easting",1000000], PARAMETER["false_northing",0], UNIT["metre",1, AUTHORITY["EPSG","9001"]], AXIS["Easting",EAST], AXIS["Northing",NORTH], AUTHORITY["EPSG","3005"]]'
    );
    const dest = proj4.Proj('EPSG:3005');

    // convert lat/long for WFS query
    const result = points.map((point) => {
      return proj4(source, dest, { x: point.lng, y: point.lat });
    });

    // built query string for WFS request
    let qStr = '';
    result.forEach((point, index, array) => {
      qStr = qStr.concat(point.x, ' ', point.y);
      if (index < array.length - 1) qStr = qStr.concat(', ');
    });
    // fetch parcel data from WFS url
    const response = await fetch(
      'https://openmaps.gov.bc.ca/geo/pub/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&outputFormat=json&typeName=WHSE_CADASTRE.PMBC_PARCEL_FABRIC_POLY_SVW&CQL_FILTER=INTERSECTS(SHAPE, POLYGON ((' +
        qStr +
        ')))'
    );
    const data = await response.json();
    return data;
  },

  // TODO: move geocoder lookups to backend - we don't want to expose the API key
  async geocodeAddress(params: string) {
    const { getConfig } = storeToRefs(useConfigStore());

    const response = await fetch(`${getConfig.value.geocoder.apiPath}/addresses.geojson?${params}`, {
      headers: { apikey: getConfig.value.geocoder.apiKey }
    });

    return response;
  },

  async geocodeSitesInArea(coordinates: Array<any>) {
    const { getConfig } = storeToRefs(useConfigStore());

    const lats: Array<any> = [];
    const lngs: Array<any> = [];
    coordinates.forEach((o: { lat: any; lng: any }) => {
      lats.push(o.lat);
      lngs.push(o.lng);
    });
    lats.sort();
    lngs.sort();
    const str = `${lngs[0]},${lats[0]},${lngs[2]},${lats[2]}`;

    const response = await fetch(
      `${getConfig.value.geocoder.apiPath}sites/within.json?outputSRS=4326&maxResults=100&locationDescriptor=any&setBack=0&brief=false&excludeUnits=false&onlyCivic=false&bbox=${str}`,
      {
        headers: { apikey: getConfig.value.geocoder.apiKey }
      }
    );
    return response;
  },

  async geocodePidForSite(siteId: number) {
    const { getConfig } = storeToRefs(useConfigStore());
    const response = await fetch(`${getConfig.value.geocoder.apiPath}/parcels/pids/${siteId}.json`, {
      headers: { apikey: getConfig.value.geocoder.apiKey }
    });
    return response;
  }
};
