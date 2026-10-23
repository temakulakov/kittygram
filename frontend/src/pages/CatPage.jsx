import React from "react";
import { Link, useHistory, useParams } from "react-router-dom";

import { api } from "../api";
import { BackLink, ColorChip, Confirm, Loader } from "../components/ui";
import { useApp } from "../context";
import defaultImg from "../images/default-kitty.jpg";
import editIcon from "../images/edit.svg";
import trashIcon from "../images/trash.svg";
import { ageText, formatDate } from "../utils";
import { NotFound } from "./NotFound";

export const CatPage = () => {
  const { id } = useParams();
  const { user, toast } = useApp();
  const history = useHistory();
  const [cat, setCat] = React.useState(null);
  const [missing, setMissing] = React.useState(false);
  const [registrations, setRegistrations] = React.useState([]);
  const [confirm, setConfirm] = React.useState(false);

  const isOwner = Boolean(cat && user && cat.owner === user.id);

  React.useEffect(() => {
    let active = true;
    setCat(null);
    setMissing(false);
    api
      .cat(id)
      .then((res) => active && setCat(res))
      .catch((error) => {
        if (!active) return;
        if (error.status === 404) setMissing(true);
        else toast(error.message, "error");
      });
    return () => {
      active = false;
    };
  }, [id, toast]);

  React.useEffect(() => {
    if (!isOwner) {
      setRegistrations([]);
      return;
    }
    api
      .registrations({ cat: id })
      .then((res) => setRegistrations(res.results))
      .catch(() => setRegistrations([]));
  }, [id, isOwner]);

  const remove = async () => {
    try {
      await api.deleteCat(cat.id);
      toast(`${cat.name} удалён`);
      history.replace("/");
    } catch (error) {
      toast(error.message, "error");
      setConfirm(false);
    }
  };

  if (missing) return <NotFound text="Такого котика нет." />;
  if (!cat) return <Loader />;

  return (
    <main className="page">
      <div className="container">
        <BackLink to="/">Все котики</BackLink>
        <div className="cat-view">
          <div className="cat-view__photo">
            <img src={cat.image_url || defaultImg} alt={cat.name} />
          </div>
          <div className="appear">
            <h1 className="cat-view__name">{cat.name}</h1>
            <p className="muted">
              Хозяин: <b>{cat.owner_name}</b>
              {isOwner && " (это вы)"}
            </p>

            <div className="facts">
              <div className="fact">
                <div className="fact__label">Возраст</div>
                <div className="fact__value">{ageText(cat.age)}</div>
              </div>
              <div className="fact">
                <div className="fact__label">Год рождения</div>
                <div className="fact__value">{cat.birth_year}</div>
              </div>
              <div className="fact" style={{ gridColumn: "1 / -1" }}>
                <div className="fact__label">Окрас</div>
                <div className="fact__value">
                  <ColorChip color={cat.color} />
                </div>
              </div>
            </div>

            <div className="section-title">Достижения</div>
            {cat.achievements.length ? (
              <div className="chips">
                {cat.achievements.map((item) => (
                  <span key={item.id} className="chip">
                    🏆 {item.achievement_name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted">Пока без достижений.</p>
            )}

            {isOwner && (
              <>
                <div className="section-title">Записи на встречи</div>
                {registrations.length ? (
                  <div className="people">
                    {registrations.map((item) => (
                      <Link
                        key={item.id}
                        className="person"
                        to={`/events/${item.event}`}
                      >
                        <div className="person__main">
                          <div className="person__name">{item.event_title}</div>
                          <div className="person__sub">
                            записан {formatDate(item.created_at)}
                          </div>
                        </div>
                        {item.status === "active" ? (
                          <span className="badge badge_ok">Участник</span>
                        ) : (
                          <span className="badge badge_warn">
                            Очередь №{item.position}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="muted">
                    Не записан ни на одну встречу.{" "}
                    <Link to="/events" style={{ color: "var(--accent)" }}>
                      Найти встречу
                    </Link>
                  </p>
                )}
                <div className="actions mt-16" style={{ marginTop: 28 }}>
                  <Link className="btn" to={`/cats/${cat.id}/edit`}>
                    <img src={editIcon} alt="" /> Редактировать
                  </Link>
                  <button
                    className="btn btn_danger"
                    onClick={() => setConfirm(true)}
                  >
                    <img src={trashIcon} alt="" /> Удалить
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {confirm && (
        <Confirm
          title={`Удалить ${cat.name}?`}
          text="Котик пропадёт из ленты, его записи на встречи будут отменены, а освободившиеся места получат котики из листа ожидания."
          action="Удалить"
          danger
          onConfirm={remove}
          onClose={() => setConfirm(false)}
        />
      )}
    </main>
  );
};
