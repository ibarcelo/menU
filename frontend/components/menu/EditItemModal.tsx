"use client";

import { useState, FormEvent } from "react";
import { X, Trash2 } from "lucide-react";
import type { MenuItem } from "@/types";

interface Props {
  item: MenuItem;
  isNew?: boolean;
  onSave: (item: Partial<MenuItem>) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

export default function EditItemModal({ item, isNew = false, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(item.price?.toString() ?? "");
  const [description, setDescription] = useState(item.description ?? "");
  const [category, setCategory] = useState(item.category || "Other");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...item,
        name: name.trim(),
        price: price ? parseFloat(price) : null,
        description: description.trim() || null,
        category: category.trim() || "Other",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl p-5 pb-10 safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg">{isNew ? "Add item" : "Edit item"}</h2>
          <button onClick={onClose} className="text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dish name *"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand"
            required
            autoFocus
          />
          <div className="flex gap-3">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price (e.g. 12.50)"
              type="number"
              step="0.01"
              min="0"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand"
            />
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand"
            />
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-brand"
          />

          <div className="flex gap-3 mt-1">
            {!isNew && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-red-50 text-red-500 text-sm font-semibold"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 bg-brand text-white font-bold rounded-xl py-3 text-sm disabled:opacity-50"
            >
              {saving ? "Saving…" : isNew ? "Add item" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
