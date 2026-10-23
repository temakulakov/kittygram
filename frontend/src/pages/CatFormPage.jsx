import React from "react";
import { useHistory, useParams } from "react-router-dom";

import { api } from "../api";
import { BackLink, Button, Field, Input, Loader } from "../components/ui";
import { useApp } from "../context";
import imageIcon from "../images/image.svg";
import { COLORS, colorInfo, fieldErrors, readFile } from "../utils";
import { NotFound } from "./NotFound";

const currentYear = new Date().getFullYear();

export const CatFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user, toast } = useApp();
  const history = useHistory();

  const [form, setForm] = React.useState({
    name: "",
    birth_year: "",
    color: COLORS[2].hex,
    achievements: [],
  });
  const [preview, setPreview] = React.useState(null);
  const [image, setImage] = React.useState(undefined);
  const [allAchievements, setAllAchievements] = React.useState([]);
  const [newAchievement, setNewAchievement] = React.useState("");
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(isEdit);
  const [forbidden, setForbidden] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    api
      .achievements()
      .then((items) => setAllAchievements(items.map((a) => a.achievement_name)))
      .catch(() => null);
  }, []);

  React.useEffect(() => {
    if (!isEdit || !user) return;
    api
      .cat(id)
      .then((cat) => {
        if (cat.owner !== user.id) {
          setForbidden(true);
          return;
        }
        setForm({
          name: cat.name,
          birth_year: String(cat.birth_year),
          color: colorInfo(cat.color).hex,
          achievements: cat.achievements.map((a) => a.achievement_name),
        });
        setPreview(cat.image_url);
      })
      .catch(() => setForbidden(true))
      .finally(() => setLoading(false));
  }, [id, isEdit, user]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors({ ...errors, image: "Выберите файл изображения." });
      return;
    }
    const data = await readFile(file);
    setImage(data);
    setPreview(data);
    setErrors({ ...errors, image: undefined });
  };

  const removeImage = (e) => {
    e.preventDefault();
    setImage(null);
    setPreview(null);
  };

  const toggleAchievement = (name) =>
    set(
      "achievements",
      form.achievements.includes(name)
        ? form.achievements.filter((item) => item !== name)
        : [...form.achievements, name]
    );

  const addAchievement = () => {
    const name = newAchievement.trim();
    if (!name) return;
    if (!allAchievements.includes(name)) {
      setAllAchievements([...allAchievements, name]);
    }
    if (!form.achievements.includes(name)) {
      set("achievements", [...form.achievements, name]);
    }
    setNewAchievement("");
  };

  const submit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Введите имя котика.";
    if (!form.birth_year) nextErrors.birth_year = "Укажите год рождения.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = {
      name: form.name.trim(),
      birth_year: Number(form.birth_year),
      color: form.color,
      achievements: form.achievements.map((name) => ({
        achievement_name: name,
      })),
    };
    if (image !== undefined) payload.image = image;

    setSaving(true);
    try {
      const cat = isEdit
        ? await api.updateCat(id, payload)
        : await api.createCat(payload);
      toast(isEdit ? "Изменения сохранены" : `${cat.name} теперь в Kittygram!`);
      history.replace(`/cats/${cat.id}`);
    } catch (error) {
      const fields = fieldErrors(error);
      setErrors(fields);
      if (!Object.keys(fields).length) toast(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (forbidden) return <NotFound text="Редактировать можно только своего котика." />;
  if (loading) return <Loader />;

  return (
    <main className="page">
      <div className="container">
        <BackLink to={isEdit ? `/cats/${id}` : "/"}>
          {isEdit ? "К котику" : "Все котики"}
        </BackLink>
        <div className="page-head">
          <h1 className="page-title">
            {isEdit ? "Редактировать котика" : "Новый котик"}
          </h1>
        </div>
        <form className="panel form-layout" onSubmit={submit} noValidate>
          <div className="form-stack">
            <label className="upload">
              <input type="file" accept="image/*" onChange={onFile} />
              {preview ? (
                <>
                  <img src={preview} alt="Фото котика" />
                  <Button
                    small
                    variant="ghost"
                    className="upload__remove"
                    onClick={removeImage}
                  >
                    Убрать
                  </Button>
                </>
              ) : (
                <div>
                  <img
                    src={imageIcon}
                    alt=""
                    style={{ position: "static", width: 28, margin: "0 auto 8px" }}
                  />
                  Загрузите фото
                  <div style={{ fontSize: 13 }}>JPG или PNG</div>
                </div>
              )}
            </label>
            {errors.image && <span className="field__error">{errors.image}</span>}
          </div>

          <div className="form-stack">
            <div className="form-grid">
              <Field label="Имя" error={errors.name}>
                <Input
                  value={form.name}
                  maxLength={16}
                  onChange={(e) => set("name", e.target.value)}
                  error={errors.name}
                  placeholder="Например, Барсик"
                />
              </Field>
              <Field label="Год рождения" error={errors.birth_year}>
                <Input
                  type="number"
                  min="1990"
                  max={currentYear}
                  value={form.birth_year}
                  onChange={(e) => set("birth_year", e.target.value)}
                  error={errors.birth_year}
                  placeholder={String(currentYear - 2)}
                />
              </Field>
            </div>

            <Field label={`Окрас: ${colorInfo(COLORS.find((c) => c.hex === form.color)?.name).title}`} error={errors.color}>
              <div className="palette">
                {COLORS.map((item) => (
                  <span
                    key={item.hex}
                    role="button"
                    tabIndex={0}
                    title={item.title}
                    className={`palette__item ${
                      form.color === item.hex ? "palette__item_active" : ""
                    }`}
                    style={{ background: item.hex }}
                    onClick={() => set("color", item.hex)}
                    onKeyDown={(e) => e.key === "Enter" && set("color", item.hex)}
                  />
                ))}
              </div>
            </Field>

            <Field label="Достижения" error={errors.achievements}>
              <div className="chips">
                {allAchievements.map((name) => (
                  <button
                    type="button"
                    key={name}
                    className={`chip chip_button ${
                      form.achievements.includes(name) ? "chip_active" : ""
                    }`}
                    onClick={() => toggleAchievement(name)}
                  >
                    {form.achievements.includes(name) ? "✓ " : "+ "}
                    {name}
                  </button>
                ))}
              </div>
            </Field>
            <div style={{ display: "flex", gap: 10 }}>
              <Input
                value={newAchievement}
                maxLength={64}
                placeholder="Новое достижение"
                onChange={(e) => setNewAchievement(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAchievement();
                  }
                }}
              />
              <Button type="button" variant="ghost" onClick={addAchievement}>
                Добавить
              </Button>
            </div>

            <div className="form-actions">
              <Button
                type="button"
                variant="ghost"
                onClick={() => history.goBack()}
              >
                Отмена
              </Button>
              <Button type="submit" loading={saving}>
                {isEdit ? "Сохранить" : "Добавить котика"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
};
