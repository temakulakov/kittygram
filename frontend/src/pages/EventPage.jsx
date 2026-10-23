import React from "react";
import { Link, useHistory, useParams } from "react-router-dom";

import { api, fetchAll } from "../api";
import {
  BackLink,
  Button,
  Confirm,
  Loader,
  Places,
  StatusBadge,
} from "../components/ui";
import { useApp } from "../context";
import { formatDate, formatTime, plural } from "../utils";
import { NotFound } from "./NotFound";

const Person = ({ item, mine, onLeave, leaving, index }) => (
  <div
    className={`person ${mine ? "person_mine" : ""}`}
    style={{ animationDelay: `${index * 40}ms` }}
  >
    {item.status === "waitlist" ? (
      <span className="person__pos">{item.position}</span>
    ) : (
      <span className="person__pos" style={{ background: "var(--ok-soft)", color: "var(--ok)" }}>
        ✓
      </span>
    )}
    <div className="person__main">
      <Link className="person__name" to={`/cats/${item.cat}`}>
        {item.cat_name}
      </Link>
      <div className="person__sub">хозяин {item.owner}</div>
    </div>
    {mine && onLeave && (
      <Button small variant="ghost" loading={leaving} onClick={onLeave}>
        Отменить
      </Button>
    )}
  </div>
);

