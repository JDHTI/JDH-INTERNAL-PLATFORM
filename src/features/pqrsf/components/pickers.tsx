"use client";

import * as React from "react";

import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

import { useAssignees, useSuggestions } from "../hooks/use-pqrsf";
import { personName } from "../lib/format";
import type { DocumentType, Person, SuggestionField } from "../types/pqrsf.types";
import { Autocomplete } from "./autocomplete";

type InputPassthrough = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "onSelect" | "role" | "defaultValue"
>;

/** Accent- and case-insensitive, so "certificacion" finds "Certificación". */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Free text that offers what was typed before in the same column: the
 * spreadsheet has hundreds of spellings of the same customer, and this is
 * how the next one stops being new.
 */
export function SuggestionInput({
  field,
  value,
  onValueChange,
  ...inputProps
}: InputPassthrough & {
  field: SuggestionField;
  value: string;
  onValueChange: (text: string) => void;
}) {
  const [isFocused, setIsFocused] = React.useState(false);
  const q = useDebouncedValue(value.trim());
  const suggestions = useSuggestions(field, q, isFocused);
  const options = (suggestions.data ?? [])
    // Offering exactly what is already typed is noise.
    .filter((text) => normalize(text) !== normalize(value))
    .map((text) => ({ value: text, label: text }));

  return (
    <Autocomplete
      {...inputProps}
      value={value}
      onValueChange={onValueChange}
      options={isFocused ? options : []}
      onSelect={(option) => onValueChange(option.value)}
      isLoading={suggestions.isFetching}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    />
  );
}

/**
 * Picks one of the 62 document types by typing part of its name. The
 * response time shows in the list, because choosing the type is choosing
 * the deadline.
 */
export function DocumentTypePicker({
  documentTypes,
  value,
  onChange,
  ...inputProps
}: InputPassthrough & {
  documentTypes: DocumentType[];
  value: DocumentType | null;
  onChange: (value: DocumentType | null) => void;
}) {
  const [text, setText] = React.useState(value?.name ?? "");
  const [syncedId, setSyncedId] = React.useState(value?.id);
  // Follows a value set from outside (a row reset) without an effect.
  if (syncedId !== value?.id) {
    setSyncedId(value?.id);
    setText(value?.name ?? "");
  }

  // Every word must appear somewhere: "cert calidad" finds "Certificado Calidad".
  const words = normalize(text).split(/\s+/).filter(Boolean);
  const matches = documentTypes
    .filter((type) => {
      const name = normalize(type.name);
      return type.is_active && words.every((word) => name.includes(word));
    })
    .slice(0, 50)
    .map((type) => ({
      value: type.id,
      label: type.name,
      hint: `${type.sla_days} ${type.sla_days === 1 ? "día hábil" : "días hábiles"}`,
    }));

  return (
    <Autocomplete
      {...inputProps}
      value={text}
      onValueChange={(next) => {
        setText(next);
        if (next.trim() === "") onChange(null);
      }}
      options={matches}
      emptyText="Ningún tipo de documento coincide"
      onSelect={(option) => {
        const picked = documentTypes.find((type) => type.id === option.value) ?? null;
        setText(picked?.name ?? "");
        onChange(picked);
      }}
      onBlur={() => {
        // Only catalog types are valid here: half-typed text snaps back.
        setText(value?.name ?? "");
      }}
    />
  );
}

/** Platform users who can take the case. Managers only: the API enforces it. */
export function AssigneePicker({
  value,
  onChange,
  ...inputProps
}: InputPassthrough & {
  value: Person | null;
  onChange: (value: Person | null) => void;
}) {
  const [text, setText] = React.useState(personName(value));
  const [syncedId, setSyncedId] = React.useState(value?.id);
  if (syncedId !== value?.id) {
    setSyncedId(value?.id);
    setText(personName(value));
  }
  const [isFocused, setIsFocused] = React.useState(false);
  const q = useDebouncedValue(text.trim());
  const assignees = useAssignees(q === personName(value) ? "" : q, isFocused);

  const options = (assignees.data ?? []).map((person) => ({
    value: person.id,
    label: personName(person),
    hint: person.email && person.display_name ? person.email : undefined,
  }));

  return (
    <Autocomplete
      {...inputProps}
      value={text}
      onValueChange={(next) => {
        setText(next);
        if (next.trim() === "") onChange(null);
      }}
      options={isFocused ? options : []}
      isLoading={assignees.isFetching}
      emptyText="Nadie coincide. La persona debe haber iniciado sesión una vez en la plataforma."
      onSelect={(option) => {
        const picked = assignees.data?.find((person) => person.id === option.value) ?? null;
        setText(personName(picked));
        onChange(picked);
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
        setText(personName(value));
      }}
    />
  );
}
