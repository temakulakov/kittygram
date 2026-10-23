import React from "react";
import { Link } from "react-router-dom";

import { api, fetchAll } from "../api";
import { EventCard } from "../components/cards";
import { Empty, Loader } from "../components/ui";
import { useApp } from "../context";
import { formatDate } from "../utils";

export const MyPage = () => {
  const { user, toast } = useApp();
  const [registrations, setRegistrations] = React.useState(null);
  const [organized, setOrganized] = React.useState(null);

  React.useEffect(() => {
    if (!user) return;
    fetchAll(api.registrations, { ordering: "-created_at" })
      .then(setRegistrations)
      .catch((error) => toast(error.message, "error"));
    fetchAll(api.events, { organizer: user.username, ordering: "-starts_at" })
      .then(setOrganized)
      .catch((error) => toast(error.message, "error"));
  }, [user, toast]);

  if (!registrations || !organized) return <Loader />;

  return (
    <main className="page">
      <div className="container">
        <div className="page-head">
          <div>
            <h1 className="page-title">Мои записи</h1>
            <p className="page-subtitle">
              Куда записаны ваши котики и какие встречи вы организуете
            </p>
          </div>
        </div>

        <div className="section-title">Мои котики на встречах</div>
        {registrations.length ? (
          <div className="people">
            {registrations.map((item, index) => (
              <Link
                key={item.id}
                to={`/events/${item.event}`}
                className="person"
                style={{ animationDelay: `${index * 40}ms`, padding: "14px 16px" }}
              >
                <div className="person__main">
                  <div className="person__name">
                    {item.cat_name} → {item.event_title}
                  </div>
                  <div className="person__sub">
                    запись от {formatDate(item.created_at)}
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
          <Empty icon="🐈" title="Записей пока нет">
            Выберите встречу в разделе{" "}
            <Link to="/events" style={{ color: "var(--accent)" }}>
              Встречи
            </Link>{" "}
            и запишите своего котика.
          </Empty>
        )}

        <div className="section-title" style={{ marginTop: 36 }}>
          Я организую
        </div>
        {organized.length ? (
          <div className="event-list">
            {organized.map((event, index) => (
              <EventCard key={event.id} event={event} index={index} />
            ))}
          </div>
        ) : (
          <Empty icon="📣" title="Вы ещё не организовали ни одной встречи">
            <Link to="/events/new" style={{ color: "var(--accent)" }}>
              Создать встречу
            </Link>
          </Empty>
        )}
      </div>
    </main>
  );
};
