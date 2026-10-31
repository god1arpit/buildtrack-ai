import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Clock3, LocateFixed, MapPin, Navigation, Play, Save, ShieldCheck, Square, TriangleAlert } from "lucide-react";
import api from "../../api/api";

const MAX_ACCURACY_METERS = 25;

const distanceBetween = (a, b) => {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const dLat = lat2 - lat1;
  const dLon = toRadians(b.longitude - a.longitude);
  const haversine = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(haversine));
};

const calculateDistance = (points) => {
  let meters = 0;
  let previous = null;
  for (const point of points) {
    if (point.accuracy > MAX_ACCURACY_METERS) continue;
    if (previous) {
      const step = distanceBetween(previous, point);
      const elapsed = Math.max((point.timestamp - previous.timestamp) / 1000, 0.25);
      if (step >= Math.max(2.5, point.accuracy * 0.15) && step / elapsed <= 45) meters += step;
    }
    previous = point;
  }
  return meters;
};

const formatDuration = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export const RoadMeasurementPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(searchParams.get("projectId") || "");
  const [measurements, setMeasurements] = useState([]);
  const [points, setPoints] = useState([]);
  const [startedAt, setStartedAt] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [accuracy, setAccuracy] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const watchIdRef = useRef(null);
  const pointsRef = useRef([]);

  const distanceMeters = useMemo(() => calculateDistance(points), [points]);
  const selectedProject = projects.find((project) => project._id === projectId);

  const loadMeasurements = useCallback(async (id) => {
    if (!id) return;
    try {
      const response = await api.get(`/road-measurements?projectId=${encodeURIComponent(id)}`);
      setMeasurements(response.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load saved road measurements.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.get("/projects")
      .then(({ data }) => {
        if (cancelled) return;
        const availableProjects = data || [];
        setProjects(availableProjects);
        const queryProjectId = searchParams.get("projectId");
        const initialId = availableProjects.some((item) => item._id === queryProjectId)
          ? queryProjectId
          : availableProjects[0]?._id || "";
        setProjectId((current) => current || initialId);
      })
      .catch(() => setError("Could not load your assigned sites."));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (projectId) {
      setSearchParams({ projectId }, { replace: true });
      loadMeasurements(projectId);
    }
  }, [projectId, loadMeasurements, setSearchParams]);

  useEffect(() => {
    if (!isTracking || !startedAt) return undefined;
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [isTracking, startedAt]);

  useEffect(() => () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const startTracking = () => {
    setError("");
    setNotice("");
    if (!projectId) {
      setError("Select an assigned site before starting a measurement.");
      return;
    }
    if (!navigator.geolocation) {
      setError("This browser does not provide GPS location. Open BuildTrack on a GPS-enabled phone.");
      return;
    }

    const time = Date.now();
    pointsRef.current = [];
    setPoints([]);
    setAccuracy(null);
    setStartedAt(time);
    setElapsedSeconds(0);
    setIsTracking(true);
    setNotice("Waiting for a clear GPS fix. Keep location permission enabled and start outdoors.");

    watchIdRef.current = navigator.geolocation.watchPosition((position) => {
      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp || Date.now(),
      };
      setAccuracy(next.accuracy);
      if (next.accuracy > MAX_ACCURACY_METERS) {
        setNotice(`GPS accuracy is ${Math.round(next.accuracy)} m. Waiting for 25 m or better before recording.`);
        return;
      }

      const previous = pointsRef.current[pointsRef.current.length - 1];
      if (previous) {
        const step = distanceBetween(previous, next);
        const elapsed = Math.max((next.timestamp - previous.timestamp) / 1000, 0.25);
        if ((step < 3 && elapsed < 8) || step / elapsed > 45) return;
      }
      pointsRef.current = [...pointsRef.current, next];
      setPoints(pointsRef.current);
      setNotice("GPS trace recording. Follow the road centerline and keep this page open.");
    }, (locationError) => {
      const messages = {
        1: "Location permission was denied. Allow location access in the browser and try again.",
        2: "Your device could not find GPS. Move outdoors and check location services.",
        3: "GPS timed out. Check location services and try again outdoors.",
      };
      setError(messages[locationError.code] || "GPS location failed. Check location permission and retry.");
      stopTracking();
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  };

  const saveMeasurement = async () => {
    if (pointsRef.current.length < 2) {
      setError("Record at least two accurate GPS points before saving.");
      return;
    }
    stopTracking();
    setIsSaving(true);
    setError("");
    try {
      const response = await api.post("/road-measurements", {
        projectId,
        startedAt,
        points: pointsRef.current,
      });
      setMeasurements((current) => [response.data.measurement, ...current]);
      setNotice(response.data.message || "Measurement saved for review.");
      pointsRef.current = [];
      setPoints([]);
      setStartedAt(null);
      setElapsedSeconds(0);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not save this GPS measurement.");
    } finally {
      setIsSaving(false);
    }
  };

  const discardTrace = () => {
    stopTracking();
    pointsRef.current = [];
    setPoints([]);
    setStartedAt(null);
    setAccuracy(null);
    setElapsedSeconds(0);
    setNotice("Unfinished trace discarded.");
    setError("");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <Link to="/supervisor" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back to Supervisor Home
      </Link>

      <header className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-green-900/40 text-green-400 flex items-center justify-center">
            <LocateFixed className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-green-400 font-bold">GPS survey</span>
            <h1 className="text-2xl font-black text-white">Measure Road Length</h1>
            <p className="text-sm text-zinc-400 mt-1">Walk or drive the road centerline to record a real-world distance.</p>
          </div>
        </div>
        <label className="block mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-400" htmlFor="measurement-site">Construction site</label>
        <select
          id="measurement-site"
          value={projectId}
          disabled={isTracking || isSaving}
          onChange={(event) => setProjectId(event.target.value)}
          className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-green-700 disabled:opacity-60"
        >
          <option value="">Select assigned site</option>
          {projects.map((project) => <option key={project._id} value={project._id}>{project.name} · {project.location}</option>)}
        </select>
        {selectedProject && <p className="text-xs text-zinc-500 mt-2">{selectedProject.name} · {selectedProject.location}</p>}
      </header>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-zinc-950 p-4 col-span-2">
            <span className="text-xs text-zinc-500">Distance recorded</span>
            <div className="text-3xl font-mono font-bold text-emerald-400 mt-1">{distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(3)} km` : `${distanceMeters.toFixed(0)} m`}</div>
          </div>
          <div className="rounded-2xl bg-zinc-950 p-4">
            <span className="text-xs text-zinc-500">GPS fixes</span>
            <div className="text-xl font-bold text-white mt-2">{points.length}</div>
          </div>
          <div className="rounded-2xl bg-zinc-950 p-4">
            <span className="text-xs text-zinc-500">Accuracy</span>
            <div className={`text-xl font-bold mt-2 ${accuracy && accuracy <= MAX_ACCURACY_METERS ? "text-emerald-400" : "text-green-400"}`}>
              {accuracy ? `±${Math.round(accuracy)} m` : "Waiting"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Clock3 className="w-4 h-4" /> {formatDuration(elapsedSeconds)}
          <span className="mx-1 text-zinc-700">·</span>
          {isTracking ? "Recording GPS" : "Not recording"}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {!isTracking ? (
            <button onClick={startTracking} disabled={!projectId || isSaving} className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-green-800 px-4 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-50">
              <Play className="w-4 h-4" /> Start measurement
            </button>
          ) : (
            <button onClick={stopTracking} className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-zinc-700 px-4 py-3 font-bold text-white hover:bg-zinc-600">
              <Square className="w-4 h-4" /> Stop trace
            </button>
          )}
          <button onClick={saveMeasurement} disabled={isTracking || points.length < 2 || isSaving} className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 font-bold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40">
            <Save className="w-4 h-4" /> {isSaving ? "Saving…" : "Save for review"}
          </button>
          {points.length > 0 && !isTracking && <button onClick={discardTrace} className="rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800">Discard</button>}
        </div>

        {notice && <p className="rounded-xl border border-zinc-500/20 bg-zinc-500/5 px-4 py-3 text-sm text-zinc-200">{notice}</p>}
        {error && <p role="alert" className="flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-200"><TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />{error}</p>}

        <div className="rounded-2xl border border-green-700/20 bg-green-900/20 p-4 text-xs leading-relaxed text-green-100/80">
          <div className="flex gap-2 font-bold text-green-300"><ShieldCheck className="w-4 h-4" /> Before recording</div>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Use a GPS-enabled phone outdoors and allow location access.</li>
            <li>Follow the road centerline; keep the page open until you stop.</li>
            <li>Only fixes accurate to 25 m or better are used. A longer trace is more reliable.</li>
            <li>Saved traces are review records and do not change project progress automatically.</li>
          </ul>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div><h2 className="font-bold text-white">Recent measurements</h2><p className="text-xs text-zinc-500 mt-1">Review each trace before using it in progress totals.</p></div>
          <Navigation className="w-5 h-5 text-zinc-500" />
        </div>
        {measurements.length === 0 ? (
          <div className="text-sm text-zinc-500 py-5 text-center">No GPS measurements saved for this site yet.</div>
        ) : (
          <div className="space-y-2">
            {measurements.map((measurement) => (
              <div key={measurement._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-950 px-4 py-3">
                <div>
                  <div className="font-mono font-bold text-emerald-300">{measurement.distanceKm} km <span className="font-sans text-xs font-normal text-zinc-500">({measurement.distanceMeters} m)</span></div>
                  <div className="text-xs text-zinc-500 mt-1">{measurement.supervisorName || "Supervisor"} · {new Date(measurement.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 rounded-full border border-green-700/30 bg-green-900/30 px-2.5 py-1 text-[10px] font-bold uppercase text-green-300"><MapPin className="w-3 h-3" /> Needs review</span>
                  <div className="text-[10px] text-zinc-600 mt-1">±{measurement.averageAccuracyMeters} m avg GPS accuracy</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