export const EventPage = () => {
  const { id } = useParams();
  const { user, toast } = useApp();
  const history = useHistory();
  const [event, setEvent] = React.useState(null);
  const [missing, setMissing] = React.useState(false);
  const [participants, setParticipants] = React.useState([]);
  const [waitlist, setWaitlist] = React.useState([]);
  const [myCats, setMyCats] = React.useState([]);
  const [selected, setSelected] = React.useState("");
  const [busy, setBusy] = React.useState(null);
  const [confirm, setConfirm] = React.useState(null);

  const load = React.useCallback(async () => {
    try {
      const [ev, act, wait] = await Promise.all([
        api.event(id),
        fetchAll((q) => api.participants(id, q.page)),
        fetchAll((q) => api.waitlist(id, q.page)),
      ]);
      setEvent(ev);
      setParticipants(act);
      setWaitlist(wait);
    } catch (error) {
      if (error.status === 404) setMissing(true);
      else toast(error.message, "error");
    }
  }, [id, toast]);

  React.useEffect(() => {
    setEvent(null);
    setMissing(false);
    load();
  }, [load]);

  React.useEffect(() => {
    if (!user) return;
    fetchAll(api.cats, { owner: user.id })
      .then(setMyCats)
      .catch(() => setMyCats([]));
  }, [user]);

  if (missing) return <NotFound text="Такой встречи нет." />;
  if (!event || !user) return <Loader />;

  const isOrganizer = event.organizer === user.username;
  const started = new Date(event.starts_at) <= new Date();
  const open = !event.is_cancelled && !started;
  const registeredIds = new Set(
    [...participants, ...waitlist].map((item) => item.cat)
  );
  const mine = [...participants, ...waitlist].filter(
    (item) => item.owner === user.username
  );
  const available = myCats.filter((cat) => !registeredIds.has(cat.id));
  const limitReached = mine.length >= event.max_cats_per_user;

  const join = async () => {
    if (!selected) return;
    setBusy("join");
    try {
      const res = await api.joinEvent(event.id, Number(selected));
      toast(
        res.status === "active"
          ? `${res.cat_name} записан на встречу!`
          : `Мест нет — ${res.cat_name} в листе ожидания, №${res.position}`
      );
      setSelected("");
      await load();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setBusy(null);
    }
  };

  const leave = async (item) => {
    setBusy(item.cat);
    try {
      const res = await api.leaveEvent(event.id, item.cat);
      const promoted = res.promoted_from_waitlist || [];
      toast(
        promoted.length
          ? `Запись отменена. Место получил ${promoted[0].cat_name}`
          : "Запись отменена"
      );
      await load();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setBusy(null);
    }
  };

  const cancelEvent = async () => {
    try {
      await api.cancelEvent(event.id);
      toast("Встреча отменена");
      setConfirm(null);
      await load();
    } catch (error) {
      toast(error.message, "error");
      setConfirm(null);
    }
  };

  const deleteEvent = async () => {
    try {
      await api.deleteEvent(event.id);
      toast("Встреча удалена");
      history.replace("/events");
    } catch (error) {
      toast(error.message, "error");
      setConfirm(null);
    }
  };

  return (
    <main className="page">
      <div className="container">
        <BackLink to="/events">Все встречи</BackLink>
        <div className="event-hero">
          <div className="panel appear">
            <StatusBadge event={event} />
            <h1 className="event-hero__title">{event.title}</h1>
            {event.description && (
              <p style={{ marginBottom: 12, whiteSpace: "pre-line" }}>
                {event.description}
              </p>
            )}
            <div className="info-row">
              <span className="info-row__icon">📅</span>
              <div>
                <b>{formatDate(event.starts_at, { weekday: "long" })}</b>
                <div className="muted">до {formatTime(event.ends_at)}</div>
              </div>
            </div>
            <div className="info-row">
              <span className="info-row__icon">📍</span>
              <div>
                <b>{event.city}</b>
                <div className="muted">{event.address}</div>
              </div>
            </div>
            <div className="info-row">
              <span className="info-row__icon">👤</span>
              <div>
                Организатор <b>{event.organizer}</b>
                {isOrganizer && <span className="muted"> (это вы)</span>}
                <div className="muted">
                  Не больше {event.max_cats_per_user}{" "}
                  {plural(event.max_cats_per_user, "котика", "котиков", "котиков")}{" "}
                  от одного хозяина
                </div>
              </div>
            </div>
            {isOrganizer && (
              <div className="actions mt-16">
                {open && (
                  <Link className="btn btn_ghost" to={`/events/${event.id}/edit`}>
                    Редактировать
                  </Link>
                )}
                {open && (
                  <Button variant="ghost" onClick={() => setConfirm("cancel")}>
                    Отменить встречу
                  </Button>
                )}
                <Button variant="danger" onClick={() => setConfirm("delete")}>
                  Удалить
                </Button>
              </div>
            )}
          </div>

          <div className="panel appear" style={{ animationDelay: "80ms" }}>
            <div className="muted" style={{ fontWeight: 600 }}>
              Свободно мест
            </div>
            <div className="big-number">{event.free_places}</div>
            <div className="mt-8">
              <Places event={event} />
            </div>
            <div className="section-title" style={{ marginTop: 22 }}>
              Записать котика
            </div>
            {!open ? (
              <p className="muted">
                {event.is_cancelled
                  ? "Встреча отменена, запись закрыта."
                  : "Встреча уже началась, запись закрыта."}
              </p>
            ) : myCats.length === 0 ? (
              <p className="muted">
                У вас пока нет котиков.{" "}
                <Link to="/cats/add" style={{ color: "var(--accent)" }}>
                  Добавить
                </Link>
              </p>
            ) : limitReached ? (
              <p className="muted">
                Вы уже записали максимум котиков на эту встречу.
              </p>
            ) : available.length === 0 ? (
              <p className="muted">Все ваши котики уже записаны.</p>
            ) : (
              <div className="form-stack" style={{ gap: 10 }}>
                <select
                  className="input"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  <option value="">Выберите котика</option>
                  {available.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={join}
                  disabled={!selected}
                  loading={busy === "join"}
                >
                  {event.free_places > 0
                    ? "Записать"
                    : "Встать в лист ожидания"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="two-cols" style={{ marginTop: 28 }}>
          <div className="panel">
            <div className="section-title" style={{ marginTop: 0 }}>
              Участники · {participants.length}
            </div>
            {participants.length ? (
              <div className="people">
                {participants.map((item, index) => (
                  <Person
                    key={item.id}
                    item={item}
                    index={index}
                    mine={item.owner === user.username}
                    leaving={busy === item.cat}
                    onLeave={open ? () => leave(item) : null}
                  />
                ))}
              </div>
            ) : (
              <p className="muted">Пока никто не записался — будьте первым!</p>
            )}
          </div>
          <div className="panel">
            <div className="section-title" style={{ marginTop: 0 }}>
              Лист ожидания · {waitlist.length}
            </div>
            {waitlist.length ? (
              <div className="people">
                {waitlist.map((item, index) => (
                  <Person
                    key={item.id}
                    item={item}
                    index={index}
                    mine={item.owner === user.username}
                    leaving={busy === item.cat}
                    onLeave={open ? () => leave(item) : null}
                  />
                ))}
              </div>
            ) : (
              <p className="muted">
                Очереди нет. Если места закончатся, новые записи попадут сюда,
                а при отказе участника первый из очереди займёт его место.
              </p>
            )}
          </div>
        </div>
      </div>
      {confirm === "cancel" && (
        <Confirm
          title="Отменить встречу?"
          text="Встреча останется в списке с пометкой «Отменена», записаться на неё будет нельзя."
          action="Отменить встречу"
          danger
          onConfirm={cancelEvent}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === "delete" && (
        <Confirm
          title="Удалить встречу?"
          text="Встреча и все записи на неё будут удалены без возможности восстановления."
          action="Удалить"
          danger
          onConfirm={deleteEvent}
          onClose={() => setConfirm(null)}
        />
      )}
    </main>
  );
};
