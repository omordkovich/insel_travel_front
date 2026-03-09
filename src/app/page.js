"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import Link from "next/link";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRNfC967UzQ8Lu5SN7rrpETre-ILwsnKZ4K6bbmMz_fHvEyrLyFQy-5ixxn278r6FLo_fHdXVvqZBIH/pub?gid=0&single=true&output=csv";

function normalizeCity(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[\s/]/g, "_");
}

function mapTours(raw) {
  const now = new Date();

  return raw
    .map((tour) => {
      const isActive = String(tour.active).trim().toLowerCase() === "true";

      const startCities = tour.startCities
        ? tour.startCities.split(";").map((c) => c.trim())
        : [];

      const startDates = tour.startDates
        ? tour.startDates
            .split(";")
            .map((d) => {
              const [day, month, year] = d.trim().split(".");
              return new Date(year, month - 1, day);
            })
            .filter((dateObj) => dateObj >= now)
        : [];

      if (startDates.length === 0) return null;

      const endDates = tour.endDates
        ? tour.endDates.split(";").map((d) => {
            const [day, month, year] = d.trim().split(".");
            return new Date(year, month - 1, day);
          })
        : [];

      const countries = tour.countries
        ? tour.countries.split(";").map((d) => d.trim())
        : [];

      const startPrice = tour.startPrice
        ? tour.startPrice.split(";").map((d) => d.trim())
        : [];

      return {
        ...tour,
        id: String(tour.id || `${tour.title}-${startDates[0]?.toISOString()}`),
        startCities,
        startDates,
        endDates,
        countries,
        startPrice,
        summary: tour.summary,
      };
    })
    .filter((tour) => tour && tour.active)
    .sort((a, b) => {
      const firstA = a.startDates[0] || new Date(9999, 0, 1);
      const firstB = b.startDates[0] || new Date(9999, 0, 1);
      return firstA - firstB;
    });
}

function formatDateRange(tour) {
  return tour.startDates
    .map((start, i) => {
      const startDay = String(start.getDate()).padStart(2, "0");
      const startMonth = String(start.getMonth() + 1).padStart(2, "0");
      const startYear = start.getFullYear();

      if (Number(tour.durationDays) > 1 && tour.endDates && tour.endDates[i]) {
        const end = tour.endDates[i];
        const endDay = String(end.getDate()).padStart(2, "0");
        const endMonth = String(end.getMonth() + 1).padStart(2, "0");
        const endYear = end.getFullYear();
        return `von ${startDay}.${startMonth}.${startYear} bis ${endDay}.${endMonth}.${endYear}`;
      }

      return `${startDay}.${startMonth}.${startYear}`;
    })
    .join(" | ");
}

function Spinner() {
  return (
    <div id="spinner" className="sun-spinner active">
      <div className="center-outline" />
      <div className="sk-circle">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className={`sk-child sk-circle${i + 1}`} />
        ))}
      </div>
    </div>
  );
}

function Filters({ tours, filters, setFilters, onSearch }) {
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const countries = useMemo(() => {
    const set = new Set();
    tours.forEach((t) => t.countries?.forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [tours]);

  const startCities = useMemo(() => {
    const set = new Set();
    tours.forEach((t) => t.startCities?.forEach((c) => set.add(c)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "de"));
  }, [tours]);

  useEffect(() => {
    if (!filters.fromDate || !filters.toDate) {
      setFilters((prev) => ({
        ...prev,
        fromDate: today,
        toDate: today,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="selectors-container">
      <div className="user-input-container">
        <label htmlFor="tour-type">Tourtyp</label>
        <select
          id="tour-type"
          className="user-select-input"
          value={filters.tourType}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, tourType: e.target.value }))
          }
        >
          <option value="all">Alle Typen</option>
          <option value="oneday">Tagesausflüge</option>
          <option value="multipledays">Mehrtägige Touren</option>
        </select>
      </div>

      <div className="user-input-container">
        <label htmlFor="tour-country">Länder</label>
        <select
          id="tour-country"
          className="user-select-input"
          value={filters.country}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, country: e.target.value }))
          }
        >
          <option value="all">Alle Länder</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="user-input-container">
        <label htmlFor="startCity">Abfahrtsort</label>
        <select
          id="startCity"
          className="user-select-input"
          value={filters.startCity}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, startCity: e.target.value }))
          }
        >
          <option value="all">Alle</option>
          {startCities.map((c) => (
            <option key={c} value={normalizeCity(c)}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="user-input-container">
        <label htmlFor="date-from">von:</label>
        <input
          id="date-from"
          type="date"
          className="date-input"
          value={filters.fromDate || ""}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, fromDate: e.target.value }))
          }
        />
      </div>

      <div className="user-input-container">
        <label htmlFor="date-to">bis:</label>
        <input
          id="date-to"
          type="date"
          className="date-input"
          value={filters.toDate || ""}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, toDate: e.target.value }))
          }
        />
      </div>

      <button className="search-button" onClick={onSearch}>
        Suchen
      </button>
    </div>
  );
}

