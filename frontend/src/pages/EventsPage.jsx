import React from "react";
import { Link } from "react-router-dom";

import { api } from "../api";
import { EventCard } from "../components/cards";
import { Empty, Pagination, Toggle } from "../components/ui";
import { useApp } from "../context";
import plusIcon from "../images/plus.svg";
import { plural } from "../utils";

export const EventsPage = () => {
  const { toast } = useApp();
  const [tab, setTab] = React.useState("upcoming");
  const [search, setSearch] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [city, setCity] = React.useState("");
  const [freeOnly, setFreeOnly] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => setPage(1), [tab, query, city, freeOnly]);

  React.useEffect(() => {
    let active = true;
    setData(null);
    api
      .events({
        page,
        search: query,
        city,
        upcoming: tab === "upcoming" ? "true" : "false",
        has_free_places: freeOnly ? "true" : "",
        is_cancelled: freeOnly ? "false" : "",
        ordering: tab === "upcoming" ? "starts_at" : "-starts_at",
      })
      .then((res) => active && setData(res))
      .catch((error) => toast(error.message, "error"));
    return () => {
      active = false;
    };
  }, [page, tab, query, city, freeOnly, toast]);

  return (
    <main className="page">
      <div className="container">
        <div className="page-head">
          <div>
            <h1 className="page-title">Кото-встречи</h1>
            <p className="page-subtitle">
              Пикники, фотосессии и мастер-классы с ограниченным числом мест.
              Когда мест нет, можно встать в лист ожидания.
            </p>
          </div>
          <Link className="btn" to="/events/new">
            <img src={plusIcon} alt="" /> Создать встречу
          </Link>
        </div>

        <div className="toolbar">
          <div className="tabs">
            <button
              className={`tab ${tab === "upcoming" ? "tab_active" : ""}`}
              onClick={() => setTab("upcoming")}
            >
              Предстоящие
            </button>
            <button
              className={`tab ${tab === "past" ? "tab_active" : ""}`}
              onClick={() => setTab("past")}
            >
              Прошедшие
            </button>
          </div>
          <div className="search">
            <input
              className="input"
              placeholder="Поиск по названию и адресу"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <input
            className="input"
            style={{ maxWidth: 180 }}
            placeholder="Город"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          {tab === "upcoming" && (
            <Toggle checked={freeOnly} onChange={setFreeOnly}>
              Есть места
            </Toggle>
          )}
        </div>

        {data && (
          <p className="muted" style={{ marginBottom: 14 }}>
            Найдено {data.count}{" "}
            {plural(data.count, "встреча", "встречи", "встреч")}
          </p>
        )}

        {!data ? (
          <div className="event-list">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ height: 112 }} />
            ))}
          </div>
        ) : data.results.length === 0 ? (
          <Empty icon="📅" title="Встреч не нашлось">
            {tab === "upcoming" ? (
              <>
                Измените фильтры или{" "}
                <Link to="/events/new" style={{ color: "var(--accent)" }}>
                  организуйте свою встречу
                </Link>
                .
              </>
            ) : (
              "Прошедших встреч пока нет."
            )}
          </Empty>
        ) : (
          <div className="event-list">
            {data.results.map((event, index) => (
              <EventCard key={event.id} event={event} index={index} />
            ))}
          </div>
        )}
        {data && (
          <Pagination count={data.count} page={page} onChange={setPage} />
        )}
      </div>
    </main>
  );
};
