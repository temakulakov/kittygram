import React from "react";
import { Link } from "react-router-dom";

import { api } from "../api";
import { CatCard } from "../components/cards";
import { Empty, Pagination, SkeletonGrid, Toggle } from "../components/ui";
import { useApp } from "../context";
import plusIcon from "../images/plus.svg";
import { COLORS, plural } from "../utils";

export const CatsPage = () => {
  const { user, toast } = useApp();
  const [data, setData] = React.useState(null);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [color, setColor] = React.useState("");
  const [onlyMine, setOnlyMine] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => setPage(1), [query, color, onlyMine]);

  React.useEffect(() => {
    let active = true;
    setData(null);
    api
      .cats({
        page,
        search: query,
        color,
        owner: onlyMine && user ? user.id : "",
        ordering: "-id",
      })
      .then((res) => active && setData(res))
      .catch((error) => toast(error.message, "error"));
    return () => {
      active = false;
    };
  }, [page, query, color, onlyMine, user, toast]);

  return (
    <main className="page">
      <div className="container">
        <div className="page-head">
          <div>
            <h1 className="page-title">Замечательные коты</h1>
            <p className="page-subtitle">
              {data
                ? `${data.count} ${plural(data.count, "котик", "котика", "котиков")}`
                : "Загружаем котиков…"}
            </p>
          </div>
          <Link className="btn" to="/cats/add">
            <img src={plusIcon} alt="" /> Добавить кота
          </Link>
        </div>

        <div className="toolbar">
          <div className="search">
            <input
              className="input"
              placeholder="Поиск по имени"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Toggle checked={onlyMine} onChange={setOnlyMine}>
            Только мои
          </Toggle>
        </div>
        <div className="chips chips_scroll" style={{ marginBottom: 24 }}>
          <button
            className={`chip chip_button ${!color ? "chip_active" : ""}`}
            onClick={() => setColor("")}
          >
            Все цвета
          </button>
          {COLORS.map((item) => (
            <button
              key={item.name}
              className={`chip chip_button ${
                color === item.name ? "chip_active" : ""
              }`}
              onClick={() => setColor(color === item.name ? "" : item.name)}
            >
              <span className="swatch" style={{ background: item.hex }} />
              {item.title}
            </button>
          ))}
        </div>

        {!data ? (
          <SkeletonGrid />
        ) : data.results.length === 0 ? (
          <Empty icon="😿" title="Котиков не нашлось">
            Попробуйте изменить фильтры или{" "}
            <Link to="/cats/add" style={{ color: "var(--accent)" }}>
              добавьте своего
            </Link>
            .
          </Empty>
        ) : (
          <div className="grid">
            {data.results.map((cat, index) => (
              <CatCard key={cat.id} cat={cat} index={index} />
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
