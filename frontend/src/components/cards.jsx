import React from "react";
import { Link } from "react-router-dom";

import defaultImg from "../images/default-kitty.jpg";
import { ageText, dayMonth, formatTime } from "../utils";
import { ColorBadge, Places } from "./ui";

export const CatCard = ({ cat, index = 0 }) => (
  <Link
    to={`/cats/${cat.id}`}
    className="cat-card appear"
    style={{ animationDelay: `${index * 45}ms` }}
  >
    <div className="cat-card__img">
      <img src={cat.image_url || defaultImg} alt={cat.name} loading="lazy" />
    </div>
    <div className="cat-card__body">
      <div>
        <div className="cat-card__name">{cat.name}</div>
        <div className="cat-card__meta">
          {ageText(cat.age)} · {cat.owner_name}
        </div>
      </div>
      <ColorBadge color={cat.color} />
    </div>
  </Link>
);

export const EventCard = ({ event, index = 0 }) => {
  const date = dayMonth(event.starts_at);
  return (
    <Link
      to={`/events/${event.id}`}
      className={`event-card appear ${
        event.is_cancelled ? "event-card_cancelled" : ""
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="date-badge">
        <span className="date-badge__day">{date.day}</span>
        <span className="date-badge__month">{date.month}</span>
      </div>
      <div>
        <div className="event-card__title">{event.title}</div>
        <div className="event-card__meta">
          <span>
            🕑 {date.weekday}, {formatTime(event.starts_at)}–
            {formatTime(event.ends_at)}
          </span>
          <span>
            📍 {event.city}, {event.address}
          </span>
          <span>👤 {event.organizer}</span>
        </div>
      </div>
      <Places event={event} />
    </Link>
  );
};