function TourCard({ tour }) {
  return (
    <div className="tour-card">
      <div className="tour-img">
        <img src={tour.imgUrl} alt={tour.title || "Tour"} />
        <div className="overlay">
          <div className="overlay-text">
            <div>{tour.countries?.join(", ")}</div>
            <div className="price">
              {tour.startPrice ? tour.startPrice.join(" | ") : ""}
            </div>
          </div>
        </div>
      </div>
      <div className="description">
        <h2>{tour.title}</h2>
        <p>{tour.summary}</p>
      </div>
      <p className="tour-dates">{formatDateRange(tour)}</p>
      <div className="btn-container">
        <Link
          href={`/tour/${encodeURIComponent(tour.id)}`}
          className="order-btn"
        >
          Mehr
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  const [tours, setTours] = useState([]);
  const [filteredTours, setFilteredTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    tourType: "all",
    country: "all",
    startCity: "all",
    fromDate: "",
    toDate: "",
  });

  useEffect(() => {
    Papa.parse(SHEET_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapped = mapTours(results.data);
        setTours(mapped);
        setFilteredTours(mapped);
        setLoading(false);
      },
      error: () => {
        setLoading(false);
      },
    });
  }, []);

  const handleSearch = () => {
    let result = [...tours];

    const from = filters.fromDate ? new Date(filters.fromDate) : null;
    const to = filters.toDate ? new Date(filters.toDate) : null;

    if (from && to) {
      if (from.getTime() === to.getTime()) {
        result = result.filter((t) =>
          t.startDates.some((d) => d >= from),
        );
      } else {
        result = result.filter((t) =>
          t.startDates.some((d) => d >= from && d <= to),
        );
      }
    } else if (from) {
      result = result.filter((t) => t.startDates.some((d) => d >= from));
    } else if (to) {
      result = result.filter((t) => t.startDates.some((d) => d <= to));
    }

    if (filters.country !== "all") {
      result = result.filter(
        (tour) =>
          Array.isArray(tour.countries) &&
          tour.countries.includes(filters.country),
      );
    }

    if (filters.tourType !== "all") {
      result = result.filter((tour) => {
        const starts = Array.isArray(tour.startDates) ? tour.startDates : [];
        const ends = Array.isArray(tour.endDates) ? tour.endDates : [];
        let isMulti = false;
        for (let i = 0; i < Math.max(starts.length, ends.length); i++) {
          const start = starts[i];
          const end = ends[i];
          if (start && end && end.getTime() > start.getTime()) {
            isMulti = true;
            break;
          }
        }
        if (filters.tourType === "multipledays") return isMulti;
        if (filters.tourType === "oneday") return !isMulti;
        return true;
      });
    }

    if (filters.startCity !== "all") {
      const selectedCity = filters.startCity.trim().toLowerCase();
      result = result.filter((t) =>
        t.startCities.some((city) => normalizeCity(city) === selectedCity),
      );
    }

    setFilteredTours(result);
  };

  return (
    <div id="root">
      <header className="app-header">
        <div className="header-info">
          <div className="info-container">
            <strong>IN-SEEL Tourservice</strong>
            <span>Sebastianstr. 97, DE-50735 Köln</span>
            <span>Tel.: +49(0)221 77898 701/702</span>
          </div>
          <p className="news-line">
            SANATORIEN UND KURORTE! Große Auswahl an Sanatorien und Kurorten für
            jeden Geschmack!
          </p>
        </div>
      </header>

      <main className="main">
        <div className="catalog-container">
          <img
            className="logo"
            src="/logo.png"
            alt="IN-SEEL Tourservice Logo"
          />

          <Filters
            tours={tours}
            filters={filters}
            setFilters={setFilters}
            onSearch={handleSearch}
          />

          {loading ? (
            <Spinner />
          ) : filteredTours.length === 0 ? (
            <p>Keine Übereinstimmungen!</p>
          ) : (
            <div className="tour-list">
              {filteredTours.map((tour) => (
                <TourCard key={tour.id} tour={tour} />
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="footer-btns-container">
          <button className="btn-footer" type="button">
            Datenschutzerklärung
          </button>
          <button className="btn-footer" type="button">
            Datenschutzhinweise für nebenberufliche Vermittler
          </button>
          <button className="btn-footer" type="button">
            Impressum
          </button>
          <button className="btn-footer" type="button">
            AGB
          </button>
          <button className="btn-footer" type="button">
            Widerrufsbelehrung
          </button>
        </div>
      </footer>
    </div>
  );
}
