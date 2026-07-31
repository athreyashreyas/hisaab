import { useState, useEffect } from 'react';
import { ArrowUpDown, Plus, RotateCcw } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, SectionHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Icon } from '../components/ui/Icon';
import { AmountField } from '../components/ui/AmountField';
import { ColorPicker } from '../components/ui/ColorPicker';
import { formatINR } from '../lib/money';
import { useCategories } from '../hooks/useData';
import { useSubmit } from '../hooks/useSubmit';
import { resolveEditor, type EditorTarget } from '../hooks/useEditorTarget';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  restoreDefaultCategories,
  reorderCategories,
} from '../lib/repo';
import { CategoryReorderSheet } from '../components/finance/CategoryReorderSheet';
import { CATEGORY_PALETTE, SUGGESTED_CATEGORIES } from '../lib/categories';
import type { Category } from '../types';
import { cn } from '../lib/cn';

const ICON_CHOICES = [
  'utensils', 'shopping-basket', 'bus', 'fuel', 'receipt', 'shopping-bag', 'heart-pulse', 'sparkles',
  'dumbbell', 'clapperboard', 'repeat', 'plane', 'graduation-cap', 'shield', 'hand-coins', 'users',
  'gift', 'home', 'coffee', 'baby', 'paw-print', 'shirt', 'laptop', 'book-open',
  'party-popper', 'heart', 'landmark', 'car', 'circle-parking', 'wine', 'scissors', 'sofa',
  'smartphone', 'zap', 'wrench', 'hand-heart', 'piggy-bank', 'stethoscope', 'banknote', 'circle-dashed',
];

/** Manage categories: rename, recolour, budget, reorder, remove, restore defaults. */
export function CategoriesPage() {
  const categories = useCategories();
  const [editing, setEditing] = useState<EditorTarget<Category>>(null);
  const [reordering, setReordering] = useState(false);

  return (
    <div>
      <PageHeader
        kicker="Buckets & budgets"
        title="Categories"
        back
        trailing={
          <Button size="sm" onClick={() => setEditing('new')} className="px-3">
            <Plus size={16} /> Add
          </Button>
        }
      />

      {/* Reorder lives with the list, not in the header: it acts on the list, and
          a second header button squeezed the title into an ellipsis. */}
      <SectionHeader
        className="mt-4"
        title={categories.length === 1 ? '1 category' : `${categories.length} categories`}
        action={
          categories.length > 1 && (
            <button
              onClick={() => setReordering(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-teal-600"
            >
              <ArrowUpDown size={14} /> Reorder
            </button>
          )
        }
      />

      <Card className="divide-y divide-parchment-200 overflow-hidden">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setEditing(c)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-parchment-100"
          >
            <span className="grid h-9 w-9 place-items-center rounded-[10px]" style={{ backgroundColor: `${c.color}22`, color: c.color }}>
              <Icon name={c.icon} size={17} />
            </span>
            <span className="flex-1 truncate text-[14px] font-semibold text-ink-900">{c.name}</span>
            {c.monthly_budget ? (
              <span className="text-[12.5px] tabular-nums text-ink-500">{formatINR(c.monthly_budget)}/mo</span>
            ) : (
              <span className="text-[12px] text-ink-300">No budget</span>
            )}
          </button>
        ))}
      </Card>

      <SuggestedCategories existing={categories} />

      <Button variant="ghost" onClick={() => restoreDefaultCategories()} className="mt-4 text-ink-500">
        <RotateCcw size={16} /> Restore default categories
      </Button>

      <CategoryModal target={editing} onClose={() => setEditing(null)} />
      <CategoryReorderSheet
        open={reordering}
        categories={categories}
        onClose={() => setReordering(false)}
        onReorder={(next) => reorderCategories(next.map((c) => c.id))}
      />
    </div>
  );
}

/**
 * The wider category library, as one-tap adds.
 *
 * Everyone's spending has a different long tail — pets, domestic help, festivals,
 * tolls — and seeding all of it would leave every user scrolling past buckets
 * they never use in the add-expense grid. So the common set ships by default and
 * the rest waits here, already named, coloured and iconed. Anything already in
 * the list drops out of the tray, so it empties as you use it.
 */
