"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Papa from "papaparse";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRNfC967UzQ8Lu5SN7rrpETre-ILwsnKZ4K6bbmMz_fHvEyrLyFQy-5ixxn278r6FLo_fHdXVvqZBIH/pub?gid=0&single=true&output=csv";

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
        id: String(tour.id || `${tour.title}-${startDates[0]?.toISOString()}`),
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

export default function TourDetailsPage() {
  const params = useParams();
  const id = decodeURIComponent(params.id);
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Papa.parse(SHEET_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapped = mapTours(results.data);
        const found = mapped.find((t) => String(t.id) === id);
        setTour(found || null);
        setLoading(false);
      },
      error: () => {
        setLoading(false);
      },
    });
  }, [id]);

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
        {loading && <Spinner />}
        {!loading && !tour && <p>Tour nicht gefunden.</p>}

        {!loading && tour && (
          <div className="form-contrainer">
            <div className="back-button-container">
              <Link className="btn-footer" href="/">
                ← Zurück zur Übersicht
              </Link>
            </div>

            <div className="tour-info">
              <img
                className="tour-img-description"
                src={tour.imgUrl}
                alt={tour.title || "Tour"}
              />
              <h2>{tour.title}</h2>
              <p id="tourDescription">{tour.description}</p>
              <DaysSummary tour={tour} />
              <p className="tour-dates">{formatDateRange(tour)}</p>
              <IncludedList tour={tour} />
              <ExcludedList tour={tour} />
              <DayPlan tour={tour} />
              <p>{tour.additionalInfo}</p>
              {tour.importantInfo && (
                <p>
                  <strong>WICHTIG!: </strong>
                  {tour.importantInfo}
                </p>
              )}
              <p>
                {tour.startPrice ? tour.startPrice.join(" | ") : ""}{" "}
                {tour.currency || "€"}
              </p>
            </div>

            <div className="btn-container">
              <Link
                href={`/tour/${encodeURIComponent(id)}/book`}
                className="order-btn"
              >
                Buchen
              </Link>
            </div>
          </div>
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

