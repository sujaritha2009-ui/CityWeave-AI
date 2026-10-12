import { BUCKET_MINUTES, dayBuckets, fromMinutes } from "./time.js";
import type { AppData, Institution, Junction, TrafficObservation } from "./types.js";

export const PILOT_CENTER: [number, number] = [13.0685, 74.9965];

const junctions: Junction[] = [
  {
    id: "j-bus-stand",
    name: "Bus Stand Junction",
    lat: 13.0702,
    lng: 74.9948,
    avgDelayMinutes: [12, 18],
    commonIssues: [
      "College buses and private buses arrive in the same 15-minute window",
      "Pickup and drop-off on the carriageway",
      "Roadside parking narrows the approach roads",
    ],
  },
  {
    id: "j-vidyagiri",
    name: "Vidyagiri Junction",
    lat: 13.0648,
    lng: 75.0012,
    avgDelayMinutes: [8, 12],
    commonIssues: [
      "Two-wheeler surge before first lecture",
      "Narrow road with no separate bus bay",
    ],
  },
  {
    id: "j-mangaluru-road",
    name: "Mangaluru Road Junction",
    lat: 13.0661,
    lng: 74.9884,
    avgDelayMinutes: [4, 7],
    commonIssues: ["Hospital visitor parking spills onto the road"],
  },
];

const institutions: Institution[] = [
  {
    id: "i-vidyagiri-eng",
    name: "Vidyagiri Engineering College",
    type: "college",
    lat: 13.0636,
    lng: 75.0031,
    startTime: "09:00",
    endTime: "16:30",
    dailyArrivals: 1200,
    flexibilityMinutes: 30,
    junctionId: "j-vidyagiri",
    notes: "Runs 14 college buses; most arrive between 8:30 and 8:55.",
  },
  {
    id: "i-riverside-degree",
    name: "Riverside Degree College",
    type: "college",
    lat: 13.0656,
    lng: 75.0024,
    startTime: "09:00",
    endTime: "16:00",
    dailyArrivals: 800,
    flexibilityMinutes: 15,
    junctionId: "j-vidyagiri",
    notes: "",
  },
  {
    id: "i-pu-college",
    name: "Moodbidri PU College",
    type: "college",
    lat: 13.0712,
    lng: 74.9962,
    startTime: "09:00",
    endTime: "16:00",
    dailyArrivals: 900,
    flexibilityMinutes: 30,
    junctionId: "j-bus-stand",
    notes: "Large share of students arrive by private bus.",
  },
  {
    id: "i-central-school",
    name: "Central Public School",
    type: "school",
    lat: 13.0694,
    lng: 74.9931,
    startTime: "08:45",
    endTime: "15:30",
    dailyArrivals: 600,
    flexibilityMinutes: 15,
    junctionId: "j-bus-stand",
    notes: "Parent drop-off between 8:15 and 8:45.",
  },
  {
    id: "i-taluk-office",
    name: "Taluk Office",
    type: "government",
    lat: 13.0709,
    lng: 74.9935,
    startTime: "09:30",
    endTime: "17:30",
    dailyArrivals: 250,
    flexibilityMinutes: 30,
    junctionId: "j-bus-stand",
    notes: "Public visiting hours start 10:00.",
  },
  {
    id: "i-community-health",
    name: "Community Health Centre",
    type: "hospital",
    lat: 13.0668,
    lng: 74.9872,
    startTime: "08:00",
    endTime: "20:00",
    dailyArrivals: 400,
    flexibilityMinutes: 0,
    junctionId: "j-mangaluru-road",
    notes: "OPD opens 8:00. Staff shift timings are not flexible.",
  },
];

/** Smooth bell-shaped bump centred on `center` minutes. */
function bump(t: number, center: number, width: number, height: number): number {
  return height * Math.exp(-((t - center) ** 2) / (2 * width ** 2));
}

const profiles: Record<string, { base: number; peaks: [number, number, number][] }> = {
  "j-bus-stand": { base: 120, peaks: [[8 * 60 + 40, 25, 480], [16 * 60 + 15, 35, 360]] },
  "j-vidyagiri": { base: 70, peaks: [[8 * 60 + 45, 20, 420], [16 * 60 + 20, 30, 300]] },
  "j-mangaluru-road": { base: 90, peaks: [[7 * 60 + 50, 30, 160], [17 * 60 + 30, 40, 140]] },
};

function sampleObservations(): TrafficObservation[] {
  const obs: TrafficObservation[] = [];
  for (const j of junctions) {
    const p = profiles[j.id];
    for (const t of dayBuckets()) {
      const mid = t + BUCKET_MINUTES / 2;
      const wobble = ((t * 7 + j.id.length * 13) % 17) - 8;
      const count = p.base + p.peaks.reduce((sum, [c, w, h]) => sum + bump(mid, c, w, h), 0) + wobble;
      obs.push({
        id: `o-${j.id}-${t}`,
        junctionId: j.id,
        time: fromMinutes(t),
        vehicleCount: Math.round(count),
        source: "sample",
      });
    }
  }
  return obs;
}

export function createSeedData(): AppData {
  return {
    institutions: institutions.map((i) => ({ ...i })),
    junctions: junctions.map((j) => ({ ...j, commonIssues: [...j.commonIssues] })),
    observations: sampleObservations(),
    recommendations: [],
    scheduleVersions: [],
  };
}
