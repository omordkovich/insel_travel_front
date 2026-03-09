"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

      const startPrice = tour.startPrice
        ? tour.startPrice.split(";").map((d) => d.trim())
        : [];

      return {
        ...tour,
        id: String(tour.id || `${tour.title}-${startDates[0]?.toISOString()}`),
        description: tour.description,
        durationDays: Number(tour.durationDays),
        durationNights: Number(tour.durationNights),
        accommodationNights: Number(tour.accommodationDurationNights),
        active: isActive,
        startCities,
        startDates,
        endDates,
        countries,
        startPrice,
      };
    })
    .filter((tour) => tour && tour.active)
    .sort((a, b) => {
      const firstA = a.startDates[0] || new Date(9999, 0, 1);
      const firstB = b.startDates[0] || new Date(9999, 0, 1);
      return firstA - firstB;
    });
}

function formatDateOptions(startDates) {
  return startDates.map((d) => {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  });
}

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

function BookingForm({ tour }) {
  const [submitting, setSubmitting] = useState(false);
  const [thankYou, setThankYou] = useState(false);
  const [numChildren, setNumChildren] = useState(0);
  const [numTourists, setNumTourists] = useState(1);

  const dateOptions = formatDateOptions(tour.startDates);

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
        </div>
      </div>
    );
  }

  return (
    <div className="form-contrainer">
      <form className="form-elements" onSubmit={handleSubmit}>
        <h2>{tour.title}</h2>
        <p>{tour.description}</p>

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

        <div className="user-input-container">
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
            {dateOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="user-input-container">
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
          <div className="user-input-container">
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

export default function BookingPage() {
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
        {!loading && tour && <BookingForm tour={tour} />}
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