function SuggestedCategories({ existing }: { existing: Category[] }) {
  const [added, setAdded] = useState<string[]>([]);
  const have = new Set(existing.map((c) => c.name));
  const offer = SUGGESTED_CATEGORIES.filter((c) => !have.has(c.name));

  if (offer.length === 0) return null;

  return (
    <>
      <SectionHeader title="Add another" />
      <p className="-mt-1 mb-2.5 px-0.5 text-[12.5px] text-ink-500">
        Tap any of these to add it. You can rename, recolour, or budget it afterwards.
      </p>
      <div className="flex flex-wrap gap-2">
        {offer.map((c) => {
          const busy = added.includes(c.name);
          return (
            <button
              key={c.name}
              disabled={busy}
              onClick={() => {
                setAdded((prev) => [...prev, c.name]);
                void createCategory(c);
              }}
              className={cn(
                'flex items-center gap-2 rounded-full border border-parchment-300 bg-parchment-50 py-1.5 pl-2 pr-3 text-[13px] font-medium text-ink-700 transition-colors',
                busy ? 'opacity-50' : 'hover:border-teal-400'
              )}
            >
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
                style={{ backgroundColor: `${c.color}22`, color: c.color }}
              >
                <Icon name={c.icon} size={13} />
              </span>
              {c.name}
              <Plus size={13} className="text-ink-250" />
            </button>
          );
        })}
      </div>
    </>
  );
}

function CategoryModal({ target, onClose }: { target: EditorTarget<Category>; onClose: () => void }) {
  const { open, existing } = resolveEditor(target);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('circle-dashed');
  const [color, setColor] = useState(CATEGORY_PALETTE.grey);
  const [budget, setBudget] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { pending, submit } = useSubmit();

  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    if (existing) {
      setName(existing.name);
      setIcon(existing.icon);
      setColor(existing.color);
      setBudget(existing.monthly_budget ?? 0);
    } else {
      setName('');
      setIcon('circle-dashed');
      setColor(CATEGORY_PALETTE.grey);
      setBudget(0);
    }
  }, [open, existing]);

  const canSave = name.trim().length > 0;

  async function save() {
    if (!canSave) return;
    const monthly_budget = budget > 0 ? budget : null;
    if (existing) await updateCategory(existing.id, { name: name.trim(), icon, color, monthly_budget });
    else await createCategory({ name: name.trim(), icon, color, monthly_budget });
    onClose();
  }

  async function remove() {
    if (!existing) return;
    await deleteCategory(existing.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit category' : 'New category'}>
      <div className="space-y-4 px-5 py-4">
        <Input label="Name" placeholder="Food & dining" value={name} onChange={(e) => setName(e.target.value)} />
        <AmountField
          label="Monthly budget"
          title="Budget for this category"
          value={budget}
          onChange={setBudget}
          placeholder="No budget"
          hint="Leave at zero to leave this category untracked."
        />

        <ColorPicker
          colors={Object.values(CATEGORY_PALETTE)}
          value={color}
          onChange={setColor}
        />

        <div>
          <div className="mb-2 text-sm font-semibold text-ink-700">Icon</div>
          <div className="grid grid-cols-8 justify-items-center gap-x-1.5 gap-y-2">
            {ICON_CHOICES.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-card border',
                  icon === ic ? 'border-teal-400 bg-teal-50 text-teal-600' : 'border-parchment-300 text-ink-500'
                )}
                aria-label={ic}
                aria-pressed={icon === ic}
              >
                <Icon name={ic} size={16} />
              </button>
            ))}
          </div>
        </div>

        {existing && (
          <p className="text-[12px] leading-relaxed text-ink-500">
            Removing a category leaves its past entries in place; they simply read as
            uncategorised. Add it back by the same name and they find it again.
          </p>
        )}

        <div className="flex gap-2">
          {existing &&
            (confirmDelete ? (
              <Button
                variant="ghost"
                onClick={() => submit(remove)}
                disabled={pending}
                className="px-3 text-rose-600"
              >
                Really remove?
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                className="px-3 text-ink-500"
              >
                Remove
              </Button>
            ))}
          <Button onClick={() => submit(save)} disabled={!canSave || pending} className="flex-1">
            {existing ? 'Save changes' : 'Add category'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
