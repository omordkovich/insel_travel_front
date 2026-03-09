"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRNfC967UzQ8Lu5SN7rrpETre-ILwsnKZ4K6bbmMz_fHvEyrLyFQy-5ixxn278r6FLo_fHdXVvqZBIH/pub?gid=0&single=true&output=csv";

const BUS_STOPS = [
  { key: "dortmund", address: "Dortmund Hbf, ZOB, Steinstr. 48, Nordausgang" },
  { key: "bochum", address: "44791 Bochum, Stadionring 20" },
  {
    key: "essen",
    address: "Essen Hbf, ZOB-Südseite, Freiheit, Bushaltestelle",
  },
  {
    key: "duesseldorf",
    address: "Düsseldorf Hbf, Worringerstr. 109, Bushaltestelle",
  },
  {
    key: "koeln",
    address:
      "Köln Hbf, Goldgasse, Ecke Breslauer Platz/Johannisstraße 34 bei Kommerz Hotel",
  },
  { key: "bonn", address: "Bonn Hbf, Quantiusstr. 1" },
  {
    key: "siegen",
    address: "Siegen, Koblenzerstr. 151, Siegerlandhalle",
  },
  {
    key: "montabaur",
    address: "ICE Montabaur Bf, Haupteingang, Autobahnseite",
  },
  {
    key: "limburg",
    address: "Limburg ICE Bf, HEM Tankstelle, Brüsselerstr. 2, 65552, Abf. SÜD",
  },
  { key: "frankfurt", address: "Frankfurt Hbf, Stuttgarterstr. 26, Busterminal" },
  { key: "darmstadt", address: "Darmstadt Hbf, Zweifalltorweg" },
  { key: "mannheim", address: "Mannheim Hbf, Heinrich-von-Stefan-Str." },
  {
    key: "karlsruhe",
    address: "Karlsruhe Hbf, Hintern Bahnhof",
  },
  {
    key: "offenburg",
    address: "Offenburg, Parkplatz im Kreisverkehr 33a, Ausfahrt 55",
  },
  {
    key: "lahr_schwarzwald",
    address: "A5 Ausfahrt 56 Lahr/Schwarzwald, Einsteinallee 2, Tankstelle",
  },
  { key: "freiburg", address: "Freiburg Hbf, ZOB, Bismarckallee" },
  {
    key: "stuttgart",
    address: "70629 Stuttgart, Flughafenstr. 70, OMV Tankstelle",
  },
  { key: "ulm", address: "89073 Ulm Hbf, Bahnhof Platz" },
  {
    key: "aachen",
    address:
      "52078 Aachen Brand, Eckenerstr. 2, Shell Tankstelle, gegen Ausfahrt A44",
  },
];

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

      const busSchedule = BUS_STOPS.map((stop) => {
        const time = tour[stop.key];
        if (!time || !time.trim()) return null;
        return { address: stop.address, time: time.trim() };
      }).filter(Boolean);

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

      const included = tour.included
        ? tour.included.split(";").map((d) => d.trim())
        : [];
      const excluded = tour.excluded
        ? tour.excluded.split(";").map((d) => d.trim())
        : [];
      const startPrice = tour.startPrice
        ? tour.startPrice.split(";").map((d) => d.trim())
        : [];

      return {
        ...tour,
        id: tour.id ?? `${tour.title}-${startDates[0]?.toISOString()}`,
        description: tour.description,
        additionalInfo: tour.additionalDescription,
        importantInfo: tour.importantInfo,
        durationDays: Number(tour.durationDays),
        durationNights: Number(tour.durationNights),
        accommodationNights: Number(tour.accommodationDurationNights),
        hotel: tour.hotelType,
        active: isActive,
        startCities,
        startDates,
        endDates,
        included,
        excluded,
        startPrice,
        countries,
        firstDayDescription: tour.firstDayDescription?.trim() || "",
        secondDayDescription: tour.secondDayDescription?.trim() || "",
        thirdDayDescription: tour.thirdDayDescription?.trim() || "",
        fourthDayDescription: tour.fourthDayDescription?.trim() || "",
        fifthDayDescription: tour.fifthDayDescription?.trim() || "",
        sixthDayDescription: tour.sixthDayDescription?.trim() || "",
        seventhDayDescription: tour.seventhDayDescription?.trim() || "",
        eighthDayDescription: tour.eighthDayDescription?.trim() || "",
        busSchedule,
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

function DaysSummary({ tour }) {
  if (!tour.durationDays && !tour.durationNights) return null;
  return (
    <p className="tour-days">
      {tour.durationDays} {tour.durationDays === 1 ? "Tag" : "Tage"};{" "}
      {tour.durationNights} {tour.durationNights === 1 ? "Nacht" : "Nächte"};{" "}
      {tour.accommodationNights}{" "}
      {tour.accommodationNights === 1 ? "Nacht" : "Nächte"} im Hotel
    </p>
  );
}

function BusSchedule({ tour }) {
  if (!tour.busSchedule?.length) return null;
  return (
    <ul className="tour-dates-list">
      {tour.busSchedule.map((stop) => (
        <li key={`${stop.address}-${stop.time}`} className="tour-dates">
          {stop.time} – {stop.address}
        </li>
      ))}
    </ul>
  );
}

function IncludedList({ tour }) {
  if (!Array.isArray(tour.included) || tour.included.length === 0) return null;
  return (
    <>
      <h3>Für Sie:</h3>
      <ul className="check">
        {tour.included.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </>
  );
}

function ExcludedList({ tour }) {
  if (!Array.isArray(tour.excluded) || tour.excluded.length === 0) return null;
  return (
    <>
      <h3>Nicht enthalten:</h3>
      <ul className="ex">
        {tour.excluded.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </>
  );
}

function DayPlan({ tour }) {
  const dayMap = [
    { key: "firstDayDescription", label: "Erster Tag" },
    { key: "secondDayDescription", label: "Zweiter Tag" },
    { key: "thirdDayDescription", label: "Dritter Tag" },
    { key: "fourthDayDescription", label: "Vierter Tag" },
    { key: "fifthDayDescription", label: "Fünfter Tag" },
    { key: "sixthDayDescription", label: "Sechster Tag" },
    { key: "seventhDayDescription", label: "Siebter Tag" },
    { key: "eighthDayDescription", label: "Achter Tag" },
  ];

  const blocks = dayMap
    .map(({ key, label }) => {
      const text = tour[key];
      if (!text || !text.trim()) return null;
      return { label, text };
    })
    .filter(Boolean);

  if (!blocks.length) return null;

  return (
    <div className="tour-day">
      {blocks.map((b) => (
        <div key={b.label}>
          <strong>{b.label}:</strong> {b.text}
        </div>
      ))}
    </div>
  );
}

function TourCard({ tour, onOpen }) {
  return (
    <div className="tour-card">
      <div className="tour-img" onClick={() => onOpen(tour)}>
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
        <button className="order-btn" onClick={() => onOpen(tour)}>
          Mehr
        </button>
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

function OrderForm({ tour, onBack }) {
  const [submitting, setSubmitting] = useState(false);
  const [thankYou, setThankYou] = useState(false);
  const [numChildren, setNumChildren] = useState(0);
  const [numTourists, setNumTourists] = useState(1);

  const datesOptions = tour.startDates.map((d) => {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.append("tourTitle", tour.title || "");

    const scriptURL =
      "https://script.google.com/macros/s/AKfycbxaF82txqsJY4iqI2EdkNxyQj_UplwiQjNx7J4r08BWp1AB6WK5iEVMnS91Rc0ABNfb/exec";

    try {
      await fetch(scriptURL, {
        method: "POST",
        body: formData,
        mode: "no-cors",
      });
      setThankYou(true);
    } catch (e) {
      // Fehler einfach in der Konsole lassen; UI schlicht halten
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (thankYou) {
    return (
      <div className="form-contrainer">
        <div className="thank-you-message">
          <p>✅ Danke!</p>
          <p>
            Ihre Anfrage wurde erfolgreich gesendet. Unsere Spezialisten werden
            sich in Kürze mit Ihnen in Verbindung setzen.
          </p>
          <button className="order-btn" onClick={onBack}>
            Zurück zur Tourübersicht
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-contrainer">
      <div className="back-button-container">
        <button className="btn-footer" type="button" onClick={onBack}>
          ← Zurück
        </button>
      </div>
      <div className="tour-info">
        <img
          id="tourImage"
          className="tour-img-description"
          src={tour.imgUrl}
          alt={tour.title || "Tour"}
        />
        <h2 id="tourTitle">{tour.title}</h2>
        <p id="tourDescription">{tour.description}</p>
        <DaysSummary tour={tour} />
        <p id="tourDates" className="tour-dates">
          {formatDateRange(tour)}
        </p>
        <IncludedList tour={tour} />
        <ExcludedList tour={tour} />
        <BusSchedule tour={tour} />
      </div>

      <form className="form-elements" onSubmit={handleSubmit}>
        <div className="user-input-container">
          <label htmlFor="fname">Vorname*:</label>
          <input id="fname" name="fname" required />
        </div>
        <div className="user-input-container">
          <label htmlFor="lname">Name*:</label>
          <input id="lname" name="lname" required />
        </div>
        <div className="user-input-container">
          <label htmlFor="agency">Agentur (optional):</label>
          <input id="agency" name="agency" />
        </div>
        <div className="user-input-container">
          <label htmlFor="addressStreet">Straße, Hausnummer*:</label>
          <input id="addressStreet" name="addressStreet" required />
        </div>
        <div className="user-input-container">
          <label htmlFor="addressCity">PLZ, Wohnort*:</label>
          <input id="addressCity" name="addressCity" required />
        </div>
        <div className="user-input-container">
          <label htmlFor="email">Email*:</label>
          <input id="email" type="email" name="email" required />
        </div>
        <div className="user-input-container">
          <label htmlFor="phone">Telefon*:</label>
          <input id="phone" name="phone" required />
        </div>

        <div className="user-input-container">
          <label htmlFor="numTourists">Anzahl der Touristen (ab 18 Jahren):</label>
          <input
            id="numTourists"
            name="numTourists"
            type="number"
            min={1}
            value={numTourists}
            onChange={(e) =>
              setNumTourists(Math.max(1, Number(e.target.value) || 1))
            }
          />
        </div>

        <div className="user-input-container">
          <label htmlFor="numChildren">
            Anzahl der Minderjährigen (unter 18 Jahren):
          </label>
          <input
            id="numChildren"
            name="numChildren"
            type="number"
            min={0}
            max={10}
            value={numChildren}
            onChange={(e) =>
              setNumChildren(
                Math.min(10, Math.max(0, Number(e.target.value) || 0)),
              )
            }
          />
        </div>

        {numChildren > 0 && (
          <div id="birthdatesContainer" className="birthdates-container">
            {Array.from({ length: numChildren }, (_, i) => (
              <div key={i} className="input-row">
                <label htmlFor={`child_birthdate_${i + 1}`}>
                  Geburtsdatum des Kindes {i + 1}:
                </label>
                <input
                  type="date"
                  name={`child_birthdate_${i + 1}`}
                  id={`child_birthdate_${i + 1}`}
                  required
                />
              </div>
            ))}
          </div>
        )}

        <div id="startDateContainer" className="user-input-container">
          <label htmlFor="start-date-select">Abreisedatum*:</label>
          <select
            id="start-date-select"
            name="start-date"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Wählen Sie das Abreisedatum:
            </option>
            {datesOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div id="startCityContainer" className="user-input-container">
          <label htmlFor="start-city-select">Abfahrtsort*:</label>
          <select id="start-city-select" name="start-city" required>
            <option value="">Wählen Sie den Abfahrtsort:</option>
            {tour.startCities.map((c) => (
              <option key={c} value={normalizeCity(c)}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {tour.durationDays > 1 && (
          <div id="hotelContainer" className="user-input-container">
            <label htmlFor="hotel-room-select">Unterbringung im Hotel*:</label>
            <select id="hotel-room-select" name="hotel-room-select" required>
              <option value="" disabled>
                Wählen Sie den Zimmertyp:
              </option>
              <option value="Einzelzimmer">Einzelzimmer</option>
              <option value="Doppelzimmer mit einem Bett">
                Doppelzimmer mit einem Bett
              </option>
              <option value="Doppelzimmer mit getrennten Betten">
                Doppelzimmer mit getrennten Betten
              </option>
              <option value="Dreibettzimmer">Dreibettzimmer</option>
              <option value="Doppelzimmer + Kinderbett">
                Doppelzimmer + Kinderbett
              </option>
            </select>
          </div>
        )}

        <div className="user-input-container">
          <label htmlFor="comments">Kommentar:</label>
          <textarea id="comments" name="comments" rows={3} />
        </div>

        <div className="user-input-container">
          <label>
            <input type="checkbox" required /> Ich habe die
            Datenschutzbestimmungen gelesen und stimme zu.
          </label>
        </div>

        <button type="submit" className="order-btn" disabled={submitting}>
          {submitting ? "Wird versendet..." : "Kontaktformular absenden"}
        </button>
      </form>
    </div>
  );
}

export default function InSeelApp() {
  const [tours, setTours] = useState([]);
  const [filteredTours, setFilteredTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTour, setSelectedTour] = useState(null);
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
        t.startCities.some(
          (city) => normalizeCity(city) === selectedCity,
        ),
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
        {!selectedTour && (
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
                  <TourCard
                    key={tour.id}
                    tour={tour}
                    onOpen={(t) => setSelectedTour(t)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTour && (
          <OrderForm
            tour={selectedTour}
            onBack={() => setSelectedTour(null)}
          />
        )}
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

