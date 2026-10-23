import React from "react";
import { useHistory, useParams } from "react-router-dom";

import { api } from "../api";
import { BackLink, Button, Field, Input, Loader } from "../components/ui";
import { useApp } from "../context";
import { fieldErrors, fromLocalInput, toLocalInput } from "../utils";
import { NotFound } from "./NotFound";

const defaultStart = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
};

export const EventFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user, toast } = useApp();
  const history = useHistory();
  const [form, setForm] = React.useState(() => {
    const start = defaultStart();
    return {
      title: "",
      description: "",
      city: "Москва",
      address: "",
      starts_at: toLocalInput(start),
      ends_at: toLocalInput(new Date(new Date(start).getTime() + 2 * 3600000).toISOString()),
      capacity: "10",
      max_cats_per_user: "1",
    };
  });
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(isEdit);
  const [forbidden, setForbidden] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!isEdit || !user) return;
    api
      .event(id)
      .then((event) => {
        if (event.organizer !== user.username) {
          setForbidden(true);
          return;
        }
        setForm({
          title: event.title,
          description: event.description,
          city: event.city,
          address: event.address,
          starts_at: toLocalInput(event.starts_at),
          ends_at: toLocalInput(event.ends_at),
          capacity: String(event.capacity),
          max_cats_per_user: String(event.max_cats_per_user),
        });
      })
      .catch(() => setForbidden(true))
      .finally(() => setLoading(false));
  }, [id, isEdit, user]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      starts_at: fromLocalInput(form.starts_at),
      ends_at: fromLocalInput(form.ends_at),
      capacity: Number(form.capacity),
      max_cats_per_user: Number(form.max_cats_per_user),
    };
    setSaving(true);
    setErrors({});
    try {
      const event = isEdit
        ? await api.updateEvent(id, payload)
        : await api.createEvent(payload);
      toast(isEdit ? "Встреча обновлена" : "Встреча создана!");
      history.replace(`/events/${event.id}`);
    } catch (error) {
      const fields = fieldErrors(error);
      setErrors(fields);
      if (!Object.keys(fields).length) toast(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (forbidden) return <NotFound text="Редактировать встречу может только организатор." />;
  if (loading) return <Loader />;

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 820 }}>
        <BackLink to={isEdit ? `/events/${id}` : "/events"}>
          {isEdit ? "К встрече" : "Все встречи"}
        </BackLink>
        <div className="page-head">
          <h1 className="page-title">
            {isEdit ? "Редактировать встречу" : "Новая встреча"}
          </h1>
        </div>
        <form className="panel form-grid" onSubmit={submit} noValidate>
          <Field className="wide" label="Название" error={errors.title}>
            <Input
              value={form.title}
              maxLength={128}
              onChange={set("title")}
              error={errors.title}
              placeholder="Кото-пикник в парке"
            />
          </Field>
          <Field className="wide" label="Описание" error={errors.description}>
            <textarea
              className="input"
              value={form.description}
              onChange={set("description")}
              placeholder="Что будет на встрече, что взять с собой"
            />
          </Field>
          <Field label="Город" error={errors.city}>
            <Input value={form.city} onChange={set("city")} error={errors.city} />
          </Field>
          <Field label="Адрес" error={errors.address}>
            <Input
              value={form.address}
              onChange={set("address")}
              error={errors.address}
              placeholder="Парк Горького, у фонтана"
            />
          </Field>
          <Field label="Начало" error={errors.starts_at}>
            <Input
              type="datetime-local"
              value={form.starts_at}
              onChange={set("starts_at")}
              error={errors.starts_at}
            />
          </Field>
          <Field label="Окончание" error={errors.ends_at}>
            <Input
              type="datetime-local"
              value={form.ends_at}
              onChange={set("ends_at")}
              error={errors.ends_at}
            />
          </Field>
          <Field label="Мест для котиков" error={errors.capacity}>
            <Input
              type="number"
              min="1"
              max="500"
              value={form.capacity}
              onChange={set("capacity")}
              error={errors.capacity}
            />
          </Field>
          <Field
            label="Котиков от одного хозяина"
            error={errors.max_cats_per_user}
          >
            <Input
              type="number"
              min="1"
              max="10"
              value={form.max_cats_per_user}
              onChange={set("max_cats_per_user")}
              error={errors.max_cats_per_user}
            />
          </Field>
          <div className="form-actions wide">
            <Button
              type="button"
              variant="ghost"
              onClick={() => history.goBack()}
            >
              Отмена
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? "Сохранить" : "Создать встречу"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
};
